"""Thin git helpers for the autonomous loop's branch + commit/revert flow."""

import subprocess
from pathlib import Path


def _git(args: list[str], cwd: Path) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["git", *args],
        cwd=cwd,
        capture_output=True,
        text=True,
        timeout=60,
    )


def working_tree_clean(cwd: Path) -> bool:
    """True if there are no tracked changes and no untracked (non-ignored) files."""
    proc = _git(["status", "--porcelain"], cwd)
    return proc.returncode == 0 and not proc.stdout.strip()


def current_head(cwd: Path) -> str:
    """The current commit SHA, or '' on failure."""
    proc = _git(["rev-parse", "HEAD"], cwd)
    return proc.stdout.strip() if proc.returncode == 0 else ""


def current_branch(cwd: Path) -> str:
    proc = _git(["rev-parse", "--abbrev-ref", "HEAD"], cwd)
    return proc.stdout.strip() if proc.returncode == 0 else ""


def checkout_work_branch(cwd: Path, branch: str) -> bool:
    """Switch to `branch`, creating it from the current HEAD if it doesn't exist."""
    exists = _git(["rev-parse", "--verify", "--quiet", branch], cwd).returncode == 0
    args = ["checkout", branch] if exists else ["checkout", "-b", branch]
    return _git(args, cwd).returncode == 0


def reset_to(cwd: Path, ref: str) -> None:
    """Hard-reset tracked files to `ref` and delete untracked files/dirs.

    Used to roll back a task whose changes failed verification.
    """
    _git(["reset", "--hard", ref], cwd)
    _git(["clean", "-fd"], cwd)


def commit_all(cwd: Path, message: str) -> bool:
    """Stage everything and commit. Returns False if there was nothing to commit."""
    _git(["add", "-A"], cwd)
    if not _git(["diff", "--cached", "--quiet"], cwd).returncode:
        return False  # exit code 0 from --quiet means no staged changes
    return _git(["commit", "-m", message], cwd).returncode == 0
