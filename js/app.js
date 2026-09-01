/**
 * 龜記 (Guiji) 叫號機與電子菜單主應用程式 (app.js)
 * 整合：
 * 1. 狀態管理 (1+3 橫向叫號佇列、重複掃描置頂邏輯、LocalStorage 斷電復原)
 * 2. 掃碼槍事件綁定 (USB HID)
 * 3. 聲光動畫回調 (Web Audio 叮咚 + Web Speech 播報)
 * 4. 測試調試面板 (按 'T' 或雙擊頂部開啟)
 */

document.addEventListener('DOMContentLoaded', () => {
  // 狀態宣告 (預設初始值比照龜記示意圖)
  const STORAGE_KEY = 'GUIJI_QMS_CALLING_DATA_V2';
  let state = {
    currentNumber: '0321',
    historyNumbers: ['0320', '0319']
  };

  // 自動縮放畫布以適應任何螢幕大小 (在 1080x1920 設備上 scale 為 1.0)
  const appContainer = document.getElementById('app-container');
  function autoScaleContainer() {
    if (!appContainer) return;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    if (windowWidth === 1080 && windowHeight === 1920) {
      appContainer.style.transform = 'none';
      return;
    }
    const scaleX = windowWidth / 1080;
    const scaleY = windowHeight / 1920;
    const scale = Math.min(scaleX, scaleY);
    appContainer.style.transform = `scale(${scale})`;
  }

  window.addEventListener('resize', autoScaleContainer);
  autoScaleContainer();

  // 實例化模組
  const audioManager = new window.QMSAudioManager();
  const uiManager = new window.QMSUIManager();

  // 從 LocalStorage 還原歷史資料
  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          if (parsed.currentNumber !== undefined) state.currentNumber = parsed.currentNumber;
          if (Array.isArray(parsed.historyNumbers)) state.historyNumbers = parsed.historyNumbers.slice(0, 4);
        }
      }
    } catch (e) {
      console.warn('[App] LocalStorage 讀取失敗:', e);
    }
  }

  // 儲存狀態至 LocalStorage
  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('[App] LocalStorage 寫入失敗:', e);
    }
  }

  /**
   * 核心叫號處理函式
   * @param {string} rawCode 條碼字串
   */
  function handleCallNumber(rawCode) {
    if (!rawCode) return;
    const code = String(rawCode).trim().toUpperCase();
    if (!code) return;

    console.log(`[Guiji App] 執行叫號: ${code}`);

    // 重複掃描相同號碼處理：若已是當前號碼，直接重播
    if (state.currentNumber === code) {
      uiManager.render(state.currentNumber, state.historyNumbers, true);
      uiManager.showToast(`重複叫號: ${code}`);
      audioManager.announceCall(code);
      return;
    }

    // 若號碼存在於歷史列表中，先將其從歷史中移除
    const existIndex = state.historyNumbers.indexOf(code);
    if (existIndex > -1) {
      state.historyNumbers.splice(existIndex, 1);
    }

    // 將原先的主號碼推入歷史列表首位
    if (state.currentNumber) {
      state.historyNumbers.unshift(state.currentNumber);
    }

    // 歷史列表限制最多 3~4 筆
    if (state.historyNumbers.length > 4) {
      state.historyNumbers = state.historyNumbers.slice(0, 4);
    }

    // 設定新號碼為當前主叫號
    state.currentNumber = code;
    saveState();

    // 渲染 UI 與觸發音效
    uiManager.render(state.currentNumber, state.historyNumbers, true);
    uiManager.showToast(`已叫號: ${code}`);
    audioManager.announceCall(code);
  }

  /**
   * 清除所有叫號資料
   */
  function clearAllNumbers() {
    state.currentNumber = null;
    state.historyNumbers = [];
    saveState();
    uiManager.render(null, [], false);
    uiManager.showToast('已重置所有叫號');
  }

  // 初始化掃描器
  const scanner = new window.BarcodeScanner({
    onScan: (code) => {
      handleCallNumber(code);
    }
  });

  // 初始載入與首次畫面渲染
  loadState();
  uiManager.render(state.currentNumber, state.historyNumbers, false);

  // ==========================================================================
  // 測試與除錯面板控制 (按鍵 'T' 或雙擊頂部切換)
  // ==========================================================================
  const debugPanel = document.getElementById('debug-panel');
  const debugInput = document.getElementById('debug-code-input');
  const debugCallBtn = document.getElementById('debug-call-btn');
  const debugClearBtn = document.getElementById('debug-clear-btn');
  const debugMuteBtn = document.getElementById('debug-mute-btn');
  const debugCloseBtn = document.getElementById('debug-close-btn');
  const headerBar = document.getElementById('qms-section');

  function toggleDebugPanel() {
    if (!debugPanel) return;
    const isVisible = debugPanel.classList.contains('visible');
    if (isVisible) {
      debugPanel.classList.remove('visible');
    } else {
      debugPanel.classList.add('visible');
      if (debugInput) debugInput.focus();
    }
  }

  // 快捷鍵 'T' 切換測試面板
  window.addEventListener('keydown', (e) => {
    if ((e.key === 't' || e.key === 'T') && e.target.tagName !== 'INPUT') {
      e.preventDefault();
      toggleDebugPanel();
    }
  });

  // 雙擊頂部叫號區域切換測試面板
  if (headerBar) {
    headerBar.addEventListener('dblclick', toggleDebugPanel);
  }

  if (debugCloseBtn) {
    debugCloseBtn.addEventListener('click', toggleDebugPanel);
  }

  if (debugCallBtn && debugInput) {
    debugCallBtn.addEventListener('click', () => {
      const code = debugInput.value.trim();
      if (code) {
        handleCallNumber(code);
        debugInput.value = '';
      }
    });
  }

  if (debugClearBtn) {
    debugClearBtn.addEventListener('click', () => {
      if (confirm('確定要清除所有叫號記錄嗎？')) {
        clearAllNumbers();
      }
    });
  }

  if (debugMuteBtn) {
    debugMuteBtn.addEventListener('click', () => {
      audioManager.isMuted = !audioManager.isMuted;
      debugMuteBtn.textContent = audioManager.isMuted ? '🔊 解除靜音' : '🔇 靜音模式';
      uiManager.showToast(audioManager.isMuted ? '已開啟靜音' : '已恢復語音播報');
    });
  }

  // 快速測試標籤按鈕點擊
  document.querySelectorAll('.quick-tag-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const code = e.target.getAttribute('data-code');
      if (code) {
        handleCallNumber(code);
      }
    });
  });

  // 點擊頁面任意處解鎖 AudioContext
  document.addEventListener('click', () => {
    audioManager.ensureAudioContext();
  }, { once: true });
});
