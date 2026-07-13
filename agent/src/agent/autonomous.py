"""Autonomous mode: the agent picks its own tasks and loops without a human
approval gate.

Each iteration: triage (choose the next task) -> plan -> execute -> verify.
The verification gate is the safety net — a task whose changes pass is committed
on a dedicated work branch; a task that fails (or errors, or produces no change)
is hard-reverted. The loop stops on: budget exhausted, iteration cap,
consecutive-failure circuit breaker, an empty backlog/goal, or a `.agent-stop`
file. It never pushes — you review the branch afterward.
"""

from datetime import datetime

from agent import git_ops
from agent.config import AgentConfig
from agent.display import (
    show_autonomous_header,
    show_autonomous_summary,
    show_error,
    show_info,
    show_phase,
    show_task_outcome,
    show_verification,
)
from agent.prompts import (
    build_execute_prompt,
    build_plan_prompt,
    build_triage_prompt,
    get_execute_system_prompt,
    get_plan_system_prompt,
    get_triage_system_prompt,
    parse_triage,
)
from agent.runner import ClaudeResult, run_claude
from agent.state import load_state, save_state
from agent.verify import run_verification

EXEC_TOOLS = ["Bash", "Read", "Edit", "Write", "Glob", "Grep"]
# Below this many dollars remaining, don't start another (plan+execute) task.
MIN_TASK_BUDGET = 0.25


def _cost(result: ClaudeResult) -> float:
    return result.cost_usd or 0.0


def _default_branch() -> str:
    return f"agent/auto-{datetime.now():%Y%m%d-%H%M%S}"


def run_autonomous(config: AgentConfig) -> None:
    """Run the autonomous plan→execute→verify loop until a stop condition."""
    repo = config.repo_root
    claude_md = repo / "CLAUDE.md"

    # Pre-flight: a clean tree is required so failed tasks can be safely reverted.
    if not git_ops.working_tree_clean(repo):
        show_error(
            "Working tree is not clean. Commit or stash your changes before "
            "running autonomous mode (it hard-reverts failed tasks)."
        )
        return

    branch = config.work_branch or _default_branch()
    if not git_ops.checkout_work_branch(repo, branch):
        show_error(f"Could not create/switch to work branch '{branch}'.")
        return

    show_autonomous_header(
        config.goal, branch, config.max_budget_usd, config.max_iterations
    )

    state = load_state(config.state_path)
    total_cost = state.total_cost_usd
    consecutive_failures = 0
    stop_reason = "iteration cap reached"

    for i in range(config.max_iterations):
        # --- stop conditions checked at the top of each iteration ---
        if config.stop_file.exists():
            stop_reason = "stop file detected"
            break
        remaining = config.max_budget_usd - total_cost
        if remaining < MIN_TASK_BUDGET:
            stop_reason = f"budget exhausted (${total_cost:.2f} spent)"
            break
        if consecutive_failures >= config.max_consecutive_failures:
            stop_reason = f"{consecutive_failures} consecutive failures"
            break

        show_phase(
            f"Iteration {i + 1}/{config.max_iterations}  (${remaining:.2f} left)"
        )

        # --- TRIAGE: choose the next task (read-only) ---
        backlog_text = (
            config.backlog_path.read_text() if config.backlog_path.exists() else ""
        )
        triage = run_claude(
            prompt=build_triage_prompt(config.goal, backlog_text, state.completed),
            permission_mode="plan",
            model=config.model,
            max_budget_usd=remaining,
            append_system_prompt=get_triage_system_prompt(claude_md),
            cwd=repo,
            stream=config.stream,
        )
        total_cost += _cost(triage)
        if triage.is_error:
            stop_reason = f"triage failed: {triage.result[:200]}"
            break
        task, done = parse_triage(triage.result)
        if done or not task:
            stop_reason = "no tasks left (triage returned DONE)"
            break
        show_info(f"→ Task: {task}")

        # Snapshot to roll back to if this task fails.
        snapshot = git_ops.current_head(repo)

        # --- PLAN (read-only) ---
        plan = run_claude(
            prompt=build_plan_prompt(task),
            permission_mode="plan",
            model=config.model,
            max_budget_usd=config.max_budget_usd - total_cost,
            append_system_prompt=get_plan_system_prompt(claude_md),
            cwd=repo,
            stream=config.stream,
        )
        total_cost += _cost(plan)
        if plan.is_error or not plan.session_id:
            git_ops.reset_to(repo, snapshot)
            consecutive_failures += 1
            state.failed.append(task)
            show_task_outcome(False, "planning failed")
            save_state(config.state_path, _sync(state, total_cost, i + 1))
            continue

        # --- EXECUTE (write access, resumes the plan session) ---
        execute = run_claude(
            prompt=build_execute_prompt(None),
            permission_mode="acceptEdits",
            resume=plan.session_id,
            allowed_tools=EXEC_TOOLS,
            model=config.model,
            max_budget_usd=config.max_budget_usd - total_cost,
            append_system_prompt=get_execute_system_prompt(claude_md),
            cwd=repo,
            stream=config.stream,
        )
        total_cost += _cost(execute)

        # --- VERIFY + decide commit vs revert ---
        if execute.is_error:
            git_ops.reset_to(repo, snapshot)
            consecutive_failures += 1
            state.failed.append(task)
            show_task_outcome(False, "execution errored")
        elif git_ops.working_tree_clean(repo):
            # Nothing changed — treat as a no-op failure (don't commit an empty task).
            consecutive_failures += 1
            state.failed.append(task)
            show_task_outcome(False, "no changes produced")
        else:
            show_phase("Verification gate")
            results = run_verification(repo)
            passed = show_verification(results)
            if passed:
                git_ops.commit_all(repo, f"agent: {task}")
                consecutive_failures = 0
                state.completed.append(task)
                show_task_outcome(True, "verification passed")
            else:
                git_ops.reset_to(repo, snapshot)
                consecutive_failures += 1
                state.failed.append(task)
                show_task_outcome(False, "verification failed")

        save_state(config.state_path, _sync(state, total_cost, i + 1))

    save_state(config.state_path, _sync(state, total_cost, state.iterations))
    show_autonomous_summary(state.completed, state.failed, total_cost, stop_reason)
    show_info(f"Review the work: git log {branch}  (nothing was pushed)")


def _sync(state, total_cost: float, iterations: int):
    state.total_cost_usd = total_cost
    state.iterations = iterations
    return state
