import { getRole, loadSessionAndProfile, setText, startClock } from "./shared/common.js";
import { getSupabaseClient } from "./shared/supabase-browser.js";

const el = {
  heroTimestamp: document.getElementById("heroTimestamp"),
  form: document.getElementById("backofficeLoginForm"),
  email: document.getElementById("loginEmail"),
  password: document.getElementById("loginPassword"),
  status: document.getElementById("loginStatusText"),
};

initialize().catch((error) => {
  console.error(error);
  setText(el.status, `初始化失敗：${error.message || "資料庫連線異常，請稍後再試。"}`);
});

async function initialize() {
  startClock(el.heroTimestamp);
  const supabase = await getSupabaseClient();

  const authState = await loadSessionAndProfile(supabase);
  redirectIfNeeded(authState.profile);

  el.form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const { error } = await supabase.auth.signInWithPassword({
      email: el.email.value.trim(),
      password: el.password.value,
    });

    if (error) {
      setText(el.status, `登入失敗：${error.message}`);
      return;
    }

    const latestAuthState = await loadSessionAndProfile(supabase);
    redirectIfNeeded(latestAuthState.profile);
  });

  setText(el.status, "請輸入後台帳號密碼。");
}

function redirectIfNeeded(profile) {
  const role = getRole(profile);

  if (role === "admin") {
    window.location.href = "/admin-dashboard.html";
  } else if (role === "staff") {
    window.location.href = "/staff-dashboard.html";
  }
}
