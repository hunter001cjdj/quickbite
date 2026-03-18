import {
  STATUS_LABELS,
  createButton,
  formatCurrency,
  formatDateTime,
  requireRole,
  setText,
  startClock,
} from "./shared/common.js";
import { getSupabaseClient } from "./shared/supabase-browser.js";

const state = {
  supabase: null,
  session: null,
  profile: null,
  orders: [],
  search: "",
  status: "all",
};

const el = {
  heroTimestamp: document.getElementById("heroTimestamp"),
  staffSessionText: document.getElementById("staffSessionText"),
  staffSignOutButton: document.getElementById("staffSignOutButton"),
  staffOrderSearchInput: document.getElementById("staffOrderSearchInput"),
  staffOrderStatusFilter: document.getElementById("staffOrderStatusFilter"),
  staffStatusText: document.getElementById("staffStatusText"),
  staffSummaryCards: document.getElementById("staffSummaryCards"),
  staffOrderList: document.getElementById("staffOrderList"),
};

initialize().catch((error) => {
  console.error(error);
  setText(el.staffStatusText, "資料庫連線異常，請稍後再試。");
});

async function initialize() {
  startClock(el.heroTimestamp);
  state.supabase = await getSupabaseClient();
  const auth = await requireRole(state.supabase, ["staff", "admin"]);
  if (!auth) {
    return;
  }

  state.session = auth.session;
  state.profile = auth.profile;
  setText(el.staffSessionText, `${state.profile?.full_name || state.session.user.email} / ${state.profile?.role || "staff"}`);

  bindEvents();
  await loadOrders();
  subscribeRealtime();
  renderAll();
  setText(el.staffStatusText, "系統正常運行中");
}

function bindEvents() {
  el.staffSignOutButton.addEventListener("click", async () => {
    await state.supabase.auth.signOut();
    window.location.href = "/backoffice-login.html";
  });

  el.staffOrderSearchInput.addEventListener("input", (event) => {
    state.search = event.target.value.trim().toLowerCase();
    renderOrders();
  });

  el.staffOrderStatusFilter.addEventListener("change", (event) => {
    state.status = event.target.value;
    renderOrders();
  });
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

function subscribeRealtime() {
  state.supabase
    .channel("staff-orders")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "orders" },
      async () => {
        await loadOrders();
        renderAll();
        setText(el.staffStatusText, "訂單資料已自動同步。");
      }
    )
    .subscribe();
}

function renderAll() {
  renderSummary();
  renderOrders();
}

function getFilteredOrders() {
  return state.orders.filter((order) => {
    const matchesStatus = state.status === "all" || order.status === state.status;
    const haystack = `${order.order_code} ${order.customer_name} ${order.phone}`.toLowerCase();
    const matchesSearch = !state.search || haystack.includes(state.search);
    return matchesStatus && matchesSearch;
  });
}

function renderSummary() {
  const pendingCount = state.orders.filter((order) => order.status === "new").length;
  const activeCount = state.orders.filter((order) => ["preparing", "delivering"].includes(order.status)).length;

  el.staffSummaryCards.innerHTML = "";
  [
    ["全部訂單", state.orders.length],
    ["新訂單", pendingCount],
    ["製作中 / 外送中", activeCount],
    ["已完成", state.orders.filter((order) => order.status === "completed").length],
  ].forEach(([label, value]) => {
    const card = document.createElement("article");
    card.className = "metric-card";
    card.innerHTML = `<span>${label}</span><strong>${value}</strong>`;
    el.staffSummaryCards.appendChild(card);
  });
}

function renderOrders() {
  const orders = getFilteredOrders();
  el.staffOrderList.innerHTML = "";

  if (orders.length === 0) {
    el.staffOrderList.innerHTML = `<div class="empty-state">目前沒有符合條件的訂單。</div>`;
    return;
  }

  orders.forEach((order) => {
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
        <span>時間：${formatDateTime(order.created_at)}</span>
        <span>姓名：${order.customer_name}</span>
        <span>電話：${order.phone}</span>
        <span>地址：${order.address}</span>
        <span>備註：${order.note || "無"}</span>
      </div>
      <div class="order-items-box">${order.order_items.map((item) => `${item.item_name} x ${item.quantity} = ${formatCurrency(item.subtotal)}`).join("<br>")}</div>
    `;

    const actions = document.createElement("div");
    actions.className = "order-actions";

    ["new", "preparing", "delivering", "completed"].forEach((status) => {
      actions.appendChild(
        createButton(STATUS_LABELS[status], `status-option${order.status === status ? " is-active" : ""}`, async () => {
          await updateOrderStatus(order.id, status);
        })
      );
    });

    actions.appendChild(
      createButton("刪除訂單", "button ghost", async () => {
        await deleteOrder(order.id);
      })
    );

    card.appendChild(actions);
    el.staffOrderList.appendChild(card);
  });
}

async function updateOrderStatus(orderId, status) {
  setText(el.staffStatusText, `正在更新為「${STATUS_LABELS[status]}」...`);
  const { error } = await state.supabase
    .from("orders")
    .update({ status })
    .eq("id", orderId);

  if (error) {
    setText(el.staffStatusText, `更新失敗：${error.message}`);
    return;
  }

  await loadOrders();
  renderAll();
  setText(el.staffStatusText, `訂單已更新為「${STATUS_LABELS[status]}」。`);
}

async function deleteOrder(orderId) {
  setText(el.staffStatusText, "正在刪除訂單...");
  const response = await fetch("/api/delete-order", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ orderId }),
  });

  const result = await response.json();
  if (!response.ok) {
    setText(el.staffStatusText, result.error || "刪除訂單失敗。");
    return;
  }

  await loadOrders();
  renderAll();
  setText(el.staffStatusText, "訂單已刪除。");
}
