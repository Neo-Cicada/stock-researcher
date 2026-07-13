from pathlib import Path

PLAN_INSTRUCTIONS = """\
You are in PLAN mode. Analyze the codebase to understand the relevant code, \
then produce a structured implementation plan.

IMPORTANT: Do NOT ask the user any questions. You are running in non-interactive \
mode and cannot receive answers. Make reasonable assumptions and state them in \
your plan. If multiple approaches are possible, pick the best one and explain why.

Your plan MUST include these sections:
- **Goal**: One-sentence summary of what will be accomplished
- **Analysis**: Key findings from the codebase (relevant files, patterns, constraints)
- **Steps**: Numbered concrete steps (file paths, function names, changes)
- **Risks**: Potential issues or edge cases to watch for
- **Verification**: How to confirm the changes work (commands to run, expected output)

Do NOT make any changes to files. Only read and analyze.\
"""

EXECUTE_INSTRUCTIONS = """\
The user has approved the plan above. Implement it step-by-step.

IMPORTANT: Do NOT ask the user any questions. You are running in non-interactive \
mode and cannot receive answers. Make reasonable decisions and proceed.

After making changes:
1. Run relevant linters (ruff for Python, eslint for TypeScript)
2. Run any applicable tests
3. Report a summary of what was changed and the results of verification steps\
"""


TRIAGE_INSTRUCTIONS = """\
You are the TRIAGE step of an autonomous coding loop. Your job is to choose \
the single next task to work on, then stop. You are read-only — do NOT make \
any changes.

Decide based on, in priority order:
1. The backlog (unchecked `- [ ]` items), top-to-bottom.
2. The stated goal, if any — decompose it into the next small, concrete step.
3. The current state of the repo (failing checks, obvious gaps).

Rules:
- Pick ONE small, self-contained task that can be implemented and verified in a \
single pass. Prefer the smallest valuable next step over a large one.
- Do NOT repeat anything in the "Already completed this run" list.
- If there is genuinely nothing worthwhile left to do, say so.

End your response with EXACTLY these two lines and nothing after them:
NEXT_TASK: <one concrete, specific task description>
STATUS: CONTINUE

If there is nothing left to do, instead end with:
NEXT_TASK: NONE
STATUS: DONE\
"""


def build_triage_prompt(
    goal: str | None,
    backlog_text: str,
    completed: list[str],
) -> str:
    """Build the prompt for the triage (task-selection) step."""
    parts = []
    if goal:
        parts.append(f"## Goal\n{goal}")
    parts.append(f"## Backlog (AGENT_BACKLOG.md)\n{backlog_text or '(empty)'}")
    if completed:
        done = "\n".join(f"- {t}" for t in completed)
        parts.append(f"## Already completed this run (do NOT repeat)\n{done}")
    parts.append("Choose the next task.")
    return "\n\n".join(parts)


def get_triage_system_prompt(claude_md_path: Path) -> str:
    """Read CLAUDE.md and append triage instructions."""
    claude_md = ""
    if claude_md_path.exists():
        claude_md = claude_md_path.read_text()
    return f"{claude_md}\n\n---\n\n{TRIAGE_INSTRUCTIONS}"


def parse_triage(text: str) -> tuple[str | None, bool]:
    """Parse triage output into (task, done).

    Returns (task_text, False) to continue, or (None, True) when finished.
    """
    task: str | None = None
    done = False
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.upper().startswith("NEXT_TASK:"):
            candidate = stripped[len("NEXT_TASK:"):].strip()
            task = candidate or None
        elif stripped.upper().startswith("STATUS:"):
            done = "DONE" in stripped.upper()
    if task is None or task.upper() in {"NONE", "N/A", "DONE"}:
        return None, True
    return task, done


def build_plan_prompt(task: str) -> str:
    """Build the full prompt for the planning phase."""
    return f"Task: {task}"


def build_execute_prompt(feedback: str | None = None) -> str:
    """Build the prompt for the execution phase."""
    if feedback:
        return (
            f"The user approved the plan with this feedback: {feedback}\n\n"
            "Now implement the plan, incorporating the feedback."
        )
    return "The user approved the plan. Now implement it step-by-step."


def get_plan_system_prompt(claude_md_path: Path) -> str:
    """Read CLAUDE.md and append plan-phase instructions."""
    claude_md = ""
    if claude_md_path.exists():
        claude_md = claude_md_path.read_text()
    return f"{claude_md}\n\n---\n\n{PLAN_INSTRUCTIONS}"


def get_execute_system_prompt(claude_md_path: Path) -> str:
    """Read CLAUDE.md and append execute-phase instructions."""
    claude_md = ""
    if claude_md_path.exists():
        claude_md = claude_md_path.read_text()
    return f"{claude_md}\n\n---\n\n{EXECUTE_INSTRUCTIONS}"
