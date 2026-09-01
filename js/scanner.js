/**
 * USB 掃碼槍 (HID 鍵盤模擬模式) 監聽器
 * 核心特性：
 * 1. 監聽全域 keydown 事件，利用緩衝區高速累積條碼字元
 * 2. 捕捉結尾 Enter (KeyCode 13) 觸發叫號
 * 3. 具備自動超時清理機制（防止手動按鍵雜訊累積）
 * 4. 支援包含英文前綴與單號之字串格式（如 A01, NO.123, ORD-20240901-01）
 */

class BarcodeScanner {
  constructor(options = {}) {
    this.onScan = options.onScan || (() => {});
    this.buffer = '';
    this.lastTime = 0;
    this.charTimeout = options.charTimeout || 100; // 掃碼槍連發字元間隔通常 < 50ms
    this.minCodeLength = options.minCodeLength || 1;
    this.isListening = false;

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.init();
  }

  init() {
    if (this.isListening) return;
    window.addEventListener('keydown', this.handleKeyDown, true);
    this.isListening = true;
    console.log('[Scanner] USB 掃描槍監聽器已就緒 (HID 鍵盤模式)');
  }

  destroy() {
    window.removeEventListener('keydown', this.handleKeyDown, true);
    this.isListening = false;
    this.buffer = '';
  }

  handleKeyDown(event) {
    // 若當前焦點在一般輸入框（非全域監聽），且非掃碼槍 Enter，則略過以防干擾輸入
    const targetTag = (event.target && event.target.tagName) ? event.target.tagName.toLowerCase() : '';
    if (targetTag === 'input' || targetTag === 'textarea') {
      if (event.key === 'Enter') {
        const val = event.target.value.trim();
        if (val) {
          this.triggerScan(val);
          event.target.value = '';
          event.target.blur();
        }
      }
      return;
    }

    const currentTime = Date.now();
    
    // 如果距離上一個字元時間超過 charTimeout，重置緩衝區
    if (currentTime - this.lastTime > this.charTimeout) {
      this.buffer = '';
    }
    this.lastTime = currentTime;

    // 判斷是否為結尾鍵 (Enter)
    if (event.key === 'Enter' || event.keyCode === 13) {
      event.preventDefault();
      const scannedCode = this.buffer.trim();
      this.buffer = '';

      if (scannedCode.length >= this.minCodeLength) {
        this.triggerScan(scannedCode);
      }
      return;
    }

    // 排除特殊控制鍵（如 Shift, Alt, Ctrl, Tab 等）
    if (event.key && event.key.length === 1) {
      this.buffer += event.key;
    }
  }

  triggerScan(rawCode) {
    // 格式清理：移除兩側不可見字元，轉為大寫標準格式
    const cleanCode = this.formatCode(rawCode);
    if (!cleanCode) return;

    console.log(`[Scanner] 成功捕獲條碼: ${cleanCode}`);
    if (typeof this.onScan === 'function') {
      this.onScan(cleanCode);
    }
  }

  formatCode(rawCode) {
    if (!rawCode) return '';
    // 移除常見換行符與非列印字元
    let code = rawCode.replace(/[\r\n\t]/g, '').trim();
    // 保持大寫英文與數字
    return code.toUpperCase();
  }
}

// 掛載至全域
window.BarcodeScanner = BarcodeScanner;
