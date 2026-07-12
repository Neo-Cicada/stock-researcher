from rich.console import Console
from rich.markdown import Markdown
from rich.panel import Panel
from rich.prompt import Prompt
from rich.text import Text

console = Console()


def show_banner() -> None:
    """Display the startup banner."""
    banner = Text()
    banner.append("株価 ", style="bold red")
    banner.append("Kabuka Agent", style="bold")
    console.print(Panel(banner, border_style="red", expand=False))


def show_phase(phase: str) -> None:
    """Display a phase header."""
    console.print(f"\n[bold cyan]── {phase} ──[/bold cyan]")


def show_plan(text: str) -> None:
    """Render the plan output in a bordered panel with markdown."""
    md = Markdown(text)
    console.print(Panel(md, title="[bold]Plan[/bold]", border_style="green", padding=(1, 2)))


def show_result(text: str, cost: float | None = None) -> None:
    """Render the execution result."""
    md = Markdown(text)
    title = "[bold]Result[/bold]"
    if cost is not None:
        title += f"  [dim](${cost:.4f})[/dim]"
    console.print(Panel(md, title=title, border_style="blue", padding=(1, 2)))


def show_error(message: str) -> None:
    """Display an error message."""
    console.print(f"[bold red]Error:[/bold red] {message}")


def show_info(message: str) -> None:
    """Display an info message."""
    console.print(f"[dim]{message}[/dim]")


def show_cost(plan_cost: float | None, exec_cost: float | None) -> None:
    """Display a cost summary."""
    parts = []
    if plan_cost is not None:
        parts.append(f"Plan: ${plan_cost:.4f}")
    if exec_cost is not None:
        parts.append(f"Execute: ${exec_cost:.4f}")
    total = (plan_cost or 0) + (exec_cost or 0)
    if parts:
        parts.append(f"Total: ${total:.4f}")
        console.print(f"\n[dim]Cost: {' | '.join(parts)}[/dim]")


def ask_approval() -> tuple[str, str | None]:
    """Prompt user to approve, revise, or reject the plan.

    Returns:
        Tuple of (decision, feedback) where decision is one of
        "approve", "revise", "reject" and feedback is optional text
        for the revise case.
    """
    console.print()
    choice = Prompt.ask(
        "[bold]Approve this plan?[/bold]",
        choices=["approve", "revise", "reject"],
        default="approve",
    )

    feedback = None
    if choice == "revise":
        feedback = Prompt.ask("[bold]Revision feedback[/bold]")

    return choice, feedback
