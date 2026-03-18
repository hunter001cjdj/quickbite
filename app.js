const { createClient } = window.supabase;

const STATUS_META = {
  new: "新訂單",
  preparing: "製作中",
  delivering: "外送中",
  completed: "已完成",
};

const CUSTOMER_ORDER_STORAGE_KEY = "quickbite-last-order";

const state = {
  supabase: null,
  session: null,
  profile: null,
  subscriptions: [],
  currentView: "customer",
  menuItems: [],
  orders: [],
  customerOrders: [],
  cart: [],
  pendingOrderStatusSelections: {},
  customerFilters: {
    query: "",
    category: "all",
  },
  staffFilters: {
    query: "",
    status: "all",
  },
};

const elements = {
  statusText: document.getElementById("statusText"),
  heroStats: document.querySelector(".hero-stats"),
  heroMenuCount: document.getElementById("heroMenuCount"),
  heroOrderCount: document.getElementById("heroOrderCount"),
  heroPendingCount: document.getElementById("heroPendingCount"),
  heroTimestamp: document.getElementById("heroTimestamp"),
  authSessionInfo: document.getElementById("authSessionInfo"),
  authCard: document.getElementById("authCard"),
  authForm: document.getElementById("authForm"),
  authEmailInput: document.getElementById("authEmailInput"),
  authPasswordInput: document.getElementById("authPasswordInput"),
  customerSignUpButton: document.getElementById("customerSignUpButton"),
  toggleCustomerRegisterButton: document.getElementById("toggleCustomerRegisterButton"),
  customerRegisterForm: document.getElementById("customerRegisterForm"),
  customerRegisterNameInput: document.getElementById("customerRegisterNameInput"),
  customerRegisterPhoneInput: document.getElementById("customerRegisterPhoneInput"),
  customerRegisterEmailInput: document.getElementById("customerRegisterEmailInput"),
  customerRegisterPasswordInput: document.getElementById("customerRegisterPasswordInput"),
  customerRegisterConfirmPasswordInput: document.getElementById("customerRegisterConfirmPasswordInput"),
  authRegisterPanel: document.getElementById("authRegisterPanel"),
  signOutButton: document.getElementById("signOutButton"),
  signOutCardButton: document.getElementById("signOutCardButton"),
  signOutMiniButton: document.getElementById("signOutMiniButton"),
  authMiniBar: document.getElementById("authMiniBar"),
  authMiniText: document.getElementById("authMiniText"),
  authLogoutBox: document.getElementById("authLogoutBox"),
  backofficeLinks: document.getElementById("backofficeLinks"),
  goStaffViewButton: document.getElementById("goStaffViewButton"),
  goAdminViewButton: document.getElementById("goAdminViewButton"),
  customerTabButton: document.getElementById("customerTabButton"),
  staffTabButton: document.getElementById("staffTabButton"),
  adminTabButton: document.getElementById("adminTabButton"),
  roleTabs: [...document.querySelectorAll(".role-tab")],
  views: {
    customer: document.getElementById("customerView"),
    staff: document.getElementById("staffView"),
    admin: document.getElementById("adminView"),
  },
  staffAccessGate: document.getElementById("staffAccessGate"),
  staffContent: document.getElementById("staffContent"),
  adminAccessGate: document.getElementById("adminAccessGate"),
  adminContent: document.getElementById("adminContent"),
  menuSearchInput: document.getElementById("menuSearchInput"),
  categoryFilter: document.getElementById("categoryFilter"),
  customerMenuList: document.getElementById("customerMenuList"),
  cartItems: document.getElementById("cartItems"),
  cartTotalPrice: document.getElementById("cartTotalPrice"),
  clearCartButton: document.getElementById("clearCartButton"),
  orderForm: document.getElementById("orderForm"),
  customerNameInput: document.getElementById("customerNameInput"),
  customerPhoneInput: document.getElementById("customerPhoneInput"),
  customerAddressInput: document.getElementById("customerAddressInput"),
  customerNoteInput: document.getElementById("customerNoteInput"),
  customerOrderStatus: document.getElementById("customerOrderStatus"),
  customerOrderCode: document.getElementById("customerOrderCode"),
  customerOrderState: document.getElementById("customerOrderState"),
  customerOrderCreatedAt: document.getElementById("customerOrderCreatedAt"),
  refreshCustomerOrderButton: document.getElementById("refreshCustomerOrderButton"),
  customerOrderList: document.getElementById("customerOrderList"),
  orderSearchInput: document.getElementById("orderSearchInput"),
  orderStatusFilter: document.getElementById("orderStatusFilter"),
  staffSummaryCards: document.getElementById("staffSummaryCards"),
  staffOrderList: document.getElementById("staffOrderList"),
  backToCustomerFromStaff: document.getElementById("backToCustomerFromStaff"),
  menuForm: document.getElementById("menuForm"),
  menuItemIdInput: document.getElementById("menuItemIdInput"),
  menuNameInput: document.getElementById("menuNameInput"),
  menuCategoryInput: document.getElementById("menuCategoryInput"),
  menuPriceInput: document.getElementById("menuPriceInput"),
  menuSortOrderInput: document.getElementById("menuSortOrderInput"),
  menuDescriptionInput: document.getElementById("menuDescriptionInput"),
  menuAvailableInput: document.getElementById("menuAvailableInput"),
  resetMenuFormButton: document.getElementById("resetMenuFormButton"),
  adminMenuList: document.getElementById("adminMenuList"),
  backToCustomerFromAdmin: document.getElementById("backToCustomerFromAdmin"),
};

initializeApp().catch((error) => {
  console.error(error);
  setDatabaseError();
});

async function initializeApp() {
  bindEvents();
  startClock();
  await bootstrapSupabase();
  setStatus("系統正常運行中");
}

function bindEvents() {
  elements.roleTabs.forEach((tab) => {
    tab.addEventListener("click", () => switchView(tab.dataset.view));
  });

  elements.authForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await signIn();
  });

  elements.signOutButton.addEventListener("click", async () => {
    await signOut();
  });

  elements.toggleCustomerRegisterButton.addEventListener("click", () => {
    const isHidden = elements.customerRegisterForm.classList.contains("hidden");
    elements.customerRegisterForm.classList.toggle("hidden", !isHidden);
    elements.toggleCustomerRegisterButton.textContent = isHidden ? "收起註冊" : "展開註冊";
  });

  elements.customerRegisterForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await signUpCustomer();
  });

  elements.signOutCardButton.addEventListener("click", async () => {
    await signOut();
  });

  elements.signOutMiniButton.addEventListener("click", async () => {
    await signOut();
  });

  elements.goStaffViewButton.addEventListener("click", () => {
    switchView("staff");
    setStatus("已切換到員工總覽。");
  });

  elements.goAdminViewButton.addEventListener("click", () => {
    switchView("admin");
    setStatus("已切換到管理者後台。");
  });

  elements.backToCustomerFromStaff.addEventListener("click", () => {
    switchView("customer");
    setStatus("已返回顧客頁。");
  });

  elements.backToCustomerFromAdmin.addEventListener("click", () => {
    switchView("customer");
    setStatus("已返回顧客頁。");
  });

  elements.menuSearchInput.addEventListener("input", (event) => {
    state.customerFilters.query = event.target.value.trim().toLowerCase();
    renderCustomerMenu();
  });

  elements.orderSearchInput.addEventListener("input", (event) => {
    state.staffFilters.query = event.target.value.trim().toLowerCase();
    renderStaffOrders();
  });

  elements.orderStatusFilter.addEventListener("change", (event) => {
    state.staffFilters.status = event.target.value;
    renderStaffOrders();
  });

  elements.clearCartButton.addEventListener("click", () => {
    state.cart = [];
    renderCart();
    setStatus("購物車已清空。");
  });

  elements.orderForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await submitOrder();
  });

  elements.menuForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await saveMenuItemFromForm();
  });

  elements.resetMenuFormButton.addEventListener("click", () => {
    resetMenuForm();
    setStatus("餐點表單已清除。");
  });

  elements.refreshCustomerOrderButton.addEventListener("click", async () => {
    await refreshCustomerOrderStatus();
  });
}

async function bootstrapSupabase() {
  const response = await fetch("/api/public-config");
  const config = await response.json();

  if (!response.ok) {
    throw new Error(config.error || "無法取得 Supabase 公開設定。");
  }

  state.supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  const sessionResult = await state.supabase.auth.getSession();
  state.session = sessionResult.data.session;

  if (state.session?.user) {
    state.profile = await loadProfile(state.session.user.id);
  }

  state.supabase.auth.onAuthStateChange(async (_event, session) => {
    state.session = session;
    state.profile = session?.user ? await loadProfile(session.user.id) : null;
    await refreshSecureData();
    renderAuthState();
    renderAccess();
  });

  await loadPublicData();
  await refreshSecureData();
  await refreshCustomerOrderStatus();
  renderAuthState();
  renderAccess();
  subscribeRealtime();
  renderAll();
}

async function loadPublicData() {
  const { data, error } = await state.supabase
    .from("menu_items")
    .select("*")
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  state.menuItems = Array.isArray(data) ? data : [];
}

async function refreshSecureData() {
  if (hasStaffAccess()) {
    await loadOrders();
    state.customerOrders = [];
  } else if (state.session?.user) {
    await loadCustomerOrders();
    state.orders = [];
  } else {
    state.orders = [];
    state.customerOrders = [];
  }

  renderAll();
}

async function loadOrders() {
  const { data, error } = await state.supabase
    .from("orders")
    .select(`
      id,
      order_code,
      customer_name,
      phone,
      address,
      note,
      status,
      total,
      created_at,
      order_items (
        id,
        item_name,
        price,
        quantity,
        subtotal
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  state.orders = Array.isArray(data) ? data : [];
}

async function loadProfile(userId) {
  const { data, error } = await state.supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", userId)
    .single();

  if (error) {
    return {
      id: userId,
      full_name: "顧客",
      role: "customer",
    };
  }

  return data;
}

async function loadCustomerOrders() {
  const { data, error } = await state.supabase
    .from("orders")
    .select(`
      id,
      order_code,
      customer_name,
      phone,
      address,
      note,
      status,
      total,
      created_at,
      order_items (
        id,
        item_name,
        price,
        quantity,
        subtotal
      )
    `)
    .eq("customer_user_id", state.session.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    state.customerOrders = [];
    return;
  }

  state.customerOrders = Array.isArray(data) ? data : [];
}

function subscribeRealtime() {
  unsubscribeRealtime();

  const menuChannel = state.supabase
    .channel("public:menu_items")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "menu_items" },
      async () => {
        try {
          await loadPublicData();
          renderAll();
          setStatus("系統正常運行中");
        } catch (error) {
          console.error(error);
          setDatabaseError();
        }
      }
    )
    .subscribe();

  state.subscriptions.push(menuChannel);

  const ordersChannel = state.supabase
    .channel("public:orders")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "orders" },
      async () => {
        if (!hasStaffAccess()) {
          try {
            if (state.session?.user && !hasStaffAccess()) {
              await loadCustomerOrders();
              renderCustomerOrderList();
              await refreshCustomerOrderStatus();
            }
          } catch (error) {
            console.error(error);
          }
          return;
        }
        try {
          await loadOrders();
          renderAll();
          setStatus("系統正常運行中");
        } catch (error) {
          console.error(error);
          setDatabaseError();
        }
      }
    )
    .subscribe();

  state.subscriptions.push(ordersChannel);
}

function unsubscribeRealtime() {
  state.subscriptions.forEach((channel) => {
    state.supabase.removeChannel(channel);
  });
  state.subscriptions = [];
}

async function signIn() {
  const email = elements.authEmailInput.value.trim();
  const password = elements.authPasswordInput.value.trim();

  if (!email || !password) {
    setStatus("請輸入 Email 與密碼。");
    return;
  }

  const { error } = await state.supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    setStatus(`登入失敗：${error.message}`);
    return;
  }

  setStatus("登入成功，正在載入權限與資料。");
}

async function signUpCustomer() {
  const fullName = elements.customerRegisterNameInput.value.trim();
  const phone = elements.customerRegisterPhoneInput.value.trim();
  const email = elements.customerRegisterEmailInput.value.trim();
  const password = elements.customerRegisterPasswordInput.value.trim();
  const confirmPassword = elements.customerRegisterConfirmPasswordInput.value.trim();

  if (!fullName || !phone || !email || !password || !confirmPassword) {
    setStatus("請完整填寫顧客註冊資料。");
    return;
  }

  if (password !== confirmPassword) {
    setStatus("兩次輸入的密碼不一致。");
    return;
  }

  const { error } = await state.supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone,
        role: "customer",
      },
    },
  });

  if (error) {
    setStatus(`顧客註冊失敗：${error.message}`);
    return;
  }

  elements.customerRegisterForm.reset();
  elements.customerRegisterForm.classList.add("hidden");
  elements.toggleCustomerRegisterButton.textContent = "展開註冊";
  setStatus("顧客帳號建立成功，請使用剛建立的帳號登入。");
}

async function signOut() {
  const { error } = await state.supabase.auth.signOut();
  if (error) {
    setStatus(`登出失敗：${error.message}`);
    return;
  }

  state.profile = null;
  state.orders = [];
  state.customerOrders = [];
  renderAll();
  renderAuthState();
  renderAccess();
  setStatus("已登出。");
}

function renderAuthState() {
  if (!state.session?.user) {
    elements.authSessionInfo.textContent = "尚未登入。員工與管理者請使用 Supabase Auth 帳號登入。";
    elements.authMiniText.textContent = "未登入";
    renderAuthLayout();
    return;
  }

  const roleLabel = state.profile?.role || "未設定角色";
  const nameLabel = state.profile?.full_name || state.session.user.email;
  elements.authSessionInfo.textContent = `已登入：${nameLabel} / ${roleLabel}`;
  elements.authMiniText.textContent = `${nameLabel} / ${roleLabel}`;
  renderAuthLayout();
}

function renderAccess() {
  const staffAllowed = hasStaffAccess();
  const adminAllowed = hasAdminAccess();

  elements.staffAccessGate.classList.toggle("hidden", staffAllowed);
  elements.staffContent.classList.toggle("hidden", !staffAllowed);
  elements.adminAccessGate.classList.toggle("hidden", adminAllowed);
  elements.adminContent.classList.toggle("hidden", !adminAllowed);

  if (!staffAllowed) {
    elements.staffAccessGate.textContent = "請先登入 staff 或 admin 帳號，才能查看訂單總覽。";
  }

  if (!adminAllowed) {
    elements.adminAccessGate.textContent = "請先登入 admin 帳號，才能管理菜單。";
  }

  elements.staffTabButton.classList.toggle("hidden", true);
  elements.adminTabButton.classList.toggle("hidden", true);
  elements.backofficeLinks.classList.toggle("hidden", !(staffAllowed || adminAllowed));
  elements.goStaffViewButton.classList.toggle("hidden", !staffAllowed);
  elements.goAdminViewButton.classList.toggle("hidden", !adminAllowed);
}

function hasStaffAccess() {
  return ["staff", "admin"].includes(state.profile?.role);
}

function hasAdminAccess() {
  return state.profile?.role === "admin";
}

function switchView(viewName) {
  state.currentView = viewName;
  elements.roleTabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.view === viewName);
  });

  Object.entries(elements.views).forEach(([name, view]) => {
    view.classList.toggle("active", name === viewName);
  });

  renderAuthLayout();
  renderHeroStatsVisibility();
}

function renderAll() {
  renderHeroStats();
  renderHeroStatsVisibility();
  renderCategoryFilters();
  renderCustomerMenu();
  renderCart();
  renderStaffSummary();
  renderStaffOrders();
  renderAdminMenu();
  renderCustomerOrderList();
}

function renderHeroStats() {
  const pendingCount = state.orders.filter((order) => order.status !== "completed").length;
  elements.heroMenuCount.textContent = String(state.menuItems.length);
  elements.heroOrderCount.textContent = String(state.orders.length);
  elements.heroPendingCount.textContent = String(pendingCount);
}

function renderCategoryFilters() {
  const availableItems = state.menuItems.filter((item) => item.available);
  const categories = [...new Set(availableItems.map((item) => item.category))];
  const options = ["all", ...categories];

  elements.categoryFilter.innerHTML = "";
  options.forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `pill${state.customerFilters.category === category ? " active" : ""}`;
    button.textContent = category === "all" ? "全部分類" : category;
    button.addEventListener("click", () => {
      state.customerFilters.category = category;
      renderCategoryFilters();
      renderCustomerMenu();
    });
    elements.categoryFilter.appendChild(button);
  });
}

function renderCustomerMenu() {
  const menuItems = getFilteredMenuItems();
  elements.customerMenuList.innerHTML = "";

  if (!menuItems.length) {
    elements.customerMenuList.appendChild(createEmptyState("目前找不到符合條件的餐點。"));
    return;
  }

  menuItems.forEach((item) => {
    const card = document.createElement("article");
    card.className = `menu-card${item.available ? "" : " unavailable"}`;
    card.innerHTML = `
      <div class="menu-card-header">
        <div>
          <span class="badge">${escapeHtml(item.category)}</span>
          <h3>${escapeHtml(item.name)}</h3>
        </div>
        <strong class="menu-price">${formatCurrency(item.price)}</strong>
      </div>
      <p>${escapeHtml(item.description || "尚未提供餐點描述。")}</p>
      <div class="menu-card-footer">
        <span>${item.available ? "可供應" : "暫停供應"}</span>
        <button class="primary-button" type="button" ${item.available ? "" : "disabled"}>加入購物車</button>
      </div>
    `;

    card.querySelector("button").addEventListener("click", () => addToCart(item.id));
    elements.customerMenuList.appendChild(card);
  });
}

function getFilteredMenuItems() {
  return state.menuItems.filter((item) => {
    const matchAvailability = item.available;
    const matchQuery =
      !state.customerFilters.query ||
      item.name.toLowerCase().includes(state.customerFilters.query) ||
      item.category.toLowerCase().includes(state.customerFilters.query) ||
      (item.description || "").toLowerCase().includes(state.customerFilters.query);
    const matchCategory =
      state.customerFilters.category === "all" || item.category === state.customerFilters.category;

    return matchAvailability && matchQuery && matchCategory;
  });
}

function addToCart(menuItemId) {
  const menuItem = state.menuItems.find((item) => item.id === menuItemId && item.available);
  if (!menuItem) {
    setStatus("此餐點目前無法加入購物車。");
    return;
  }

  const existing = state.cart.find((item) => item.id === menuItemId);
  if (existing) {
    existing.quantity += 1;
  } else {
    state.cart.push({
      id: menuItem.id,
      name: menuItem.name,
      price: menuItem.price,
      quantity: 1,
    });
  }

  renderCart();
  setStatus(`已將「${menuItem.name}」加入購物車。`);
}

function renderCart() {
  elements.cartItems.innerHTML = "";

  if (!state.cart.length) {
    elements.cartItems.appendChild(createEmptyState("購物車目前沒有餐點。"));
    elements.cartTotalPrice.textContent = formatCurrency(0);
    return;
  }

  state.cart.forEach((item) => {
    const row = document.createElement("div");
    row.className = "cart-item";
    row.innerHTML = `
      <div class="cart-item-meta">
        <strong>${escapeHtml(item.name)}</strong>
        <span>${formatCurrency(item.price)} / 份</span>
      </div>
      <div class="quantity-controls">
        <button class="quantity-button" type="button">-</button>
        <strong>${item.quantity}</strong>
        <button class="quantity-button" type="button">+</button>
        <button class="text-button" type="button">移除</button>
      </div>
    `;

    const [minusButton, plusButton, removeButton] = row.querySelectorAll("button");
    minusButton.addEventListener("click", () => updateCartQuantity(item.id, item.quantity - 1));
    plusButton.addEventListener("click", () => updateCartQuantity(item.id, item.quantity + 1));
    removeButton.addEventListener("click", () => removeFromCart(item.id));
    elements.cartItems.appendChild(row);
  });

  elements.cartTotalPrice.textContent = formatCurrency(getCartTotal());
}

function updateCartQuantity(itemId, nextQuantity) {
  if (nextQuantity <= 0) {
    removeFromCart(itemId);
    return;
  }

  const cartItem = state.cart.find((item) => item.id === itemId);
  if (!cartItem) {
    return;
  }

  cartItem.quantity = nextQuantity;
  renderCart();
}

function removeFromCart(itemId) {
  state.cart = state.cart.filter((item) => item.id !== itemId);
  renderCart();
}

function getCartTotal() {
  return state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

async function submitOrder() {
  if (!state.cart.length) {
    setStatus("請先加入至少一項餐點再送出訂單。");
    return;
  }

  const payload = {
    customerName: elements.customerNameInput.value.trim(),
    phone: elements.customerPhoneInput.value.trim(),
    address: elements.customerAddressInput.value.trim(),
    note: elements.customerNoteInput.value.trim(),
    items: state.cart.map((item) => ({
      menuItemId: item.id,
      quantity: item.quantity,
    })),
  };

  if (!payload.customerName || !payload.phone || !payload.address) {
    setStatus("請完整填寫姓名、電話與地址。");
    return;
  }

  try {
    const response = await fetch("/api/create-order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok) {
      setStatus(`建立訂單失敗：${result.error || "未知錯誤"}`);
      return;
    }

    state.cart = [];
    elements.orderForm.reset();
    renderCart();
    switchView("customer");
    setStatus(`訂單 ${result.orderCode} 已送出。`);
    saveCustomerOrder(result.orderCode, payload.phone);
    if (state.session?.user && !hasStaffAccess()) {
      await loadCustomerOrders();
      renderCustomerOrderList();
    }
    await refreshCustomerOrderStatus();
    window.alert("點餐成功！");
  } catch (error) {
    console.error(error);
    setDatabaseError();
  }
}

function renderStaffSummary() {
  elements.staffSummaryCards.innerHTML = "";

  if (!hasStaffAccess()) {
    return;
  }

  const summary = [
    { label: "全部訂單", value: state.orders.length },
    { label: "新訂單", value: state.orders.filter((order) => order.status === "new").length },
    {
      label: "製作中 / 外送中",
      value: state.orders.filter((order) => ["preparing", "delivering"].includes(order.status)).length,
    },
    { label: "已完成", value: state.orders.filter((order) => order.status === "completed").length },
  ];

  summary.forEach((item) => {
    const card = document.createElement("article");
    card.className = "summary-card";
    card.innerHTML = `<span>${item.label}</span><strong>${item.value}</strong>`;
    elements.staffSummaryCards.appendChild(card);
  });
}

function renderStaffOrders() {
  elements.staffOrderList.innerHTML = "";

  if (!hasStaffAccess()) {
    return;
  }

  const filteredOrders = state.orders.filter((order) => {
    const query = state.staffFilters.query;
    const haystack = `${order.order_code} ${order.customer_name} ${order.phone} ${order.address}`.toLowerCase();
    const matchQuery = !query || haystack.includes(query);
    const matchStatus = state.staffFilters.status === "all" || order.status === state.staffFilters.status;
    return matchQuery && matchStatus;
  });

  if (!filteredOrders.length) {
    elements.staffOrderList.appendChild(createEmptyState("目前沒有符合條件的訂單。"));
    return;
  }

  filteredOrders.forEach((order) => {
    const itemsHtml = (order.order_items || [])
      .map((item) => `${escapeHtml(item.item_name)} x ${item.quantity} = ${formatCurrency(item.subtotal)}`)
      .join("<br>");

    const card = document.createElement("article");
    card.className = "order-card";
    card.innerHTML = `
      <div class="order-card-header">
        <div>
          <span class="status-badge" data-status="${order.status}">${STATUS_META[order.status]}</span>
          <h3>${escapeHtml(order.order_code)}</h3>
        </div>
        <strong class="order-total">${formatCurrency(order.total)}</strong>
      </div>
      <div class="order-meta">
        <div><strong>時間：</strong>${formatDateTime(order.created_at)}</div>
        <div><strong>姓名：</strong>${escapeHtml(order.customer_name)}</div>
        <div><strong>電話：</strong>${escapeHtml(order.phone)}</div>
        <div><strong>地址：</strong>${escapeHtml(order.address)}</div>
        <div><strong>備註：</strong>${escapeHtml(order.note || "無")}</div>
      </div>
      <div class="order-items">${itemsHtml || "沒有明細"}</div>
      <div class="order-actions">
        ${renderStatusButtons(order.status)}
      </div>
      <div class="status-submit-row">
        <button class="primary-button" type="button" data-submit-status>更新狀態</button>
        <button class="ghost-button danger-button" type="button" data-delete-order>刪除訂單</button>
      </div>
      <p class="order-feedback" data-order-feedback>請先選擇要更新的狀態。</p>
    `;

    card.querySelectorAll("[data-next-status]").forEach((button) => {
      button.addEventListener("click", () => {
        state.pendingOrderStatusSelections[order.id] = button.dataset.nextStatus;
        card.querySelectorAll("[data-next-status]").forEach((item) => {
          item.classList.toggle("is-active", item.dataset.nextStatus === button.dataset.nextStatus);
        });
        const feedback = card.querySelector("[data-order-feedback]");
        feedback.textContent = `已選擇「${STATUS_META[button.dataset.nextStatus]}」，按下「更新狀態」後送出。`;
        setStatus(`已選擇訂單 ${order.order_code} 的狀態為「${STATUS_META[button.dataset.nextStatus]}」。`);
      });
    });

    card.querySelector("[data-submit-status]").addEventListener("click", async () => {
      const selectedStatus = state.pendingOrderStatusSelections[order.id];
      const feedback = card.querySelector("[data-order-feedback]");

      if (!selectedStatus) {
        feedback.textContent = "請先點選一個狀態，再按更新狀態。";
        setStatus("請先選擇要更新的訂單狀態。");
        return;
      }

      feedback.textContent = `正在更新為「${STATUS_META[selectedStatus]}」...`;
      await updateOrderStatus(order.id, selectedStatus, feedback, order.order_code);
    });

    card.querySelector("[data-delete-order]").addEventListener("click", async () => {
      const feedback = card.querySelector("[data-order-feedback]");
      feedback.textContent = "正在刪除訂單...";
      await deleteOrder(order.id, feedback, order.order_code);
    });

    elements.staffOrderList.appendChild(card);
  });
}

function renderStatusButtons(currentStatus) {
  return Object.entries(STATUS_META)
    .map(([status, label]) => {
      const activeClass = currentStatus === status ? " is-active" : "";
      return `<button class="ghost-button${activeClass}" type="button" data-next-status="${status}">${label}</button>`;
    })
    .join("");
}

async function updateOrderStatus(orderId, nextStatus, feedbackEl = null, orderCode = "") {
  if (!hasStaffAccess()) {
    setStatus("你沒有更新訂單狀態的權限。");
    if (feedbackEl) {
      feedbackEl.textContent = "你沒有更新這筆訂單的權限。";
    }
    return;
  }

  const { error } = await state.supabase
    .from("orders")
    .update({ status: nextStatus })
    .eq("id", orderId);

  if (error) {
    setStatus(`更新訂單狀態失敗：${error.message}`);
    if (feedbackEl) {
      feedbackEl.textContent = `更新失敗：${error.message}`;
    }
    return;
  }

  setStatus(`訂單狀態已更新為「${STATUS_META[nextStatus]}」。`);
  if (feedbackEl) {
    feedbackEl.textContent = `訂單 ${orderCode || ""} 已更新為「${STATUS_META[nextStatus]}」。`;
  }
  delete state.pendingOrderStatusSelections[orderId];
  await refreshCustomerOrderStatus();
}

async function deleteOrder(orderId, feedbackEl = null, orderCode = "") {
  try {
    const response = await fetch("/api/delete-order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ orderId }),
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "刪除訂單失敗");
    }

    setStatus(`訂單 ${orderCode} 已刪除。`);
    if (feedbackEl) {
      feedbackEl.textContent = `訂單 ${orderCode} 已刪除。`;
    }

    state.pendingOrderStatusSelections[orderId] = undefined;
    await loadOrders();
    renderStaffSummary();
    renderStaffOrders();
    if (state.session?.user && !hasStaffAccess()) {
      await loadCustomerOrders();
      renderCustomerOrderList();
    }
    await refreshCustomerOrderStatus();
  } catch (error) {
    console.error(error);
    setStatus(`刪除訂單失敗：${error.message}`);
    if (feedbackEl) {
      feedbackEl.textContent = `刪除失敗：${error.message}`;
    }
  }
}

async function saveMenuItemFromForm() {
  if (!hasAdminAccess()) {
    setStatus("你沒有管理菜單的權限。");
    return;
  }

  const menuItemId = elements.menuItemIdInput.value;
  const payload = {
    name: elements.menuNameInput.value.trim(),
    category: elements.menuCategoryInput.value.trim(),
    price: Number(elements.menuPriceInput.value),
    sort_order: elements.menuSortOrderInput.value ? Number(elements.menuSortOrderInput.value) : null,
    description: elements.menuDescriptionInput.value.trim(),
    available: elements.menuAvailableInput.checked,
  };

  if (!payload.name || !payload.category || Number.isNaN(payload.price) || payload.price < 0) {
    setStatus("請完整填寫餐點名稱、分類與正確價格。");
    return;
  }

  let error = null;
  if (menuItemId) {
    ({ error } = await state.supabase.from("menu_items").update(payload).eq("id", menuItemId));
  } else {
    ({ error } = await state.supabase.from("menu_items").insert(payload));
  }

  if (error) {
    setStatus(`儲存餐點失敗：${error.message}`);
    return;
  }

  resetMenuForm();
  setStatus(menuItemId ? "餐點已更新。" : "餐點已新增。");
}

function resetMenuForm() {
  elements.menuForm.reset();
  elements.menuItemIdInput.value = "";
  elements.menuAvailableInput.checked = true;
}

function renderAdminMenu() {
  elements.adminMenuList.innerHTML = "";

  if (!hasAdminAccess()) {
    return;
  }

  if (!state.menuItems.length) {
    elements.adminMenuList.appendChild(createEmptyState("目前沒有餐點，先新增第一個品項。"));
    return;
  }

  state.menuItems.forEach((item) => {
    const card = document.createElement("article");
    card.className = "admin-menu-card";
    card.innerHTML = `
      <div class="admin-menu-header">
        <div>
          <span class="badge">${escapeHtml(item.category)}</span>
          <h3>${escapeHtml(item.name)}</h3>
        </div>
        <strong class="menu-price">${formatCurrency(item.price)}</strong>
      </div>
      <p>${escapeHtml(item.description || "尚未提供餐點描述。")}</p>
      <div class="admin-menu-footer">
        <span>${item.available ? "上架中" : "已下架"} / 排序 ${item.sort_order ?? "-"}</span>
        <div class="admin-menu-actions">
          <button class="ghost-button" type="button" data-action="edit">編輯</button>
          <button class="ghost-button danger-button" type="button" data-action="delete">刪除</button>
        </div>
      </div>
    `;

    card.querySelector('[data-action="edit"]').addEventListener("click", () => populateMenuForm(item.id));
    card.querySelector('[data-action="delete"]').addEventListener("click", async () => {
      await deleteMenuItem(item.id);
    });
    elements.adminMenuList.appendChild(card);
  });
}

function populateMenuForm(itemId) {
  const item = state.menuItems.find((entry) => entry.id === itemId);
  if (!item) {
    return;
  }

  elements.menuItemIdInput.value = item.id;
  elements.menuNameInput.value = item.name;
  elements.menuCategoryInput.value = item.category;
  elements.menuPriceInput.value = String(item.price);
  elements.menuSortOrderInput.value = item.sort_order ?? "";
  elements.menuDescriptionInput.value = item.description || "";
  elements.menuAvailableInput.checked = item.available;
  switchView("admin");
  setStatus(`正在編輯餐點「${item.name}」。`);
}

async function deleteMenuItem(itemId) {
  if (!hasAdminAccess()) {
    setStatus("你沒有刪除菜單的權限。");
    return;
  }

  const item = state.menuItems.find((entry) => entry.id === itemId);
  const { error } = await state.supabase.from("menu_items").delete().eq("id", itemId);

  if (error) {
    setStatus(`刪除餐點失敗：${error.message}`);
    return;
  }

  state.cart = state.cart.filter((cartItem) => cartItem.id !== itemId);
  renderCart();
  setStatus(item ? `已刪除餐點「${item.name}」。` : "餐點已刪除。");
}

function createEmptyState(message) {
  const div = document.createElement("div");
  div.className = "empty-state";
  div.textContent = message;
  return div;
}

function setStatus(message) {
  elements.statusText.textContent = message;
}

function setDatabaseError() {
  setStatus("資料庫連線異常，請稍後再試。");
}

function renderAuthLayout() {
  const showCompactAuth = Boolean(state.session?.user) && ["staff", "admin"].includes(state.currentView);
  elements.authCard.classList.toggle("compact-auth", showCompactAuth);
  elements.authMiniBar.classList.toggle("hidden", !showCompactAuth);
  elements.authForm.classList.toggle("hidden", Boolean(state.session?.user));
  elements.authLogoutBox.classList.toggle("hidden", !state.session?.user || showCompactAuth);
  elements.authRegisterPanel.classList.toggle("hidden", Boolean(state.session?.user));
  elements.customerTabButton.classList.remove("hidden");
  elements.staffTabButton.classList.add("hidden");
  elements.adminTabButton.classList.add("hidden");
}

function renderHeroStatsVisibility() {
  const hideStats = state.currentView === "customer" || !["staff", "admin"].includes(state.currentView);
  elements.heroStats.classList.toggle("hidden", hideStats);
}

function startClock() {
  updateClock();
  window.setInterval(updateClock, 1000);
}

function updateClock() {
  const now = new Date();
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("/");
  const time = [
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ].join(":");
  elements.heroTimestamp.textContent = `${date} ${time}`;
}

function saveCustomerOrder(orderCode, phone) {
  localStorage.setItem(
    CUSTOMER_ORDER_STORAGE_KEY,
    JSON.stringify({
      orderCode,
      phone,
    })
  );
}

function getSavedCustomerOrder() {
  try {
    return JSON.parse(localStorage.getItem(CUSTOMER_ORDER_STORAGE_KEY) || "null");
  } catch (error) {
    console.error(error);
    return null;
  }
}

async function refreshCustomerOrderStatus() {
  const savedOrder = getSavedCustomerOrder();
  const liveOrder = state.customerOrders[0];
  if (liveOrder) {
    elements.customerOrderStatus.classList.remove("hidden");
    elements.customerOrderCode.textContent = liveOrder.order_code;
    elements.customerOrderState.textContent = STATUS_META[liveOrder.status] || liveOrder.status;
    elements.customerOrderCreatedAt.textContent = formatDateTime(liveOrder.created_at);
    return;
  }

  if (!savedOrder?.orderCode || !savedOrder?.phone) {
    elements.customerOrderStatus.classList.add("hidden");
    return;
  }

  try {
    const query = new URLSearchParams({
      orderCode: savedOrder.orderCode,
      phone: savedOrder.phone,
    });
    const response = await fetch(`/api/order-status?${query.toString()}`);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "無法取得訂單狀態");
    }

    elements.customerOrderStatus.classList.remove("hidden");
    elements.customerOrderCode.textContent = result.order.order_code;
    elements.customerOrderState.textContent = STATUS_META[result.order.status] || result.order.status;
    elements.customerOrderCreatedAt.textContent = formatDateTime(result.order.created_at);
  } catch (error) {
    console.error(error);
    elements.customerOrderStatus.classList.remove("hidden");
    elements.customerOrderCode.textContent = savedOrder.orderCode;
    elements.customerOrderState.textContent = "狀態讀取失敗";
    elements.customerOrderCreatedAt.textContent = "-";
    setDatabaseError();
  }
}

function renderCustomerOrderList() {
  elements.customerOrderList.innerHTML = "";

  if (!state.customerOrders.length) {
    return;
  }

  state.customerOrders.slice(0, 5).forEach((order) => {
    const card = document.createElement("div");
    card.className = "customer-order-item";
    card.innerHTML = `
      <strong>${escapeHtml(order.order_code)}</strong>
      <span>${STATUS_META[order.status] || order.status}</span>
      <span>${formatDateTime(order.created_at)}</span>
    `;
    elements.customerOrderList.appendChild(card);
  });
}

function formatCurrency(amount) {
  return `NT$ ${Number(amount || 0).toLocaleString("zh-TW")}`;
}

function formatDateTime(isoString) {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
