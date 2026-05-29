export interface LineupWindowConfig {
  lockBeforeMatchMinutes: number;
}

export function isLineupEditable(
  matchScheduledAt: Date | null | undefined,
  now: Date,
  config: LineupWindowConfig
): boolean {
  if (!matchScheduledAt) return true;
  const lockTime = new Date(matchScheduledAt.getTime() - config.lockBeforeMatchMinutes * 60_000);
  return now < lockTime;
}
