# 龜記叫號取餐系統與電子菜單看板 (Guiji QMS and Menu Board)

這是一個專為 Android 機上盒 (WebView) 設計的 9:16 直立式滿版 (1080x1920) 叫號取餐系統與電子菜單看板。主打 **離線運作、零外部框架依賴、極速載入與模組化架構**。

## 🌟 核心功能

* **自適應滿版縮放**：採用原生 CSS `transform: scale` 與 JavaScript 計算，自動等比縮放以適應不同的螢幕與預覽視窗，無捲軸干擾。
* **USB 掃碼槍支援 (HID 模式)**：全域監聽鍵盤連發事件，並具備 Buffer 緩衝邏輯以精準捕捉掃碼槍的高速輸入 (過濾 <100ms 間隔字元)，支援純數字自動正規化 3 碼及英數混合單號 (例如 `A01`, `088`)。
* **100% 斷網強化與離線持久化 (Offline-First Hardening)**：
  * **PWA Service Worker (`sw.js`)**：支援網址部署下的全資源預先快取（包含 HTML、CSS、JS、菜單圖片、所有字體與橫幅背景影片），並實作 HTTP `206 Partial Content` Range 離線串流支援。即使門市斷網數日且每日關機重開，機上盒開啟網址時仍可直接從本機快取秒開運作。
  * **全資源本地化 (`assets/`)**：橫幅背景影片 (`assets/maxhomevideo2.webm`) 與開源字體 (`Montserrat`、`Poppins`、`Nunito` `.woff2`) 均已內建於專案目錄，完全不依賴外部 Google Fonts 或第三方圖床。
  * **狀態保存 (`localStorage`)**：斷電或重新整理時，自動從 `localStorage` 復原最新的主號碼、歷史號碼、顯示模式與外觀設定。
* **聲光回饋 (100% 離線合成)**：
  * **音效**：使用 `Web Audio API` 雙正弦波合成清脆的雙音「Ding-Dong」，不依賴任何外部 MP3/WAV 檔案。
  * **語音廣播**：調用原生 `Web Speech API` 進行 TTS 語音合成朗讀 (「請，X X X，取餐」)。
* **動態調校與測試面板**：按下 `T` 鍵或雙擊頂部橫幅即可呼叫內建面板，提供：
  * 數字字體切換、綠底遮罩透明度滑桿
  * 歷史顯示模式與排版方向即時切換
  * 手動單號輸入、測試下一號、一鍵清空、自動輪播 Demo 模式
  * 4 組一鍵動畫風格預設（俐落標準、極致絲滑、輕巧 Q 彈、火車連鎖差動）與進場/推擠物理參數微調

## 🎨 UI / UX 與歷史顯示模式

* **整體版面配置**：
  * 上方 15% (`288px`)：即時叫號橫幅 (`#qms-banner`)，採用動態品牌影片搭配可調式草本綠半透明遮罩。
  * 下方 85% (`1632px`)：靜態電子菜單展示區 (`assets/menu.jpg`)。
* **待機模式與轉場動畫**：
  * 無號碼 (`---`) 時進入待機模式，隱藏綠底遮罩並將品牌 Logo 置中放大展示。
  * 第一筆訂單掃入時，Logo 平滑移至左側，主號碼緊接彈出 (`popIn` 動畫)。
* **三種歷史顯示模式**（支援面板切換或 URL 參數預覽 `?mode=classic` / `?mode=a` / `?mode=b`）：
  1. **經典模式 (`classic`)**：`1 主號碼 + 2 歷史號碼`，支援 **橫向 (左新右舊)** 與 **直向 (下新上舊)** 兩種 GPU 平移排版。
  2. **方案 A (`stack-a`)**：`1 主號碼 + 6 歷史號碼` 直列階梯字級排版。
  3. **方案 B (`grid-b`)**：`1 主號碼 + 6 歷史號碼` 3×2 六格網格排版（內建 B1～B4 四種填格順序，單號時自動置中展示主號與 Logo，多號時自動展開六格網格）。

## 📂 專案結構

```text
├── index.html          # 主頁面結構 (語意化 HTML 與調校面板)
├── manifest.json       # PWA 全螢幕應用程式清單
├── sw.js               # Service Worker (100% 離線資源預快取與影片 Range 支援)
├── css/
│   └── style.css       # 全域樣式、本地 @font-face、歷史模式排版、GPU 動畫與面板樣式
├── js/
│   ├── audio.js        # QMSAudio：Web Audio 雙音合成與 Web Speech 語音播報模組
│   ├── scanner.js      # QMSScanner：USB HID 掃碼槍高速緩衝監聽與快捷鍵模組
│   ├── ui.js           # QMSUI：視窗縮放、統一歷史 DOM 差動渲染引擎與面板控制模組
│   └── app.js          # QMSApp：核心狀態管理、Service Worker 註冊與叫號邏輯控制器
└── assets/
    ├── menu.jpg            # 電子菜單底圖
    ├── maxhomevideo2.webm  # 本地橫幅背景動態影片 (離線播放)
    ├── logo2.svg           # 龜記品牌 Logo (綠字版)
    ├── logo2_white.svg     # 龜記品牌 Logo (白字版)
    └── fonts/              # 內嵌數字字體資源 (Montserrat / Poppins / Nunito / Greycliff CF)
```

## 🚀 部署與執行

1. Clone 本專案。
2. 確保專案根目錄下的 `assets/` 資料夾內有 `menu.jpg` 菜單圖片。
3. 直接以瀏覽器開啟 `index.html`（支援 `file://` 本地離線直接開啟）或部署至 GitHub Pages 等靜態伺服器即可運行。

## 📦 版本

目前版本：**v0.4 (Refactored Modular Architecture)**
