const SUPABASE_REST_HEADERS = {
  "Content-Type": "application/json",
};

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  const supabaseUrl = String(process.env.SUPABASE_URL || "").trim();
  const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

  if (!supabaseUrl || !serviceRoleKey) {
    res.status(500).json({
      error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable.",
    });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const customerName = String(body.customerName || "").trim();
    const phone = String(body.phone || "").trim();
    const address = String(body.address || "").trim();
    const note = String(body.note || "").trim();
    const items = Array.isArray(body.items) ? body.items : [];

    if (!customerName || !phone || !address || items.length === 0) {
      res.status(400).json({
        error: "customerName, phone, address, and at least one item are required.",
      });
      return;
    }

    const normalizedItems = items
      .map((item) => ({
        menuItemId: String(item.menuItemId || "").trim(),
        quantity: Number(item.quantity || 0),
      }))
      .filter((item) => item.menuItemId && Number.isInteger(item.quantity) && item.quantity > 0);

    if (normalizedItems.length === 0) {
      res.status(400).json({ error: "Items are invalid." });
      return;
    }

    const menuIds = [...new Set(normalizedItems.map((item) => item.menuItemId))];
    const menuItems = await fetchMenuItems(supabaseUrl, serviceRoleKey, menuIds);
    const menuById = new Map(menuItems.map((item) => [item.id, item]));

    const orderItems = normalizedItems.map((item) => {
      const menu = menuById.get(item.menuItemId);
      if (!menu || !menu.available) {
        throw new Error(`菜單品項不存在或已下架：${item.menuItemId}`);
      }

      return {
        menu_item_id: menu.id,
        item_name: menu.name,
        price: Number(menu.price),
        quantity: item.quantity,
        subtotal: Number(menu.price) * item.quantity,
      };
    });

    const total = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
    const orderCode = createOrderCode();

    const insertedOrder = await insertOrder(supabaseUrl, serviceRoleKey, {
      order_code: orderCode,
      customer_name: customerName,
      phone,
      address,
      note,
      status: "new",
      total,
    });

    await insertOrderItems(
      supabaseUrl,
      serviceRoleKey,
      orderItems.map((item) => ({
        ...item,
        order_id: insertedOrder.id,
      }))
    );

    res.status(200).json({
      success: true,
      orderCode,
      orderId: insertedOrder.id,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message || "Failed to create order.",
    });
  }
};

async function fetchMenuItems(supabaseUrl, serviceRoleKey, menuIds) {
  const inClause = menuIds.join(",");
  const url = `${supabaseUrl}/rest/v1/menu_items?select=id,name,price,available&id=in.(${inClause})`;
  const response = await fetch(url, {
    headers: createSupabaseHeaders(serviceRoleKey),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch menu items.");
  }

  return Array.isArray(data) ? data : [];
}

async function insertOrder(supabaseUrl, serviceRoleKey, payload) {
  const response = await fetch(`${supabaseUrl}/rest/v1/orders`, {
    method: "POST",
    headers: {
      ...createSupabaseHeaders(serviceRoleKey),
      Prefer: "return=representation",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to insert order.");
  }

  return data[0];
}

async function insertOrderItems(supabaseUrl, serviceRoleKey, payload) {
  const response = await fetch(`${supabaseUrl}/rest/v1/order_items`, {
    method: "POST",
    headers: {
      ...createSupabaseHeaders(serviceRoleKey),
      Prefer: "return=minimal",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.message || "Failed to insert order items.");
  }
}

function createSupabaseHeaders(serviceRoleKey) {
  return {
    ...SUPABASE_REST_HEADERS,
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
  };
}

function createOrderCode() {
  const now = new Date();
  const datePart = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
  const timePart = [
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ].join("");
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `QB-${datePart}-${timePart}-${suffix}`;
}
