---
name: guiji-brand
description: 龜記叫號取餐＋電子菜單看板（guiji-qms-menu）的品牌、平台與動效規範。凡本 repo 的 UI／視覺／動畫工作必讀；優先於 frontend-design 及一切外部設計技能。
---

# guiji-brand（龜記 QMS 看板）

## 何時使用

- 修改或新增本 repo 內任何**畫面、排版、色彩、字體、動畫、裝飾素材**時，先讀本技能。
- **優先權**：若 `frontend-design` 或其他技能建議 Google Fonts、CDN、React/Vue、blur／filter 動畫、大量 box-shadow 動畫等，**一律改依本技能**。

## 平台與畫布

- **裝置**：Android 機上盒 WebView，直立 **1080×1920**（9:16）。
- **根容器**：`#viewport-container`（固定 1080×1920，整頁縮放置中）。
- **版面**：
  - 上方 **288px（15%）**：叫號橫幅 `#qms-banner`
  - 下方 **1632px（85%）**：電子菜單 `#menu-area`（`assets/menu.jpg` 滿版 cover）

## 品牌色（程式內實際使用）

| 用途 | 色碼 / 值 |
|------|-----------|
| 橫幅綠色遮罩、PWA theme、影片 fallback 底 | `#485b28`（遮罩為 `rgba(72, 91, 40, var(--banner-opacity))`，預設 opacity **0.8**） |
| 主叫號 `#main-number`、調校面板強調色 | `#dbee0f` |
| 歷史號碼 `.history-item` | `#fff`，opacity **0.8** |
| 頁面背景 | `#000`；菜單區底 `#111` |

勿自行發明未在 repo 使用的品牌色作為主視覺。

## 字體（僅本地 `@font-face`）

- **預設數字字體**：`--selected-font: 'Montserrat', sans-serif`（`assets/fonts/montserrat-700/800/900.woff2`）。
- **可選（開源）**：Poppins、Nunito（同目錄 `.woff2`，權重 700/800/900）。
- **Greycliff CF**：僅 `assets/fonts/Demo_Fonts/` 試用檔，**有浮水印**；調校面板標示「有浮水印」。**正式門市／量產部署勿用**，僅限內部預覽或除錯。
- **系統後備**（非叫號數字主體）：`Helvetica Neue`、`PingFang TC`、`Microsoft JhengHei` 等（見 `css/style.css` body）。

## Logo

- 橫幅使用**白色** inline SVG（等同 `assets/logo2_white.svg` 風格，`fill: #fff`）。
- **叫號中**：`.logo-area` 在左 **`left: 40px`**，垂直置中，約 **200×200** 區域。
- **待機** `#qms-banner.standby-mode`：Logo **水平置中** `left: 50%`，**放大 1.6 倍**（`scale(1.6)`）。
- 另有 `assets/logo2.svg`（綠字版）供 PWA／其他用途；橫幅以白字為準。

## 橫幅 `#qms-banner` 結構與狀態

- **背景**：本地影片 `#qms-video-bg` → `assets/maxhomevideo2.webm`（loop、muted）。
- **待機**（`.standby-mode`）：綠遮罩透明、主號與歷史區隱藏；Logo 置中放大。
- **叫號中**：遮罩顯示；Logo 左移；`#main-number` 顯示（預設 `---` 時仍可能待機，邏輯見 `js/app.js`）。
- **影片失敗**：`.video-fallback` 以 `#485b28` 為底。

### 主號碼動畫

- 進場 class：`.animate-call`
- **`popIn` 0.4s**，`cubic-bezier(0.175, 0.885, 0.32, 1.275)`；僅 **transform + opacity**。

### 歷史號碼動畫（classic 橫向為主）

- GPU：**transform、opacity**（`will-change: transform, opacity`）。
- 進場 `.item-enter` → `.item-enter-active`（預設由左滑入，距離約 60px + CSS 變數 `--hist1-x`）。
- 推移 `.item-shift` → `.item-shift-active`。
- 退場 `.item-exit` → `.item-exit-active`（向右滑出）。
- 時長由 `--hist1-dur` / `--hist2-dur`（預設 **0.5s**）控制；**stack-a** 模式不使用 shift 動畫（見 `js/ui.js`）。

## 歷史顯示模式

| 模式 | 鍵值 | 內容 |
|------|------|------|
| 經典 | `classic` | 1 主號 + **2** 筆歷史；可橫向或直向（`.layout-vertical`） |
| 方案 A | `stack-a` | 1 主號 + **6** 筆直列階梯字級 |
| 方案 B | `grid-b` | 1 主號 + **6** 格 3×2；單號 `.grid-b-solo`、多號 `.grid-b-active` |

- 持久化與切換：`js/app.js`、`js/ui.js`；URL 預覽 `?mode=classic` / `?mode=a` / `?mode=b`。
- **grid-b** 退場為原地 opacity + scale，非橫向飛出。

## 龜記 IP 角色（客戶提供素材）

- 客戶提供 **4 隻綠色 IP 角色**圖（例：對話附件 `hi-1.png`）；**非 repo 內建檔**，使用前須與客戶確認授權範圍（門市、期間、媒介）。
- **禁止**遮擋 `#main-number` 或任何 `.history-item` 數字。
- **禁止**改色、拉伸變形；維持原始比例。
- 角色為**次要裝飾**，不可搶過叫號資訊；建議放在菜單區邊緣或橫幅非文字安全區。
- 若新增角色圖檔：放 `assets/`，並登記 `sw.js` 的 `PRECACHE_ASSETS`。

## 硬性規則

1. **100% 離線**：禁止 Google Fonts、任何 CDN、任何外連 URL（含圖床、analytics）。
2. **新靜態資源**必須加入 `sw.js` 的 `PRECACHE_ASSETS`。
3. **技術棧**：Vanilla HTML / CSS / JS only；**勿改 Android 原生程式**。
4. **動效（STB 效能）**：
   - 動畫只動 **`transform` 與 `opacity`**。
   - **不要**對 blur、filter、box-shadow 做連續動畫。
   - 避免大量 layout 觸發（width/height/top/left 動畫）。
5. **靜態裝飾**可用既有 `text-shadow`、`drop-shadow`（如 Logo）；新增動效仍遵守上條。
6. **調校面板** `#debug-panel`：按 **T** 或**雙擊橫幅**開關；勿移除既有快捷行為。

## 變體與根站

- **根目錄**（本 site）為正式叫號＋菜單；大改視覺或實驗（如 IP 版）應放在**獨立資料夾與獨立 URL**（例：`v-ip/`），**不要**在未確認前改動根站既有行為與版面。
- 新變體仍須遵守離線、SW precache、1080×1920 與 guiji-brand 色／字體規範。

## 實作前快速對照

- 版面與動畫：`css/style.css`
- 狀態與模式：`js/app.js`、`js/ui.js`
- PWA：`manifest.json`（`theme_color`: `#485b28`）
- 協作總覽：`AGENTS.md`
