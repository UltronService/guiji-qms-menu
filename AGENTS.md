# AGENTS.md - 協作開發指引 (Collaborative Guide for Agents & GrokBot)

本文件專為 AI Agent（如 GrokBot、Antigravity Agent）與協作開發者設計，提供本專案的架構規範、操作指引與使用 Antigravity CLI (`agy`) 協作的方式。

---

## 📌 專案基本資訊

* **GitHub 倉庫**：https://github.com/UltronService/guiji-qms-menu.git
* **GitHub Pages 線上預覽**：https://ultronservice.github.io/guiji-qms-menu/
* **專案規格**：
  * Android 機上盒 (WebView) 9:16 直立式滿版 (1080x1920)。
  * 上方 15% (288px) 即時叫號看板 + 下方 85% (1632px) 電子菜單展示。
  * **100% 離線優先 (Offline-First)**：無第三方框架依賴（Vanilla JS/CSS）、PWA Service Worker 本機快取、純 Web Audio API 雙音合成「Ding-Dong」、本地字體與影片。

---

## 🚀 使用 Antigravity CLI (`agy`) 協作

在已安裝 Antigravity 環境的終端機中，可使用 `agy` 指令進行自動化程式碼檢視、重構或測試。

### 1. 常用命令範例

* **單次執行並輸出結果 (Print Mode)**：
  ```bash
  agy -p "檢視目前的 js/app.js 邏輯並給出優化建議"
  ```

* **免手動確認權限自動執行 (Auto-approved Agent)**：
  ```bash
  agy --dangerously-skip-permissions -p "檢查所有 precache 靜態資源完整性"
  ```

* **接續上一次對話或指定工作目錄**：
  ```bash
  agy --continue
  # 或指定專案路徑
  agy --add-dir . -i "啟動協作開發模式"
  ```

* **切換思考深度 (Reasoning Effort)**：
  ```bash
  agy --effort high -p "針對 1080x1920 WebView 進行動畫效能分析"
  ```

---

## 📂 專案檔案架構

```text
├── index.html          # 主頁面結構與動態調校面板（按 T 鍵或雙擊頂部呼叫）
├── manifest.json       # PWA 全螢幕 Web App 配置
├── sw.js               # Service Worker：24 項核心資源離線預先快取與 Range 影片串流
├── css/
│   └── style.css       # 1080x1920 版面、歷史顯示模式 (classic/stack-a/grid-b)、GPU 動畫
├── js/
│   ├── audio.js        # QMSAudio：Web Audio API 叮咚音效與 Web Speech 語音朗讀
│   ├── scanner.js      # QMSScanner：USB HID 掃碼槍高速鍵盤連發緩衝監聽 (<100ms)
│   ├── ui.js           # QMSUI：視窗縮放、歷史號碼 DOM 差動渲染與調校面板
│   └── app.js          # QMSApp：狀態持久化 (LocalStorage)、叫號推進與流程控制器
└── assets/
    ├── menu.jpg            # 電子菜單底圖
    ├── maxhomevideo2.webm  # 本地橫幅背景影片
    ├── logo2_white.svg     # 龜記白色品牌標誌
    └── fonts/              # 本地 Montserrat / Poppins / Nunito / Greycliff CF 字體
```

---

## ⚠️ 開發與修改重要規範 (Agent Rules)

1. **維持 100% 離線特性**：
   * 禁止引用外部 CDN（如外連 js/css 或 Google Fonts 網址）。
   * 所有靜態資源必須內建於本地，若新增檔案需同步登記至 `sw.js` 的 `PRECACHE_ASSETS` 清單中。
2. **硬體與瀏覽器相容性 (Android WebView)**：
   * 動畫優先使用 GPU 屬性（`transform`, `opacity`），避免觸發大量 Layout 重排（Reflow）。
   * 確保支援鍵盤快捷鍵：按 `T` 鍵或雙擊叫號橫幅可開啟/關閉動態調校面板。
3. **驗證指令**：
   * 修改 JavaScript 後，請執行語法檢查：
     ```bash
     node --check js/audio.js
     node --check js/scanner.js
     node --check js/ui.js
     node --check js/app.js
     node --check sw.js
     ```
