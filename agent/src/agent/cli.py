import argparse
import sys

from agent.config import AgentConfig
from agent.display import (
    ask_approval,
    console,
    show_banner,
    show_cost,
    show_error,
    show_info,
    show_phase,
    show_plan,
    show_result,
)
from agent.prompts import (
    build_execute_prompt,
    build_plan_prompt,
    get_execute_system_prompt,
    get_plan_system_prompt,
)
from agent.runner import run_claude


def parse_args() -> tuple[AgentConfig, str]:
    """Parse CLI arguments and return config + task prompt."""
    parser = argparse.ArgumentParser(
        prog="kabuka-agent",
        description="Autonomous coding agent for the Kabuka repo",
    )
    parser.add_argument(
        "task",
        nargs="?",
        help="Task description (omit for interactive prompt)",
    )
    parser.add_argument(
        "--plan-only",
        action="store_true",
        help="Only produce a plan, don't execute",
    )
    parser.add_argument(
        "--model",
        type=str,
        default=None,
        help="Model to use (e.g. sonnet, opus)",
    )
    parser.add_argument(
        "--budget",
        type=float,
        default=2.0,
        help="Max budget in USD (default: 2.0)",
    )

    args = parser.parse_args()

    config = AgentConfig(
        model=args.model,
        max_budget_usd=args.budget,
        plan_only=args.plan_only,
    )

    task = args.task
    if not task:
        try:
            task = console.input("[bold]What should I work on?[/bold] ")
        except (EOFError, KeyboardInterrupt):
            console.print()
            sys.exit(0)

    if not task.strip():
        show_error("No task provided.")
        sys.exit(1)

    return config, task.strip()


def run_plan_phase(config: AgentConfig, task: str) -> tuple[str, str, float | None]:
    """Run the planning phase.

    Returns:
        Tuple of (plan_text, session_id, cost_usd).
    """
    show_phase("Phase 1: Planning (read-only)")
    show_info("Claude is analyzing the codebase...")

    claude_md = config.repo_root / "CLAUDE.md"
    system_prompt = get_plan_system_prompt(claude_md)
    prompt = build_plan_prompt(task, claude_md)

    result = run_claude(
        prompt=prompt,
        permission_mode="plan",
        model=config.model,
        max_budget_usd=config.max_budget_usd,
        append_system_prompt=system_prompt,
        cwd=config.repo_root,
    )

    if result.is_error:
        show_error(result.result)
        sys.exit(1)

    return result.result, result.session_id, result.cost_usd


def run_execute_phase(
    config: AgentConfig,
    session_id: str,
    feedback: str | None = None,
) -> tuple[str, float | None]:
    """Run the execution phase.

    Returns:
        Tuple of (result_text, cost_usd).
    """
    show_phase("Phase 2: Executing (with write access)")
    show_info("Claude is implementing the plan...")

    claude_md = config.repo_root / "CLAUDE.md"
    system_prompt = get_execute_system_prompt(claude_md)
    prompt = build_execute_prompt(feedback)

    exec_tools = ["Bash", "Read", "Edit", "Write", "Glob", "Grep"]

    result = run_claude(
        prompt=prompt,
        permission_mode="acceptEdits",
        resume=session_id,
        allowed_tools=exec_tools,
        model=config.model,
        max_budget_usd=config.max_budget_usd,
        append_system_prompt=system_prompt,
        cwd=config.repo_root,
    )

    if result.is_error:
        show_error(result.result)
        sys.exit(1)

    return result.result, result.cost_usd


def main() -> None:
    """Main entry point: plan → approve → execute."""
    config, task = parse_args()
    show_banner()

    # Phase 1: Plan
    plan_text, session_id, plan_cost = run_plan_phase(config, task)
    show_plan(plan_text)

    if config.plan_only:
        show_cost(plan_cost, None)
        return

    # Approval loop (allows revisions)
    while True:
        decision, feedback = ask_approval()

        if decision == "reject":
            show_info("Plan rejected. Exiting.")
            show_cost(plan_cost, None)
            return

        if decision == "approve":
            break

        # Revise: re-run planning with feedback
        show_phase("Re-planning with feedback")
        show_info("Claude is revising the plan...")

        revision_prompt = (
            f"The user wants revisions to the plan. Feedback: {feedback}\n\n"
            "Produce a revised plan addressing this feedback."
        )

        claude_md = config.repo_root / "CLAUDE.md"
        system_prompt = get_plan_system_prompt(claude_md)

        from agent.runner import run_claude as _run

        result = _run(
            prompt=revision_prompt,
            permission_mode="plan",
            resume=session_id,
            model=config.model,
            max_budget_usd=config.max_budget_usd,
            append_system_prompt=system_prompt,
            cwd=config.repo_root,
        )

        if result.is_error:
            show_error(result.result)
            sys.exit(1)

        plan_text = result.result
        session_id = result.session_id or session_id
        if result.cost_usd is not None:
            plan_cost = (plan_cost or 0) + result.cost_usd

        show_plan(plan_text)

    # Phase 2: Execute
    exec_text, exec_cost = run_execute_phase(config, session_id, feedback)
    show_result(exec_text, exec_cost)
    show_cost(plan_cost, exec_cost)


if __name__ == "__main__":
    main()
