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
  setText(el.statusText, `資料庫連線異常，請稍後再試。${error.message ? ` (${error.message})` : ""}`);
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

  setText(el.statusText, "系統正常運行中，請先登入或註冊後開始點餐。");
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
    setText(el.statusText, "已登出，目前可重新登入或註冊。");
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
  }, 500);
}

async function signInCustomer() {
  const email = el.customerLoginEmail.value.trim();
  const password = el.customerLoginPassword.value;

  const { error } = await state.supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    setText(el.statusText, `登入失敗：${error.message}`);
    return;
  }

  setText(el.statusText, "登入成功，正在前往點餐系統...");
  window.location.href = "/customer-order.html";
}

async function signUpCustomer() {
  const email = el.customerSignupEmail.value.trim();
  const password = el.customerSignupPassword.value;
  const confirmPassword = el.customerSignupPasswordConfirm.value;

  if (password !== confirmPassword) {
    setText(el.statusText, "兩次輸入的密碼不一致。");
    return;
  }

  const fullName = el.customerSignupName.value.trim();
  const phone = el.customerSignupPhone.value.trim();

  const { error } = await state.supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone,
      },
    },
  });

  if (error) {
    setText(el.statusText, `註冊失敗：${error.message}`);
    return;
  }

  const signInResult = await state.supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInResult.error) {
    setText(el.statusText, `註冊成功，但自動登入失敗：${signInResult.error.message}`);
    toggleAuthMode("login");
    el.customerLoginEmail.value = email;
    return;
  }

  el.customerSignupForm.reset();
  setText(el.statusText, "註冊成功，正在登入並前往點餐系統...");
  window.location.href = "/customer-order.html";
}
