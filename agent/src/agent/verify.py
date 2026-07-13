"""Programmatic post-execute verification gate.

After the execute phase, Claude is *asked* to run linters, but nothing
confirms it did or that they passed. This module closes that loop: it
inspects the working-tree changes and runs the linter for each affected
subtree, returning structured pass/fail results the caller can surface.
"""

import subprocess
from dataclasses import dataclass
from pathlib import Path

# Subtree prefix -> (human label, command, cwd relative to repo_root).
# Order matters only for display; each matching subtree runs once.
_CHECKS: list[tuple[str, str, list[str], str]] = [
    ("backend", "ruff (backend)", ["uv", "run", "ruff", "check", "."], "backend"),
    ("frontend", "eslint (frontend)", ["npm", "run", "lint"], "frontend"),
    ("agent", "ruff (agent)", ["uv", "run", "ruff", "check", "."], "agent"),
]


@dataclass
class CheckResult:
    label: str
    passed: bool
    output: str


def _changed_paths(repo_root: Path) -> list[str]:
    """Return repo-relative paths of modified/untracked files, or [] on error."""
    try:
        proc = subprocess.run(
            ["git", "status", "--porcelain"],
            capture_output=True,
            text=True,
            cwd=repo_root,
            timeout=30,
        )
    except (subprocess.SubprocessError, FileNotFoundError):
        return []
    if proc.returncode != 0:
        return []

    paths: list[str] = []
    for line in proc.stdout.splitlines():
        # Porcelain format: "XY <path>" or "XY <old> -> <new>" for renames.
        entry = line[3:].strip()
        if not entry:
            continue
        if " -> " in entry:
            entry = entry.split(" -> ", 1)[1]
        paths.append(entry.strip('"'))
    return paths


def run_verification(repo_root: Path) -> list[CheckResult]:
    """Run the linter for each subtree touched by the working-tree changes."""
    changed = _changed_paths(repo_root)
    if not changed:
        return []

    results: list[CheckResult] = []
    for prefix, label, cmd, subdir in _CHECKS:
        if not any(p.startswith(f"{prefix}/") for p in changed):
            continue
        cwd = repo_root / subdir
        if not cwd.exists():
            continue
        try:
            proc = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                cwd=cwd,
                timeout=300,
            )
        except subprocess.TimeoutExpired:
            results.append(CheckResult(label, False, "timed out after 300s"))
            continue
        except FileNotFoundError:
            results.append(
                CheckResult(label, False, f"command not found: {cmd[0]}")
            )
            continue
        output = (proc.stdout + proc.stderr).strip()
        results.append(CheckResult(label, proc.returncode == 0, output))
    return results
