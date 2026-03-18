export const STATUS_LABELS = {
  new: "新訂單",
  preparing: "製作中",
  delivering: "外送中",
  completed: "已完成",
};

export const CUSTOMER_LAST_ORDER_KEY = "quickbite-last-order";

export function setText(element, value) {
  if (element) {
    element.textContent = value;
  }
}

export function formatCurrency(value) {
  return `NT$ ${Number(value || 0).toFixed(0)}`;
}

export function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export function startClock(element) {
  const tick = () => setText(element, formatDateTime(new Date().toISOString()));
  tick();
  return window.setInterval(tick, 1000);
}

export function createButton(label, className, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.className = className;
  button.addEventListener("click", onClick);
  return button;
}

export function getRole(profile) {
  return profile?.role || "customer";
}

export async function loadSessionAndProfile(supabase) {
  const sessionResult = await supabase.auth.getSession();
  const session = sessionResult.data.session;

  if (!session?.user) {
    return { session: null, profile: null };
  }

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", session.user.id)
    .maybeSingle();

  return {
    session,
    profile: data || null,
  };
}

export async function requireRole(supabase, allowedRoles) {
  const { session, profile } = await loadSessionAndProfile(supabase);

  if (!session?.user) {
    window.location.href = "/backoffice-login.html";
    return null;
  }

  const role = getRole(profile);
  if (!allowedRoles.includes(role)) {
    window.location.href = role === "admin" ? "/admin-dashboard.html" : "/index.html";
    return null;
  }

  return { session, profile };
}
