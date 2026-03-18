import {
  createButton,
  formatCurrency,
  requireRole,
  setText,
  startClock,
} from "./shared/common.js";
import { getSupabaseClient } from "./shared/supabase-browser.js";

const state = {
  supabase: null,
  session: null,
  profile: null,
  menuItems: [],
};

const el = {
  heroTimestamp: document.getElementById("heroTimestamp"),
  adminSessionText: document.getElementById("adminSessionText"),
  adminSignOutButton: document.getElementById("adminSignOutButton"),
  menuForm: document.getElementById("menuForm"),
  menuItemIdInput: document.getElementById("menuItemIdInput"),
  menuNameInput: document.getElementById("menuNameInput"),
  menuCategoryInput: document.getElementById("menuCategoryInput"),
  menuPriceInput: document.getElementById("menuPriceInput"),
  menuSortOrderInput: document.getElementById("menuSortOrderInput"),
  menuDescriptionInput: document.getElementById("menuDescriptionInput"),
  menuAvailableInput: document.getElementById("menuAvailableInput"),
  resetMenuFormButton: document.getElementById("resetMenuFormButton"),
  adminStatusText: document.getElementById("adminStatusText"),
  adminMenuList: document.getElementById("adminMenuList"),
};

initialize().catch((error) => {
  console.error(error);
  setText(el.adminStatusText, `初始化失敗：${error.message || "資料庫連線異常，請稍後再試。"}`);
});

async function initialize() {
  startClock(el.heroTimestamp);
  state.supabase = await getSupabaseClient();
  const auth = await requireRole(state.supabase, ["admin"]);
  if (!auth) {
    return;
  }

  state.session = auth.session;
  state.profile = auth.profile;
  setText(el.adminSessionText, `${state.profile?.full_name || state.session.user.email} / admin`);

  bindEvents();
  await loadMenuItems();
  subscribeRealtime();
  renderMenuList();
  setText(el.adminStatusText, "系統正常運行中");
}

function bindEvents() {
  el.adminSignOutButton.addEventListener("click", async () => {
    await state.supabase.auth.signOut();
    window.location.href = "/backoffice-login.html";
  });

  el.menuForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await saveMenuItem();
  });

  el.resetMenuFormButton.addEventListener("click", () => {
    resetForm();
    setText(el.adminStatusText, "表單已清空。");
  });
}

async function loadMenuItems() {
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

function subscribeRealtime() {
  state.supabase
    .channel("admin-menu")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "menu_items" },
      async () => {
        await loadMenuItems();
        renderMenuList();
        setText(el.adminStatusText, "菜單資料已自動同步。");
      }
    )
    .subscribe();
}

async function saveMenuItem() {
  const payload = {
    name: el.menuNameInput.value.trim(),
    category: el.menuCategoryInput.value.trim(),
    price: Number(el.menuPriceInput.value),
    sort_order: el.menuSortOrderInput.value ? Number(el.menuSortOrderInput.value) : null,
    description: el.menuDescriptionInput.value.trim(),
    available: el.menuAvailableInput.checked,
  };

  if (!payload.name || !payload.category || Number.isNaN(payload.price)) {
    setText(el.adminStatusText, "請完整填寫名稱、分類與價格。");
    return;
  }

  let query = state.supabase.from("menu_items");
  const editingId = el.menuItemIdInput.value.trim();

  if (editingId) {
    query = query.update(payload).eq("id", editingId);
  } else {
    query = query.insert(payload);
  }

  const { error } = await query;
  if (error) {
    setText(el.adminStatusText, `儲存失敗：${error.message}`);
    return;
  }

  await loadMenuItems();
  renderMenuList();
  resetForm();
  setText(el.adminStatusText, "餐點資料已儲存。");
}

function renderMenuList() {
  el.adminMenuList.innerHTML = "";

  if (state.menuItems.length === 0) {
    el.adminMenuList.innerHTML = `<div class="empty-state">目前還沒有菜單品項。</div>`;
    return;
  }

  state.menuItems.forEach((item) => {
    const card = document.createElement("article");
    card.className = "menu-admin-card";
    card.innerHTML = `
      <div class="order-header">
        <div>
          <p class="eyebrow">${item.category}</p>
          <h3>${item.name}</h3>
        </div>
        <span class="menu-price">${formatCurrency(item.price)}</span>
      </div>
      <p class="menu-meta">${item.description || "暫無描述"}</p>
      <p class="menu-meta">排序：${item.sort_order ?? "-"} / ${item.available ? "供應中" : "已停售"}</p>
    `;

    const actions = document.createElement("div");
    actions.className = "menu-admin-actions";
    actions.appendChild(createButton("編輯", "button ghost", () => fillForm(item)));
    actions.appendChild(createButton(item.available ? "設為停售" : "恢復供應", "button ghost", async () => {
      await toggleAvailability(item);
    }));
    card.appendChild(actions);
    el.adminMenuList.appendChild(card);
  });
}

function fillForm(item) {
  el.menuItemIdInput.value = item.id;
  el.menuNameInput.value = item.name;
  el.menuCategoryInput.value = item.category;
  el.menuPriceInput.value = Number(item.price);
  el.menuSortOrderInput.value = item.sort_order ?? "";
  el.menuDescriptionInput.value = item.description || "";
  el.menuAvailableInput.checked = Boolean(item.available);
  setText(el.adminStatusText, `正在編輯「${item.name}」。`);
}

async function toggleAvailability(item) {
  const { error } = await state.supabase
    .from("menu_items")
    .update({ available: !item.available })
    .eq("id", item.id);

  if (error) {
    setText(el.adminStatusText, `更新供應狀態失敗：${error.message}`);
    return;
  }

  await loadMenuItems();
  renderMenuList();
  setText(el.adminStatusText, `${item.name} 已${item.available ? "設為停售" : "恢復供應"}。`);
}

function resetForm() {
  el.menuForm.reset();
  el.menuItemIdInput.value = "";
  el.menuAvailableInput.checked = true;
}
