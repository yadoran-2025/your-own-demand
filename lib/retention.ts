const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function latestFebruaryFirstCutoff(now: Date): Date {
  const koreaYear = new Date(now.getTime() + KST_OFFSET_MS).getUTCFullYear();
  const currentYearCutoff = new Date(Date.UTC(koreaYear, 0, 31, 15));

  return now >= currentYearCutoff
    ? currentYearCutoff
    : new Date(Date.UTC(koreaYear - 1, 0, 31, 15));
}

export function isBeforeAnnualCutoff(isoTimestamp: string, now: Date): boolean {
  const storedAt = new Date(isoTimestamp);
  return (
    Number.isFinite(storedAt.getTime()) &&
    storedAt < latestFebruaryFirstCutoff(now)
  );
}
