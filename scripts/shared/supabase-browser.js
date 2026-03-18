import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

let supabasePromise;

export async function getSupabaseClient() {
  if (!supabasePromise) {
    supabasePromise = (async () => {
      const response = await fetch("/api/public-config");
      const config = await response.json();

      if (!response.ok) {
        throw new Error(config.error || "無法取得 Supabase 公開設定。");
      }

      if (!config.supabaseUrl || !config.supabaseAnonKey) {
        throw new Error("Supabase 公開設定不完整。");
      }

      return createClient(config.supabaseUrl.trim(), config.supabaseAnonKey.trim(), {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
    })();
  }

  return supabasePromise;
}
