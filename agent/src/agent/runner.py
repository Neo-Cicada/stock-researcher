import json
import os
import subprocess
import sys
from dataclasses import dataclass
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
    stream: bool = True,
) -> ClaudeResult:
    """Invoke the claude CLI in print mode.

    When stream=True (default), uses stream-json output and prints assistant
    text to the terminal in real-time. When stream=False, uses json output
    and blocks until completion.
    """
    output_format = "stream-json" if stream else "json"
    cmd: list[str] = ["claude", "-p", "--output-format", output_format]

    if stream:
        cmd.append("--verbose")

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

    cmd.append(prompt)

    # Build the child environment. Two adjustments:
    #  - Drop CLAUDECODE so the child doesn't think it's nested in another
    #    Claude Code session.
    #  - Drop every credential env var that would make the `claude` CLI bill
    #    the Anthropic API (or Bedrock/Vertex) instead of using the OAuth
    #    subscription login. This guarantees the agent always runs on the
    #    account's subscription, regardless of the parent shell's exports.
    _BILLING_OVERRIDE_VARS = {
        "CLAUDECODE",
        "ANTHROPIC_API_KEY",
        "ANTHROPIC_AUTH_TOKEN",
        "CLAUDE_CODE_USE_BEDROCK",
        "CLAUDE_CODE_USE_VERTEX",
        "AWS_BEARER_TOKEN_BEDROCK",
    }
    env = {k: v for k, v in os.environ.items() if k not in _BILLING_OVERRIDE_VARS}

    if not stream:
        return _run_blocking(cmd, env, cwd)

    return _run_streaming(cmd, env, cwd)


def _run_blocking(cmd: list[str], env: dict, cwd: Path | None) -> ClaudeResult:
    """Run claude with JSON output, blocking until done."""
    try:
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=cwd or Path.cwd(),
            env=env,
            timeout=600,
        )
    except subprocess.TimeoutExpired:
        return ClaudeResult(result="Claude CLI timed out.", is_error=True)
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

    stdout = proc.stdout.strip()
    try:
        data = json.loads(stdout)
    except json.JSONDecodeError:
        return ClaudeResult(result=stdout or proc.stderr.strip())

    return ClaudeResult(
        result=data.get("result", ""),
        session_id=data.get("session_id", ""),
        cost_usd=data.get("total_cost_usd"),
        model=data.get("model", ""),
        is_error=data.get("is_error", False),
    )


def _run_streaming(cmd: list[str], env: dict, cwd: Path | None) -> ClaudeResult:
    """Run claude with stream-json output, printing text in real-time."""
    try:
        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            cwd=cwd or Path.cwd(),
            env=env,
        )
    except FileNotFoundError:
        return ClaudeResult(
            result="'claude' CLI not found. Is Claude Code installed?",
            is_error=True,
        )

    collected_text: list[str] = []
    session_id = ""
    cost_usd = None
    model_name = ""
    is_error = False

    assert proc.stdout is not None
    for line in proc.stdout:
        line = line.strip()
        if not line:
            continue
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            continue

        event_type = event.get("type", "")

        if event_type == "assistant":
            # Assistant message: message.content is a list of blocks, each
            # {"type": "text", "text": ...} or {"type": "tool_use", ...}.
            # Stream only the text blocks to the terminal.
            msg = event.get("message", {})
            model_name = msg.get("model", "") or model_name
            content = msg.get("content", [])
            if isinstance(content, list):
                for block in content:
                    if isinstance(block, dict) and block.get("type") == "text":
                        text = block.get("text", "")
                        sys.stdout.write(text)
                        sys.stdout.flush()
                        collected_text.append(text)

        elif event_type == "result":
            # Final result event with session_id, cost, etc.
            session_id = event.get("session_id", "")
            cost_usd = event.get("total_cost_usd")
            is_error = event.get("is_error", False)
            result_text = event.get("result", "")
            if result_text and not collected_text:
                collected_text.append(result_text)

    # Print newline after streaming
    sys.stdout.write("\n")
    sys.stdout.flush()

    proc.wait()

    full_text = "".join(collected_text) if collected_text else ""

    # If we got no text from streaming, check stderr
    if not full_text and proc.stderr:
        stderr = proc.stderr.read()
        if stderr.strip():
            return ClaudeResult(result=stderr.strip(), is_error=True)

    return ClaudeResult(
        result=full_text,
        session_id=session_id,
        cost_usd=cost_usd,
        model=model_name,
        is_error=is_error,
    )
