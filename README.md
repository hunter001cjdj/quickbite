# QuickBite Supabase

QuickBite 是一個以 Supabase + Vercel 為基礎的線上點餐系統，現在已經整理成多頁面結構，避免把所有畫面都塞在同一個 `index.html` 裡。

## 目前有幾個頁面

目前前端共有 4 個主要頁面：

1. `index.html`
   顧客入口頁。顧客可在這裡註冊、登入、瀏覽菜單、加入購物車、送出訂單、查詢最新訂單狀態。

2. `backoffice-login.html`
   員工 / 管理者專用登入頁。登入成功後會依角色自動導向對應後台。

3. `staff-dashboard.html`
   員工總覽頁。可查看所有訂單、篩選訂單、更新狀態為新訂單 / 製作中 / 外送中 / 已完成，也可刪除已取消訂單。

4. `admin-dashboard.html`
   管理者後台頁。可新增、編輯、停售或恢復供應菜單品項，管理價格、分類、描述與排序。

## 現在的檔案結構

### 頁面檔案

- `index.html`
- `backoffice-login.html`
- `staff-dashboard.html`
- `admin-dashboard.html`

### 共用前端

- `styles.css`
  全站共用樣式。

- `scripts/shared/supabase-browser.js`
  在瀏覽器端初始化 Supabase client。

- `scripts/shared/common.js`
  共用格式化、時間、角色驗證與小工具函式。

### 各頁面腳本

- `scripts/customer-page.js`
  顧客首頁邏輯。

- `scripts/login-page.js`
  後台登入頁邏輯。

- `scripts/staff-page.js`
  員工總覽邏輯。

- `scripts/admin-page.js`
  管理者後台邏輯。

### API

- `api/public-config.js`
  提供前端 Supabase public config。

- `api/create-order.js`
  建立訂單 API。

- `api/order-status.js`
  查詢訂單狀態 API。

- `api/delete-order.js`
  刪除訂單 API。

### Supabase

- `supabase/schema.sql`
  建表、RLS、Realtime 與初始菜單資料。

## 功能摘要

### 顧客端

- 顧客可註冊與登入。
- 未登入前不顯示點餐內容。
- 登入後可瀏覽菜單、加入購物車、送出訂單。
- 可透過最新訂單資訊查詢目前狀態。

### 員工端

- 查看全部訂單。
- 依狀態或關鍵字篩選。
- 更新訂單狀態。
- 刪除取消訂單。

### 管理者端

- 新增菜單。
- 編輯現有菜單。
- 切換供應狀態。
- 維護價格、分類、描述與排序。

## 本機啟動

```bash
npm install
node local-server.js
```

本機網址：

```text
http://localhost:3000
```

## Supabase 環境變數

請建立 `.env.local`：

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 這個專案目前綁到哪個 GitHub / Vercel

### GitHub

目前本機 remote 指向：

`https://github.com/hunter001cjdj/quickbite.git`

### Vercel

目前這個資料夾的本機 Vercel link 檔案顯示：

- Project Name: `quickbite`
- Project ID: `prj_UKwJGb44TjKuS8HQJ1C2zzyv6KNi`

也就是說，這個專案資料夾本身是有綁到一個名為 `quickbite` 的 Vercel 專案。

如果你在 Vercel 後台看不到，常見原因有：

- 你現在登入的不是同一個 Vercel 帳號或 team
- 專案是建立在另一個 team 下面
- 本地已 link，但你尚未在目前帳號的 dashboard 中切到對應 team

## 之後由你自己更新 Vercel 的流程

目前已經把本地 `.vercel` link、`local-server.js`、測試 log 與本地快取檔清掉，後續建議只走：

`本機修改 → git push GitHub → Vercel 線上專案自動 / 手動 Redeploy`

你說後續要由你自己更新 Vercel，可以照這個流程：

1. 先把本機改動 commit

```bash
git add .
git commit -m "Refactor QuickBite pages"
```

2. 推到 GitHub

```bash
git push origin main
```

3. 到 Vercel dashboard 找到 `quickbite`

4. 如果這個 repo 已經綁好 GitHub，自動會出現新的 deployment

5. 你也可以手動在 Vercel 按 `Redeploy`

## 注意事項

- `SUPABASE_SERVICE_ROLE_KEY` 只能放在伺服器端，不能放進前端腳本。
- 如果你曾經公開貼出 `service_role`，建議去 Supabase 旋轉更新金鑰。
- 如果 Supabase schema 有更新，記得同步回 `SQL Editor` 再執行一次必要 SQL。
