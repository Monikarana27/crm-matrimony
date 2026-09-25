// Shared start-of-day (IST) boundary. Subscription endDates are stored as
// midnight IST of their LAST valid day, so any "is this still current" or
// "is this expiring soon" comparison must treat that whole day as current —
// comparing against raw now() makes a subscription look expired/past the
// instant its endDate's midnight arrives, hours before the day is actually over.
export function startOfTodayIST(): Date {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const nowIst = new Date(Date.now() + IST_OFFSET_MS);
  const startIstMs = Date.UTC(nowIst.getUTCFullYear(), nowIst.getUTCMonth(), nowIst.getUTCDate());
  return new Date(startIstMs - IST_OFFSET_MS);
}
