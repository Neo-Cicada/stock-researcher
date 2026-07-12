from pathlib import Path

PLAN_INSTRUCTIONS = """\
You are in PLAN mode. Analyze the codebase to understand the relevant code, \
then produce a structured implementation plan.

Your plan MUST include these sections:
- **Goal**: One-sentence summary of what will be accomplished
- **Analysis**: Key findings from reading the codebase (relevant files, patterns, constraints)
- **Steps**: Numbered list of concrete implementation steps (file paths, function names, changes)
- **Risks**: Potential issues or edge cases to watch for
- **Verification**: How to confirm the changes work (commands to run, expected output)

Do NOT make any changes to files. Only read and analyze.\
"""

EXECUTE_INSTRUCTIONS = """\
The user has approved the plan above. Implement it step-by-step.

After making changes:
1. Run relevant linters (ruff for Python, eslint for TypeScript)
2. Run any applicable tests
3. Report a summary of what was changed and the results of verification steps\
"""


def build_plan_prompt(task: str, claude_md_path: Path) -> str:
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
