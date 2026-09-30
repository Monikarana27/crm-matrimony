const WORK_MS = 8 * 60 * 60 * 1000;
const MIN_BREAK_MS = 30 * 60 * 1000;
const SHIFT_START_HOUR = 10;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/**
 * Expected leave time = max(check-in, 10:00) + 8h + max(actual break, 30 min).
 * Early arrivals count from 10:00; a break shorter than 30 min still counts as 30.
 * Pass breakStartMs/breakEndMs as null when there is no break. If the break is
 * still open, pass breakEndMs as null and nowMs is used as its end.
 */
export function computeExpectedLeaveMs(
  checkInMs: number,
  breakStartMs: number | null,
  breakEndMs: number | null,
  nowMs: number
): number {
  // Anchor 10:00 in IST (UTC+5:30, no DST) so results don't depend on the
  // machine timezone (the PDF export renders on the server).
  const istMs = checkInMs + IST_OFFSET_MS;
  const istDayStart = Math.floor(istMs / 86_400_000) * 86_400_000;
  const shiftStartMs = istDayStart + SHIFT_START_HOUR * 3_600_000 - IST_OFFSET_MS;
  const startMs = Math.max(checkInMs, shiftStartMs);

  const breakMs =
    breakStartMs !== null ? Math.max(0, (breakEndMs ?? nowMs) - breakStartMs) : 0;

  return startMs + WORK_MS + Math.max(breakMs, MIN_BREAK_MS);
}
