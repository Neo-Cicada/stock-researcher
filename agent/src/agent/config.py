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
