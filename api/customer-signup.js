const AUTH_HEADERS = {
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
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const fullName = String(body.fullName || "").trim();
    const phone = String(body.phone || "").trim();

    if (!email || !password || !fullName || !phone) {
      res.status(400).json({
        error: "email, password, fullName, and phone are required.",
      });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({
        error: "Password must be at least 6 characters.",
      });
      return;
    }

    const createResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: "POST",
      headers: createSupabaseHeaders(serviceRoleKey),
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          phone,
        },
      }),
    });

    const createPayload = await createResponse.json();

    if (!createResponse.ok) {
      const message = createPayload.msg || createPayload.error_description || createPayload.error || "Failed to create user.";
      const statusCode = createResponse.status === 422 ? 409 : createResponse.status;
      res.status(statusCode).json({ error: translateSignupError(message) });
      return;
    }

    res.status(200).json({
      success: true,
      userId: createPayload.user?.id || null,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message || "Failed to create user.",
    });
  }
};

function createSupabaseHeaders(serviceRoleKey) {
  return {
    ...AUTH_HEADERS,
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
  };
}

function translateSignupError(message) {
  const normalized = String(message || "").toLowerCase();

  if (normalized.includes("already") || normalized.includes("registered") || normalized.includes("exists")) {
    return "這個 Email 已經註冊過了，請直接登入或改用其他 Email。";
  }

  if (normalized.includes("password")) {
    return "密碼格式不符合要求，請至少使用 6 碼。";
  }

  return message || "建立顧客帳號失敗。";
}
