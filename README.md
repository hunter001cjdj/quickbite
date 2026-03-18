# QuickBite Supabase

這是獨立於原本專案的新資料夾版本，提供可上線的多人同步線上點餐系統：

- 顧客可公開瀏覽菜單並下單
- 員工可登入後查看所有訂單、電話、地址、時間與明細
- 管理者可登入後新增、編輯、刪除菜單
- 所有資料儲存在 Supabase
- 菜單與訂單變更透過 Supabase Realtime 同步
- 顧客送單透過 Vercel Serverless API 建立，避免直接暴露資料表寫入流程

## 專案結構

- `index.html`: 單頁應用介面
- `styles.css`: 頁面樣式
- `app.js`: Supabase 前端串接、登入、即時同步、顧客/員工/管理者流程
- `api/public-config.js`: 回傳前端使用的 Supabase URL 與 anon key
- `api/create-order.js`: 顧客建立訂單的後端 API
- `supabase/schema.sql`: 建表、RLS、Realtime 與範例資料 SQL

## 你要先做的事

1. 到 Supabase 建立新 project。
2. 打開 `SQL Editor`，把 [supabase/schema.sql](/c:/Users/Administrator/Desktop/project/test/quickbite-supabase/supabase/schema.sql) 全部執行。
3. 到 `Authentication > Users` 建立至少兩個帳號：
   - 一個 admin
   - 一個 staff
4. 到 `Table Editor > profiles` 幫這兩個帳號補上 `role`：
   - `admin`
   - `staff`
5. 到 Vercel 或本機 `.env.local` 設定這三個環境變數：

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 本機啟動

```bash
npm install
npx vercel dev
```

本機開啟：

```text
http://localhost:3000
```

## 上線到 Vercel

1. 把 `quickbite-supabase` 推到 GitHub。
2. 在 Vercel 匯入這個 repo 或子資料夾。
3. 在 Vercel Project Settings > Environment Variables 設定：
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. 重新部署。

## 權限設計

- 顧客：
  - 可以讀公開菜單
  - 可以透過 `/api/create-order` 建立訂單
- staff：
  - 可以讀取訂單與訂單明細
  - 可以更新訂單狀態
- admin：
  - 具備 staff 權限
  - 可以新增、修改、刪除菜單

## 串接流程

### 前端

1. `app.js` 啟動時先呼叫 `/api/public-config`
2. 用回傳的 `SUPABASE_URL` + `SUPABASE_ANON_KEY` 建立 Supabase client
3. 讀取 `menu_items`
4. 若員工或管理者已登入，再讀取 `orders` 與 `order_items`
5. 透過 Realtime 訂閱 `menu_items` 和 `orders`

### 顧客送單

1. 顧客選菜後送到 `/api/create-order`
2. 後端用 `SUPABASE_SERVICE_ROLE_KEY` 到 `menu_items` 驗證價格與可用狀態
3. 後端建立 `orders`
4. 後端建立 `order_items`
5. 員工端收到 Realtime 更新

## 官方文件

- Supabase JavaScript: https://supabase.com/docs/reference/javascript/introduction
- Supabase Realtime: https://supabase.com/docs/guides/realtime/postgres-changes
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security

## 注意

- `SUPABASE_SERVICE_ROLE_KEY` 只能放在 Vercel 或伺服器端，不要放進前端。
- 如果你已經執行過 SQL，又想重跑，請先檢查 publication/policy 是否已存在。
- 目前是帳密登入版本，若你要我下一步幫你改成 magic link、Google 登入、列印出單、LINE 通知，我可以直接接著做。
