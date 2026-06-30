type AnnualQuota = {
  year: number;
  remaining: number;
  postponedByDuty?: boolean;
};

export function calculateBknAnnualLeaveBalance(quotas: AnnualQuota[]) {
  const sorted = [...quotas].sort((a, b) => b.year - a.year);
  const current = sorted[0];
  const previous = sorted.filter((quota) => quota.year < current.year);
  const postponed = previous.filter((quota) => quota.postponedByDuty);
  const normalCarryOver = previous.filter((quota) => !quota.postponedByDuty);
  const rawPreviousRemaining = normalCarryOver.reduce(
    (sum, quota) => sum + quota.remaining,
    0,
  );
  const rawPostponedRemaining = postponed.reduce(
    (sum, quota) => sum + quota.remaining,
    0,
  );
  const unusedTwoYearsOrMore = previous
    .slice(0, 2)
    .every((quota) => quota.remaining >= 6);
  const maxTotal = unusedTwoYearsOrMore ? 24 : 18;
  const effectiveCarryOver = Math.min(
    unusedTwoYearsOrMore ? 12 : 6,
    rawPreviousRemaining,
  );
  const totalBeforePostponed = current.remaining + effectiveCarryOver;

  return {
    currentYear: current.year,
    currentRemaining: current.remaining,
    rawPreviousRemaining,
    effectiveCarryOver,
    postponedRemaining: rawPostponedRemaining,
    maxTotal,
    totalUsable: Math.min(maxTotal, totalBeforePostponed) + rawPostponedRemaining,
    status: unusedTwoYearsOrMore
      ? "tidak_digunakan_2_tahun"
      : totalBeforePostponed > 18
        ? "dibatasi_18_hari"
        : "normal",
  };
}
