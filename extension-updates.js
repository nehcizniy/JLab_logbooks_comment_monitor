const EXTENSION_RELEASE_API_URL = "https://api.github.com/repos/nehcizniy/JLab_logbooks_comment_monitor/releases/latest";
const EXTENSION_RELEASES_URL = "https://github.com/nehcizniy/JLab_logbooks_comment_monitor/releases";
const EXTENSION_UPDATE_ALARM = "jlab-extension-update-daily";
const EXTENSION_UPDATE_INTERVAL_MINUTES = 24 * 60;

function normalizeExtensionVersion(value) {
  const normalized = String(value || "")
    .trim()
    .replace(/^v/i, "")
    .split("-")[0];
  return /^\d+(?:\.\d+){0,3}$/.test(normalized) ? normalized : "";
}

function compareExtensionVersions(left, right) {
  const leftVersion = normalizeExtensionVersion(left);
  const rightVersion = normalizeExtensionVersion(right);
  if (!leftVersion || !rightVersion) return 0;
  const leftParts = leftVersion.split(".").map(Number);
  const rightParts = rightVersion.split(".").map(Number);
  const length = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (leftParts[index] || 0) - (rightParts[index] || 0);
    if (difference) return difference > 0 ? 1 : -1;
  }
  return 0;
}

function isNewerExtensionVersion(candidate, installed) {
  return compareExtensionVersions(candidate, installed) > 0;
}

function friendlyExtensionUpdateError(error) {
  const message = String(error?.message || error || "Update check failed");
  if (/HTTP 404/i.test(message)) return "No published extension release is available yet.";
  if (/HTTP 403|rate limit/i.test(message)) return "GitHub temporarily limited update checks. Try again later.";
  if (/failed to fetch|network|load failed/i.test(message)) {
    return "Could not reach GitHub. Check the network or VPN and try again.";
  }
  return message.replace(/^Error:\s*/i, "").slice(0, 240);
}

function normalizeExtensionRelease(value) {
  if (!value || typeof value !== "object" || value.draft || value.prerelease) {
    throw new Error("No stable extension release was found");
  }
  const latestVersion = normalizeExtensionVersion(value.tag_name || value.name);
  if (!latestVersion) throw new Error("The latest release has an unfamiliar version number");
  const assets = Array.isArray(value.assets) ? value.assets : [];
  const expectedName = `jlab-logbook-comment-monitor-v${latestVersion}.zip`.toLocaleLowerCase();
  const asset = assets.find((item) => String(item?.name || "").toLocaleLowerCase() === expectedName)
    || assets.find((item) => /\.zip$/i.test(String(item?.name || "")));
  return {
    latestVersion,
    releaseName: String(value.name || value.tag_name || `Version ${latestVersion}`),
    releaseUrl: String(value.html_url || EXTENSION_RELEASES_URL),
    assetUrl: String(asset?.browser_download_url || ""),
    assetName: String(asset?.name || ""),
    publishedAt: String(value.published_at || value.created_at || "")
  };
}

function createExtensionUpdateState(release, currentVersion, checkedAt = Date.now()) {
  const installed = normalizeExtensionVersion(currentVersion);
  const comparison = compareExtensionVersions(release.latestVersion, installed);
  return {
    status: comparison > 0 ? "available" : comparison < 0 ? "development" : "current",
    currentVersion: installed,
    latestVersion: release.latestVersion,
    releaseName: release.releaseName,
    releaseUrl: release.releaseUrl,
    assetUrl: release.assetUrl,
    assetName: release.assetName,
    publishedAt: release.publishedAt,
    checkedAt: Number(checkedAt),
    error: ""
  };
}

function normalizeExtensionUpdateState(value, currentVersion = "") {
  const state = value && typeof value === "object" ? value : {};
  const installed = normalizeExtensionVersion(currentVersion || state.currentVersion);
  const latest = normalizeExtensionVersion(state.latestVersion);
  const derivedStatus = latest && installed
    ? isNewerExtensionVersion(latest, installed)
      ? "available"
      : compareExtensionVersions(latest, installed) < 0
        ? "development"
        : "current"
    : "checking";
  return {
    status: state.status === "error" || state.status === "checking" ? state.status : derivedStatus,
    currentVersion: installed,
    latestVersion: latest,
    releaseName: String(state.releaseName || ""),
    releaseUrl: String(state.releaseUrl || EXTENSION_RELEASES_URL),
    assetUrl: String(state.assetUrl || ""),
    assetName: String(state.assetName || ""),
    publishedAt: String(state.publishedAt || ""),
    checkedAt: Number.isFinite(Number(state.checkedAt)) ? Number(state.checkedAt) : 0,
    error: String(state.error || "")
  };
}
