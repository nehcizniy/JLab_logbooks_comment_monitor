const installedVersion = document.querySelector("#installed-version");
const latestVersion = document.querySelector("#latest-version");
const updateStatus = document.querySelector("#update-status");
const checkUpdateButton = document.querySelector("#check-update");
const downloadUpdateButton = document.querySelector("#download-update");
const openReleasesButton = document.querySelector("#open-releases");
const openExtensionsButton = document.querySelector("#open-extensions");
let downloadUrl = "";

installedVersion.textContent = chrome.runtime.getManifest().version;
checkUpdateButton.addEventListener("click", checkNow);
downloadUpdateButton.addEventListener("click", () => {
  if (downloadUrl) chrome.tabs.create({ url: downloadUrl });
});
openReleasesButton.addEventListener("click", () => chrome.tabs.create({ url: EXTENSION_RELEASES_URL }));
openExtensionsButton.addEventListener("click", () => chrome.tabs.create({ url: "chrome://extensions/" }));
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.extensionUpdateState) render(changes.extensionUpdateState.newValue);
});

async function checkNow() {
  checkUpdateButton.disabled = true;
  checkUpdateButton.textContent = "Checking…";
  updateStatus.className = "";
  updateStatus.textContent = "Checking GitHub releases…";
  const result = await chrome.runtime.sendMessage({ type: "check-extension-update" });
  if (!result?.ok) {
    updateStatus.className = "error";
    updateStatus.textContent = result?.error || "The update check failed. Try again later.";
  }
  const { extensionUpdateState } = await chrome.storage.local.get("extensionUpdateState");
  render(extensionUpdateState);
  checkUpdateButton.disabled = false;
  checkUpdateButton.textContent = "Check again";
}

function render(value) {
  const currentVersion = chrome.runtime.getManifest().version;
  const state = normalizeExtensionUpdateState(value, currentVersion);
  installedVersion.textContent = currentVersion;
  latestVersion.textContent = state.latestVersion || "Not available";
  downloadUrl = state.assetUrl || state.releaseUrl || "";
  downloadUpdateButton.disabled = !downloadUrl;
  downloadUpdateButton.textContent = state.assetUrl ? "Download latest ZIP" : "Open latest release";
  updateStatus.className = "";
  if (state.status === "available") {
    updateStatus.classList.add("available");
    updateStatus.textContent = `Version ${state.latestVersion} is ready. Download it, keep the current folder as a backup, then reload.`;
  } else if (state.status === "current") {
    updateStatus.textContent = `Version ${currentVersion} is the latest stable release.`;
  } else if (state.status === "development") {
    updateStatus.textContent = `Version ${currentVersion} is newer than the latest published release (${state.latestVersion}).`;
  } else if (state.status === "error") {
    updateStatus.classList.add("error");
    updateStatus.textContent = state.error || "The latest release could not be checked.";
  } else {
    updateStatus.textContent = "Checking GitHub releases…";
  }
}

chrome.storage.local.get("extensionUpdateState").then(({ extensionUpdateState }) => {
  render(extensionUpdateState);
  if (!normalizeExtensionUpdateState(extensionUpdateState, chrome.runtime.getManifest().version).checkedAt) checkNow();
});
