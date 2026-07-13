"""Persistent state for the autonomous loop.

Stored inside `.git/` so it is never committed by the loop's `git add -A`.
Lets a run resume (accumulated cost, completed tasks) after an interruption.
"""

import json
from dataclasses import asdict, dataclass, field
from pathlib import Path


@dataclass
class AutonomousState:
    completed: list[str] = field(default_factory=list)
    failed: list[str] = field(default_factory=list)
    total_cost_usd: float = 0.0
    iterations: int = 0


def load_state(path: Path) -> AutonomousState:
    if not path.exists():
        return AutonomousState()
    try:
        data = json.loads(path.read_text())
    except (json.JSONDecodeError, OSError):
        return AutonomousState()
    return AutonomousState(
        completed=data.get("completed", []),
        failed=data.get("failed", []),
        total_cost_usd=data.get("total_cost_usd", 0.0),
        iterations=data.get("iterations", 0),
    )


def save_state(path: Path, state: AutonomousState) -> None:
    try:
        path.write_text(json.dumps(asdict(state), indent=2))
    except OSError:
        pass


def clear_state(path: Path) -> None:
    path.unlink(missing_ok=True)
