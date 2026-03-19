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
  customerOrders: [],
  cart: [],
  selectedCategory: "all",
  search: "",
  lastOrder: null,
};

const el = {
  heroTimestamp: document.getElementById("heroTimestamp"),
  statusText: document.getElementById("statusText"),
  customerSessionText: document.getElementById("customerSessionText"),
  customerSignOutButton: document.getElementById("customerSignOutButton"),
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
  customerOrderList: document.getElementById("customerOrderList"),
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
  state.lastOrder = loadLastOrder();

  if (!state.session?.user) {
    window.location.href = "/index.html";
    return;
  }

  state.supabase.auth.onAuthStateChange((event, session) => {
    state.session = session;

    if (event === "SIGNED_OUT" || !session?.user) {
      window.location.href = "/index.html";
    }
  });

  const label = state.session.user.user_metadata?.full_name || state.session.user.email;
  setText(el.customerSessionText, label);
  if (!el.customerNameInput.value) {
    el.customerNameInput.value = state.session.user.user_metadata?.full_name || "";
  }
  if (!el.customerPhoneInput.value) {
    el.customerPhoneInput.value = state.session.user.user_metadata?.phone || "";
  }

  await loadMenuItems();
  await loadCustomerOrders();
  renderFilters();
  renderMenu();
  renderCart();
  renderCustomerOrders();
  await refreshOrderStatus(false);
  setText(el.statusText, "系統正常運行中");
}

function bindEvents() {
  el.customerSignOutButton.addEventListener("click", async () => {
    const { error } = await state.supabase.auth.signOut();
    if (error) {
      setText(el.statusText, `登出失敗：${error.message}`);
      return;
    }

    window.location.href = "/index.html";
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
    setText(el.statusText, "購物車已清空。");
  });

  el.refreshCustomerOrderButton.addEventListener("click", async () => {
    await refreshOrderStatus(true);
    await loadCustomerOrders();
    renderCustomerOrders();
  });
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

async function loadCustomerOrders() {
  const { data, error } = await state.supabase
    .from("orders")
    .select(`
      id,
      order_code,
      status,
      total,
      created_at,
      note,
      address,
      phone,
      customer_name,
      order_items (
        id,
        item_name,
        quantity,
        subtotal
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  state.customerOrders = Array.isArray(data) ? data : [];
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
  setText(el.statusText, `${item.name} 已加入購物車。`);
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
  if (state.cart.length === 0) {
    setText(el.statusText, "請先加入至少一個餐點。");
    return;
  }

  const payload = {
    customerId: state.session.user.id,
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
    setText(el.statusText, result.error || "建立訂單失敗。");
    return;
  }

  state.lastOrder = {
    orderCode: result.orderCode,
    phone: payload.phone,
  };
  localStorage.setItem(CUSTOMER_LAST_ORDER_KEY, JSON.stringify(state.lastOrder));
  state.cart = [];
  renderCart();
  await loadCustomerOrders();
  renderCustomerOrders();
  await refreshOrderStatus(false);
  setText(el.statusText, "點餐成功！");
}

function renderCustomerOrders() {
  el.customerOrderList.innerHTML = "";

  if (state.customerOrders.length === 0) {
    el.customerOrderList.innerHTML = `<div class="empty-state">你的歷史訂單會顯示在這裡。</div>`;
    return;
  }

  state.customerOrders.forEach((order) => {
    const card = document.createElement("article");
    card.className = "order-card";
    card.innerHTML = `
      <div class="order-header">
        <div>
          <p class="eyebrow">${STATUS_LABELS[order.status] || order.status}</p>
          <h3>${order.order_code}</h3>
        </div>
        <span class="order-total">${formatCurrency(order.total)}</span>
      </div>
      <div class="order-meta">
        <span>建立時間：${formatDateTime(order.created_at)}</span>
        <span>電話：${order.phone}</span>
        <span>地址：${order.address}</span>
        <span>備註：${order.note || "無"}</span>
      </div>
      <div class="order-items-box">${(order.order_items || []).map((item) => `${item.item_name} x ${item.quantity} = ${formatCurrency(item.subtotal)}`).join("<br>")}</div>
    `;
    el.customerOrderList.appendChild(card);
  });
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
      setText(el.statusText, "目前還沒有可追蹤的訂單。");
    }
    return;
  }

  const query = new URLSearchParams({
    orderCode: state.lastOrder.orderCode,
    phone: state.lastOrder.phone,
  });

  const response = await fetch(`/api/order-status?${query.toString()}`);
  const result = await response.json();

  if (response.status === 404) {
    el.customerOrderStatus.classList.remove("hidden");
    setText(el.customerOrderCode, state.lastOrder.orderCode);
    setText(el.customerOrderState, "訂單已被取消");
    setText(el.customerOrderCreatedAt, "-");
    if (showFeedback) {
      setText(el.statusText, "這筆訂單已被取消。");
    }
    return;
  }

  if (!response.ok) {
    setText(el.statusText, result.error || "更新訂單狀態失敗。");
    return;
  }

  const order = result.order;
  el.customerOrderStatus.classList.remove("hidden");
  setText(el.customerOrderCode, order.order_code);
  setText(el.customerOrderState, STATUS_LABELS[order.status] || order.status);
  setText(el.customerOrderCreatedAt, formatDateTime(order.created_at));

  if (showFeedback) {
    setText(el.statusText, `最新狀態：${STATUS_LABELS[order.status] || order.status}`);
  }
}
