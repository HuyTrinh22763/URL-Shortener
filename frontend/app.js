const API_BASE = "http://localhost:6001";

const HISTORY_KEY = "urlShortenerHistory";
const HISTORY_LIMIT = 8;

const form = document.getElementById("shorten-form");
const longUrlInput = document.getElementById("long-url");
const submitBtn = form.querySelector('button[type="submit"]');
const messageEl = document.getElementById("form-message");
const resultSection = document.getElementById("result");
const originalUrlEl = document.getElementById("original-url");
const shortUrlEl = document.getElementById("short-url");
const copyBtn = document.getElementById("copy-btn");
const historyList = document.getElementById("history-list");
const clearHistoryBtn = document.getElementById("clear-history");

const submitLabelDefault = submitBtn.textContent;

function displayShortUrl(data) {
  if (data?.shortUrl) {
    return data.shortUrl;
  }
  if (data?.shortCode) {
    return `${API_BASE.replace(/\/$/, "")}/${data.shortCode}`;
  }
  return "";
}

async function shortenUrl(longURL) {
  const res = await fetch(`${API_BASE}/api/v1/data/shorten`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ longURL }),
  });
  const body = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, body };
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

function prependHistoryEntry(entry) {
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
  shortUrlEl.title = fullShort;
  resultSection.classList.remove("hidden");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const longUrl = longUrlInput.value.trim();

  if (!isValidUrl(longUrl)) {
    messageEl.textContent =
      "URL không hợp lệ. Hãy nhập URL bắt đầu bằng http:// hoặc https://";
    messageEl.classList.remove("success");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Đang rút gọn…";
  messageEl.textContent = "";
  messageEl.classList.remove("success");

  try {
    const { ok, status, body } = await shortenUrl(longUrl);

    if (status === 201 && body?.success && body.data?.shortCode) {
      const { shortCode, longURL, createdAt } = body.data;
      const displayLong = longURL || longUrl;
      const fullShort = displayShortUrl(body.data);
      showResult(displayLong, fullShort);
      prependHistoryEntry({
        original: displayLong,
        short: fullShort,
        shortCode,
        createdAt: createdAt || new Date().toISOString(),
      });
      messageEl.textContent = "Đã tạo short URL mới.";
      messageEl.classList.add("success");
      return;
    }

    if (status === 200 && body?.success && body.data?.shortCode) {
      const { shortCode, createdAt } = body.data;
      const fullShort = displayShortUrl(body.data);
      showResult(longUrl, fullShort);
      prependHistoryEntry({
        original: longUrl,
        short: fullShort,
        shortCode,
        createdAt: createdAt || new Date().toISOString(),
      });
      messageEl.textContent = "URL này đã được rút gọn trước đó.";
      messageEl.classList.add("success");
      return;
    }

    if (status === 400 && body?.error?.message) {
      messageEl.textContent = body.error.message;
      messageEl.classList.remove("success");
      return;
    }

    if (!ok) {
      const serverMsg = body?.error?.message;
      messageEl.textContent =
        serverMsg || "Không thể rút gọn URL. Vui lòng thử lại sau.";
      messageEl.classList.remove("success");
      console.error("Shorten failed:", status, body);
      return;
    }

    messageEl.textContent = "Phản hồi không hợp lệ từ server.";
    messageEl.classList.remove("success");
    console.error("Unexpected response:", status, body);
  } catch (err) {
    messageEl.textContent =
      "Không kết nối được backend. Kiểm tra server đang chạy và API_BASE.";
    messageEl.classList.remove("success");
    console.error(err);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = submitLabelDefault;
  }
});

copyBtn.addEventListener("click", async () => {
  const text = shortUrlEl.textContent.trim();
  if (!text) {
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    messageEl.textContent = "Đã copy short URL vào clipboard.";
    messageEl.classList.add("success");
  } catch {
    messageEl.textContent = "Không thể copy tự động. Bạn hãy copy thủ công.";
    messageEl.classList.remove("success");
  }
});

clearHistoryBtn.addEventListener("click", () => {
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
});

renderHistory();
