import {
  CUSTOMER_LAST_ORDER_KEY,
  STATUS_LABELS,
  createButton,
  formatCurrency,
  formatDateTime,
  setText,
  startClock,
} from "./shared/common.js";
import { getSupabaseClient } from "./shared/supabase-browser.js";

const state = {
  supabase: null,
  session: null,
  menuItems: [],
  cart: [],
  selectedCategory: "all",
  search: "",
  lastOrder: null,
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
  customerGate: document.getElementById("customerGate"),
  customerContent: document.getElementById("customerContent"),
  menuSearchInput: document.getElementById("menuSearchInput"),
  categoryFilter: document.getElementById("categoryFilter"),
  customerMenuList: document.getElementById("customerMenuList"),
  orderForm: document.getElementById("orderForm"),
  customerNameInput: document.getElementById("customerNameInput"),
  customerPhoneInput: document.getElementById("customerPhoneInput"),
  customerAddressInput: document.getElementById("customerAddressInput"),
  customerNoteInput: document.getElementById("customerNoteInput"),
  clearCartButton: document.getElementById("clearCartButton"),
  cartItems: document.getElementById("cartItems"),
  cartTotalPrice: document.getElementById("cartTotalPrice"),
  refreshCustomerOrderButton: document.getElementById("refreshCustomerOrderButton"),
  customerOrderStatus: document.getElementById("customerOrderStatus"),
  customerOrderCode: document.getElementById("customerOrderCode"),
  customerOrderState: document.getElementById("customerOrderState"),
  customerOrderCreatedAt: document.getElementById("customerOrderCreatedAt"),
};

initialize().catch((error) => {
  console.error(error);
  setStatus(`初始化失敗：${error.message || "資料庫連線異常，請稍後再試。"}`);
});

async function initialize() {
  startClock(el.heroTimestamp);
  bindEvents();
  state.supabase = await getSupabaseClient();

  const sessionResult = await state.supabase.auth.getSession();
  state.session = sessionResult.data.session;
  state.lastOrder = loadLastOrder();

  state.supabase.auth.onAuthStateChange((_event, session) => {
    state.session = session;
    renderSession();
  });

  await loadMenuItems();
  renderSession();
  renderFilters();
  renderMenu();
  renderCart();
  await refreshOrderStatus(false);
  setStatus("系統正常運行中");
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
      setStatus(`登出失敗：${error.message}`);
      return;
    }

    state.cart = [];
    renderCart();
    setStatus("已登出顧客帳號。");
  });

  el.menuSearchInput.addEventListener("input", (event) => {
    state.search = event.target.value.trim().toLowerCase();
    renderMenu();
  });

  el.orderForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await submitOrder();
  });

  el.clearCartButton.addEventListener("click", () => {
    state.cart = [];
    renderCart();
    setStatus("購物車已清空。");
  });

  el.refreshCustomerOrderButton.addEventListener("click", async () => {
    await refreshOrderStatus(true);
  });
}

function toggleAuthMode(mode) {
  const showLogin = mode === "login";
  el.customerLoginForm.classList.toggle("hidden", !showLogin);
  el.customerSignupForm.classList.toggle("hidden", showLogin);
  el.showCustomerLoginButton.classList.toggle("is-active", showLogin);
  el.showCustomerSignupButton.classList.toggle("is-active", !showLogin);
}

async function signInCustomer() {
  const { error } = await state.supabase.auth.signInWithPassword({
    email: el.customerLoginEmail.value.trim(),
    password: el.customerLoginPassword.value,
  });

  if (error) {
    setStatus(`登入失敗：${error.message}`);
    return;
  }

  setStatus("登入成功，現在可以開始點餐。");
}

async function signUpCustomer() {
  const password = el.customerSignupPassword.value;
  const confirmPassword = el.customerSignupPasswordConfirm.value;

  if (password !== confirmPassword) {
    setStatus("兩次輸入的密碼不一致。");
    return;
  }

  const { error } = await state.supabase.auth.signUp({
    email: el.customerSignupEmail.value.trim(),
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/index.html`,
      data: {
        full_name: el.customerSignupName.value.trim(),
        phone: el.customerSignupPhone.value.trim(),
      },
    },
  });

  if (error) {
    setStatus(`註冊失敗：${error.message}`);
    return;
  }

  el.customerSignupForm.reset();
  toggleAuthMode("login");
  setStatus("顧客帳號建立成功，請使用新帳號登入。");
}

async function loadMenuItems() {
  const { data, error } = await state.supabase
    .from("menu_items")
    .select("*")
    .eq("available", true)
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  state.menuItems = Array.isArray(data) ? data : [];
}

function renderSession() {
  const loggedIn = Boolean(state.session?.user);
  el.customerSessionBox.classList.toggle("hidden", !loggedIn);
  el.customerGate.classList.toggle("hidden", loggedIn);
  el.customerContent.classList.toggle("hidden", !loggedIn);

  if (loggedIn) {
    const label = state.session.user.user_metadata?.full_name || state.session.user.email;
    setText(el.customerSessionText, `${label}`);
    if (!el.customerNameInput.value) {
      el.customerNameInput.value = state.session.user.user_metadata?.full_name || "";
    }
    if (!el.customerPhoneInput.value) {
      el.customerPhoneInput.value = state.session.user.user_metadata?.phone || "";
    }
  } else {
    setText(el.customerSessionText, "--");
  }
}

function renderFilters() {
  const categories = ["all", ...new Set(state.menuItems.map((item) => item.category))];
  el.categoryFilter.innerHTML = "";

  categories.forEach((category) => {
    const label = category === "all" ? "全部分類" : category;
    const button = createButton(label, `pill${state.selectedCategory === category ? " is-active" : ""}`, () => {
      state.selectedCategory = category;
      renderFilters();
      renderMenu();
    });
    el.categoryFilter.appendChild(button);
  });
}

function renderMenu() {
  const filteredItems = state.menuItems.filter((item) => {
    const matchesCategory = state.selectedCategory === "all" || item.category === state.selectedCategory;
    const haystack = `${item.name} ${item.description || ""} ${item.category}`.toLowerCase();
    const matchesSearch = !state.search || haystack.includes(state.search);
    return matchesCategory && matchesSearch;
  });

  el.customerMenuList.innerHTML = "";

  if (filteredItems.length === 0) {
    el.customerMenuList.innerHTML = `<div class="empty-state">目前沒有符合條件的餐點。</div>`;
    return;
  }

  filteredItems.forEach((item) => {
    const card = document.createElement("article");
    card.className = "menu-card";
    card.innerHTML = `
      <div class="order-header">
        <div>
          <p class="eyebrow">${item.category}</p>
          <h3>${item.name}</h3>
        </div>
        <span class="menu-price">${formatCurrency(item.price)}</span>
      </div>
      <p class="menu-meta">${item.description || "暫無描述"}</p>
    `;

    const addButton = createButton("加入購物車", "button primary", () => {
      addToCart(item);
    });

    card.appendChild(addButton);
    el.customerMenuList.appendChild(card);
  });
}

function addToCart(item) {
  const existingItem = state.cart.find((entry) => entry.menuItemId === item.id);

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    state.cart.push({
      menuItemId: item.id,
      name: item.name,
      price: Number(item.price),
      quantity: 1,
    });
  }

  renderCart();
  setStatus(`${item.name} 已加入購物車。`);
}

function renderCart() {
  el.cartItems.innerHTML = "";

  if (state.cart.length === 0) {
    el.cartItems.innerHTML = `<div class="empty-state">購物車目前是空的。</div>`;
    setText(el.cartTotalPrice, "NT$ 0");
    return;
  }

  state.cart.forEach((item) => {
    const row = document.createElement("div");
    row.className = "cart-row";
    row.innerHTML = `
      <div>
        <strong>${item.name}</strong>
        <div class="menu-meta">x ${item.quantity}</div>
      </div>
      <div class="button-row">
        <button class="button ghost" type="button">-</button>
        <span>${formatCurrency(item.price * item.quantity)}</span>
        <button class="button ghost" type="button">+</button>
      </div>
    `;

    const [minusButton, plusButton] = row.querySelectorAll("button");
    minusButton.addEventListener("click", () => updateQuantity(item.menuItemId, -1));
    plusButton.addEventListener("click", () => updateQuantity(item.menuItemId, 1));
    el.cartItems.appendChild(row);
  });

  const total = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  setText(el.cartTotalPrice, formatCurrency(total));
}

function updateQuantity(menuItemId, delta) {
  const item = state.cart.find((entry) => entry.menuItemId === menuItemId);
  if (!item) {
    return;
  }

  item.quantity += delta;
  state.cart = state.cart.filter((entry) => entry.quantity > 0);
  renderCart();
}

async function submitOrder() {
  if (!state.session?.user) {
    setStatus("請先登入顧客帳號。");
    return;
  }

  if (state.cart.length === 0) {
    setStatus("請先加入至少一個餐點。");
    return;
  }

  const payload = {
    customerName: el.customerNameInput.value.trim(),
    phone: el.customerPhoneInput.value.trim(),
    address: el.customerAddressInput.value.trim(),
    note: el.customerNoteInput.value.trim(),
    items: state.cart.map((item) => ({
      menuItemId: item.menuItemId,
      quantity: item.quantity,
    })),
  };

  const response = await fetch("/api/create-order", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json();
  if (!response.ok) {
    setStatus(result.error || "建立訂單失敗。");
    return;
  }

  state.lastOrder = {
    orderCode: result.orderCode,
    phone: payload.phone,
  };
  localStorage.setItem(CUSTOMER_LAST_ORDER_KEY, JSON.stringify(state.lastOrder));
  state.cart = [];
  renderCart();
  await refreshOrderStatus(false);
  setStatus("點餐成功！");
}

function loadLastOrder() {
  try {
    const raw = localStorage.getItem(CUSTOMER_LAST_ORDER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_error) {
    return null;
  }
}

async function refreshOrderStatus(showFeedback = true) {
  if (!state.lastOrder?.orderCode || !state.lastOrder?.phone) {
    el.customerOrderStatus.classList.add("hidden");
    if (showFeedback) {
      setStatus("目前還沒有可追蹤的訂單。");
    }
    return;
  }

  const query = new URLSearchParams({
    orderCode: state.lastOrder.orderCode,
    phone: state.lastOrder.phone,
  });

  const response = await fetch(`/api/order-status?${query.toString()}`);
  const result = await response.json();

  if (!response.ok) {
    setStatus(result.error || "更新訂單狀態失敗。");
    return;
  }

  const order = result.order;
  el.customerOrderStatus.classList.remove("hidden");
  setText(el.customerOrderCode, order.order_code);
  setText(el.customerOrderState, STATUS_LABELS[order.status] || order.status);
  setText(el.customerOrderCreatedAt, formatDateTime(order.created_at));

  if (showFeedback) {
    setStatus(`最新狀態：${STATUS_LABELS[order.status] || order.status}`);
  }
}

function setStatus(message) {
  setText(el.statusText, message);
}
