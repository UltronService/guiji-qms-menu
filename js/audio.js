/**
 * 音效合成與語音廣播模組 (Web Audio API + Web Speech API)
 * 特性：
 * 1. 100% 離線運作，無需外接音檔檔案
 * 2. 高音質雙諧波「叮咚 (Ding-Dong)」雙音提示鈴聲
 * 3. 原生中文語音合成：「請 {號碼} 取餐」
 * 4. 具備自動啟用 AudioContext 與防止重複語音佇列管理
 */

class QMSAudioManager {
  constructor() {
    this.audioCtx = null;
    this.synth = window.speechSynthesis || null;
    this.chineseVoice = null;
    this.isMuted = false;

    this.initAudioContext();
    this.initSpeechVoice();
  }

  initAudioContext() {
    // 延遲至使用者互動或首次調用時建立，符合瀏覽器 AudioContext 策略
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    } catch (e) {
      console.warn('[Audio] AudioContext 初始化失敗:', e);
    }
  }

  ensureAudioContext() {
    if (!this.audioCtx) {
      this.initAudioContext();
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  initSpeechVoice() {
    if (!this.synth) return;

    const findVoice = () => {
      const voices = this.synth.getVoices();
      // 優先選擇繁體中文/臺灣語音，其次為簡體中文/一般中文
      this.chineseVoice = voices.find(v => v.lang === 'zh-TW' || v.lang === 'zh-HK') ||
                          voices.find(v => v.lang.startsWith('zh')) ||
                          null;
    };

    findVoice();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = findVoice;
    }
  }

  /**
   * 播放「叮咚」雙音提示鈴聲 (Web Audio API 振盪器物理合成)
   * 第一聲 Ding (高音 ~659Hz E5) -> 第二聲 Dong (中音 ~523Hz C5)
   */
  playChime() {
    return new Promise((resolve) => {
      if (this.isMuted) return resolve();
      this.ensureAudioContext();

      if (!this.audioCtx) {
        return resolve();
      }

      const now = this.audioCtx.currentTime;

      // --- 第 1 聲 Ding (E5: ~659.25Hz + 諧波) ---
      const osc1 = this.audioCtx.createOscillator();
      const gain1 = this.audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);

      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.4, now + 0.02);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc1.connect(gain1);
      gain1.connect(this.audioCtx.destination);

      osc1.start(now);
      osc1.stop(now + 0.45);

      // --- 第 2 聲 Dong (C5: ~523.25Hz + 諧波) ---
      const delay = 0.22;
      const osc2 = this.audioCtx.createOscillator();
      const gain2 = this.audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(523.25, now + delay);

      gain2.gain.setValueAtTime(0, now + delay);
      gain2.gain.linearRampToValueAtTime(0.5, now + delay + 0.02);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.65);

      osc2.connect(gain2);
      gain2.connect(this.audioCtx.destination);

      osc2.start(now + delay);
      osc2.stop(now + delay + 0.65);

      // 總耗時約 750ms 後 resolve
      setTimeout(resolve, 750);
    });
  }

  /**
   * 繁體中文語音播報：「請 {number} 取餐」
   * 針對代號 (如 A01, NO.102, ORD-05) 進行友善念法轉換
   */
  speakNumber(rawNumber) {
    return new Promise((resolve) => {
      if (this.isMuted || !this.synth) return resolve();

      // 中斷前一次尚未播完的語音
      this.synth.cancel();

      // 格式化念法：例如將 "A01" 轉為 "A 零 一"，讓語音引擎念得更清楚
      const spokenText = this.formatSpokenText(rawNumber);
      const textToSpeak = `請 ${spokenText} 取餐`;

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      if (this.chineseVoice) {
        utterance.voice = this.chineseVoice;
      }
      utterance.lang = 'zh-TW';
      utterance.rate = 0.95;  // 略微放慢以求發音清晰
      utterance.pitch = 1.05; // 稍微清亮之語調

      utterance.onend = () => resolve();
      utterance.onerror = (e) => {
        console.warn('[Audio] 語音播報異常:', e);
        resolve();
      };

      this.synth.speak(utterance);
    });
  }

  /**
   * 完整叫號流程：叮咚提示音 -> 語音播報
   */
  async announceCall(number) {
    try {
      await this.playChime();
      await this.speakNumber(number);
    } catch (e) {
      console.warn('[Audio] 叫號播報發生錯誤:', e);
    }
  }

  formatSpokenText(numberStr) {
    if (!numberStr) return '';
    // 將號碼中的連續數字拆分空格，有助於朗讀出單一號碼如「一 零 八」而非「一百零八」
    return numberStr
      .split('')
      .map(char => {
        if (/[0-9]/.test(char)) {
          return ` ${char} `;
        }
        return char;
      })
      .join('')
      .trim();
  }
}

// 掛載至全域
window.QMSAudioManager = QMSAudioManager;
