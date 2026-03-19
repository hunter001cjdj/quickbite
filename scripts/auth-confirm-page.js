import { setText, startClock } from "./shared/common.js";
import { getSupabaseClient } from "./shared/supabase-browser.js";

const el = {
  heroTimestamp: document.getElementById("heroTimestamp"),
  confirmStatusText: document.getElementById("confirmStatusText"),
};

initialize().catch((error) => {
  console.error(error);
  setText(el.confirmStatusText, `驗證失敗：${error.message || "請重新點擊驗證信。"}`);
});

async function initialize() {
  startClock(el.heroTimestamp);

  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const searchParams = new URLSearchParams(window.location.search);
  const errorDescription = hashParams.get("error_description") || searchParams.get("error_description");

  if (errorDescription) {
    setText(el.confirmStatusText, `驗證失敗：${decodeURIComponent(errorDescription)}`);
    return;
  }

  const supabase = await getSupabaseClient();
  const sessionResult = await supabase.auth.getSession();
  const session = sessionResult.data.session;

  if (session?.user) {
    setText(el.confirmStatusText, "信箱驗證成功，正在帶你前往點餐系統...");
    window.setTimeout(() => {
      window.location.href = "/customer-order.html";
    }, 1800);
    return;
  }

  setText(el.confirmStatusText, "驗證連結已開啟，若尚未登入請回到顧客入口重新登入。");
}
