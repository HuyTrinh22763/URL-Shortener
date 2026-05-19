const HISTORY_KEY = "urlShortenerHistory";
const HISTORY_LIMIT = 8;

const apiBaseInput = document.getElementById("api-base");
const tabs = document.querySelectorAll(".tab");
const panelCreate = document.getElementById("panel-create");
const panelRedirect = document.getElementById("panel-redirect");
const createForm = document.getElementById("create-form");
const redirectForm = document.getElementById("redirect-form");
const createMessage = document.getElementById("create-message");
const responseSection = document.getElementById("response");
const responseStatus = document.getElementById("response-status");
const responseTime = document.getElementById("response-time");
const responseCache = document.getElementById("response-cache");
const responseHeaders = document.getElementById("response-headers");
const responseBody = document.getElementById("response-body");
const resultSection = document.getElementById("result");
const originalUrlEl = document.getElementById("original-url");
const shortUrlEl = document.getElementById("short-url");
const copyBtn = document.getElementById("copy-btn");
const historyList = document.getElementById("history-list");
const clearHistoryBtn = document.getElementById("clear-history");

function defaultApiBase() {
  if (window.location.pathname.startsWith("/playground")) {
    return window.location.origin;
  }
  return "http://localhost:6001";
}

apiBaseInput.value = defaultApiBase();

function getApiBase() {
  return apiBaseInput.value.trim().replace(/\/$/, "") || defaultApiBase();
}

function headersToObject(res) {
  const out = {};
  res.headers.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

async function sendRequest(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let body = text;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  } else {
    body = null;
  }
  return {
    status: res.status,
    headers: headersToObject(res),
    body,
    serverMs: res.headers.get("X-Resolve-Time-Ms"),
    cacheStatus: res.headers.get("X-Cache-Status"),
  };
}

function formatBody(body) {
  if (body === null || body === "") {
    return "(empty)";
  }
  if (typeof body === "object") {
    return JSON.stringify(body, null, 2);
  }
  return String(body);
}

function renderResponse(result) {
  responseSection.classList.remove("hidden");
  responseStatus.textContent = `Status ${result.status}`;
  responseTime.textContent = result.serverMs
    ? `Time: ${result.serverMs} ms (server)`
    : "Time: —";
  responseCache.textContent = result.cacheStatus
    ? `Cache: ${result.cacheStatus}`
    : "Cache: —";
  responseHeaders.textContent = JSON.stringify(result.headers, null, 2);
  responseBody.textContent = formatBody(result.body);
}

function parseShortCode(input) {
  const trimmed = input.trim();
  if (!trimmed) {
    return "";
  }
  try {
    const u = new URL(trimmed);
    const parts = u.pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] || trimmed;
  } catch {
    return trimmed.replace(/^\/+/, "");
  }
}

function displayShortUrl(data) {
  if (data?.shortUrl) {
    return data.shortUrl;
  }
  if (data?.shortCode) {
    return `${getApiBase()}/${data.shortCode}`;
  }
  return "";
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistory(items) {
  localStorage.setItem(
    HISTORY_KEY,
    JSON.stringify(items.slice(0, HISTORY_LIMIT)),
  );
}

function renderHistory() {
  const history = loadHistory();
  historyList.innerHTML = "";

  if (history.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "empty-state";
    emptyItem.textContent = "Chưa có URL nào được tạo.";
    historyList.appendChild(emptyItem);
    return;
  }

  history.forEach((item) => {
    const li = document.createElement("li");

    const original = document.createElement("span");
    original.textContent = item.original;

    const short = document.createElement("span");
    short.className = "short";
    short.textContent = item.short;

    li.appendChild(original);
    li.appendChild(short);
    historyList.appendChild(li);
  });
}

function prependHistory(entry) {
  const history = loadHistory();
  history.unshift(entry);
  saveHistory(history);
  renderHistory();
}

function isValidUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function showResult(longUrl, fullShort) {
  originalUrlEl.textContent = longUrl;
  shortUrlEl.textContent = fullShort;
  resultSection.classList.remove("hidden");
}

// Phục vục cho 2 nút Create và Redirect để chuyển mode trên FE
tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    const name = tab.dataset.tab;
    panelCreate.classList.toggle("hidden", name !== "create");
    panelRedirect.classList.toggle("hidden", name !== "redirect");
  });
});

createForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const longUrl = document.getElementById("long-url").value.trim();
  if (!isValidUrl(longUrl)) {
    createMessage.textContent = "Invalid URL";
    return;
  }
  createMessage.textContent = "";
  try {
    const result = await sendRequest(`${getApiBase()}/api/v1/data/shorten`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ longURL: longUrl }),
    });
    renderResponse(result);

    if (
      (result.status === 201 || result.status === 200) &&
      result.body?.success &&
      result.body.data?.shortCode
    ) {
      const fullShort = displayShortUrl(result.body.data);
      showResult(result.body.data.longURL || longUrl, fullShort);
      prependHistory({
        original: result.body.data.longURL || longUrl,
        short: fullShort,
        shortCode: result.body.data.shortCode,
      });
      createMessage.textContent =
        result.status === 201 ? "Created" : "Already exists";
    } else if (result.body?.error?.message) {
      createMessage.textContent = result.body.error.message;
    }
  } catch (err) {
    createMessage.textContent = "Request failed";
    console.error(err);
  }
});

redirectForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const shortCode = parseShortCode(document.getElementById("short-code").value);
  if (!shortCode) {
    return;
  }
  try {
    const result = await sendRequest(
      `${getApiBase()}/api/v1/data/shorten/${encodeURIComponent(shortCode)}`,
      { method: "GET" },
    );
    renderResponse(result);
    if (result.status === 200 && result.body?.data?.longURL) {
      // Khi click Send thì jump sang tab khác với longURL, thể hiện thông số ở giao diện
      window.open(result.body.data.longURL, "_blank", "noopener,noreferrer");
    }
  } catch (err) {
    console.error(err);
  }
});

copyBtn.addEventListener("click", async () => {
  const text = shortUrlEl.textContent.trim();
  if (text) {
    // Clipboard API giúp ghi chép clipboard/text hệ thống
    // API này trả ra một Promise
    await navigator.clipboard.writeText(text).catch(() => {});
  }
});

clearHistoryBtn.addEventListener("click", () => {
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
});

renderHistory();
