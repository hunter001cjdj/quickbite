import { setText, startClock } from "./shared/common.js";
import { getSupabaseClient } from "./shared/supabase-browser.js";

const state = {
  supabase: null,
  session: null,
};

const el = {
  heroTimestamp: document.getElementById("heroTimestamp"),
  statusText: document.getElementById("statusText"),
  showCustomerLoginButton: document.getElementById("showCustomerLoginButton"),
  showCustomerSignupButton: document.getElementById("showCustomerSignupButton"),
  customerLoginForm: document.getElementById("customerLoginForm"),
  customerSignupForm: document.getElementById("customerSignupForm"),
  customerLoginEmail: document.getElementById("customerLoginEmail"),
  customerLoginPassword: document.getElementById("customerLoginPassword"),
  customerSignupName: document.getElementById("customerSignupName"),
  customerSignupPhone: document.getElementById("customerSignupPhone"),
  customerSignupEmail: document.getElementById("customerSignupEmail"),
  customerSignupPassword: document.getElementById("customerSignupPassword"),
  customerSignupPasswordConfirm: document.getElementById("customerSignupPasswordConfirm"),
  customerSessionBox: document.getElementById("customerSessionBox"),
  customerSessionText: document.getElementById("customerSessionText"),
  customerSignOutButton: document.getElementById("customerSignOutButton"),
};

initialize().catch((error) => {
  console.error(error);
  setText(el.statusText, `初始化失敗：${error.message || "資料庫連線異常，請稍後再試。"}`);
});

async function initialize() {
  startClock(el.heroTimestamp);
  bindEvents();
  state.supabase = await getSupabaseClient();

  const sessionResult = await state.supabase.auth.getSession();
  state.session = sessionResult.data.session;
  renderSession();

  state.supabase.auth.onAuthStateChange((_event, session) => {
    state.session = session;
    renderSession();
  });

  setText(el.statusText, "系統正常運行中");
}

function bindEvents() {
  el.showCustomerLoginButton.addEventListener("click", () => toggleAuthMode("login"));
  el.showCustomerSignupButton.addEventListener("click", () => toggleAuthMode("signup"));

  el.customerLoginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await signInCustomer();
  });

  el.customerSignupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await signUpCustomer();
  });

  el.customerSignOutButton.addEventListener("click", async () => {
    const { error } = await state.supabase.auth.signOut();
    if (error) {
      setText(el.statusText, `登出失敗：${error.message}`);
      return;
    }

    renderSession();
    setText(el.statusText, "已登出顧客帳號。");
  });
}

function toggleAuthMode(mode) {
  const showLogin = mode === "login";
  el.customerLoginForm.classList.toggle("hidden", !showLogin);
  el.customerSignupForm.classList.toggle("hidden", showLogin);
  el.showCustomerLoginButton.classList.toggle("is-active", showLogin);
  el.showCustomerSignupButton.classList.toggle("is-active", !showLogin);
}

function renderSession() {
  const loggedIn = Boolean(state.session?.user);
  el.customerSessionBox.classList.toggle("hidden", !loggedIn);

  if (!loggedIn) {
    setText(el.customerSessionText, "--");
    return;
  }

  const label = state.session.user.user_metadata?.full_name || state.session.user.email;
  setText(el.customerSessionText, label);
  window.setTimeout(() => {
    window.location.href = "/customer-order.html";
  }, 600);
}

async function signInCustomer() {
  const { error } = await state.supabase.auth.signInWithPassword({
    email: el.customerLoginEmail.value.trim(),
    password: el.customerLoginPassword.value,
  });

  if (error) {
    setText(el.statusText, `登入失敗：${error.message}`);
    return;
  }

  setText(el.statusText, "登入成功，正在前往點餐系統...");
  window.location.href = "/customer-order.html";
}

async function signUpCustomer() {
  const password = el.customerSignupPassword.value;
  const confirmPassword = el.customerSignupPasswordConfirm.value;

  if (password !== confirmPassword) {
    setText(el.statusText, "兩次輸入的密碼不一致。");
    return;
  }

  const { error } = await state.supabase.auth.signUp({
    email: el.customerSignupEmail.value.trim(),
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth-confirm.html`,
      data: {
        full_name: el.customerSignupName.value.trim(),
        phone: el.customerSignupPhone.value.trim(),
      },
    },
  });

  if (error) {
    setText(el.statusText, `註冊失敗：${error.message}`);
    return;
  }

  el.customerSignupForm.reset();
  toggleAuthMode("login");
  setText(el.statusText, "顧客帳號建立成功，請先完成信箱驗證。");
}
