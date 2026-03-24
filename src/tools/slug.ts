/** A term/semester identifier */
export type TermIdentifier = `${"fa" | "sp" | "sm"}${number}`;

/** Generate a term slug. */
export function generateTermSlug(): TermIdentifier {
  const date = new Date();
  const year = date.getFullYear();
  const month = date.getMonth();

  if (month <= 3) {
    return `sp${year}`;
  } else if (month <= 7) {
    return `sm${year}`;
  } else {
    return `fa${year}`;
  }
}

/** Generate a slug for a team. */
export function generateTeamSlug(team: number): string {
  return `${generateTermSlug()}-team${team}`;
}

/** Generate a slug for a project. */
export function generateProjectSlug(name: string, team: number): string {
  return `${generateTeamSlug(team)}-${name
    .replace(/ /gm, "-")
    .replace(/[^a-zA-Z]/gm, "")
    .toLowerCase()}`;
}
