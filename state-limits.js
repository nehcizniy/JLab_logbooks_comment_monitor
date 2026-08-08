const MAX_PENDING_ALERTS = 100;

function currentEntryCommentCounts(entries) {
  const counts = {};
  for (const entry of Array.isArray(entries) ? entries : []) {
    const bookSlug = String(entry?.bookSlug || "").trim().toLocaleLowerCase();
    const lognumber = String(entry?.lognumber || "").trim();
    if (!bookSlug || !/^\d+$/.test(lognumber)) continue;
    counts[`${bookSlug}:${lognumber}`] = parseCommentCount(entry);
  }
  return counts;
}

function pruneEntryCountMap(value, entries) {
  const currentKeys = new Set(Object.keys(currentEntryCommentCounts(entries)));
  return Object.fromEntries(
    Object.entries(value && typeof value === "object" ? value : {})
      .filter(([key]) => currentKeys.has(key))
  );
}

function normalizeEntryHighWatermarks(value, commentCounts = {}, allowedBookSlugs = null) {
  const allowed = Array.isArray(allowedBookSlugs)
    ? new Set(allowedBookSlugs.map((slug) => String(slug).trim().toLocaleLowerCase()).filter(Boolean))
    : null;
  const watermarks = {};
  for (const [slug, raw] of Object.entries(value && typeof value === "object" ? value : {})) {
    const normalizedSlug = String(slug).trim().toLocaleLowerCase();
    const lognumber = Math.max(0, Math.trunc(Number(raw || 0)));
    if (!normalizedSlug || !lognumber || (allowed && !allowed.has(normalizedSlug))) continue;
    watermarks[normalizedSlug] = lognumber;
  }
  for (const key of Object.keys(commentCounts && typeof commentCounts === "object" ? commentCounts : {})) {
    const match = String(key).match(/^([^:]+):(\d+)$/);
    if (!match) continue;
    const slug = match[1].trim().toLocaleLowerCase();
    const lognumber = Number(match[2]);
    if (!slug || !lognumber || (allowed && !allowed.has(slug))) continue;
    watermarks[slug] = Math.max(Number(watermarks[slug] || 0), lognumber);
  }
  return watermarks;
}

function advanceEntryHighWatermarks(value, entries, activeBookSlugs) {
  const active = new Set(
    (Array.isArray(activeBookSlugs) ? activeBookSlugs : [])
      .map((slug) => String(slug).trim().toLocaleLowerCase())
      .filter(Boolean)
  );
  const watermarks = normalizeEntryHighWatermarks(value, {}, [...active]);
  for (const entry of Array.isArray(entries) ? entries : []) {
    const slug = String(entry?.bookSlug || "").trim().toLocaleLowerCase();
    const lognumber = Math.max(0, Math.trunc(Number(entry?.lognumber || 0)));
    if (!slug || !lognumber || !active.has(slug)) continue;
    watermarks[slug] = Math.max(Number(watermarks[slug] || 0), lognumber);
  }
  return watermarks;
}

function limitPendingAlerts(value, maximum = MAX_PENDING_ALERTS) {
  const limit = Math.max(0, Math.trunc(Number(maximum || 0)));
  return Object.fromEntries(
    Object.entries(value && typeof value === "object" ? value : {})
      .filter(([id, alert]) => id && alert && typeof alert === "object")
      .sort((left, right) => Number(right[1]?.createdAt || 0) - Number(left[1]?.createdAt || 0))
      .slice(0, limit)
  );
}

function reconcilePendingAlertState(value, activeNotificationIds, maximum = MAX_PENDING_ALERTS) {
  const activeIds = new Set(
    (Array.isArray(activeNotificationIds) ? activeNotificationIds : []).map(String)
  );
  const limited = limitPendingAlerts(value, maximum);
  const pendingAlerts = Object.fromEntries(
    Object.entries(limited).filter(([id]) => activeIds.has(id))
  );
  const retainedIds = new Set(Object.keys(pendingAlerts));
  return {
    pendingAlerts,
    orphanedNotificationIds: [...activeIds].filter((id) => !retainedIds.has(id))
  };
}
