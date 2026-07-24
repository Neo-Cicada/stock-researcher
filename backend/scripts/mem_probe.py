"""Memory probe for the yfinance price-fetch paths.

Exercises the real fetch code (`price_fetcher._download_prices` or
`_fetch_ticker_detail`) in a loop and, after each iteration, reports:

* **tracemalloc** — Python-level allocations (top growth lines + traced total).
* **process RSS** — resident set size read from `ps`, which *includes* native
  C-extension memory (pandas, numpy, curl_cffi) that tracemalloc cannot see.

The contrast is the whole point of this probe:

* RSS climbs while traced memory stays flat  -> native leak (pandas / HTTP
  session buffers). Look at yfinance internals, not app objects.
* Both climb together                        -> Python object retention. The
  top-growth lines point at the holder.
* Neither climbs after warmup                -> no leak on this path.

Run from the ``backend/`` directory (network access to Yahoo required):

    uv run python scripts/mem_probe.py --mode prices --iterations 6
    uv run python scripts/mem_probe.py --mode detail --iterations 6 \
        --tickers AAPL,MSFT,NVDA,TSLA,AMD

Use ``--warmup`` (default 1) to discard the first iterations before diffing, so
one-time import/allocation costs don't masquerade as a leak.
"""

from __future__ import annotations

import argparse
import gc
import linecache
import os
import subprocess
import sys
import tracemalloc
from pathlib import Path

# Make the app package importable when run as a plain script (sys.path[0] is
# the scripts/ dir, not the backend/ root).
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services import price_fetcher  # noqa: E402

DEFAULT_TICKERS = [
    "AAPL",
    "MSFT",
    "NVDA",
    "TSLA",
    "AMD",
    "GME",
    "PLTR",
    "SMCI",
    "COIN",
    "SOFI",
    "AMZN",
    "GOOGL",
    "META",
    "NFLX",
    "INTC",
    "MU",
]


def rss_mb() -> float:
    """Current resident set size of this process, in MiB, via ``ps``."""
    out = subprocess.check_output(
        ["ps", "-o", "rss=", "-p", str(os.getpid())], text=True
    )
    return int(out.strip()) / 1024  # ps reports RSS in KiB


def run_iteration(mode: str, tickers: list[str]) -> None:
    """Exercise one real fetch cycle for the given path."""
    if mode == "prices":
        # Heavy periodic path: batched yf.download + extended-hours enrichment.
        price_fetcher._download_prices(tickers)
    else:  # detail
        for t in tickers:
            price_fetcher._fetch_ticker_detail(t)


def top_growth(current, previous, limit: int) -> None:
    """Print the top tracemalloc allocation-size increases between snapshots."""
    stats = current.compare_to(previous, "lineno")
    print(f"  top {limit} Python allocation growths (this iter):")
    shown = 0
    for stat in stats:
        if stat.size_diff <= 0:
            continue
        frame = stat.traceback[0]
        line = linecache.getline(frame.filename, frame.lineno).strip()
        loc = f"{Path(frame.filename).name}:{frame.lineno}"
        print(
            f"    +{stat.size_diff / 1024:8.1f} KiB  "
            f"(now {stat.size / 1024:8.1f} KiB)  {loc}"
        )
        if line:
            print(f"        {line}")
        shown += 1
        if shown >= limit:
            break
    if shown == 0:
        print("    (no net Python allocation growth)")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--mode", choices=["prices", "detail"], default="prices")
    parser.add_argument("--iterations", type=int, default=6)
    parser.add_argument(
        "--warmup",
        type=int,
        default=1,
        help="iterations to run before the baseline snapshot",
    )
    parser.add_argument(
        "--tickers",
        type=str,
        default="",
        help="comma-separated override for the ticker set",
    )
    parser.add_argument(
        "--top",
        type=int,
        default=12,
        help="how many growth lines to print per iteration",
    )
    parser.add_argument(
        "--trim",
        action="store_true",
        help="call price_fetcher._release_native_memory() (malloc_trim) each "
        "cycle, to validate the leak fix on Linux/glibc",
    )
    args = parser.parse_args()

    tickers = [
        t.strip().upper() for t in args.tickers.split(",") if t.strip()
    ] or DEFAULT_TICKERS

    print(
        f"mode={args.mode}  tickers={len(tickers)}  "
        f"iterations={args.iterations}  warmup={args.warmup}"
    )
    print("=" * 72)

    tracemalloc.start(25)

    # Warmup: pay one-time import/allocation costs so they don't look like a leak.
    for i in range(args.warmup):
        run_iteration(args.mode, tickers)
        gc.collect()
        if args.trim:
            price_fetcher._release_native_memory()
        print(f"warmup {i + 1}/{args.warmup}  rss={rss_mb():8.1f} MiB")

    gc.collect()
    baseline = tracemalloc.take_snapshot()
    base_rss = rss_mb()
    base_traced = tracemalloc.get_traced_memory()[0] / 1024 / 1024
    prev = baseline
    print("-" * 72)
    print(f"baseline  rss={base_rss:8.1f} MiB  traced={base_traced:8.1f} MiB")
    print("-" * 72)

    for i in range(args.iterations):
        run_iteration(args.mode, tickers)
        gc.collect()
        if args.trim:
            price_fetcher._release_native_memory()
        snap = tracemalloc.take_snapshot()
        traced = tracemalloc.get_traced_memory()[0] / 1024 / 1024
        rss = rss_mb()
        print(
            f"iter {i + 1:>2}/{args.iterations}  "
            f"rss={rss:8.1f} MiB (Δbase {rss - base_rss:+7.1f})  "
            f"traced={traced:8.1f} MiB (Δbase {traced - base_traced:+7.1f})"
        )
        top_growth(snap, prev, args.top)
        prev = snap
        print("-" * 72)

    # Cumulative Python growth over the whole run, and the RSS-vs-traced verdict.
    print("=" * 72)
    print("CUMULATIVE Python allocation growth (last vs baseline):")
    top_growth(prev, baseline, args.top)
    final_rss = rss_mb()
    final_traced = tracemalloc.get_traced_memory()[0] / 1024 / 1024
    rss_delta = final_rss - base_rss
    traced_delta = final_traced - base_traced
    print("=" * 72)
    print(f"RSS    Δ over run: {rss_delta:+8.1f} MiB")
    print(f"traced Δ over run: {traced_delta:+8.1f} MiB")
    unexplained = rss_delta - traced_delta
    print(f"unexplained (native / untraced): {unexplained:+8.1f} MiB")
    print("-" * 72)
    if rss_delta < 5:
        print("VERDICT: no significant leak on this path.")
    elif traced_delta > rss_delta * 0.5:
        print("VERDICT: Python object retention — see cumulative growth above.")
    else:
        print(
            "VERDICT: native / untraced growth (pandas / curl_cffi HTTP "
            "sessions) — tracemalloc can't see it; the app's own objects "
            "are not the cause."
        )
    tracemalloc.stop()


if __name__ == "__main__":
    main()
