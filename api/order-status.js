module.exports = async (req, res) => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    res.status(500).json({
      error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable.",
    });
    return;
  }

  const orderCode = typeof req.query.orderCode === "string" ? req.query.orderCode.trim() : "";
  const phone = typeof req.query.phone === "string" ? req.query.phone.trim() : "";

  if (!orderCode || !phone) {
    res.status(400).json({ error: "orderCode and phone are required." });
    return;
  }

  try {
    const query = new URLSearchParams({
      select: "order_code,status,created_at",
      order_code: `eq.${orderCode}`,
      phone: `eq.${phone}`,
      limit: "1",
    });

    const response = await fetch(`${supabaseUrl}/rest/v1/orders?${query.toString()}`, {
      headers: {
        "Content-Type": "application/json",
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch order status.");
    }

    const order = Array.isArray(data) ? data[0] : null;
    if (!order) {
      res.status(404).json({ error: "Order not found." });
      return;
    }

    res.status(200).json({ order });
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to fetch order status." });
  }
};
