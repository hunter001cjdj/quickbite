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
    const orderId = String(body.orderId || "").trim();

    if (!orderId) {
      res.status(400).json({ error: "orderId is required." });
      return;
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${orderId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Prefer: "return=minimal",
      },
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || "Failed to delete order.");
    }

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to delete order." });
  }
};
