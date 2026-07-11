const COPY = {
  login: {
    heading: "Đăng nhập",
    blurb: "Tiếp tục với Google để vào phiên làm việc hiện có.",
    button: "Tiếp tục với Google",
  },
  register: {
    heading: "Đăng ký",
    blurb:
      "Tạo tài khoản mới bằng Google. Nếu email đã từng đăng nhập, bạn sẽ vào đúng tài khoản đó.",
    button: "Đăng ký với Google",
  },
};

const authPanel = document.getElementById("auth-panel");
const sessionPanel = document.getElementById("session-panel");
const authHeading = document.getElementById("auth-heading");
const authBlurb = document.getElementById("auth-blurb");
const googleBtnLabel = document.getElementById("google-btn-label");
const authHint = document.getElementById("auth-hint");
const tabs = document.querySelectorAll(".section-auth .inner-link.tab");
const logoutBtn = document.getElementById("logout-btn");
const userName = document.getElementById("user-name");
const userEmail = document.getElementById("user-email");
const userAvatar = document.getElementById("user-avatar");

function setMode(mode) {
  const copy = COPY[mode] || COPY.login;
  authHeading.textContent = copy.heading;
  authBlurb.textContent = copy.blurb;
  googleBtnLabel.textContent = copy.button;
  tabs.forEach((tab) => {
    const active = tab.dataset.mode === mode;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", active ? "true" : "false");
  });
}

function showHint(message, isError) {
  if (!message) {
    authHint.hidden = true;
    authHint.textContent = "";
    authHint.classList.remove("is-error");
    return;
  }
  authHint.hidden = false;
  authHint.textContent = message;
  authHint.classList.toggle("is-error", Boolean(isError));
}

function renderLoggedOut() {
  authPanel.hidden = false;
  sessionPanel.hidden = true;
}

function renderLoggedIn(user) {
  authPanel.hidden = true;
  sessionPanel.hidden = false;
  userName.textContent = user.displayName || "Người dùng";
  userEmail.textContent = user.email || "";
  if (user.avatarUrl) {
    userAvatar.hidden = false;
    userAvatar.src = user.avatarUrl;
    userAvatar.alt = user.displayName || "Avatar";
  } else {
    userAvatar.hidden = true;
    userAvatar.removeAttribute("src");
  }
}

async function fetchMe() {
  const res = await fetch("/api/v1/auth/me", {
    method: "GET",
    credentials: "same-origin",
  });
  if (res.status === 401) {
    return null;
  }
  if (!res.ok) {
    throw new Error("Không lấy được thông tin phiên.");
  }
  const payload = await res.json();
  return payload?.data ?? null;
}

async function logout() {
  const res = await fetch("/logout", {
    method: "POST",
    credentials: "same-origin",
  });
  if (!res.ok) {
    throw new Error("Đăng xuất thất bại.");
  }
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => setMode(tab.dataset.mode));
});

logoutBtn.addEventListener("click", async () => {
  try {
    await logout();
    renderLoggedOut();
    showHint("Đã đăng xuất.");
  } catch (err) {
    showHint(err.message || "Đăng xuất thất bại.", true);
  }
});

async function boot() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("error")) {
    showHint("Đăng nhập Google thất bại. Thử lại.", true);
  }

  setMode("login");

  try {
    const user = await fetchMe();
    if (user) {
      renderLoggedIn(user);
      if (params.get("error")) {
        showHint("");
      }
    } else {
      renderLoggedOut();
    }
  } catch (err) {
    renderLoggedOut();
    showHint(err.message || "Không kiểm tra được phiên đăng nhập.", true);
  }
}

boot();
