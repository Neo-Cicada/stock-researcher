import json
import os
import subprocess
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class ClaudeResult:
    result: str = ""
    session_id: str = ""
    cost_usd: float | None = None
    model: str = ""
    is_error: bool = False


def run_claude(
    prompt: str,
    permission_mode: str = "plan",
    resume: str | None = None,
    allowed_tools: list[str] | None = None,
    model: str | None = None,
    max_budget_usd: float | None = None,
    append_system_prompt: str | None = None,
    cwd: Path | None = None,
) -> ClaudeResult:
    """Invoke the claude CLI in print mode and parse the JSON result.

    Args:
        prompt: The user prompt to send.
        permission_mode: One of "plan", "acceptEdits", "default".
        resume: Session ID to resume (carries prior context).
        allowed_tools: List of tool names to allow (e.g. ["Bash", "Edit"]).
        model: Model to use (e.g. "sonnet", "opus").
        max_budget_usd: Maximum dollar spend for this invocation.
        append_system_prompt: Extra system prompt text appended to default.
        cwd: Working directory for the subprocess.

    Returns:
        ClaudeResult with parsed output.
    """
    cmd: list[str] = ["claude", "-p", "--output-format", "json"]

    cmd.extend(["--permission-mode", permission_mode])

    if resume:
        cmd.extend(["--resume", resume])

    if allowed_tools:
        cmd.extend(["--allowedTools", ",".join(allowed_tools)])

    if model:
        cmd.extend(["--model", model])

    if max_budget_usd is not None:
        cmd.extend(["--max-budget-usd", str(max_budget_usd)])

    if append_system_prompt:
        cmd.extend(["--append-system-prompt", append_system_prompt])

    # The prompt goes last as positional argument
    cmd.append(prompt)

    # Strip CLAUDECODE env var so the child process doesn't think
    # it's nested inside another Claude Code session.
    env = {k: v for k, v in os.environ.items() if k != "CLAUDECODE"}

    try:
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=cwd or Path.cwd(),
            env=env,
            timeout=600,  # 10 minute timeout
        )
    except subprocess.TimeoutExpired:
        return ClaudeResult(
            result="Claude CLI timed out after 10 minutes.",
            is_error=True,
        )
    except FileNotFoundError:
        return ClaudeResult(
            result="'claude' CLI not found. Is Claude Code installed?",
            is_error=True,
        )

    if proc.returncode != 0 and not proc.stdout.strip():
        return ClaudeResult(
            result=proc.stderr.strip() or f"claude exited with code {proc.returncode}",
            is_error=True,
        )

    # Parse JSON output
    stdout = proc.stdout.strip()
    try:
        data = json.loads(stdout)
    except json.JSONDecodeError:
        # If JSON parsing fails, treat raw output as the result
        return ClaudeResult(result=stdout or proc.stderr.strip())

    return ClaudeResult(
        result=data.get("result", ""),
        session_id=data.get("session_id", ""),
        cost_usd=data.get("cost_usd"),
        model=data.get("model", ""),
        is_error=data.get("is_error", False),
    )
