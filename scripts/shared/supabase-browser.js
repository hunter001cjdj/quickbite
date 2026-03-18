const { createClient } = window.supabase;

let supabasePromise;

export async function getSupabaseClient() {
  if (!supabasePromise) {
    supabasePromise = (async () => {
      const response = await fetch("/api/public-config");
      const config = await response.json();

      if (!response.ok) {
        throw new Error(config.error || "無法取得 Supabase 公開設定。");
      }

      return createClient(config.supabaseUrl, config.supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
    })();
  }

  return supabasePromise;
}
