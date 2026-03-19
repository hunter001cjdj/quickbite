# QuickBite Supabase

QuickBite 是一個用 Supabase + Vercel 製作的線上點餐系統，分成顧客頁、後台登入頁、員工總覽頁、管理者後台頁。

## 頁面數量與用途

目前共有 4 個主要頁面：

1. `index.html`
   顧客入口頁。顧客可註冊、登入、瀏覽菜單、加入購物車、送出訂單、追蹤最新訂單狀態。

2. `backoffice-login.html`
   員工 / 管理者登入頁。登入成功後依角色自動導向對應後台。

3. `staff-dashboard.html`
   員工總覽頁。可查看全部訂單、篩選訂單、更新狀態、刪除取消訂單。

4. `admin-dashboard.html`
   管理者後台頁。可新增、編輯、停售、恢復供應菜單品項。

## 前端結構

### 頁面檔案

- `index.html`
- `backoffice-login.html`
- `staff-dashboard.html`
- `admin-dashboard.html`

### 共用腳本

- `scripts/shared/supabase-browser.js`
- `scripts/shared/common.js`

### 各頁面腳本

- `scripts/customer-page.js`
- `scripts/login-page.js`
- `scripts/staff-page.js`
- `scripts/admin-page.js`

### API

- `api/public-config.js`
- `api/create-order.js`
- `api/order-status.js`
- `api/delete-order.js`

## 環境變數

建立 `.env.local`：

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Supabase Auth 驗證信設定

如果驗證信點開後會跳回 `localhost`，通常是 Supabase 的 Auth URL 設定還留在本機網址。

請到 Supabase Dashboard：

`Authentication > URL Configuration`

把下面兩個地方改好：

### Site URL

填你的正式站，例如：

```text
https://quickbite-peach-five.vercel.app
```

### Redirect URLs

至少加入：

```text
https://quickbite-peach-five.vercel.app
https://quickbite-peach-five.vercel.app/index.html
```

如果你還會本機測試，也可以保留：

```text
http://localhost:3000
```

## 程式內的驗證信導向

顧客註冊時，前端現在會主動指定：

```js
emailRedirectTo: `${window.location.origin}/index.html`
```

這段已經寫在：

- `scripts/customer-page.js`

## GitHub

目前 GitHub repo：

`https://github.com/hunter001cjdj/quickbite`

## Vercel 更新方式

現在已經不保留本地 `.vercel` 和本地測試伺服器流程，之後建議只走：

`本機修改 -> git push GitHub -> 線上 Vercel Redeploy`

## 注意事項

- `SUPABASE_SERVICE_ROLE_KEY` 只能放伺服器端，不能放進前端。
- 如果你曾經公開貼出 `service_role key`，建議去 Supabase 旋轉更新。
- 如果 Auth 驗證信還是跳錯地方，優先檢查 `Authentication > URL Configuration`。
