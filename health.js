const MONITOR_HEALTH_SOURCES = ["logbooks", "comments", "dtm", "shiftCrew", "email"];
let monitorHealthWriteQueue = Promise.resolve();

function normalizeHealthState(value) {
  const stored = value && typeof value === "object" ? value : {};
  return Object.fromEntries(MONITOR_HEALTH_SOURCES.map((source) => {
    const item = stored[source] && typeof stored[source] === "object" ? stored[source] : {};
    return [source, {
      status: ["ok", "error", "checking", "idle"].includes(item.status) ? item.status : "idle",
      lastAttempt: Number(item.lastAttempt || 0),
      lastSuccess: Number(item.lastSuccess || 0),
      error: String(item.error || ""),
      detail: String(item.detail || ""),
      checked: Number(item.checked || 0),
      consecutiveFailures: Math.max(0, Number(item.consecutiveFailures || 0))
    }];
  }));
}

async function recordSourceHealth(source, update) {
  if (!MONITOR_HEALTH_SOURCES.includes(source) || typeof chrome === "undefined") return;
  monitorHealthWriteQueue = monitorHealthWriteQueue.then(async () => {
    const { healthState } = await chrome.storage.local.get("healthState");
    const next = normalizeHealthState(healthState);
    const previous = next[source];
    const consecutiveFailures = update.status === "error"
      ? previous.consecutiveFailures + 1
      : update.status === "ok"
        ? 0
        : previous.consecutiveFailures;
    next[source] = { ...previous, ...update, consecutiveFailures };
    await chrome.storage.local.set({ healthState: next });
  });
  return monitorHealthWriteQueue;
}

function createDiagnosticSnapshot(state, manifest = {}) {
  const health = normalizeHealthState(state?.healthState);
  return {
    generatedAt: new Date().toISOString(),
    extension: {
      name: manifest.name || "JLab Logbook Comment Monitor",
      version: manifest.version || "unknown"
    },
    monitor: {
      interfaceMode: normalizeInterfaceMode(state?.interfaceMode),
      onboardingCompleted: state?.onboardingCompleted === true,
      enabled: state?.enabled !== false,
      intervalMinutes: Number(state?.intervalMinutes || 5),
      lastCheck: Number(state?.lastCheck || 0),
      lastSuccessfulCheck: Number(state?.lastSuccessfulCheck || 0),
      lastError: String(state?.lastError || ""),
      trackedEntries: Number(state?.trackedEntries || 0),
      commentCursor: Number(state?.commentCursor || 0),
      commentScanDiagnostic: String(state?.commentScanDiagnostic || ""),
      lastCommentRecoveryScan: Number(state?.lastCommentRecoveryScan || 0)
    },
    sources: health,
    logbooks: state?.bookDiagnostics && typeof state.bookDiagnostics === "object"
      ? state.bookDiagnostics
      : {},
    shiftCrew: state?.shiftCrewState && typeof state.shiftCrewState === "object"
      ? Object.fromEntries(Object.entries(state.shiftCrewState).map(([hall, value]) => [hall, {
          status: value?.status || "unknown",
          checkedAt: Number(value?.checkedAt || 0),
          dateCode: value?.dateCode || "",
          error: value?.error || ""
        }]))
      : {},
    email: {
      configured: Boolean(state?.emailConfig?.recipients?.length),
      enabled: state?.emailConfig?.enabled === true,
      connected: Boolean(state?.emailAuth?.provider),
      provider: state?.emailAuth?.provider || state?.emailConfig?.provider || "",
      lastSentAt: Number(state?.lastEmailSentAt || 0),
      lastError: String(state?.lastEmailError || "")
    }
  };
}
