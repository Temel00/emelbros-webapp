/**
 * Access level system for gating dashboard sections.
 *
 * Levels (highest → lowest):
 *   mt_hood  – full access (health tracking, etc.)
 *   mt_jeff  – mid-tier access
 *   sisters  – basic access (food only)
 */

export const ACCESS_LEVELS = ["mt_hood", "mt_jeff", "sisters"] as const;
export type AccessLevel = (typeof ACCESS_LEVELS)[number];

/** Numeric rank: lower index = higher permissions. */
const RANK: Record<AccessLevel, number> = {
  mt_hood: 0,
  mt_jeff: 1,
  sisters: 2,
};

/** Returns true when the user's level meets or exceeds the required level. */
export function hasAccess(
  userLevel: AccessLevel | null | undefined,
  requiredLevel: AccessLevel,
): boolean {
  if (!userLevel) return false;
  return RANK[userLevel] <= RANK[requiredLevel];
}

/** Display labels for each level. */
export const ACCESS_LEVEL_LABELS: Record<AccessLevel, string> = {
  mt_hood: "Mt. Hood",
  mt_jeff: "Mt. Jeff",
  sisters: "Sisters",
};
