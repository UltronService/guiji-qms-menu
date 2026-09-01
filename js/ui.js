/**
 * 龜記叫號系統 UI 管理器 (ui.js)
 * 負責：
 * 1. 渲染居中最新主號碼 (亮黃色大字體 + 縮放動畫)
 * 2. 渲染右側橫向歷史號碼 (2~4 組，支援滑動淡入動畫)
 * 3. 根據號碼長度動態調整字級
 * 4. 浮動掃描 Toast 提示
 */

class QMSUIManager {
  constructor() {
    this.mainDisplay = document.getElementById('main-number');
    this.historyContainer = document.getElementById('history-numbers-container');
    this.toastEl = document.getElementById('scan-toast');
    this.toastTimeout = null;
  }

  /**
   * 渲染當前號碼與歷史號碼
   * @param {string|null} currentNumber 最新主叫號
   * @param {Array<string>} historyNumbers 歷史號碼陣列 (最多 4 筆)
   * @param {boolean} triggerAnimation 是否觸發新號碼進場動畫
   */
  render(currentNumber, historyNumbers = [], triggerAnimation = true) {
    this.renderMainNumber(currentNumber, triggerAnimation);
    this.renderHistory(historyNumbers);
  }

  renderMainNumber(number, triggerAnimation) {
    if (!this.mainDisplay) return;

    if (!number) {
      this.mainDisplay.textContent = '等待叫號';
      this.mainDisplay.classList.add('waiting');
      this.mainDisplay.style.fontSize = '64px';
      return;
    }

    this.mainDisplay.classList.remove('waiting');
    this.mainDisplay.textContent = number;

    // 字體大小自動適應
    const len = number.length;
    if (len <= 4) {
      this.mainDisplay.style.fontSize = '140px';
    } else if (len <= 6) {
      this.mainDisplay.style.fontSize = '110px';
    } else if (len <= 10) {
      this.mainDisplay.style.fontSize = '80px';
    } else {
      this.mainDisplay.style.fontSize = '54px';
    }

    // 觸發進場動畫
    if (triggerAnimation) {
      this.mainDisplay.classList.remove('calling');
      void this.mainDisplay.offsetWidth; // 強制重繪
      this.mainDisplay.classList.add('calling');
    }
  }

  renderHistory(historyNumbers = []) {
    if (!this.historyContainer) return;
    this.historyContainer.innerHTML = '';

    // 最多顯示 3~4 組歷史號碼，依序橫向排開
    const displayList = historyNumbers.slice(0, 3);

    displayList.forEach((num, index) => {
      const numSpan = document.createElement('span');
      numSpan.className = 'history-num-item newly-pushed';
      numSpan.textContent = num;

      // 歷史號碼字級自適應
      if (num.length > 5) {
        numSpan.style.fontSize = '42px';
      }

      this.historyContainer.appendChild(numSpan);
    });
  }

  showToast(text) {
    if (!this.toastEl) return;
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
    this.toastEl.textContent = text;
    this.toastEl.classList.add('show');

    this.toastTimeout = setTimeout(() => {
      this.toastEl.classList.remove('show');
    }, 1800);
  }
}

// 掛載至全域
window.QMSUIManager = QMSUIManager;
