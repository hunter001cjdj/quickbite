module.exports = async (_req, res) => {
  const supabaseUrl = String(process.env.SUPABASE_URL || "").trim();
  const supabaseAnonKey = String(process.env.SUPABASE_ANON_KEY || "").trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    res.status(500).json({
      error: "Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variable.",
    });
    return;
  }

  res.status(200).json({
    supabaseUrl,
    supabaseAnonKey,
  });
};
