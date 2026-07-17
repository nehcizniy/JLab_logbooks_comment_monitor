const EMAIL_PROVIDER_GMAIL = "gmail";
const EMAIL_PROVIDER_MICROSOFT = "microsoft";
const MICROSOFT_SCOPES = ["openid", "profile", "offline_access", "User.Read", "Mail.Send"];

async function connectEmailProvider() {
  const { emailConfig } = await chrome.storage.local.get("emailConfig");
  const config = normalizeEmailConfig(emailConfig);
  const auth = config.provider === EMAIL_PROVIDER_MICROSOFT
    ? await connectMicrosoftEmail(config)
    : await connectGmailEmail();
  await chrome.storage.local.set({ emailAuth: auth, lastEmailError: "" });
  await recordSourceHealth("email", {
    status: "ok",
    lastAttempt: Date.now(),
    lastSuccess: Date.now(),
    error: "",
    detail: `${auth.accountEmail || "Email sender"} connected`
  });
  return publicEmailAuth(auth);
}

async function disconnectEmailProvider() {
  const { emailAuth = {} } = await chrome.storage.local.get("emailAuth");
  if (emailAuth.provider === EMAIL_PROVIDER_GMAIL) {
    try {
      const token = await getGmailAccessToken(false);
      if (token) {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
          method: "POST"
        });
        await chrome.identity.removeCachedAuthToken({ token });
      }
    } catch (_error) {
      // Local disconnection must still succeed if the provider already revoked the token.
    }
  }
  await chrome.storage.local.remove("emailAuth");
  await chrome.storage.local.set({ lastEmailError: "" });
  await recordSourceHealth("email", { status: "idle", lastAttempt: Date.now(), error: "", detail: "Sender disconnected" });
  return { connected: false };
}

async function testEmailDelivery() {
  return sendAlertEmail({
    systemTitle: "JLab monitor email test",
    message: "Email notifications are connected and working.",
    url: "https://logbooks.jlab.org/book/hclog"
  }, { force: true });
}

async function sendAlertEmail(alert, options = {}) {
  const { emailConfig, emailAuth } = await chrome.storage.local.get(["emailConfig", "emailAuth"]);
  const config = normalizeEmailConfig(emailConfig);
  if (!config.enabled && !options.force) return { skipped: true };
  if (!config.recipients.length) throw new Error("Add at least one valid receiving address");
  if (!emailAuth || emailAuth.provider !== config.provider) {
    throw new Error("Connect the selected sending account first");
  }

  const subject = sanitizeEmailHeader(`[JLab Alert] ${alert.systemTitle || "Logbook notification"}`);
  const body = buildAlertEmailBody(alert);
  if (config.provider === EMAIL_PROVIDER_MICROSOFT) {
    await sendMicrosoftEmail(config, emailAuth, subject, body);
  } else {
    await sendGmailEmail(config, subject, body);
  }

  const sentAt = Date.now();
  await chrome.storage.local.set({ lastEmailSentAt: sentAt, lastEmailError: "" });
  await recordSourceHealth("email", {
    status: "ok",
    lastAttempt: sentAt,
    lastSuccess: sentAt,
    error: "",
    checked: config.recipients.length,
    detail: `Sent to ${config.recipients.length} recipient${config.recipients.length === 1 ? "" : "s"}`
  });
  return { ok: true, sentAt, recipients: config.recipients.length };
}

async function recordEmailFailure(error) {
  const message = describeEmailError(error);
  await chrome.storage.local.set({ lastEmailError: message, lastEmailAttempt: Date.now() });
  await recordSourceHealth("email", { status: "error", lastAttempt: Date.now(), error: message });
  return message;
}

async function connectGmailEmail() {
  assertGmailOAuthConfigured();
  const token = await getGmailAccessToken(true);
  let accountEmail = "Gmail account";
  try {
    const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (response.ok) {
      const profile = await response.json();
      accountEmail = profile.email || accountEmail;
    }
  } catch (_error) {
    // Sending can still work even if the optional account-label lookup fails.
  }
  return {
    provider: EMAIL_PROVIDER_GMAIL,
    accountEmail,
    connectedAt: Date.now()
  };
}

async function getGmailAccessToken(interactive) {
  assertGmailOAuthConfigured();
  const result = await chrome.identity.getAuthToken({
    interactive,
    enableGranularPermissions: true
  });
  const token = typeof result === "string" ? result : result?.token;
  if (!token) throw new Error(interactive ? "Gmail sign-in did not return an access token" : "Reconnect the Gmail sending account");
  return token;
}

function assertGmailOAuthConfigured() {
  const clientId = chrome.runtime.getManifest().oauth2?.client_id || "";
  if (!clientId || /replace|placeholder/i.test(clientId)) {
    throw new Error("Gmail OAuth is not configured. Add the Google Chrome Extension client ID to manifest.json first");
  }
}

async function sendGmailEmail(config, subject, body) {
  let token = await getGmailAccessToken(false);
  let response = await gmailSendRequest(token, config.recipients, subject, body);
  if (response.status === 401) {
    await chrome.identity.removeCachedAuthToken({ token });
    token = await getGmailAccessToken(false);
    response = await gmailSendRequest(token, config.recipients, subject, body);
  }
  if (!response.ok) throw new Error(await readProviderError(response, "Gmail rejected the message"));
}

function gmailSendRequest(token, recipients, subject, body) {
  const encodedSubject = utf8ToBase64(subject);
  const encodedBody = wrapBase64(utf8ToBase64(body));
  const mime = [
    `To: ${recipients.join(", ")}`,
    `Subject: =?UTF-8?B?${encodedSubject}?=`,
    `Date: ${new Date().toUTCString()}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    encodedBody
  ].join("\r\n");
  return fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ raw: utf8ToBase64Url(mime) })
  });
}

async function connectMicrosoftEmail(config) {
  assertMicrosoftConfig(config);
  const redirectUri = chrome.identity.getRedirectURL("microsoft");
  const { verifier, challenge } = await createPkcePair();
  const state = randomBase64Url(24);
  const authorizeUrl = new URL(`https://login.microsoftonline.com/${encodeURIComponent(config.microsoftTenant)}/oauth2/v2.0/authorize`);
  authorizeUrl.search = new URLSearchParams({
    client_id: config.microsoftClientId,
    response_type: "code",
    redirect_uri: redirectUri,
    response_mode: "query",
    scope: MICROSOFT_SCOPES.join(" "),
    code_challenge: challenge,
    code_challenge_method: "S256",
    state,
    prompt: "select_account"
  }).toString();

  const resultUrl = await chrome.identity.launchWebAuthFlow({ url: authorizeUrl.toString(), interactive: true });
  if (!resultUrl) throw new Error("Microsoft sign-in was canceled");
  const result = new URL(resultUrl);
  if (result.searchParams.get("state") !== state) throw new Error("Microsoft sign-in state check failed");
  const oauthError = result.searchParams.get("error_description") || result.searchParams.get("error");
  if (oauthError) throw new Error(oauthError);
  const code = result.searchParams.get("code");
  if (!code) throw new Error("Microsoft sign-in did not return an authorization code");

  const token = await requestMicrosoftToken(config, {
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    code_verifier: verifier
  });
  const profile = await fetchMicrosoftProfile(token.access_token);
  return {
    provider: EMAIL_PROVIDER_MICROSOFT,
    accountEmail: profile.mail || profile.userPrincipalName || "Microsoft account",
    displayName: profile.displayName || "",
    accessToken: token.access_token,
    refreshToken: token.refresh_token || "",
    expiresAt: Date.now() + Math.max(60, Number(token.expires_in) || 3600) * 1000,
    connectedAt: Date.now()
  };
}

async function sendMicrosoftEmail(config, auth, subject, body) {
  const token = await getMicrosoftAccessToken(config, auth);
  const response = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: {
        subject,
        body: { contentType: "Text", content: body },
        toRecipients: config.recipients.map((address) => ({ emailAddress: { address } }))
      },
      saveToSentItems: true
    })
  });
  if (!response.ok) throw new Error(await readProviderError(response, "Microsoft Graph rejected the message"));
}

async function getMicrosoftAccessToken(config, auth) {
  if (auth.accessToken && Number(auth.expiresAt) > Date.now() + 120000) return auth.accessToken;
  if (!auth.refreshToken) throw new Error("Reconnect the Microsoft sending account");
  const token = await requestMicrosoftToken(config, {
    grant_type: "refresh_token",
    refresh_token: auth.refreshToken,
    redirect_uri: chrome.identity.getRedirectURL("microsoft")
  });
  const updatedAuth = {
    ...auth,
    accessToken: token.access_token,
    refreshToken: token.refresh_token || auth.refreshToken,
    expiresAt: Date.now() + Math.max(60, Number(token.expires_in) || 3600) * 1000
  };
  await chrome.storage.local.set({ emailAuth: updatedAuth });
  return updatedAuth.accessToken;
}

async function requestMicrosoftToken(config, fields) {
  const response = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(config.microsoftTenant)}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.microsoftClientId,
      scope: MICROSOFT_SCOPES.join(" "),
      ...fields
    }).toString()
  });
  if (!response.ok) throw new Error(await readProviderError(response, "Microsoft sign-in failed"));
  return response.json();
}

async function fetchMicrosoftProfile(token) {
  const response = await fetch("https://graph.microsoft.com/v1.0/me?$select=displayName,mail,userPrincipalName", {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) throw new Error(await readProviderError(response, "Could not read the Microsoft account profile"));
  return response.json();
}

function assertMicrosoftConfig(config) {
  if (!/^[0-9a-f-]{20,}$/i.test(config.microsoftClientId)) {
    throw new Error("Enter a valid Microsoft Application (client) ID");
  }
  if (!/^[a-z0-9.-]+$/i.test(config.microsoftTenant)) {
    throw new Error("Enter a valid Microsoft tenant such as common or your tenant ID");
  }
}

function normalizeEmailConfig(value) {
  const config = value && typeof value === "object" ? value : {};
  const rawRecipients = Array.isArray(config.recipients)
    ? config.recipients
    : String(config.recipients || "").split(/[\s,;]+/);
  const seenRecipients = new Set();
  const recipients = rawRecipients
    .map((address) => String(address).trim())
    .filter((address) => {
      const normalized = address.toLocaleLowerCase();
      if (!isValidEmailAddress(address) || seenRecipients.has(normalized)) return false;
      seenRecipients.add(normalized);
      return true;
    });
  return {
    enabled: config.enabled === true,
    provider: config.provider === EMAIL_PROVIDER_MICROSOFT ? EMAIL_PROVIDER_MICROSOFT : EMAIL_PROVIDER_GMAIL,
    recipients,
    microsoftClientId: String(config.microsoftClientId || "").trim(),
    microsoftTenant: String(config.microsoftTenant || "common").trim() || "common"
  };
}

function isValidEmailAddress(value) {
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(String(value || ""));
}

function buildAlertEmailBody(alert) {
  return [
    alert.systemTitle || "JLab logbook notification",
    "",
    `Priority: ${alertPriorityLabel(alert.priority)}`,
    alert.message || "A monitored JLab logbook changed.",
    alert.url ? "" : null,
    alert.url ? `Open: ${alert.url}` : null,
    "",
    `Sent by JLab Logbook Comment Monitor at ${new Date().toLocaleString()}.`
  ].filter((line) => line !== null).join("\n");
}

function sanitizeEmailHeader(value) {
  return String(value || "").replace(/[\r\n]+/g, " ").trim().slice(0, 240);
}

function publicEmailAuth(auth) {
  return {
    connected: true,
    provider: auth.provider,
    accountEmail: auth.accountEmail || "Connected account",
    displayName: auth.displayName || "",
    connectedAt: auth.connectedAt
  };
}

function describeEmailError(error) {
  return actionableErrorMessage(error || "Email delivery failed", "email").slice(0, 500);
}

async function readProviderError(response, fallback) {
  try {
    const data = await response.json();
    return data?.error?.message || data?.error_description || data?.error || `${fallback} (${response.status})`;
  } catch (_error) {
    return `${fallback} (${response.status})`;
  }
}

async function createPkcePair() {
  const verifier = randomBase64Url(64);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return { verifier, challenge: bytesToBase64Url(new Uint8Array(digest)) };
}

function randomBase64Url(length) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

function utf8ToBase64(value) {
  return bytesToBase64(new TextEncoder().encode(String(value)));
}

function utf8ToBase64Url(value) {
  return bytesToBase64Url(new TextEncoder().encode(String(value)));
}

function bytesToBase64(bytes) {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 8192) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 8192));
  }
  return btoa(binary);
}

function bytesToBase64Url(bytes) {
  return bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function wrapBase64(value) {
  return String(value).replace(/.{1,76}/g, "$&\r\n").trim();
}
