export const colors = {
  paper: "#F5F0E5",
  paperCard: "#EFE9DB",
  ink: "#211C15",
  inkSoft: "#2A241C",
  bullish: "#4A7C59",
  bearish: "#C3423F",
  hanko: "#BE3B33",
  blossomPink: "#E8B4B8",
  budPink: "#C99A98",
  petalEmpty: "#DCD4C1",
} as const;

export function directionColor(score: number): string {
  return score >= 50 ? colors.bullish : colors.bearish;
}
