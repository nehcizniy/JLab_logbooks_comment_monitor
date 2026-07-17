function parseDtmEventHtml(html, pageUrl = "https://ace.jlab.org/dtm/open-events") {
  const source = String(html || "");
  const eventMatch = source.match(/<h3\b[^>]*id=["']header-(\d+)["'][^>]*>([\s\S]*?)<\/h3>/i);
  if (!eventMatch) {
    return {
      status: "closed",
      identity: null,
      title: "No open event",
      url: pageUrl,
      comments: {},
      commentRecords: {},
      diagnostic: "DTM reports no open events"
    };
  }

  const eventId = eventMatch[1];
  const header = eventMatch[2];
  const titleMatch = header.match(/class=["'][^"']*\baccordion-event-title\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);
  const durationMatch = header.match(/class=["'][^"']*\bevent-header-time-elapsed-wrap\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);
  const periodMatch = header.match(/class=["'][^"']*\bevent-header-period\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);
  const title = htmlToText(titleMatch?.[1]) || `Open DTM event #${eventId}`;
  const duration = htmlToText(durationMatch?.[1]);
  const start = htmlToText(periodMatch?.[1]);
  const detail = [title, start && `Started ${start}`, duration].filter(Boolean).join(" · ");
  return {
    status: "open",
    identity: `dtm:${eventId}`,
    title,
    detail,
    url: `${pageUrl}?event_id=${encodeURIComponent(eventId)}`,
    comments: {},
    commentRecords: {},
    diagnostic: `Direct DTM check detected event #${eventId}: ${detail}`
  };
}

function parseCommentPageHtml(html, id) {
  const source = String(html || "");
  const commentIdentity = new RegExp(`(?:/comment/${id}\\b|comment-${id}\\b)`, "i");
  if (/access denied/i.test(source) && !commentIdentity.test(source)) throw new Error("AUTH_REQUIRED");
  if (/page\s+not\s+found|requested\s+page\s+could\s+not\s+be\s+found|does\s+not\s+exist/i.test(source)) return null;
  if (!commentIdentity.test(source)) return null;

  const entryHeadingMatch = source.match(/<h1\b[^>]*class=["'][^"']*\bnode-title\b[^"']*["'][^>]*>[\s\S]*?<a\b[^>]*href=["'][^"']*\/entry\/(\d+)[^"']*["'][^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h1>/i);
  const entryMatch = entryHeadingMatch || source.match(/\/entry\/(\d+)/i);
  const bookCellMatch = source.match(/<th\b[^>]*>\s*Logbooks?:?\s*<\/th>\s*<td\b[^>]*>([\s\S]*?)<\/td>/i);
  const bookSlugs = [...String(bookCellMatch?.[1] || "").matchAll(/\/book\/([a-z0-9_-]+)/gi)]
    .map((match) => match[1].toLocaleLowerCase())
    .filter((slug, index, values) => values.indexOf(slug) === index);
  const createdMatch = source.match(/class=["'][^"']*\bauthor-datetime\b[^"']*["'][^>]*>[\s\S]*?Lognumber[\s\S]*?<time\b[^>]*datetime=["']([^"']+)["']/i);
  const title = entryHeadingMatch?.[2]
    ? htmlToText(entryHeadingMatch[2])
    : `Entry containing comment #${id}`;
  const commentUrl = `https://logbooks.jlab.org/comment/${id}#comment-${id}`;
  return {
    commentId: String(id),
    lognumber: entryMatch?.[1] || null,
    bookSlug: bookSlugs[0] || null,
    bookSlugs,
    title,
    created: createdMatch?.[1] || null,
    commentUrl,
    url: commentUrl
  };
}

function createCommentScanPlan(startCursor, recovery = false, seed = 58417) {
  const originalCursor = Math.max(Number(seed) || 0, Number(startCursor) || 0);
  return {
    originalCursor,
    scanStart: recovery ? Math.max(Number(seed) || 0, originalCursor - 100) : originalCursor,
    maximumChecks: recovery ? 600 : 200,
    missLimit: recovery ? 100 : 20,
    recovery: recovery === true
  };
}

function parseCommentCount(entry) {
  const raw = entry?.numcomments ?? entry?.comment_count ?? entry?.commentCount ?? entry?.comments ?? 0;
  return extractNumericCount(raw);
}

function combineCommentAlerts(value) {
  const alerts = Array.isArray(value) ? value : [];
  const grouped = new Map();
  for (const alert of alerts) {
    if (!alert || typeof alert !== "object") continue;
    const key = `${alert.bookSlug || alert.book || "jlab"}:${alert.lognumber || alert.commentId || "comment"}`;
    const added = Math.max(1, Number(alert.added || 1));
    const previous = grouped.get(key);
    if (!previous) {
      grouped.set(key, { ...alert, added });
      continue;
    }
    const previousCommentId = Number(previous.commentId || 0);
    const currentCommentId = Number(alert.commentId || 0);
    grouped.set(key, {
      ...(currentCommentId >= previousCommentId ? previous : alert),
      ...(currentCommentId >= previousCommentId ? alert : previous),
      added: previous.added + added
    });
  }
  return [...grouped.values()];
}

function extractNumericCount(raw, depth = 0) {
  if (depth > 5 || raw === null || typeof raw === "undefined") return 0;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0;
  if (typeof raw === "string") {
    const match = raw.match(/\d+/);
    return match ? Number(match[0]) : 0;
  }
  if (Array.isArray(raw)) {
    return raw.reduce((maximum, value) => Math.max(maximum, extractNumericCount(value, depth + 1)), 0);
  }
  if (typeof raw === "object") {
    for (const key of ["count", "value", "total", "content", "numcomments"]) {
      if (key in raw) return extractNumericCount(raw[key], depth + 1);
    }
    return Object.values(raw).reduce(
      (maximum, value) => Math.max(maximum, extractNumericCount(value, depth + 1)),
      0
    );
  }
  return 0;
}

function normalizeEntries(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload?.stat && payload.stat !== "ok") {
    throw new Error(payload.message || "The JLab API reported an error");
  }
  if (Array.isArray(payload?.data?.entries)) return payload.data.entries;
  for (const key of ["entries", "data", "results", "items"]) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  for (const wrapper of Object.values(payload || {})) {
    if (!wrapper || typeof wrapper !== "object" || Array.isArray(wrapper)) continue;
    for (const key of ["entries", "results", "items"]) {
      if (Array.isArray(wrapper[key])) return wrapper[key];
    }
  }
  if (payload && typeof payload === "object") {
    const entryValues = Object.values(payload).filter(
      (value) => value && typeof value === "object" && !Array.isArray(value) && "lognumber" in value
    );
    if (entryValues.length) return entryValues;
  }
  throw new Error("The JLab API returned an unfamiliar response format");
}

function htmlToText(value) {
  return String(value || "")
    .replace(/<br\s*\/?\s*>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#(?:39|x27);/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}
