from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class AgentConfig:
    repo_root: Path = field(
        default_factory=lambda: Path(__file__).resolve().parent.parent.parent.parent
    )
    model: str | None = None
    max_budget_usd: float = 2.0
    plan_only: bool = False
    stream: bool = True

    # Autonomous mode: the agent picks its own tasks and loops without a human
    # approval gate. The verification gate becomes the safety net (green ->
    # commit, red -> revert). See autonomous.py.
    autonomous: bool = False
    goal: str | None = None
    work_branch: str | None = None
    max_iterations: int = 10
    max_consecutive_failures: int = 3

    @property
    def backlog_path(self) -> Path:
        return self.repo_root / "AGENT_BACKLOG.md"

    @property
    def state_path(self) -> Path:
        # Stored inside .git/ so it is never picked up by `git add -A`.
        return self.repo_root / ".git" / "kabuka-agent-state.json"

    @property
    def stop_file(self) -> Path:
        # Touch this file to ask the loop to stop after the current iteration.
        return self.repo_root / ".agent-stop"
