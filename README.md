# QuickBite Supabase

QuickBite 是一個使用 Supabase + Vercel 製作的線上點餐系統，已拆成多頁面架構，包含顧客入口、信箱驗證頁、後台登入頁、員工總覽頁與管理者後台頁。

## 目前有幾個頁面

目前共有 6 個主要頁面：

1. `index.html`
   顧客入口頁。顧客先在這裡註冊或登入。

2. `auth-confirm.html`
   顧客信箱驗證頁。顧客點擊驗證信後會先進到這頁，再自動導回顧客首頁。

3. `customer-order.html`
   顧客登入後的點餐系統頁。可瀏覽菜單、加入購物車、送出訂單、查看自己的歷史訂單與最新狀態。

4. `backoffice-login.html`
   員工 / 管理者登入頁。登入成功後依角色自動跳轉。

5. `staff-dashboard.html`
   員工總覽頁。可查看訂單、篩選、更新狀態、刪除取消訂單。

6. `admin-dashboard.html`
   管理者後台頁。可維護菜單品項、價格、分類、描述、排序與供應狀態。

## 專案結構

### 頁面檔案

- `index.html`
- `auth-confirm.html`
- `customer-order.html`
- `backoffice-login.html`
- `staff-dashboard.html`
- `admin-dashboard.html`

### 共用腳本

- `scripts/shared/supabase-browser.js`
- `scripts/shared/common.js`

### 各頁面腳本

- `scripts/customer-auth-page.js`
- `scripts/customer-order-page.js`
- `scripts/auth-confirm-page.js`
- `scripts/login-page.js`
- `scripts/staff-page.js`
- `scripts/admin-page.js`

### API

- `api/public-config.js`
- `api/create-order.js`
- `api/order-status.js`
- `api/delete-order.js`

### Supabase SQL

- `supabase/schema.sql`
- `supabase/customer-upgrade.sql`

## 環境變數

建立 `.env.local`：

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Supabase Auth 驗證信設定

如果驗證信點開後跑回 `localhost`，請到：

`Authentication > URL Configuration`

設定如下。

### Site URL

```text
https://quickbite-peach-five.vercel.app
```

### Redirect URLs

```text
https://quickbite-peach-five.vercel.app
https://quickbite-peach-five.vercel.app/index.html
https://quickbite-peach-five.vercel.app/auth-confirm.html
```

如果你還會本機測試，也可以保留：

```text
http://localhost:3000
```

## 程式內的驗證信導向

顧客註冊時，前端目前會主動指定：

```js
emailRedirectTo: `${window.location.origin}/auth-confirm.html`
```

位置：

- `scripts/customer-auth-page.js`

## 顧客帳號正式綁定

這一版已經補上顧客正式資料結構：

- 新增 `customers` 表
- `orders` 新增 `customer_id`
- 顧客註冊後自動寫入 `customers`
- 顧客登入後可查看自己的歷史訂單

如果你是既有專案，要在 Supabase `SQL Editor` 執行：

- `supabase/customer-upgrade.sql`

如果你是新專案，可以直接使用已更新後的：

- `supabase/schema.sql`

## GitHub

目前 GitHub repo：

`https://github.com/hunter001cjdj/quickbite`

## Vercel 更新方式

目前建議只走：

`本機修改 -> git push GitHub -> 線上 Vercel Redeploy`

## 注意事項

- `SUPABASE_SERVICE_ROLE_KEY` 只能放在伺服器端，不能放到前端。
- 如果你曾公開貼出 `service_role key`，建議去 Supabase 旋轉更新。
- 如果驗證信仍然跳錯地方，優先檢查 `Authentication > URL Configuration`。
