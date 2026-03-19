# QuickBite Supabase

QuickBite 是一個使用 Supabase + Vercel 的多人線上點餐系統，分成顧客入口、員工後台、管理者後台三種使用情境。顧客註冊後可直接登入點餐，訂單與狀態都會寫入 Supabase，員工與管理者可同步查看與處理資料。

## 目前有幾個網站

1. `index.html`
   顧客登入 / 註冊入口。顧客登入後會進入獨立點餐頁。
2. `customer-order.html`
   顧客點餐頁。可瀏覽菜單、建立訂單、查看目前訂單狀態與歷史訂單。
3. `backoffice-login.html`
   員工 / 管理者登入入口。登入成功後會依角色導向對應後台。
4. `staff-dashboard.html`
   員工後台。可查看訂單、更新狀態、刪除已取消訂單。
5. `admin-dashboard.html`
   管理者後台。可管理菜單、新增餐點、編輯餐點、上下架與刪除餐點。

## 專案結構

### 頁面

- `index.html`
- `customer-order.html`
- `backoffice-login.html`
- `staff-dashboard.html`
- `admin-dashboard.html`

### 前端腳本

- `scripts/customer-auth-page.js`
- `scripts/customer-order-page.js`
- `scripts/login-page.js`
- `scripts/staff-page.js`
- `scripts/admin-page.js`

### 共用腳本

- `scripts/shared/common.js`
- `scripts/shared/supabase-browser.js`

### API

- `api/public-config.js`
- `api/create-order.js`
- `api/order-status.js`
- `api/delete-order.js`

### SQL

- `supabase/schema.sql`
- `supabase/customer-upgrade.sql`

## 目前功能

### 顧客

- 註冊顧客帳號並直接登入
- 瀏覽菜單與加入購物車
- 建立訂單
- 查看目前訂單狀態
- 查看自己的歷史訂單

### 員工

- 查看所有訂單
- 切換狀態為新訂單、製作中、外送中、已完成
- 刪除已取消訂單

### 管理者

- 新增餐點
- 編輯餐點
- 設定供應中 / 停售
- 刪除餐點

## 環境變數

在 Vercel 或本機 `.env.local` 需要設定：

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Supabase 設定

### 必跑 SQL

先執行：

- `supabase/schema.sql`

如果你要啟用顧客帳號與訂單正式綁定，再執行：

- `supabase/customer-upgrade.sql`

### 帳號角色

`profiles` 表目前主要給員工與管理者使用，`role` 只會是：

- `staff`
- `admin`

顧客帳號則使用 Supabase Auth，顧客姓名與電話會存在使用者的 `user_metadata`，正式綁單資料則由 `customers` 與 `orders.customer_id` 處理。

### 關閉信箱驗證

如果你要維持現在這版「註冊後直接登入」，請到 Supabase：

`Authentication > Providers > Email`

將 `Confirm email` 關閉。否則就算前端不再顯示驗證頁，Supabase 仍然會要求顧客先驗證信箱。

## 部署方式

目前建議流程是：

1. 修改程式碼
2. `git push` 到 GitHub
3. 到 Vercel 針對 `quickbite` 專案執行 Redeploy

GitHub Repo：

`https://github.com/hunter001cjdj/quickbite`

## 注意事項

- `SUPABASE_SERVICE_ROLE_KEY` 只能放在伺服器端，不能放到前端。
- 如果你曾經把 key 貼到公開地方，建議立刻去 Supabase 旋轉更新。
- 如果 Vercel 更新後畫面沒變，先做一次 `Ctrl + F5` 強制重新整理。
