const SHIFT_CREW_ALARM = "jlab-shift-crew-daily";
const SHIFT_CREW_PERIOD_MINUTES = 24 * 60;
const SHIFT_CREW_STALE_MILLISECONDS = 20 * 60 * 60 * 1000;
const SHIFT_CREW_TIME_ZONE = "America/New_York";
const SHIFT_CREW_HALLS = ["hallA", "hallB", "hallC", "hallD"];
const SHIFT_CREW_LABELS = {
  hallA: "Hall A",
  hallB: "Hall B",
  hallC: "Hall C",
  hallD: "Hall D"
};
const SHIFT_CREW_SHIFTS = [
  { name: "Owl", startHour: 0, endHour: 8 },
  { name: "Day", startHour: 8, endHour: 16 },
  { name: "Swing", startHour: 16, endHour: 24 }
];
let activeShiftCrewCheck = null;

function defaultShiftCrewSchedules() {
  return Object.fromEntries(SHIFT_CREW_HALLS.map((hall) => [hall, ""]));
}

function normalizeShiftCrewSchedules(value, options = {}) {
  const stored = value && typeof value === "object" ? value : {};
  const schedules = defaultShiftCrewSchedules();
  for (const hall of SHIFT_CREW_HALLS) {
    const rawUrl = String(stored[hall] || "").trim();
    if (!rawUrl) continue;
    try {
      schedules[hall] = normalizeShiftScheduleUrl(rawUrl);
    } catch (error) {
      if (options.strict) throw new Error(`${SHIFT_CREW_LABELS[hall]}: ${error.message}`);
    }
  }
  return schedules;
}

function normalizeShiftScheduleUrl(value) {
  let url;
  try {
    url = new URL(String(value || "").trim());
  } catch (_error) {
    throw new Error("enter a valid shift-schedule URL");
  }
  const hostname = url.hostname.toLocaleLowerCase();
  const pathname = url.pathname.toLocaleLowerCase();
  if (url.protocol !== "https:") throw new Error("the URL must use HTTPS");
  const isMisSchedule = hostname === "misportal.jlab.org" && pathname.includes("/shiftschedule/");
  const isHallBPradSchedule = hostname === "www.jlab.org" && pathname.startsWith("/hall-b/pradshifts");
  const isHallDGluexSchedule = hostname === "www.jlab.org" && pathname.startsWith("/hall-d/shifts");
  if (!isMisSchedule && !isHallBPradSchedule && !isHallDGluexSchedule) {
    throw new Error("enter a supported JLab MIS, Hall B PRad, or Hall D shift-schedule URL");
  }
  if (isMisSchedule && !url.searchParams.get("experimentRunId")) {
    throw new Error("the MIS URL is missing experimentRunId");
  }
  url.hash = "";
  return url.toString();
}

async function saveAndCheckShiftCrewSchedules(value) {
  const schedules = normalizeShiftCrewSchedules(value, { strict: true });
  const { shiftCrewState = {}, shiftCrewAlertEnabledHalls = [] } = await chrome.storage.local.get([
    "shiftCrewState", "shiftCrewAlertEnabledHalls"
  ]);
  const nextState = Object.fromEntries(
    Object.entries(shiftCrewState).filter(([hall, result]) => schedules[hall] && result?.url === schedules[hall])
  );
  await chrome.storage.local.set({
    shiftCrewSchedules: schedules,
    shiftCrewState: nextState,
    shiftCrewAlertEnabledHalls: shiftCrewAlertEnabledHalls.filter((hall) => schedules[hall]),
    shiftCrewError: ""
  });
  return checkShiftCrewSchedules();
}

async function syncShiftCrewAlarm() {
  const { shiftCrewSchedules, lastShiftCrewCheck = 0 } = await chrome.storage.local.get([
    "shiftCrewSchedules", "lastShiftCrewCheck"
  ]);
  const schedules = normalizeShiftCrewSchedules(shiftCrewSchedules);
  await chrome.alarms.clear(SHIFT_CREW_ALARM);
  if (!Object.values(schedules).some(Boolean)) return;
  const elapsedMinutes = Math.max(0, (Date.now() - Number(lastShiftCrewCheck || 0)) / 60000);
  const delayInMinutes = Number(lastShiftCrewCheck)
    ? Math.max(1, SHIFT_CREW_PERIOD_MINUTES - elapsedMinutes)
    : 1;
  await chrome.alarms.create(SHIFT_CREW_ALARM, {
    delayInMinutes,
    periodInMinutes: SHIFT_CREW_PERIOD_MINUTES
  });
}

async function checkShiftCrewSchedulesIfDue(force = false) {
  const state = await chrome.storage.local.get([
    "shiftCrewSchedules", "shiftCrewState", "lastShiftCrewCheck"
  ]);
  const schedules = normalizeShiftCrewSchedules(state.shiftCrewSchedules);
  const configuredHalls = SHIFT_CREW_HALLS.filter((hall) => schedules[hall]);
  if (!configuredHalls.length) return { skipped: true };
  const todayCode = getJlabDateParts().dateCode;
  const everyHallHasToday = configuredHalls.every(
    (hall) => state.shiftCrewState?.[hall]?.dateCode === todayCode
  );
  const recentlyChecked = Date.now() - Number(state.lastShiftCrewCheck || 0) < SHIFT_CREW_STALE_MILLISECONDS;
  if (!force && recentlyChecked && everyHallHasToday) return { skipped: true };
  return checkShiftCrewSchedules();
}

function checkShiftCrewSchedules() {
  if (activeShiftCrewCheck) return activeShiftCrewCheck;
  activeShiftCrewCheck = runShiftCrewSchedulesCheck().finally(() => {
    activeShiftCrewCheck = null;
  });
  return activeShiftCrewCheck;
}

async function runShiftCrewSchedulesCheck() {
  const { shiftCrewSchedules, shiftCrewState = {}, shiftCrewAlertEnabledHalls = [] } = await chrome.storage.local.get([
    "shiftCrewSchedules", "shiftCrewState", "shiftCrewAlertEnabledHalls"
  ]);
  const schedules = normalizeShiftCrewSchedules(shiftCrewSchedules);
  const configuredHalls = SHIFT_CREW_HALLS.filter((hall) => schedules[hall]);
  if (!configuredHalls.length) {
    await chrome.storage.local.set({
      shiftCrewState: {},
      shiftCrewChecking: false,
      shiftCrewError: "",
      lastShiftCrewCheck: 0
    });
    await syncShiftCrewAlarm();
    await recordSourceHealth("shiftCrew", {
      status: "idle",
      lastAttempt: Date.now(),
      error: "",
      checked: 0,
      detail: "No shift schedules configured"
    });
    return { schedules, state: {}, checkedAt: 0 };
  }

  await chrome.storage.local.set({ shiftCrewChecking: true, shiftCrewError: "" });
  await recordSourceHealth("shiftCrew", { status: "checking", lastAttempt: Date.now(), error: "" });
  const checkedAt = Date.now();
  const nextState = Object.fromEntries(
    Object.entries(shiftCrewState).filter(([hall]) => schedules[hall])
  );
  const errors = [];
  const changeAlerts = [];
  const alertEnabledHalls = new Set(Array.isArray(shiftCrewAlertEnabledHalls) ? shiftCrewAlertEnabledHalls : []);
  const results = await Promise.all(configuredHalls.map(async (hall) => {
    try {
      return [hall, await fetchShiftCrewSchedule(schedules[hall], hall, checkedAt)];
    } catch (error) {
      const message = describeShiftCrewError(error);
      errors.push(`${SHIFT_CREW_LABELS[hall]}: ${message}`);
      return [hall, {
        hall,
        hallName: SHIFT_CREW_LABELS[hall],
        url: schedules[hall],
        status: "error",
        error: message,
        checkedAt
      }];
    }
  }));
  for (const [hall, result] of results) {
    const previous = shiftCrewState[hall];
    if (
      result.status !== "error"
      && alertEnabledHalls.has(hall)
      && previous?.scheduleFingerprint
      && previous.dateCode === result.dateCode
      && previous.scheduleFingerprint !== result.scheduleFingerprint
    ) {
      changeAlerts.push(result);
    }
    nextState[hall] = result;
  }
  const shiftCrewError = errors.join(" · ");
  await chrome.storage.local.set({
    shiftCrewState: nextState,
    shiftCrewChecking: false,
    shiftCrewError,
    lastShiftCrewCheck: checkedAt
  });
  await syncShiftCrewAlarm();
  const successful = results.filter(([, result]) => result.status !== "error").length;
  const healthUpdate = {
    status: errors.length ? "error" : "ok",
    error: shiftCrewError,
    checked: configuredHalls.length,
    detail: `${successful}/${configuredHalls.length} configured schedules read`
  };
  if (successful) healthUpdate.lastSuccess = checkedAt;
  await recordSourceHealth("shiftCrew", healthUpdate);
  for (const schedule of changeAlerts) await showShiftCrewChangeNotification(schedule);
  return { schedules, state: nextState, checkedAt, error: shiftCrewError };
}

async function fetchShiftCrewSchedule(url, hall, checkedAt = Date.now()) {
  const requestUrl = buildShiftScheduleFetchUrl(url, checkedAt);
  const response = await fetch(requestUrl, {
    cache: "no-store",
    credentials: "omit",
    headers: { Accept: "text/html" }
  });
  if (!response.ok) throw new Error(`schedule returned HTTP ${response.status}`);
  const html = await response.text();
  const parsed = parseShiftScheduleHtml(html, checkedAt);
  return {
    hall,
    hallName: SHIFT_CREW_LABELS[hall],
    url,
    checkedAt,
    ...parsed,
    scheduleFingerprint: createShiftCrewFingerprint(parsed)
  };
}

function createShiftCrewFingerprint(schedule) {
  const content = JSON.stringify({
    dateCode: schedule?.dateCode || "",
    status: schedule?.status || "",
    shifts: schedule?.shifts || [],
    hourlyCrew: schedule?.hourlyCrew || []
  });
  let hash = 0;
  for (const character of content) hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0;
  return `${content.length}:${Math.abs(hash).toString(36)}`;
}

function buildShiftScheduleFetchUrl(value, now = Date.now()) {
  const url = new URL(value);
  if (url.hostname.toLocaleLowerCase() !== "www.jlab.org") return url.toString();
  const pathname = url.pathname.toLocaleLowerCase();
  if (pathname.startsWith("/hall-b/pradshifts")) {
    url.pathname = "/Hall-B/pradshifts/index.php";
  } else if (pathname.startsWith("/hall-d/shifts")) {
    url.pathname = "/Hall-D/shifts_3perday/index.php";
  } else {
    return url.toString();
  }
  const dateParts = getJlabDateParts(now);
  url.search = "";
  url.searchParams.set("start", dateParts.previousQueryDate);
  url.searchParams.set("end", dateParts.tomorrowQueryDate);
  url.searchParams.set("display", "schedule");
  url.searchParams.set("stype", "schedule");
  return url.toString();
}

function parseShiftScheduleHtml(html, now = Date.now()) {
  const source = String(html || "");
  if (/class\s*=\s*["'][^"']*\bshiftcal\b/i.test(source)) {
    return parseMisShiftScheduleHtml(source, now);
  }
  if (/class\s*=\s*["']tdate["']/i.test(source) && /Expert\s+Owl/i.test(source) && /Worker\s+Owl/i.test(source)) {
    return parseHallBPradScheduleHtml(source, now);
  }
  if (/class\s*=\s*["']tdate["']/i.test(source) && /Leader\s*<br\s*\/?\s*>\s*Owl/i.test(source)) {
    return parseHallDGluexScheduleHtml(source, now);
  }
  throw new Error("the page does not contain a recognized shift schedule");
}

function parseMisShiftScheduleHtml(html, now = Date.now()) {
  const source = String(html || "");
  const dateParts = getJlabDateParts(now);
  const titleMatch = source.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)
    || source.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const title = cleanShiftCrewText(titleMatch?.[1] || "JLab shift schedule");
  const markerPattern = new RegExp(`id\\s*=\\s*["']href${dateParts.dateCode}["']`, "i");
  const marker = markerPattern.exec(source);
  if (!marker) {
    return {
      title,
      status: "no-shift",
      warning: "No current schedule row was found. This page may describe an older or future run.",
      dateCode: dateParts.dateCode,
      dateLabel: dateParts.dateLabel,
      shifts: SHIFT_CREW_SHIFTS.map((shift) => ({ ...shift, workers: [], status: "No shift scheduled" }))
    };
  }

  const rowStart = source.toLocaleLowerCase().lastIndexOf("<tr", marker.index);
  const rowHtml = extractBalancedHtmlElement(source, rowStart, "tr");
  if (!rowHtml) throw new Error("today's schedule row could not be read");
  const cells = extractDirectHtmlElements(rowHtml, "td");
  if (cells.length < 4) throw new Error("today's schedule does not have the expected three shifts");
  const shifts = SHIFT_CREW_SHIFTS.map((shift, index) => ({
    ...shift,
    ...parseShiftCrewCell(cells[index + 1])
  }));
  return {
    title,
    status: "ok",
    dateCode: dateParts.dateCode,
    dateLabel: dateParts.dateLabel,
    shifts
  };
}

function parseHallBPradScheduleHtml(html, now = Date.now()) {
  const source = String(html || "");
  const dateParts = getJlabDateParts(now);
  const titleMatch = source.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const title = cleanShiftCrewText(titleMatch?.[1] || "Hall B shift schedule");
  const todayCells = findDatedShiftTableRow(source, dateParts.hallBDate);
  if (!todayCells) {
    return {
      format: "hallb-prad",
      title,
      status: "no-shift",
      warning: "No current dated row was found in the Hall B schedule.",
      dateCode: dateParts.dateCode,
      dateLabel: dateParts.dateLabel,
      hourlyCrew: []
    };
  }
  if (todayCells.length < 7) throw new Error("today's Hall B schedule row is incomplete");
  const previousCells = findDatedShiftTableRow(source, dateParts.previousHallBDate);
  const hourlyCrew = Array.from({ length: 24 }, (_unused, hour) => {
    const expertCell = hour < 8 ? todayCells[1] : hour < 16 ? todayCells[2] : todayCells[3];
    const workerCell = hour < 7
      ? previousCells?.[6]
      : hour < 15
        ? todayCells[4]
        : hour < 23
          ? todayCells[5]
          : todayCells[6];
    const expert = cleanShiftCrewText(expertCell?.html || "");
    const worker = cleanShiftCrewText(workerCell?.html || "");
    const workers = [];
    if (expert) workers.push({ role: "Expert", name: expert });
    if (worker) workers.push({ role: "Worker", name: worker });
    return {
      hour,
      shiftName: hour < 8 ? "Owl" : hour < 16 ? "Day" : "Swing",
      workers,
      status: workers.length ? "" : "No crew listed"
    };
  });
  return {
    format: "hallb-prad",
    title,
    status: "ok",
    dateCode: dateParts.dateCode,
    dateLabel: dateParts.dateLabel,
    hourlyCrew
  };
}

function parseHallDGluexScheduleHtml(html, now = Date.now()) {
  const source = String(html || "");
  const dateParts = getJlabDateParts(now);
  const titleMatch = source.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const title = cleanShiftCrewText(titleMatch?.[1] || "Hall D shift schedule");
  const todayCells = findDatedShiftTableRow(source, dateParts.hallBDate);
  if (!todayCells) {
    return {
      format: "halld-gluex",
      title,
      status: "no-shift",
      warning: "No current dated row was found in the Hall D schedule.",
      dateCode: dateParts.dateCode,
      dateLabel: dateParts.dateLabel,
      hourlyCrew: []
    };
  }
  if (todayCells.length < 9) throw new Error("today's Hall D schedule row is incomplete");
  const previousCells = findDatedShiftTableRow(source, dateParts.previousHallBDate);
  const hourlyCrew = Array.from({ length: 24 }, (_unused, hour) => {
    const leaderCell = hour < 8 ? todayCells[1] : hour < 16 ? todayCells[3] : todayCells[5];
    const workerCell = hour < 4
      ? previousCells?.[6]
      : hour < 12
        ? todayCells[2]
        : hour < 20
          ? todayCells[4]
          : todayCells[6];
    const leader = cleanShiftCrewText(leaderCell?.html || "");
    const worker = cleanShiftCrewText(workerCell?.html || "");
    const workers = [];
    if (leader) workers.push({ role: "Leader", name: leader });
    if (worker) workers.push({ role: "Worker", name: worker });
    return {
      hour,
      shiftName: hour < 8 ? "Owl" : hour < 16 ? "Day" : "Evening",
      workers,
      status: workers.length ? "" : "No crew listed"
    };
  });
  return {
    format: "halld-gluex",
    title,
    status: "ok",
    dateCode: dateParts.dateCode,
    dateLabel: dateParts.dateLabel,
    hourlyCrew
  };
}

function findDatedShiftTableRow(html, hallBDate) {
  const normalizedDate = String(hallBDate || "").trim();
  const dateParts = normalizedDate.match(/^0?([1-9]|[12]\d|3[01])-([A-Za-z]{3})-(\d{4})$/);
  const flexibleDate = dateParts
    ? `${Number(dateParts[1]) < 10 ? "0?" : ""}${Number(dateParts[1])}-${dateParts[2]}-${dateParts[3]}`
    : normalizedDate.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const dateCellPattern = new RegExp(
    `<td\\b[^>]*\\bclass\\s*=\\s*["']tdate["'][^>]*>\\s*${flexibleDate}(?=\\s|<)`,
    "i"
  );
  const marker = dateCellPattern.exec(html);
  if (!marker) return null;
  const rowStart = html.toLocaleLowerCase().lastIndexOf("<tr", marker.index);
  const rowHtml = extractBalancedHtmlElement(html, rowStart, "tr");
  if (!rowHtml) return null;
  return extractDirectHtmlElements(rowHtml, "td");
}

function extractBalancedHtmlElement(html, startIndex, tagName) {
  if (startIndex < 0) return "";
  const pattern = new RegExp(`<\\/?${tagName}\\b[^>]*>`, "gi");
  pattern.lastIndex = startIndex;
  let depth = 0;
  let match;
  while ((match = pattern.exec(html))) {
    const closing = /^<\//.test(match[0]);
    depth += closing ? -1 : 1;
    if (depth === 0) return html.slice(startIndex, pattern.lastIndex);
  }
  return "";
}

function extractDirectHtmlElements(html, tagName) {
  const elements = [];
  const pattern = new RegExp(`<\\/?${tagName}\\b[^>]*>`, "gi");
  let depth = 0;
  let contentStart = 0;
  let openTag = "";
  let match;
  while ((match = pattern.exec(html))) {
    const closing = /^<\//.test(match[0]);
    if (!closing) {
      if (depth === 0) {
        contentStart = pattern.lastIndex;
        openTag = match[0];
      }
      depth += 1;
    } else if (depth > 0) {
      depth -= 1;
      if (depth === 0) elements.push({ openTag, html: html.slice(contentStart, match.index) });
    }
  }
  return elements;
}

function parseShiftCrewCell(cell) {
  const workers = [];
  const seen = new Set();
  const jobRows = String(cell?.html || "").match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi) || [];
  for (const row of jobRows) {
    const cells = extractDirectHtmlElements(row, "td");
    if (cells.length < 2) continue;
    const role = cleanShiftCrewText(cells[0].html).replace(/\s*:\s*$/, "");
    const name = cleanShiftCrewText(cells[1].html);
    const key = `${role.toLocaleLowerCase()}|${name.toLocaleLowerCase()}`;
    if (!role || !name || seen.has(key)) continue;
    seen.add(key);
    workers.push({ role, name });
  }
  const text = cleanShiftCrewText(cell?.html || "");
  const classText = String(cell?.openTag || "");
  let status = "";
  if (/canceled|on-hold/i.test(text)) status = "Shift canceled / on-hold";
  else if (/\bOpenShift\b/i.test(classText)) status = "Open shift";
  else if (!workers.length) status = "No crew listed";
  return { workers, status };
}

function getJlabDateParts(now = Date.now()) {
  const date = new Date(now);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: SHIFT_CREW_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "long"
    }).formatToParts(date).filter((part) => part.type !== "literal").map((part) => [part.type, part.value])
  );
  const dateCode = `${parts.year}${parts.month}${parts.day}`;
  const dateLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: SHIFT_CREW_TIME_ZONE,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(date);
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const current = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), 12));
  const previous = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day) - 1, 12));
  const tomorrow = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day) + 1, 12));
  const formatTableDate = (value) => `${String(value.getUTCDate()).padStart(2, "0")}-${monthNames[value.getUTCMonth()]}-${value.getUTCFullYear()}`;
  const formatQueryDate = (value) => `${value.getUTCFullYear()}-${value.getUTCMonth() + 1}-${value.getUTCDate()}`;
  const hallBDate = formatTableDate(current);
  const previousHallBDate = formatTableDate(previous);
  return {
    dateCode,
    dateLabel,
    hallBDate,
    previousHallBDate,
    previousQueryDate: formatQueryDate(previous),
    tomorrowQueryDate: formatQueryDate(tomorrow)
  };
}

function cleanShiftCrewText(value) {
  return decodeShiftCrewEntities(
    String(value || "")
      .replace(/<br\s*\/?\s*>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  ).replace(/\s+/g, " ").trim();
}

function decodeShiftCrewEntities(value) {
  const named = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: "\""
  };
  return String(value || "").replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity) => {
    if (entity[0] === "#") {
      const hexadecimal = entity[1]?.toLocaleLowerCase() === "x";
      const codePoint = Number.parseInt(entity.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }
    return named[entity.toLocaleLowerCase()] ?? match;
  });
}

function describeShiftCrewError(error) {
  return actionableErrorMessage(error || "shift schedule check failed", "shiftCrew").slice(0, 300);
}
