// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: cyan; icon-glyph: wallet;

/**
 * ====================================================================
 * 📱 定成 & 妤珊 記帳 — iOS Scriptable 專屬桌面小組件 (Widget)
 * ====================================================================
 * 支援尺寸：
 *   1. 小尺寸 (Small)：今日花費、本月剩餘預算、即時欠款餘額
 *   2. 中尺寸 (Medium)：左右分欄看板（左側預算與欠款，右側今日明細）
 *   3. 大尺寸 (Large)：比照網頁版的完整當天消費清單與統計面板
 * 
 * 點擊互動：
 *   - 點擊小組件直接以 In-App WebView 或 Safari 開啟完整記帳儀表板！
 * ====================================================================
 */

// 版本編號規範：自 1.0 起算；小更新為 1.1 / 1.2，極小修正為 1.0.1 / 1.0.2
const WIDGET_VERSION = "1.3";

// 🔗 您的 Google Apps Script 記帳 Web App 部署網址（/exec 結尾）
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbw-lI8xekExLAo2D9xtJXReDGejy4qrR-7GcCsWeTUvmMwJwzmObXIoOHvK057e5Rwz/exec";

// 🌐 點擊小組件要開啟的記帳網頁網址（預設開啟您專屬的 GitHub Pages 極速網頁）
const PAGE_URL = "https://ting666777.github.io/money/";

// 解析參數（支援 "妤珊"、"定成"，也相容 "user=妤珊" 這類寫法）
function parseUserFromParam(rawParam) {
  if (!rawParam) return "";
  const cleaned = String(rawParam).trim();
  const match = cleaned.match(/user\s*=\s*([^&,\s]+)/i);
  const val = match ? decodeURIComponent(match[1]).trim() : cleaned;
  if (val === "妤珊" || val === "定成") return val;
  return "";
}

// 儲存小工具參數對應的當前用戶，供 App 內手動執行時沿用
function saveLastWidgetUser(user) {
  if (user !== "妤珊" && user !== "定成") return;
  try {
    const fm = FileManager.local();
    const path = fm.joinPath(fm.documentsDirectory(), "accounting_widget_last_user.json");
    fm.writeString(path, JSON.stringify({ user: user }));
  } catch (e) {}
}

// 讀取上次小工具參數指定的用戶
function loadLastWidgetUser() {
  try {
    const fm = FileManager.local();
    const path = fm.joinPath(fm.documentsDirectory(), "accounting_widget_last_user.json");
    if (fm.fileExists(path)) {
      const data = JSON.parse(fm.readString(path));
      if (data && (data.user === "妤珊" || data.user === "定成")) {
        return data.user;
      }
    }
  } catch (e) {}
  return "";
}

// 取得目標用戶：優先看 queryParameters.user，其次看 widgetParameter，再看上次小工具參數紀錄
function resolveTargetUser(fallbackDefault = "定成") {
  const fromQuery = parseUserFromParam(args.queryParameters && args.queryParameters.user);
  if (fromQuery) return fromQuery;

  const fromWidgetParam = parseUserFromParam(args.widgetParameter);
  if (fromWidgetParam) return fromWidgetParam;

  const fromLastWidget = loadLastWidgetUser();
  if (fromLastWidget) return fromLastWidget;

  return fallbackDefault;
}

// 若本次有帶入桌面小工具參數，先記錄下來供 App 內切換主題時使用
const INITIAL_WIDGET_PARAM_USER = parseUserFromParam(args.widgetParameter);
if (INITIAL_WIDGET_PARAM_USER) {
  saveLastWidgetUser(INITIAL_WIDGET_PARAM_USER);
}

// 當前使用者：優先讀取點擊時傳入的 user 參數，其次讀取桌面小組件設定的參數與本機紀錄，最後預設「定成」
const CURRENT_USER = resolveTargetUser("定成");

// --------------------------------------------------------------------
// 📱 點擊互動模式設定 (Interaction Mode)
// --------------------------------------------------------------------
// true  = 🌟 沉浸式 WebView 模式（點擊小工具立即在 App 內彈出獨立全螢幕記帳畫面，看完往下一滑即關閉，完全不開 Safari、不留分頁！）
// false = 🌐 傳統 Safari 瀏覽器模式（跳轉開啟 Safari 瀏覽器）
const USE_IN_APP_WEBVIEW = true;

// 可自訂的精選主題配色表（深色與淺色／白底對應配色一應俱全，支援 Scriptable 選單一鍵切換）
const THEME_PRESETS = {
  "default": {
    name: "🌌 深色預設（定成青藍 / 妤珊粉紅）",
    bgGradient: ["#0b0f19", "#151d2f"],
    cardBg: "#1e293b",
    cardAlpha: 0.6,
    border: "#334155",
    accent: null
  },
  "light_default": {
    name: "☀️ 白底預設（定成海藍 / 妤珊粉字）",
    isLight: true,
    bgGradient: ["#ffffff", "#f1f5f9"],
    cardBg: "#e2e8f0",
    cardAlpha: 0.55,
    border: "#cbd5e1",
    textPrimary: "#0f172a",
    textSecondary: "#334155",
    textMuted: "#64748b",
    accent: null
  },
  "white_black": {
    name: "🤍 白底黑字（極簡明亮）",
    isLight: true,
    bgGradient: ["#ffffff", "#f4f4f5"],
    cardBg: "#e4e4e7",
    cardAlpha: 0.55,
    border: "#d4d4d8",
    textPrimary: "#09090b",
    textSecondary: "#3f3f46",
    textMuted: "#71717a",
    accent: "#111827"
  },
  "light_purple": {
    name: "🪻 白底紫字（薰衣草亮紫）",
    isLight: true,
    bgGradient: ["#ffffff", "#f5f3ff"],
    cardBg: "#ede9fe",
    cardAlpha: 0.62,
    border: "#ddd6fe",
    textPrimary: "#4c1d95",
    textSecondary: "#6d28d9",
    textMuted: "#7e5bef",
    accent: "#7c3aed"
  },
  "light_green": {
    name: "🍵 白底綠字（清新抹茶綠）",
    isLight: true,
    bgGradient: ["#ffffff", "#ecfdf5"],
    cardBg: "#d1fae5",
    cardAlpha: 0.58,
    border: "#a7f3d0",
    textPrimary: "#064e3b",
    textSecondary: "#047857",
    textMuted: "#3b7a68",
    accent: "#059669"
  },
  "light_cyan": {
    name: "🧊 白底藍字（晴空冰藍）",
    isLight: true,
    bgGradient: ["#ffffff", "#eff6ff"],
    cardBg: "#dbeafe",
    cardAlpha: 0.62,
    border: "#bfdbfe",
    textPrimary: "#0c4a6e",
    textSecondary: "#0369a1",
    textMuted: "#4b7799",
    accent: "#0284c7"
  },
  "light_pink": {
    name: "🌷 白底粉字（柔霧櫻花粉）",
    isLight: true,
    bgGradient: ["#ffffff", "#fdf2f8"],
    cardBg: "#fce7f3",
    cardAlpha: 0.65,
    border: "#fbcfe8",
    textPrimary: "#831843",
    textSecondary: "#be185d",
    textMuted: "#9d5c78",
    accent: "#db2777"
  },
  "light_amber": {
    name: "🍯 白底橘字（暖陽琥珀橘）",
    isLight: true,
    bgGradient: ["#ffffff", "#fffbeb"],
    cardBg: "#fef3c7",
    cardAlpha: 0.6,
    border: "#fde68a",
    textPrimary: "#78350f",
    textSecondary: "#b45309",
    textMuted: "#926b44",
    accent: "#d97706"
  },
  "light_milktea": {
    name: "🧋 暖白奶茶（焦糖可可字）",
    isLight: true,
    bgGradient: ["#fffdf9", "#f5ebe0"],
    cardBg: "#ede0d4",
    cardAlpha: 0.68,
    border: "#d6ccc2",
    textPrimary: "#432818",
    textSecondary: "#7f5539",
    textMuted: "#8d7b70",
    accent: "#9c6644"
  },
  "light_teal": {
    name: "🩵 白底青字（湖水松石青）",
    isLight: true,
    bgGradient: ["#ffffff", "#f0fdfa"],
    cardBg: "#ccfbf1",
    cardAlpha: 0.55,
    border: "#99f6e4",
    textPrimary: "#134e4a",
    textSecondary: "#0f766e",
    textMuted: "#4b7d78",
    accent: "#0d9488"
  },
  "light_indigo": {
    name: "📘 白底靛字（學院靛青藍）",
    isLight: true,
    bgGradient: ["#ffffff", "#eef2ff"],
    cardBg: "#e0e7ff",
    cardAlpha: 0.6,
    border: "#c7d2fe",
    textPrimary: "#312e81",
    textSecondary: "#4338ca",
    textMuted: "#636694",
    accent: "#4f46e5"
  },
  "cyber_cyan": {
    name: "💠 深色星空藍",
    bgGradient: ["#07111e", "#10253f"],
    cardBg: "#172c47",
    cardAlpha: 0.62,
    border: "#38bdf8",
    accent: "#38bdf8"
  },
  "sakura_pink": {
    name: "🌸 深色櫻花粉",
    bgGradient: ["#190b16", "#2c1328"],
    cardBg: "#3d1a35",
    cardAlpha: 0.58,
    border: "#f472b6",
    accent: "#f472b6"
  },
  "mint_green": {
    name: "🌿 深色抹茶綠",
    bgGradient: ["#071511", "#0f2922"],
    cardBg: "#173b31",
    cardAlpha: 0.6,
    border: "#34d399",
    accent: "#34d399"
  },
  "neon_purple": {
    name: "🟣 深色霓虹紫",
    bgGradient: ["#100a1f", "#1e133b"],
    cardBg: "#2b1c52",
    cardAlpha: 0.58,
    border: "#a78bfa",
    accent: "#a78bfa"
  },
  "warm_amber": {
    name: "🍊 深色琥珀橘",
    bgGradient: ["#171007", "#2b1c0c"],
    cardBg: "#3b2712",
    cardAlpha: 0.6,
    border: "#fbbf24",
    accent: "#fbbf24"
  },
  "oled_black": {
    name: "🖤 純黑極簡（OLED 省電）",
    bgGradient: ["#000000", "#09090b"],
    cardBg: "#18181b",
    cardAlpha: 0.85,
    border: "#27272a",
    accent: "#e4e4e7"
  }
};

// 主題配色（由 loadActiveTheme 動態載入）
const THEME = {
  themeKey: "default",
  themeName: THEME_PRESETS["default"].name,
  isLight: false,
  bgHex: ["#0b0f19", "#151d2f"],
  bgGradient: [new Color("#0b0f19"), new Color("#151d2f")],
  cardHex: "#1e293b",
  cardBg: new Color("#1e293b", 0.6),
  borderHex: "#334155",
  text1Hex: "#f8fafc",
  text2Hex: "#94a3b8",
  text3Hex: "#64748b",
  textPrimary: new Color("#f8fafc"),
  textSecondary: new Color("#94a3b8"),
  textMuted: new Color("#64748b"),
  accentCyan: new Color("#38bdf8"),
  accentPink: new Color("#f472b6"),
  accentGreen: new Color("#34d399"),
  accentAmber: new Color("#fbbf24"),
  accentRose: new Color("#fb7185"),
  accentHex: "#38bdf8",
  accentColor: new Color("#38bdf8"),
  progressTrack: new Color("#334155", 0.6),
  border: new Color("#334155", 0.4)
};

function readThemeKeyFromFm(fm, filePath) {
  try {
    if (fm.fileExists(filePath)) {
      const saved = JSON.parse(fm.readString(filePath));
      if (saved && saved.themeKey && THEME_PRESETS[saved.themeKey]) {
        return saved.themeKey;
      }
    }
  } catch (e) {}
  return "";
}

function loadActiveTheme(user) {
  const targetUser = (user === "妤珊") ? "妤珊" : "定成";
  let themeKey = "default";
  const fileName = `accounting_widget_theme_${targetUser}.json`;
  try {
    const fm = FileManager.local();
    const localPath = fm.joinPath(fm.documentsDirectory(), fileName);
    const localTheme = readThemeKeyFromFm(fm, localPath);
    if (localTheme) {
      themeKey = localTheme;
    } else {
      // 若本機尚未建立（例如重裝 App 或換新 iPhone），嘗試從 iCloud 同步備份還原
      try {
        const fmCloud = FileManager.iCloud();
        const cloudPath = fmCloud.joinPath(fmCloud.documentsDirectory(), fileName);
        if (fmCloud.fileExists(cloudPath) && fmCloud.isFileDownloaded(cloudPath)) {
          const cloudTheme = readThemeKeyFromFm(fmCloud, cloudPath);
          if (cloudTheme) {
            themeKey = cloudTheme;
            try { fm.writeString(localPath, JSON.stringify({ themeKey: cloudTheme })); } catch (e2) {}
          }
        }
      } catch (eCloud) {}
    }
  } catch (e) {}

  const preset = THEME_PRESETS[themeKey] || THEME_PRESETS["default"];
  const isLight = Boolean(preset.isLight);
  const defaultUserAccent = isLight
    ? (targetUser === "妤珊" ? "#db2777" : "#0284c7")
    : (targetUser === "妤珊" ? "#f472b6" : "#38bdf8");
  const accentHex = preset.accent || defaultUserAccent;
  const text1Hex = preset.textPrimary || (isLight ? "#09090b" : "#f8fafc");
  const text2Hex = preset.textSecondary || (isLight ? "#3f3f46" : "#94a3b8");
  const text3Hex = preset.textMuted || (isLight ? "#71717a" : "#64748b");

  THEME.themeKey = themeKey;
  THEME.themeName = preset.name;
  THEME.isLight = isLight;
  THEME.bgHex = preset.bgGradient;
  THEME.bgGradient = [new Color(preset.bgGradient[0]), new Color(preset.bgGradient[1])];
  THEME.cardBg = new Color(preset.cardBg, preset.cardAlpha);
  THEME.cardHex = preset.cardBg;
  THEME.borderHex = preset.border;
  THEME.border = new Color(preset.border, isLight ? 0.78 : 0.4);
  THEME.accentHex = accentHex;
  THEME.accentColor = new Color(accentHex);
  THEME.text1Hex = text1Hex;
  THEME.text2Hex = text2Hex;
  THEME.text3Hex = text3Hex;
  THEME.textPrimary = new Color(text1Hex);
  THEME.textSecondary = new Color(text2Hex);
  THEME.textMuted = new Color(text3Hex);

  if (isLight) {
    THEME.accentCyan = new Color("#0284c7");
    THEME.accentPink = new Color("#db2777");
    THEME.accentGreen = new Color("#059669");
    THEME.accentAmber = new Color("#b45309");
    THEME.accentRose = new Color("#e11d48");
    THEME.progressTrack = new Color(preset.border || "#e4e4e7", 0.75);
  } else {
    THEME.accentCyan = new Color("#38bdf8");
    THEME.accentPink = new Color("#f472b6");
    THEME.accentGreen = new Color("#34d399");
    THEME.accentAmber = new Color("#fbbf24");
    THEME.accentRose = new Color("#fb7185");
    THEME.progressTrack = new Color("#334155", 0.6);
  }
  return THEME;
}

function saveActiveTheme(user, themeKey) {
  const targetUser = (user === "妤珊") ? "妤珊" : "定成";
  const fileName = `accounting_widget_theme_${targetUser}.json`;
  const payload = JSON.stringify({ themeKey: themeKey });
  try {
    const fm = FileManager.local();
    const themePath = fm.joinPath(fm.documentsDirectory(), fileName);
    fm.writeString(themePath, payload);
  } catch (e) {}
  try {
    const fmCloud = FileManager.iCloud();
    const cloudPath = fmCloud.joinPath(fmCloud.documentsDirectory(), fileName);
    fmCloud.writeString(cloudPath, payload);
  } catch (eCloud) {}
  loadActiveTheme(targetUser);
}

async function openThemePickerMenu(explicitUser) {
  const paramUser = parseUserFromParam(args.widgetParameter)
    || parseUserFromParam(args.queryParameters && args.queryParameters.user);

  let targetUser = explicitUser || paramUser || loadLastWidgetUser();

  // 若完全沒有小工具參數也沒有歷史紀錄，才彈出對象選擇
  if (!targetUser) {
    const whoAlert = new Alert();
    whoAlert.title = "👤 選擇要更換主題的對象";
    whoAlert.message = "未偵測到小工具參數，請選擇要為哪一位設定主題：";
    whoAlert.addAction("妤珊");
    whoAlert.addAction("定成");
    whoAlert.addCancelAction("取消");
    const whoChoice = await whoAlert.present();
    if (whoChoice === 0) {
      targetUser = "妤珊";
    } else if (whoChoice === 1) {
      targetUser = "定成";
    } else {
      return false;
    }
  }

  saveLastWidgetUser(targetUser);
  loadActiveTheme(targetUser);

  const keys = Object.keys(THEME_PRESETS);
  const picker = new Alert();
  picker.title = `🎨 更換【${targetUser}】主題配色 (v${WIDGET_VERSION})`;
  picker.message = `目前套用：${THEME.themeName}\n點選下方任一主題即可即時儲存並套用至小組件！`;
  keys.forEach((k) => {
    const prefix = (k === THEME.themeKey) ? "✅ " : "";
    picker.addAction(prefix + THEME_PRESETS[k].name);
  });
  picker.addCancelAction("返回");

  const idx = await picker.presentSheet();
  if (idx >= 0 && idx < keys.length) {
    const chosenKey = keys[idx];
    saveActiveTheme(targetUser, chosenKey);
    const doneAlert = new Alert();
    doneAlert.title = "✅ 主題已更換！";
    doneAlert.message = `已套用【${THEME_PRESETS[chosenKey].name}】至【${targetUser}】。\n立即為您預覽最新小組件效果！`;
    doneAlert.addAction("查看預覽");
    await doneAlert.present();
    return true;
  }
  return false;
}

// 分類圖示對照表 (SF Symbols)
const CATEGORY_SYMBOLS = {
  "食物": "fork.knife",
  "飲品": "cup.and.saucer.fill",
  "交通": "car.fill",
  "居家": "house.fill",
  "娛樂": "gamecontroller.fill",
  "3C": "laptopcomputer",
  "購物": "bag.fill",
  "消費": "cart.fill",
  "醫藥": "cross.case.fill",
  "收入": "banknote.fill",
  "其他": "tag.fill"
};

const REMINDER_NOTIF_ID = "accounting_daily_reminder_23";
const REMINDER_TEST_NOTIF_ID = "accounting_test_reminder";
const REMINDER_CONFIG_FILE = "accounting_reminder_config.json";

function getLocalTodayStr(dateObj) {
  const d = dateObj || new Date();
  const pad = (n) => (n < 10 ? "0" + n : "" + n);
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
}

function getMainDashboardActionUrl(targetUser) {
  const user = (targetUser === "妤珊") ? "妤珊" : "定成";
  if (USE_IN_APP_WEBVIEW) {
    const scriptName = (typeof Script !== "undefined" && Script.name && Script.name()) || "記帳小組件";
    return `scriptable:///run?scriptName=${encodeURIComponent(scriptName)}&action=openWebView&user=${encodeURIComponent(user)}`;
  }
  const baseUrl = PAGE_URL || WEB_APP_URL;
  return baseUrl.includes("?")
    ? `${baseUrl}&user=${encodeURIComponent(user)}`
    : `${baseUrl}?user=${encodeURIComponent(user)}`;
}

function loadReminderConfig() {
  const def = { enabled: true, hour: 23, minute: 0 };
  try {
    const fm = FileManager.local();
    const path = fm.joinPath(fm.documentsDirectory(), REMINDER_CONFIG_FILE);
    if (fm.fileExists(path)) {
      const parsed = JSON.parse(fm.readString(path));
      if (parsed && typeof parsed === "object") {
        return {
          enabled: parsed.enabled !== false,
          hour: Number.isFinite(Number(parsed.hour)) ? Number(parsed.hour) : 23,
          minute: Number.isFinite(Number(parsed.minute)) ? Number(parsed.minute) : 0
        };
      }
    }
  } catch (e) {}
  return def;
}

function saveReminderConfig(cfg) {
  try {
    const fm = FileManager.local();
    const path = fm.joinPath(fm.documentsDirectory(), REMINDER_CONFIG_FILE);
    fm.writeString(path, JSON.stringify({
      enabled: cfg && cfg.enabled !== false,
      hour: cfg && Number.isFinite(Number(cfg.hour)) ? Number(cfg.hour) : 23,
      minute: cfg && Number.isFinite(Number(cfg.minute)) ? Number(cfg.minute) : 0
    }));
  } catch (e) {}
}

function updateLocalManualState(user, delta) {
  try {
    const targetUser = (user === "妤珊") ? "妤珊" : "定成";
    const todayStr = getLocalTodayStr();
    const fm = FileManager.local();
    const path = fm.joinPath(fm.documentsDirectory(), `accounting_manual_state_${targetUser}.json`);
    let count = 0;
    if (fm.fileExists(path)) {
      const parsed = JSON.parse(fm.readString(path));
      if (parsed && parsed.date === todayStr) {
        count = Math.max(0, Number(parsed.count) || 0);
      }
    }
    count = Math.max(0, count + Number(delta || 0));
    fm.writeString(path, JSON.stringify({ date: todayStr, count: count }));
  } catch (e) {}
}

function getLocalManualCountToday(user) {
  try {
    const targetUser = (user === "妤珊") ? "妤珊" : "定成";
    const todayStr = getLocalTodayStr();
    const fm = FileManager.local();
    const path = fm.joinPath(fm.documentsDirectory(), `accounting_manual_state_${targetUser}.json`);
    if (fm.fileExists(path)) {
      const parsed = JSON.parse(fm.readString(path));
      if (parsed && parsed.date === todayStr) {
        return Math.max(0, Number(parsed.count) || 0);
      }
    }
  } catch (e) {}
  return 0;
}

function hasManualRecordToday(data, user) {
  if (data && data.hasTodayManual === true) return true;
  if (getLocalManualCountToday(user) > 0) return true;
  if (!data) return false;
  const todayStr = getLocalTodayStr();
  const candidates = []
    .concat(Array.isArray(data.todayRecords) ? data.todayRecords : [])
    .concat(Array.isArray(data.recentRecords) ? data.recentRecords : []);
  return candidates.some((r) => {
    if (!r) return false;
    const recDay = String(r.day || (r["Recorded At"] || "").slice(0, 10));
    if (recDay !== todayStr) return false;
    return String(r.Account || "").trim() === "現金" || Number(r["Account ID"] || 0) === 0;
  });
}

async function clearPendingReminderNotifications(notifId) {
  if (typeof Notification === "undefined") return;
  try {
    if (typeof Notification.removePending === "function") {
      await Notification.removePending([notifId]);
    }
  } catch (e) {}
  try {
    if (typeof Notification.allPending === "function") {
      const pending = await Notification.allPending();
      if (Array.isArray(pending)) {
        for (let i = 0; i < pending.length; i++) {
          const item = pending[i];
          if (item && (item.identifier === notifId || item.threadIdentifier === notifId) && typeof item.remove === "function") {
            await item.remove();
          }
        }
      }
    }
  } catch (e) {}
}

function createAccountingReminderNotification(notifId, title, body, triggerDate, targetUser) {
  const notif = new Notification();
  notif.identifier = notifId;
  notif.threadIdentifier = notifId;
  notif.title = title;
  notif.body = body;
  notif.sound = "default";
  notif.openURL = getMainDashboardActionUrl(targetUser);
  notif.setTriggerDate(triggerDate);
  return notif;
}

async function syncDailyReminderNotification(user, data, fireImmediateIfMissing = false, nowOverride = null) {
  const targetUser = (user === "妤珊") ? "妤珊" : "定成";
  const cfg = loadReminderConfig();
  await clearPendingReminderNotifications(REMINDER_NOTIF_ID);

  if (!cfg.enabled || typeof Notification === "undefined") {
    return { scheduled: false, enabled: cfg.enabled, hasManualToday: false };
  }

  const now = nowOverride ? new Date(nowOverride) : new Date();
  const hasManual = hasManualRecordToday(data, targetUser);

  if (fireImmediateIfMissing && !hasManual) {
    const immNotif = createAccountingReminderNotification(
      "accounting_immediate_reminder_23",
      "記得記帳",
      `${targetUser} 今天尚未手動記帳，點選跳到記帳主畫面`,
      new Date(now.getTime() + 1500),
      targetUser
    );
    await immNotif.schedule();
  }

  const nextTrigger = new Date(now.getFullYear(), now.getMonth(), now.getDate(), cfg.hour, cfg.minute, 0, 0);
  if (hasManual || now.getTime() >= nextTrigger.getTime()) {
    nextTrigger.setDate(nextTrigger.getDate() + 1);
  }

  const scheduledNotif = createAccountingReminderNotification(
    REMINDER_NOTIF_ID,
    "記得記帳",
    `${targetUser} 今天尚未手動記帳，點選跳到記帳主畫面`,
    nextTrigger,
    targetUser
  );
  await scheduledNotif.schedule();

  return {
    scheduled: true,
    enabled: true,
    hasManualToday: hasManual,
    triggerTimestamp: nextTrigger.getTime(),
    openURL: scheduledNotif.openURL
  };
}

async function scheduleTestReminderNotification(user, delaySeconds = 5) {
  if (typeof Notification === "undefined") return null;
  const targetUser = (user === "妤珊") ? "妤珊" : "定成";
  await clearPendingReminderNotifications(REMINDER_TEST_NOTIF_ID);
  const triggerDate = new Date(Date.now() + Math.max(1, Number(delaySeconds) || 5) * 1000);
  const notif = createAccountingReminderNotification(
    REMINDER_TEST_NOTIF_ID,
    "記得記帳（測試通知）",
    `${targetUser} 今天尚未手動記帳，點選跳到記帳主畫面`,
    triggerDate,
    targetUser
  );
  await notif.schedule();
  return { triggerAt: triggerDate.getTime(), openURL: notif.openURL };
}

const TRANSPARENT_BG_CONFIG_FILE = "accounting_transparent_bg_config.json";
const TRANSPARENT_WALLPAPER_FILE = "accounting_transparent_wallpaper.jpg";

const TRANSPARENT_PHONE_SIZES = {
  2868: { small: 510, medium: 1092, large: 1146, left: 114, right: 696, top: 276, middle: 912, bottom: 1548 },
  2796: { small: 510, medium: 1092, large: 1146, left: 99,  right: 681, top: 276, middle: 912, bottom: 1548 },
  2778: { small: 510, medium: 1092, large: 1146, left: 96,  right: 678, top: 276, middle: 912, bottom: 1548 },
  2688: { small: 507, medium: 1080, large: 1122, left: 81,  right: 654, top: 228, middle: 843, bottom: 1458 },
  2622: { small: 486, medium: 1032, large: 1098, left: 87,  right: 633, top: 264, middle: 876, bottom: 1488 },
  2556: { small: 474, medium: 1014, large: 1062, left: 84,  right: 621, top: 252, middle: 840, bottom: 1428 },
  2532: { small: 474, medium: 1014, large: 1062, left: 78,  right: 618, top: 231, middle: 819, bottom: 1407 },
  2436: { small: 465, medium: 987,  large: 1035, left: 69,  right: 591, top: 213, middle: 783, bottom: 1353 },
  2340: { small: 438, medium: 942,  large: 978,  left: 69,  right: 573, top: 225, middle: 765, bottom: 1305 },
  2208: { small: 471, medium: 1044, large: 1071, left: 99,  right: 672, top: 114, middle: 696, bottom: 1278 },
  1792: { small: 338, medium: 720,  large: 758,  left: 54,  right: 436, top: 160, middle: 580, bottom: 1000 },
  1334: { small: 296, medium: 642,  large: 648,  left: 54,  right: 400, top: 60,  middle: 412, bottom: 764 }
};

function computeTransparentCropRect(imgWidth, imgHeight, family, position) {
  const h = Math.round(Number(imgHeight) || 2556);
  const w = Math.round(Number(imgWidth) || 1179);
  const layout = TRANSPARENT_PHONE_SIZES[h] || {
    small: Math.round(w * 0.402),
    medium: Math.round(w * 0.860),
    large: Math.round(h * 0.4155),
    left: Math.round(w * 0.0712),
    right: Math.round(w * 0.5267),
    top: Math.round(h * 0.0986),
    middle: Math.round(h * 0.3286),
    bottom: Math.round(h * 0.5587)
  };

  const pos = String(position || "top").toLowerCase();
  if (family === "small") {
    const x = pos.includes("right") ? layout.right : layout.left;
    const y = pos.includes("bottom") ? layout.bottom : (pos.includes("middle") ? layout.middle : layout.top);
    return { x: x, y: y, width: layout.small, height: layout.small };
  }
  if (family === "large") {
    const y = pos.includes("bottom") ? layout.middle : layout.top;
    return { x: layout.left, y: y, width: layout.medium, height: layout.large };
  }
  const y = pos.includes("bottom") ? layout.bottom : (pos.includes("middle") ? layout.middle : layout.top);
  return { x: layout.left, y: y, width: layout.medium, height: layout.small };
}

function loadTransparentBgConfig() {
  try {
    const fm = FileManager.local();
    const path = fm.joinPath(fm.documentsDirectory(), TRANSPARENT_BG_CONFIG_FILE);
    if (fm.fileExists(path)) {
      const parsed = JSON.parse(fm.readString(path));
      if (parsed && typeof parsed === "object") return parsed;
    }
  } catch (e) {}
  return { enabled: false, family: "medium", position: "top" };
}

function saveTransparentBgConfig(cfg) {
  try {
    const fm = FileManager.local();
    const path = fm.joinPath(fm.documentsDirectory(), TRANSPARENT_BG_CONFIG_FILE);
    fm.writeString(path, JSON.stringify(cfg || { enabled: false }));
  } catch (e) {}
}

function getTransparentCropFileName(family) {
  return `accounting_transparent_crop_${family || "medium"}.jpg`;
}

function cropAndSaveTransparentBg(wallpaperImg, family, position) {
  const rect = computeTransparentCropRect(wallpaperImg.size.width, wallpaperImg.size.height, family, position);
  const dc = new DrawContext();
  dc.size = new Size(rect.width, rect.height);
  dc.opaque = false;
  dc.drawImageAtPoint(wallpaperImg, new Point(-rect.x, -rect.y));
  const cropped = dc.getImage();

  const fm = FileManager.local();
  const cropPath = fm.joinPath(fm.documentsDirectory(), getTransparentCropFileName(family));
  fm.writeImage(cropPath, cropped);
  return cropped;
}

function loadTransparentBgImage(family) {
  const cfg = loadTransparentBgConfig();
  if (!cfg || !cfg.enabled) return null;
  try {
    const fm = FileManager.local();
    const cropPath = fm.joinPath(fm.documentsDirectory(), getTransparentCropFileName(family));
    if (fm.fileExists(cropPath)) {
      return fm.readImage(cropPath);
    }
    const wallPath = fm.joinPath(fm.documentsDirectory(), TRANSPARENT_WALLPAPER_FILE);
    if (fm.fileExists(wallPath)) {
      const wallImg = fm.readImage(wallPath);
      return cropAndSaveTransparentBg(wallImg, family, cfg.position || "top");
    }
  } catch (e) {}
  return null;
}

async function openTransparentBgSetupMenu() {
  const cfg = loadTransparentBgConfig();
  const menu = new Alert();
  menu.title = "透明背景無邊框設定";
  menu.message = cfg.enabled
    ? `目前狀態：已開啟（${cfg.family || "medium"} / ${cfg.position || "top"}）`
    : "目前狀態：未開啟（使用漸層卡片）";
  menu.addAction("從相簿選取空白桌面截圖并設定位置");
  if (cfg.enabled) {
    menu.addAction("調整小工具位置（沿用已存截圖）");
    menu.addAction("關閉透明背景（恢復漸層卡片）");
  }
  menu.addCancelAction("取消");
  const pick = await menu.present();
  if (pick === -1) return false;

  const fm = FileManager.local();
  const wallPath = fm.joinPath(fm.documentsDirectory(), TRANSPARENT_WALLPAPER_FILE);

  if (cfg.enabled && pick === 2) {
    saveTransparentBgConfig({ enabled: false, family: cfg.family || "medium", position: cfg.position || "top" });
    const offAlert = new Alert();
    offAlert.title = "已關閉透明背景";
    offAlert.message = "小工具已恢復原本的主題漸層卡片背景。";
    offAlert.addAction("確定");
    await offAlert.present();
    return true;
  }

  let wallImg = null;
  if (pick === 0) {
    const guide = new Alert();
    guide.title = "準備空白桌面截圖";
    guide.message = "請先在 iPhone 主畫面長按進入編輯模式，滑到最右邊的「完全空白頁面」截圖一次，接著從相簿選取該截圖。";
    guide.addAction("前往相簿選取截圖");
    guide.addCancelAction("取消");
    if ((await guide.present()) === -1) return false;
    wallImg = await Photos.fromLibrary();
    if (!wallImg) return false;
    fm.writeImage(wallPath, wallImg);
  } else if (fm.fileExists(wallPath)) {
    wallImg = fm.readImage(wallPath);
  } else {
    return false;
  }

  const sizeMenu = new Alert();
  sizeMenu.title = "選擇這個小工具的尺寸";
  sizeMenu.addAction("中尺寸（4x2）");
  sizeMenu.addAction("小尺寸（2x2）");
  sizeMenu.addAction("大尺寸（4x4）");
  sizeMenu.addCancelAction("取消");
  const sIdx = await sizeMenu.present();
  if (sIdx === -1) return false;
  const family = sIdx === 1 ? "small" : (sIdx === 2 ? "large" : "medium");

  const posMenu = new Alert();
  posMenu.title = "選擇小工具放在桌面哪個位置";
  let posKeys = [];
  if (family === "small") {
    posKeys = ["top-left", "top-right", "middle-left", "middle-right", "bottom-left", "bottom-right"];
    ["左上", "右上", "中左", "中右", "左下", "右下"].forEach((t) => posMenu.addAction(t));
  } else if (family === "large") {
    posKeys = ["top", "bottom"];
    ["上方", "下方"].forEach((t) => posMenu.addAction(t));
  } else {
    posKeys = ["top", "middle", "bottom"];
    ["上方", "中間", "下方"].forEach((t) => posMenu.addAction(t));
  }
  posMenu.addCancelAction("取消");
  const pIdx = await posMenu.present();
  if (pIdx === -1) return false;
  const chosenPos = posKeys[pIdx] || "top";

  ["small", "medium", "large"].forEach((f) => {
    cropAndSaveTransparentBg(wallImg, f, chosenPos);
  });
  saveTransparentBgConfig({ enabled: true, family: family, position: chosenPos });
  config.widgetFamily = family;
  return true;
}

// 進入點
await main();

async function main() {
  const shortcutParam = String(args.shortcutParameter || (Array.isArray(args.plainTexts) ? args.plainTexts[0] : "") || "").trim();
  const actionParam = (args.queryParameters && args.queryParameters.action)
    || (/checkReminder/i.test(shortcutParam) ? "checkReminder" : (/testNotification/i.test(shortcutParam) ? "testNotification" : ""));

  // 0. 處理點擊小組件「+」觸發的極速記帳視窗
  if (actionParam === "quickAdd") {
    const targetUser = (args.queryParameters && args.queryParameters.user) || CURRENT_USER;
    loadActiveTheme(targetUser);
    await openQuickAddWebView(targetUser);
    Script.complete();
    return;
  }

  // 1. 處理點擊小組件或通知觸發的記帳主畫面請求
  if (actionParam === "openWebView") {
    const targetUser = (args.queryParameters && args.queryParameters.user) || CURRENT_USER;
    await openAccountingWebView(targetUser);
    Script.complete();
    return;
  }

  // 1B. 供捷徑自動化於每晚 23:00 呼叫即時檢查是否漏記
  if (actionParam === "checkReminder") {
    const targetUser = (args.queryParameters && args.queryParameters.user) || CURRENT_USER;
    const data = await fetchAccountingData(targetUser);
    await syncDailyReminderNotification(targetUser, data, true);
    Script.complete();
    return;
  }

  // 1C. 直接觸發測試通知
  if (actionParam === "testNotification") {
    const targetUser = (args.queryParameters && args.queryParameters.user) || CURRENT_USER;
    await scheduleTestReminderNotification(targetUser, 3);
    Script.complete();
    return;
  }

  loadActiveTheme(CURRENT_USER);

  // 2. 在 Scriptable App 內點擊執行時的快捷選單
  const hasQueryParams = args.queryParameters && Object.keys(args.queryParameters).length > 0;
  if (!config.runsInWidget && !hasQueryParams && !actionParam) {
    const remCfg = loadReminderConfig();
    const transCfg = loadTransparentBgConfig();
    const alert = new Alert();
    alert.title = `📱 ${CURRENT_USER} 記帳`;
    alert.message = `當前身份：【${CURRENT_USER}】\n目前主題：${THEME.themeName}\n目前版本：v${WIDGET_VERSION}\n每晚 23:00 提醒：${remCfg.enabled ? "已開啟" : "已關閉"}\n透明背景：${transCfg.enabled ? "已開啟" : "未開啟"}`;
    alert.addAction("⚡ 快速記一筆");
    alert.addAction("🚀 開啟全螢幕儀表板 WebView");
    alert.addAction("🎨 更換主題配色");
    alert.addAction("🔍 預覽 中尺寸 Widget (推薦)");
    alert.addAction("🔍 預覽 大尺寸 Widget");
    const otherUser = CURRENT_USER === "妤珊" ? "定成" : "妤珊";
    alert.addAction("🔍 預覽 小尺寸 Widget");
    alert.addAction(`切換預設身份（改為 ${otherUser}）`);
    alert.addAction("發送測試通知（5 秒後跳出）");
    alert.addAction(remCfg.enabled ? "每日 23:00 記帳提醒：已開啟（點此關閉）" : "每日 23:00 記帳提醒：已關閉（點此開啟）");
    alert.addAction(transCfg.enabled ? "透明背景設定（目前：已開啟）" : "透明背景設定（目前：未開啟）");
    alert.addCancelAction("取消");
    const choice = await alert.present();
    if (choice === 0) {
      await openQuickAddWebView(CURRENT_USER);
      Script.complete();
      return;
    } else if (choice === 1) {
      await openAccountingWebView(CURRENT_USER);
      Script.complete();
      return;
    } else if (choice === 2) {
      const presetUser = resolveTargetUser("");
      const changed = await openThemePickerMenu(presetUser);
      if (!changed) {
        Script.complete();
        return;
      }
      const activeUserAfterPick = loadLastWidgetUser() || presetUser || "定成";
      loadActiveTheme(activeUserAfterPick);
      const previewData = await fetchAccountingData(activeUserAfterPick);
      previewData.user = activeUserAfterPick;
      const previewWidget = await createWidget(previewData);
      config.widgetFamily = "medium";
      await previewWidget.presentMedium();
      Script.complete();
      return;
    } else if (choice === 3) {
      config.widgetFamily = "medium";
    } else if (choice === 4) {
      config.widgetFamily = "large";
    } else if (choice === 5) {
      config.widgetFamily = "small";
    } else if (choice === 6) {
      saveLastWidgetUser(otherUser);
      const okAlert = new Alert();
      okAlert.title = "已切換預設身份";
      okAlert.message = `本機預設身份已改為「${otherUser}」，下次開啟將自動套用。\n（若桌面小工具仍顯示舊名字，請長按桌面小工具 > 編輯小工具，將 Parameter 填入「${otherUser}」）`;
      okAlert.addAction("確定");
      await okAlert.present();
      Script.complete();
      return;
    } else if (choice === 7) {
      await scheduleTestReminderNotification(CURRENT_USER, 5);
      const testAlert = new Alert();
      testAlert.title = "測試通知已排程";
      testAlert.message = "通知將在 5 秒後跳出，請現在切回主畫面或鎖定螢幕查看；點選通知即可直接跳到記帳主畫面。";
      testAlert.addAction("確定");
      await testAlert.present();
      Script.complete();
      return;
    } else if (choice === 8) {
      const nextEnabled = !remCfg.enabled;
      saveReminderConfig({ enabled: nextEnabled, hour: 23, minute: 0 });
      const freshData = await fetchAccountingData(CURRENT_USER);
      await syncDailyReminderNotification(CURRENT_USER, freshData, false);
      const toggleAlert = new Alert();
      toggleAlert.title = "提醒設定已更新";
      toggleAlert.message = nextEnabled
        ? "已開啟每日 23:00 提醒：若當天尚無網頁或小工具手動記帳，將於 23:00 跳通知提醒您。"
        : "已關閉每日 23:00 記帳提醒。";
      toggleAlert.addAction("確定");
      await toggleAlert.present();
      Script.complete();
      return;
    } else if (choice === 9) {
      const updated = await openTransparentBgSetupMenu();
      if (!updated) {
        Script.complete();
        return;
      }
      const previewData = await fetchAccountingData(CURRENT_USER);
      const previewWidget = await createWidget(previewData);
      const fam = config.widgetFamily || "medium";
      if (fam === "small") await previewWidget.presentSmall();
      else if (fam === "large") await previewWidget.presentLarge();
      else await previewWidget.presentMedium();
      Script.complete();
      return;
    } else {
      Script.complete();
      return;
    }
  }

  const data = await fetchAccountingData(CURRENT_USER);
  await syncDailyReminderNotification(CURRENT_USER, data, false);
  const widget = await createWidget(data);

  if (config.runsInWidget) {
    Script.setWidget(widget);
  } else {
    // 依選擇預覽
    const family = config.widgetFamily || "medium";
    if (family === "small") {
      await widget.presentSmall();
    } else if (family === "large") {
      await widget.presentLarge();
    } else {
      await widget.presentMedium();
    }
  }
  Script.complete();
}

/**
 * 📱 呼叫 Scriptable 內建的原生全螢幕 WebView 視窗
 * 看完手指往下輕輕一滑即可關閉，完全不開 Safari、不留任何分頁！
 */
async function openAccountingWebView(user) {
  const targetUser = user || CURRENT_USER;
  const baseUrl = PAGE_URL || WEB_APP_URL;
  const targetUrl = baseUrl.includes("?")
    ? `${baseUrl}&user=${encodeURIComponent(targetUser)}`
    : `${baseUrl}?user=${encodeURIComponent(targetUser)}`;
  const wv = new WebView();
  await wv.loadURL(targetUrl);
  await wv.present(false); // false = 全螢幕沉浸式視窗
}

/**
 * 🌐 向 Google Apps Script 後端請求即時記帳資料（支援雙核心 API + 離線快取防護）
 */
async function fetchAccountingData(user) {
  user = user || CURRENT_USER;
  const fm = FileManager.local();
  const cachePath = fm.joinPath(fm.documentsDirectory(), `accounting_widget_cache_${user}.json`);

  // 1. 優先請求小工具專用極速 API（若 Google Apps Script 已部署新版，可包含即時欠款）
  try {
    const url = `${WEB_APP_URL}?action=getWidgetData&user=${encodeURIComponent(user)}`;
    const req = new Request(url);
    req.timeoutInterval = 8;
    const res = await req.loadJSON();

    if (res && res.success && res.data) {
      fm.writeString(cachePath, JSON.stringify(res.data));
      if (res.data.categoryNotes && typeof res.data.categoryNotes === "object") {
        saveLocalCategoryNotes(user, res.data.categoryNotes);
      }
      return res.data;
    }
  } catch (err) {
    console.warn("getWidgetData 嘗試失敗，自動切換至相容模式：" + err);
  }

  // 2. 智慧相容模式：直接讀取線上穩定生效的 getDashboardData API 並在手機端即時計算！
  try {
    const url = `${WEB_APP_URL}?action=getDashboardData&user=${encodeURIComponent(user)}`;
    const req = new Request(url);
    req.timeoutInterval = 10;
    const res = await req.loadJSON();

    if (res && res.success && res.data) {
      const computed = computeWidgetDataFromDashboard(res.data, user);
      fm.writeString(cachePath, JSON.stringify(computed));
      return computed;
    }
  } catch (err) {
    console.warn("getDashboardData 相容模式嘗試失敗：" + err);
  }

  // 3. 讀取離線快取（無網路或連線逾時時顯示最後一次紀錄）
  if (fm.fileExists(cachePath)) {
    try {
      const cachedStr = fm.readString(cachePath);
      return JSON.parse(cachedStr);
    } catch (e) {}
  }

  // 4. 預設備份資料（剛安裝尚未連線時顯示）
  return {
    user: user,
    todayStr: "2026/11/13",
    todayTotal: 0,
    todayCount: 0,
    todayRecords: [],
    recentRecords: [],
    monthTotal: 0,
    dingMonthTotal: 0,
    yuMonthTotal: 0,
    dailyAvg: 0,
    budget: (user === "定成") ? 15000 : 25000,
    remainingBudget: (user === "定成") ? 15000 : 25000,
    budgetProgress: 0,
    debtStatus: { text: "雙方已結清", amount: 0, debtor: "" },
    updatedAt: "--:--"
  };
}

/**
 * ⚡ 手機端即時解析 Dashboard 資料（相容模式，免等後端重新部署即可顯示真實今日花費）
 */
function computeWidgetDataFromDashboard(dashData, currentUser) {
  dashData = dashData || {};
  const now = new Date();

  const pad = (n) => (n < 10 ? "0" + n : "" + n);
  const year = now.getFullYear();
  const month = pad(now.getMonth() + 1);
  const date = pad(now.getDate());
  const hours = pad(now.getHours());
  const minutes = pad(now.getMinutes());

  const todayStr = `${year}/${month}/${date}`;
  const currentMonthKey = `${year}/${month}`;

  const yDayObj = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayStr = `${yDayObj.getFullYear()}/${pad(yDayObj.getMonth() + 1)}/${pad(yDayObj.getDate())}`;

  const allRecs = dashData.allRecords || [];
  const todayRecs = [];
  let todayTotal = 0;
  const yesterdayRecs = [];
  let yesterdayTotal = 0;
  let hasTodayManual = false;

  for (let i = 0; i < allRecs.length; i++) {
    const r = allRecs[i];
    if (r.day === todayStr && (String(r.Account || "").trim() === "現金" || Number(r["Account ID"] || 0) === 0)) {
      hasTodayManual = true;
    }
    if (r.Category === "收入") continue;
    if (r.day === todayStr) {
      todayTotal += Number(r.Amount) || 0;
      todayRecs.push(r);
    } else if (r.day === yesterdayStr) {
      yesterdayTotal += Number(r.Amount) || 0;
      yesterdayRecs.push(r);
    }
  }
  if (!hasTodayManual && getLocalManualCountToday(currentUser) > 0) {
    hasTodayManual = true;
  }

  // 若今日尚未有消費，取昨日花費；若昨日亦無，則取最近一次有消費的過去日期
  let pastDay = yesterdayStr;
  let pastRecs = yesterdayRecs;
  let pastTotal = yesterdayTotal;

  if (pastRecs.length === 0 && allRecs.length > 0) {
    for (let i = 0; i < allRecs.length; i++) {
      const r = allRecs[i];
      if (r.Category !== "收入" && r.day !== todayStr) {
        pastDay = r.day;
        break;
      }
    }
    if (pastDay) {
      for (let i = 0; i < allRecs.length; i++) {
        const r = allRecs[i];
        if (r.Category !== "收入" && r.day === pastDay) {
          pastTotal += Number(r.Amount) || 0;
          pastRecs.push(r);
        }
      }
    }
  }

  const hasToday = todayRecs.length > 0;
  const displayLabel = hasToday ? "今日支出" : "昨日支出";
  const displayTotal = hasToday ? Math.round(todayTotal) : Math.round(pastTotal);
  const displayRecords = hasToday ? todayRecs : pastRecs;

  const monthlySums = dashData.monthlyExpenses || {};
  const dingMonthTotal = (monthlySums["定成"] && monthlySums["定成"][currentMonthKey]) || 0;
  const yuMonthTotal = (monthlySums["妤珊"] && monthlySums["妤珊"][currentMonthKey]) || 0;

  const userSettings = dashData.userSettings || {};
  const uSettings = userSettings[currentUser] || {};
  const hasExplicitZero = (uSettings.explicitZeroBudget === true && Number(uSettings.monthlyBudget) === 0);
  const rawBudget = Number(uSettings.monthlyBudget !== undefined ? uSettings.monthlyBudget : uSettings.budget);
  const defaultBudget = (currentUser === "定成") ? 15000 : 25000;
  const userBudget = hasExplicitZero
    ? 0
    : ((!isNaN(rawBudget) && rawBudget > 0) ? rawBudget : defaultBudget);

  const userMonthTotal = (currentUser === "定成") ? dingMonthTotal : yuMonthTotal;
  const remainingBudget = userBudget > 0 ? Math.max(0, userBudget - userMonthTotal) : 0;

  if (dashData.categoryNotes && dashData.categoryNotes[currentUser]) {
    saveLocalCategoryNotes(currentUser, dashData.categoryNotes[currentUser]);
  }

  const dayOfMonth = Math.max(1, now.getDate());
  const dailyAvg = Math.round(userMonthTotal / dayOfMonth);

  return {
    user: currentUser,
    todayStr: todayStr,
    isToday: hasToday,
    hasTodayManual: hasTodayManual,
    expenseLabel: displayLabel,
    todayTotal: displayTotal,
    todayCount: displayRecords.length,
    todayRecords: displayRecords.slice(0, 12),
    recentRecords: allRecs.slice(0, 8),
    monthTotal: Math.round(userMonthTotal),
    dingMonthTotal: Math.round(dingMonthTotal),
    yuMonthTotal: Math.round(yuMonthTotal),
    dailyAvg: dailyAvg,
    budget: userBudget,
    explicitZeroBudget: hasExplicitZero,
    remainingBudget: Math.round(remainingBudget),
    budgetProgress: userBudget > 0 ? Math.min(100, Math.round((userMonthTotal / userBudget) * 100)) : 0,
    debtStatus: { text: "雙方已結清", amount: 0, debtor: "" },
    updatedAt: `${hours}:${minutes}`
  };
}

/**
 * 🎨 根據小工具尺寸渲染對應佈局
 */
async function createWidget(data) {
  const targetUser = data.user || CURRENT_USER;
  loadActiveTheme(targetUser);

  const family = config.widgetFamily || "medium";
  const widget = new ListWidget();
  widget.setPadding(14, 14, 14, 14);

  const transparentBg = loadTransparentBgImage(family);
  if (transparentBg) {
    widget.backgroundImage = transparentBg;
  } else {
    // 背景漸層
    const gradient = new LinearGradient();
    gradient.locations = [0, 1];
    gradient.colors = THEME.bgGradient;
    widget.backgroundGradient = gradient;
  }

  // 點擊小工具行為：必定帶上當前使用者參數，確保點妤珊跳轉妤珊、點定成跳轉定成！
  widget.url = getMainDashboardActionUrl(targetUser);

  if (family === "small") {
    renderSmallWidget(widget, data);
  } else if (family === "large") {
    renderLargeWidget(widget, data);
  } else {
    renderMediumWidget(widget, data);
  }

  return widget;
}

/**
 * --------------------------------------------------------------------
 * 1. 小尺寸組件 (Small 2x2)：簡潔洗鍊、字體放大、零多餘表情符號
 * --------------------------------------------------------------------
 */
function renderSmallWidget(widget, data) {
  const userColor = THEME.accentColor || ((data.user === "妤珊") ? THEME.accentPink : THEME.accentCyan);

  // 頂部列：使用者標題 + 更新時間
  const topRow = widget.addStack();
  topRow.layoutHorizontally();
  topRow.centerAlignContent();

  const title = topRow.addText(`${data.user}記帳`);
  title.font = Font.boldSystemFont(15);
  title.textColor = userColor;

  topRow.addSpacer();

  const timeText = topRow.addText(data.updatedAt || "");
  timeText.font = Font.systemFont(11);
  timeText.textColor = THEME.textMuted;

  widget.addSpacer(8);

  // 主焦點：支出（今日無消費時自動切換為「昨日支出」）
  const expenseTitle = data.expenseLabel || (data.isToday === false ? "昨日支出" : "今日支出");
  const todayLabel = widget.addText(expenseTitle);
  todayLabel.font = Font.systemFont(12);
  todayLabel.textColor = THEME.textSecondary;

  widget.addSpacer(2);

  const amountRow = widget.addStack();
  amountRow.layoutHorizontally();
  amountRow.bottomAlignContent();

  const dollarSign = amountRow.addText("$ ");
  dollarSign.font = Font.boldSystemFont(15);
  dollarSign.textColor = THEME.accentRose;

  const todayAmount = amountRow.addText(`${Number(data.todayTotal || 0).toLocaleString()}`);
  todayAmount.font = Font.boldSystemFont(27);
  todayAmount.textColor = THEME.textPrimary;

  widget.addSpacer(10);

  // 本月日均花費（使用者要求：小組件改成日均花費，不放預算剩餘）
  const now = new Date();
  const dayOfMonth = Math.max(1, now.getDate());
  const dailyAvg = (data.dailyAvg !== undefined)
    ? Number(data.dailyAvg || 0)
    : Math.round(Number(data.monthTotal || 0) / dayOfMonth);

  const avgRow = widget.addStack();
  avgRow.layoutHorizontally();
  avgRow.centerAlignContent();

  const avgText = avgRow.addText(`日均花費 $${dailyAvg.toLocaleString()}`);
  avgText.font = Font.mediumSystemFont(12);
  avgText.textColor = THEME.accentGreen;

  widget.addSpacer(6);

  // 底部欠款狀態膠囊（簡潔純文字，不加混亂符號）
  const debtPill = widget.addStack();
  debtPill.layoutHorizontally();
  debtPill.centerAlignContent();
  debtPill.backgroundColor = THEME.cardBg;
  debtPill.cornerRadius = 6;
  debtPill.setPadding(3, 8, 3, 8);

  let debtStr = "雙方已結清";
  if (data.debtStatus && data.debtStatus.amount > 0) {
    debtStr = data.debtStatus.text || `${data.debtStatus.debtor}欠${data.debtStatus.creditor} $${data.debtStatus.amount}`;
  }
  const debtText = debtPill.addText(debtStr);
  debtText.font = Font.boldSystemFont(12);
  debtText.textColor = (data.debtStatus && data.debtStatus.amount > 0) ? THEME.accentAmber : THEME.textSecondary;
  debtText.lineLimit = 1;
}

/**
 * --------------------------------------------------------------------
 * 2. 中尺寸組件 (Medium 4x2)：字體放大、專注本人數據、顯示達 5 筆明細、金額無負號
 * --------------------------------------------------------------------
 */
function renderMediumWidget(widget, data) {
  const userColor = THEME.accentColor || ((data.user === "妤珊") ? THEME.accentPink : THEME.accentCyan);
  const displayItems = (data.todayRecords || []);

  if (displayItems.length === 0) {
    renderMediumDashboardView(widget, data, userColor);
  } else {
    renderMediumSplitView(widget, data, userColor, displayItems);
  }
}

function getWidgetBudgetDisplay(data) {
  const budgetVal = Number(data && data.budget);
  const hasBudget = !isNaN(budgetVal) && budgetVal > 0;
  if (!hasBudget) {
    return {
      hasBudget: false,
      remainLabel: "未設預算",
      splitRemainLabel: "未設預算",
      remainColor: THEME.textMuted
    };
  }
  const remaining = Number(data.remainingBudget || 0);
  const pct = Number(data.budgetProgress || 0);
  const isOver = Number(data.monthTotal || 0) > budgetVal;
  return {
    hasBudget: true,
    remainLabel: isOver ? `已達預算上限 (${pct}%)` : `預算剩餘 $${remaining.toLocaleString()} (${pct}%)`,
    splitRemainLabel: isOver ? "已超支" : `剩 $${remaining.toLocaleString()}`,
    remainColor: isOver ? THEME.accentRose : THEME.accentGreen
  };
}

/**
 * 🌟 中尺寸：全寬度平衡看板（今日無消費時專用，充實飽滿、零空洞、不縮角）
 */
function renderMediumDashboardView(widget, data, userColor) {
  const topHeader = widget.addStack();
  topHeader.layoutHorizontally();
  topHeader.centerAlignContent();

  const title = topHeader.addText(`${data.user} 記帳儀表板`);
  title.font = Font.boldSystemFont(13);
  title.textColor = userColor;

  topHeader.addSpacer();

  const timeLabel = topHeader.addText(`更新 ${data.updatedAt || ""}`);
  timeLabel.font = Font.systemFont(10);
  timeLabel.textColor = THEME.textMuted;

  topHeader.addSpacer(6);
  addQuickAddPill(topHeader, data.user || CURRENT_USER, userColor, true);

  widget.addSpacer(8);

  const gridRow = widget.addStack();
  gridRow.layoutHorizontally();

  const todayCard = gridRow.addStack();
  todayCard.layoutVertically();
  todayCard.backgroundColor = THEME.cardBg;
  todayCard.cornerRadius = 8;
  todayCard.setPadding(6, 10, 6, 10);

  const expenseTitle = data.expenseLabel || (data.isToday === false ? "昨日支出" : "今日支出");
  const todayLabel = todayCard.addText(expenseTitle);
  todayLabel.font = Font.systemFont(10);
  todayLabel.textColor = THEME.textMuted;

  todayCard.addSpacer(2);

  const todayValRow = todayCard.addStack();
  todayValRow.layoutHorizontally();
  todayValRow.bottomAlignContent();

  const dollarSign = todayValRow.addText("$ ");
  dollarSign.font = Font.boldSystemFont(12);
  dollarSign.textColor = THEME.accentRose;

  const todayNum = todayValRow.addText(`${Number(data.todayTotal || 0).toLocaleString()}`);
  todayNum.font = Font.boldSystemFont(18);
  todayNum.textColor = THEME.textPrimary;

  gridRow.addSpacer(8);

  const debtCard = gridRow.addStack();
  debtCard.layoutVertically();
  debtCard.backgroundColor = THEME.cardBg;
  debtCard.cornerRadius = 8;
  debtCard.setPadding(6, 10, 6, 10);

  const debtTitle = debtCard.addText("欠款狀態");
  debtTitle.font = Font.systemFont(10);
  debtTitle.textColor = THEME.textMuted;

  debtCard.addSpacer(2);

  let debtStr = "雙方已結清";
  if (data.debtStatus && data.debtStatus.amount > 0) {
    debtStr = data.debtStatus.text || `${data.debtStatus.debtor}欠${data.debtStatus.creditor} $${data.debtStatus.amount}`;
  }
  const debtVal = debtCard.addText(debtStr);
  debtVal.font = Font.boldSystemFont(12);
  debtVal.textColor = (data.debtStatus && data.debtStatus.amount > 0) ? THEME.accentAmber : THEME.textSecondary;
  debtVal.lineLimit = 1;

  widget.addSpacer(8);

  const budgetCard = widget.addStack();
  budgetCard.layoutVertically();
  budgetCard.backgroundColor = THEME.cardBg;
  budgetCard.cornerRadius = 8;
  budgetCard.setPadding(7, 10, 7, 10);

  const budgetHeader = budgetCard.addStack();
  budgetHeader.layoutHorizontally();
  budgetHeader.centerAlignContent();

  const monthExpenseText = budgetHeader.addText(`本月支出 $${Number(data.monthTotal || 0).toLocaleString()}`);
  monthExpenseText.font = Font.boldSystemFont(11);
  monthExpenseText.textColor = userColor;

  budgetHeader.addSpacer();

  const budgetDisplay = getWidgetBudgetDisplay(data);

  const budgetRemainText = budgetHeader.addText(budgetDisplay.remainLabel);
  budgetRemainText.font = Font.systemFont(10);
  budgetRemainText.textColor = budgetDisplay.remainColor;

  budgetCard.addSpacer(5);

  const barImg = createProgressBarImage(data.budgetProgress, 310, 6, userColor, THEME.progressTrack);
  const barNode = budgetCard.addImage(barImg);
  barNode.imageSize = new Size(310, 6);

  widget.addSpacer();
}

/**
 * 🌟 中尺寸：雙欄明細模式（今日有消費時，左看板 ＋ 右明細，比例協調）
 */
function renderMediumSplitView(widget, data, userColor, displayItems) {
  const mainRow = widget.addStack();
  mainRow.layoutHorizontally();

  const leftCol = mainRow.addStack();
  leftCol.layoutVertically();
  const leftWidth = 152;
  leftCol.size = new Size(leftWidth, 0);

  const topHeader = leftCol.addStack();
  topHeader.layoutHorizontally();
  topHeader.centerAlignContent();

  const userTitle = topHeader.addText(`${data.user} 記帳`);
  userTitle.font = Font.boldSystemFont(15);
  userTitle.textColor = userColor;

  topHeader.addSpacer();

  const timeText = topHeader.addText(data.updatedAt || "");
  timeText.font = Font.systemFont(11);
  timeText.textColor = THEME.textMuted;

  leftCol.addSpacer(7);

  const expenseTitle = data.expenseLabel || (data.isToday === false ? "昨日支出" : "今日支出");
  const todayLabel = leftCol.addText(expenseTitle);
  todayLabel.font = Font.systemFont(12);
  todayLabel.textColor = THEME.textMuted;

  const todayValRow = leftCol.addStack();
  todayValRow.layoutHorizontally();
  todayValRow.bottomAlignContent();

  const dollarSign = todayValRow.addText("$ ");
  dollarSign.font = Font.boldSystemFont(14);
  dollarSign.textColor = THEME.accentRose;

  const todayNum = todayValRow.addText(`${Number(data.todayTotal || 0).toLocaleString()}`);
  todayNum.font = Font.boldSystemFont(22);
  todayNum.textColor = THEME.textPrimary;

  leftCol.addSpacer(7);

  const monthRow = leftCol.addStack();
  monthRow.layoutHorizontally();
  monthRow.centerAlignContent();

  const myMonthText = monthRow.addText(`本月 $${Number(data.monthTotal || 0).toLocaleString()}`);
  myMonthText.font = Font.mediumSystemFont(11);
  myMonthText.textColor = userColor;

  monthRow.addSpacer();

  const budgetDisplay = getWidgetBudgetDisplay(data);
  const myRemainText = monthRow.addText(budgetDisplay.splitRemainLabel);
  myRemainText.font = Font.mediumSystemFont(11);
  myRemainText.textColor = budgetDisplay.remainColor;

  leftCol.addSpacer(4);

  const barHeight = 5;
  const barImg = createProgressBarImage(data.budgetProgress, leftWidth, barHeight, userColor, THEME.progressTrack);
  const barNode = leftCol.addImage(barImg);
  barNode.imageSize = new Size(leftWidth, barHeight);

  leftCol.addSpacer(8);

  const debtCard = leftCol.addStack();
  debtCard.layoutHorizontally();
  debtCard.centerAlignContent();
  debtCard.backgroundColor = THEME.cardBg;
  debtCard.cornerRadius = 6;
  debtCard.setPadding(4, 7, 4, 7);

  let debtStr = "雙方已結清";
  if (data.debtStatus && data.debtStatus.amount > 0) {
    debtStr = data.debtStatus.text || `${data.debtStatus.debtor}欠${data.debtStatus.creditor} $${data.debtStatus.amount}`;
  }
  const debtText = debtCard.addText(debtStr);
  debtText.font = Font.boldSystemFont(12);
  debtText.textColor = (data.debtStatus && data.debtStatus.amount > 0) ? THEME.accentAmber : THEME.textSecondary;
  debtText.lineLimit = 1;

  leftCol.addSpacer();

  mainRow.addSpacer(7);

  const divider = mainRow.addStack();
  divider.size = new Size(1, 122);
  divider.backgroundColor = THEME.border;

  mainRow.addSpacer(8);

  const rightCol = mainRow.addStack();
  rightCol.layoutVertically();

  const rightHeader = rightCol.addStack();
  rightHeader.layoutHorizontally();
  rightHeader.centerAlignContent();

  const countStr = (data.todayCount !== undefined) ? data.todayCount : displayItems.length;
  const listHeaderTitle = (data.isToday === false) ? `昨日明細 (${countStr} 筆)` : `今日明細 (${countStr} 筆)`;
  const listTitle = rightHeader.addText(listHeaderTitle);
  listTitle.font = Font.boldSystemFont(13);
  listTitle.textColor = THEME.textSecondary;

  rightHeader.addSpacer();
  addQuickAddPill(rightHeader, data.user || CURRENT_USER, userColor, true);

  const itemsToShow = displayItems.slice(0, 8);
  const isDenseList = itemsToShow.length > 5;
  rightCol.addSpacer(isDenseList ? 3 : 5);

  itemsToShow.forEach((item, index) => {
    renderTransactionRow(rightCol, item, isDenseList ? 10 : 12);
    if (index < itemsToShow.length - 1) {
      rightCol.addSpacer(isDenseList ? 1 : 3);
    }
  });

  if (displayItems.length > 8) {
    rightCol.addSpacer(2);
    const moreHint = rightCol.addText(`還有 ${displayItems.length - 8} 筆，點開看全部`);
    moreHint.font = Font.systemFont(9);
    moreHint.textColor = THEME.textMuted;
  }

  rightCol.addSpacer();
}

function renderLargeWidget(widget, data) {
  const userColor = THEME.accentColor || ((data.user === "妤珊") ? THEME.accentPink : THEME.accentCyan);

  const topHeader = widget.addStack();
  topHeader.layoutHorizontally();
  topHeader.centerAlignContent();

  const mainTitle = topHeader.addText(`${data.user} 記帳儀表板`);
  mainTitle.font = Font.boldSystemFont(15);
  mainTitle.textColor = userColor;

  topHeader.addSpacer();

  const timeLabel = topHeader.addText(`更新 ${data.updatedAt}`);
  timeLabel.font = Font.systemFont(11);
  timeLabel.textColor = THEME.textMuted;

  topHeader.addSpacer(8);
  addQuickAddPill(topHeader, data.user || CURRENT_USER, userColor, false);

  widget.addSpacer(10);

  const gridRow = widget.addStack();
  gridRow.layoutHorizontally();

  const largeExpenseTitle = data.expenseLabel || (data.isToday === false ? "昨日支出" : "今日支出");
  renderMetricCard(gridRow, largeExpenseTitle, `$${Number(data.todayTotal || 0).toLocaleString()}`, THEME.accentRose);
  gridRow.addSpacer(8);

  let debtStr = "雙方已結清";
  if (data.debtStatus && data.debtStatus.amount > 0) {
    debtStr = data.debtStatus.text || `${data.debtStatus.debtor}欠${data.debtStatus.creditor} $${data.debtStatus.amount}`;
  }
  renderMetricCard(gridRow, "欠款餘額", debtStr, (data.debtStatus && data.debtStatus.amount > 0) ? THEME.accentAmber : THEME.textSecondary);

  widget.addSpacer(8);

  const budgetCard = widget.addStack();
  budgetCard.layoutVertically();
  budgetCard.backgroundColor = THEME.cardBg;
  budgetCard.cornerRadius = 8;
  budgetCard.setPadding(8, 10, 8, 10);

  const budgetHeader = budgetCard.addStack();
  budgetHeader.layoutHorizontally();
  budgetHeader.centerAlignContent();

  const monthExpenseText = budgetHeader.addText(`本月支出 $${Number(data.monthTotal || 0).toLocaleString()}`);
  monthExpenseText.font = Font.boldSystemFont(12);
  monthExpenseText.textColor = userColor;

  budgetHeader.addSpacer();

  const budgetDisplay = getWidgetBudgetDisplay(data);

  const budgetRemainText = budgetHeader.addText(budgetDisplay.remainLabel);
  budgetRemainText.font = Font.systemFont(11);
  budgetRemainText.textColor = budgetDisplay.remainColor;

  budgetCard.addSpacer(6);

  const barImg = createProgressBarImage(data.budgetProgress, 310, 8, userColor, THEME.progressTrack);
  const barNode = budgetCard.addImage(barImg);
  barNode.imageSize = new Size(310, 8);

  const todayItems = (data.todayRecords || []);

  if (todayItems.length > 0) {
    widget.addSpacer(10);

    const divider = widget.addStack();
    divider.size = new Size(0, 1);
    divider.backgroundColor = THEME.border;

    widget.addSpacer(8);

    const listHeader = widget.addStack();
    listHeader.layoutHorizontally();
    listHeader.centerAlignContent();

    const countStr = (data.todayCount !== undefined) ? data.todayCount : todayItems.length;
    const listHeaderTitle = (data.isToday === false) ? `昨日消費明細（${countStr} 筆）` : `今日消費明細（${countStr} 筆）`;
    const listTitle = listHeader.addText(listHeaderTitle);
    listTitle.font = Font.boldSystemFont(12);
    listTitle.textColor = THEME.textSecondary;

    if (todayItems.length > 12) {
      listHeader.addSpacer();
      const moreText = listHeader.addText(`顯示最新 12 筆`);
      moreText.font = Font.systemFont(10);
      moreText.textColor = THEME.textMuted;
    }

    widget.addSpacer(6);

    if (todayItems.length <= 4) {
      const displayItems = todayItems.slice(0, 4);
      displayItems.forEach((item, index) => {
        renderDetailedTransactionRow(widget, item);
        if (index < displayItems.length - 1) {
          widget.addSpacer(4);
        }
      });
    } else {
      const displayItems = todayItems.slice(0, 12);
      const isUltraDense = displayItems.length > 8;
      const half = Math.ceil(displayItems.length / 2);
      const leftItems = displayItems.slice(0, half);
      const rightItems = displayItems.slice(half);

      const twoColStack = widget.addStack();
      twoColStack.layoutHorizontally();

      const leftCol = twoColStack.addStack();
      leftCol.layoutVertically();
      leftItems.forEach((item, index) => {
        renderCompactTransactionRow(leftCol, item, isUltraDense);
        if (index < leftItems.length - 1) {
          leftCol.addSpacer(isUltraDense ? 2 : 4);
        }
      });

      twoColStack.addSpacer(8);

      const rightCol = twoColStack.addStack();
      rightCol.layoutVertically();
      rightItems.forEach((item, index) => {
        renderCompactTransactionRow(rightCol, item, isUltraDense);
        if (index < rightItems.length - 1) {
          rightCol.addSpacer(isUltraDense ? 2 : 4);
        }
      });
    }
  }

  widget.addSpacer();
}

/**
 * 🎨 繪製比照網頁版的圓角平滑進度條圖片
 */
function createProgressBarImage(progress, width, height, fillColor, bgColor) {
  const dc = new DrawContext();
  dc.size = new Size(width, height);
  dc.opaque = false;
  dc.respectScreenScale = true;

  const bgPath = new Path();
  bgPath.addRoundedRect(new Rect(0, 0, width, height), height / 2, height / 2);
  dc.addPath(bgPath);
  dc.setFillColor(bgColor);
  dc.fillPath();

  const safeProgress = Math.max(0, Math.min(100, Number(progress) || 0));
  const fillW = Math.max(height, (width * safeProgress) / 100);
  const fillPath = new Path();
  fillPath.addRoundedRect(new Rect(0, 0, fillW, height), height / 2, height / 2);
  dc.addPath(fillPath);
  dc.setFillColor(fillColor);
  dc.fillPath();

  return dc.getImage();
}

/**
 * 輔助組件：指標小卡片
 */
function renderMetricCard(parent, title, value, valColor) {
  const card = parent.addStack();
  card.layoutVertically();
  card.backgroundColor = THEME.cardBg;
  card.cornerRadius = 8;
  card.setPadding(6, 8, 6, 8);

  const t = card.addText(title);
  t.font = Font.systemFont(10);
  t.textColor = THEME.textMuted;

  card.addSpacer(2);

  const v = card.addText(value);
  v.font = Font.boldSystemFont(13);
  v.textColor = valColor;
  v.lineLimit = 1;
}

/**
 * 輔助組件：中尺寸簡潔單列交易項目（金額不加負號）
 */
function renderTransactionRow(parent, item, fontSize = 12) {
  const row = parent.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();

  const itemName = row.addText(item.note || item.Category || "消費");
  itemName.font = Font.mediumSystemFont(fontSize);
  itemName.textColor = THEME.textPrimary;
  itemName.lineLimit = 1;

  row.addSpacer();

  const isIncome = (item.Category === "收入");
  const amtSign = isIncome ? "+$" : "$";
  const amtText = row.addText(`${amtSign}${Number(item.Amount || 0).toLocaleString()}`);
  amtText.font = Font.boldSystemFont(fontSize);
  amtText.textColor = isIncome ? THEME.accentGreen : THEME.textPrimary;
}

/**
 * 輔助組件：大尺寸詳細交易行（金額不加負號）
 */
function renderDetailedTransactionRow(parent, item) {
  const row = parent.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();
  row.backgroundColor = THEME.cardBg;
  row.cornerRadius = 6;
  row.setPadding(4, 8, 4, 8);

  const col = row.addStack();
  col.layoutVertically();

  const noteText = col.addText(item.note || item.Category || "消費");
  noteText.font = Font.mediumSystemFont(13);
  noteText.textColor = THEME.textPrimary;
  noteText.lineLimit = 1;

  const timeStr = item["Recorded At"] ? item["Recorded At"].slice(11, 16) : "";
  const subText = col.addText(`${timeStr} ｜ ${item.Account || "現金"}`);
  subText.font = Font.systemFont(11);
  subText.textColor = THEME.textMuted;

  row.addSpacer();

  const isIncome = (item.Category === "收入");
  const amtSign = isIncome ? "+$" : "$";
  const amtText = row.addText(`${amtSign}${Number(item.Amount || 0).toLocaleString()}`);
  amtText.font = Font.boldSystemFont(14);
  amtText.textColor = isIncome ? THEME.accentGreen : THEME.textPrimary;
}

/**
 * 🏷️ 雙欄緊湊型消費小卡片（專為 5 筆以上消費設計，左右並列、節省空間絕不擠破上方）
 */
function renderCompactTransactionRow(parent, item, ultraDense = false) {
  const row = parent.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();
  row.backgroundColor = THEME.cardBg;
  row.cornerRadius = 6;
  row.setPadding(ultraDense ? 3 : 4, ultraDense ? 6 : 7, ultraDense ? 3 : 4, ultraDense ? 6 : 7);

  const cat = String(item.Category || "其他").trim();
  const symName = CATEGORY_SYMBOLS[cat] || "tag.fill";
  const sym = SFSymbol.named(symName);
  if (sym) {
    const symImg = row.addImage(sym.image);
    symImg.imageSize = new Size(ultraDense ? 10 : 11, ultraDense ? 10 : 11);
    symImg.tintColor = THEME.accentColor || THEME.accentCyan;
  }

  row.addSpacer(4);

  const titleStr = String(item.note || item.Category || "消費").trim();
  const title = row.addText(titleStr);
  title.font = Font.systemFont(ultraDense ? 10 : 11);
  title.textColor = THEME.textPrimary;
  title.lineLimit = 1;

  row.addSpacer();

  const amt = Number(item.Amount || 0);
  const amtText = row.addText(`$${amt.toLocaleString()}`);
  amtText.font = Font.boldSystemFont(ultraDense ? 10 : 11);
  amtText.textColor = (item.Category === "收入") ? THEME.accentGreen : THEME.accentRose;
}

/**
 * ⚡ 小組件「+」快捷按鈕
 */
function addQuickAddPill(parentStack, targetUser, userColor, compact) {
  const scriptName = Script.name() || "記帳小組件";
  const userHex = THEME.accentHex || ((targetUser === "妤珊") ? "#f472b6" : "#38bdf8");

  const btn = parentStack.addStack();
  btn.layoutHorizontally();
  btn.centerAlignContent();
  btn.backgroundColor = THEME.isLight ? new Color(userHex, 0.1) : new Color(userHex, 0.18);
  btn.borderColor = THEME.isLight ? new Color(userHex, 0.35) : new Color(userHex, 0.55);
  btn.borderWidth = 1;
  btn.cornerRadius = compact ? 9 : 10;
  btn.size = new Size(compact ? 24 : 28, compact ? 18 : 20);
  btn.url = `scriptable:///run?scriptName=${encodeURIComponent(scriptName)}&action=quickAdd&user=${encodeURIComponent(targetUser)}`;

  btn.addSpacer();
  const plusSym = SFSymbol.named("plus");
  if (plusSym) {
    if (typeof plusSym.applyBoldWeight === "function") {
      plusSym.applyBoldWeight();
    }
    const icon = btn.addImage(plusSym.image);
    icon.imageSize = new Size(compact ? 10 : 12, compact ? 10 : 12);
    icon.tintColor = userColor;
  } else {
    const label = btn.addText("+");
    label.font = Font.boldSystemFont(compact ? 13 : 14);
    label.textColor = userColor;
  }
  btn.addSpacer();

  return btn;
}

/**
 * ✨ 打開高質感暗色毛玻璃「快速記帳」視窗
 */
async function openQuickAddWebView(initialUser) {
  const targetUser = (initialUser === "妤珊") ? "妤珊" : "定成";
  loadActiveTheme(targetUser);

  const cachedNotesByUser = {
    "定成": loadLocalCategoryNotes("定成"),
    "妤珊": loadLocalCategoryNotes("妤珊")
  };
  const hasNotesCache = Object.keys(cachedNotesByUser[targetUser] || {}).length > 0;
  const wv = new WebView();

  wv.shouldAllowRequest = (request) => {
    const url = request.url || "";
    if (url.startsWith("quickadd://submit")) {
      const queryPart = url.split("payload=")[1] || "";
      try {
        const payload = JSON.parse(decodeURIComponent(queryPart));
        processQuickAddSubmission(wv, payload);
      } catch (err) {
        wv.evaluateJavaScript("onQuickAddError('資料格式解析失敗')");
      }
      return false;
    }
    if (url.startsWith("quickadd://delete")) {
      const queryPart = url.split("payload=")[1] || "";
      try {
        const payload = JSON.parse(decodeURIComponent(queryPart));
        processQuickAddDelete(wv, payload);
      } catch (err) {
        wv.evaluateJavaScript("onQuickAddDeleteError('刪除資料解析失敗')");
      }
      return false;
    }
    if (url.startsWith("quickadd://syncnotes")) {
      const uMatch = url.match(/user=([^&]+)/);
      const u = uMatch ? decodeURIComponent(uMatch[1]) : targetUser;
      const hasU = Object.keys(loadLocalCategoryNotes(u) || {}).length > 0;
      syncCategoryNotesFromCloud(u, wv, hasU);
      return false;
    }
    if (url.startsWith("quickadd://dashboard")) {
      const uMatch = url.match(/user=([^&]+)/);
      const u = uMatch ? decodeURIComponent(uMatch[1]) : targetUser;
      const baseUrl = PAGE_URL || WEB_APP_URL;
      const dest = baseUrl.includes("?")
        ? `${baseUrl}&user=${encodeURIComponent(u)}`
        : `${baseUrl}?user=${encodeURIComponent(u)}`;
      wv.loadURL(dest);
      return false;
    }
    return true;
  };

  await wv.loadHTML(buildQuickAddHtml(targetUser, cachedNotesByUser, hasNotesCache));
  syncCategoryNotesFromCloud(targetUser, wv, hasNotesCache);
  await wv.present(false);
}

/**
 * 🏷️ 讀取與更新「個人各分類前 10 個常用備註」本地快取
 */
function loadLocalCategoryNotes(user) {
  try {
    const fm = FileManager.local();
    const path = fm.joinPath(fm.documentsDirectory(), `accounting_category_notes_${user}.json`);
    if (fm.fileExists(path)) {
      const parsed = JSON.parse(fm.readString(path));
      if (parsed && typeof parsed === "object") return parsed;
    }
  } catch (e) {}
  return {};
}

function saveLocalCategoryNotes(user, notesMap) {
  try {
    const fm = FileManager.local();
    const path = fm.joinPath(fm.documentsDirectory(), `accounting_category_notes_${user}.json`);
    fm.writeString(path, JSON.stringify(notesMap || {}));
  } catch (e) {}
}

function mergeCategoryNotesFromRecords(records, existingMap, isFullRebuild) {
  const result = isFullRebuild ? {} : Object.assign({}, existingMap || {});
  const freshByCat = {};

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const cat = String(r.Category || r.category || "").trim();
    const note = String(r.note || r.Note || "").trim();
    if (!cat || !note || note === cat) continue;

    if (!freshByCat[cat]) freshByCat[cat] = [];
    if (freshByCat[cat].indexOf(note) === -1 && freshByCat[cat].length < 10) {
      freshByCat[cat].push(note);
    }
  }

  Object.keys(freshByCat).forEach((cat) => {
    const freshList = freshByCat[cat];
    if (isFullRebuild) {
      result[cat] = freshList.slice(0, 10);
    } else {
      const oldList = Array.isArray(result[cat]) ? result[cat] : [];
      const merged = freshList.slice();
      for (let j = 0; j < oldList.length && merged.length < 10; j++) {
        if (merged.indexOf(oldList[j]) === -1) {
          merged.push(oldList[j]);
        }
      }
      result[cat] = merged.slice(0, 10);
    }
  });

  return result;
}

function updateLocalCategoryNotesAfterAdd(user, category, note) {
  const cat = String(category || "").trim();
  const cleanNote = String(note || "").trim();
  const currentMap = loadLocalCategoryNotes(user);
  if (!cat || !cleanNote || cleanNote === cat) return currentMap;

  const list = Array.isArray(currentMap[cat]) ? currentMap[cat].slice() : [];
  const existingIdx = list.indexOf(cleanNote);
  if (existingIdx !== -1) {
    list.splice(existingIdx, 1);
  }
  list.unshift(cleanNote);
  currentMap[cat] = list.slice(0, 10);
  saveLocalCategoryNotes(user, currentMap);
  return currentMap;
}

async function syncCategoryNotesFromCloud(user, wv, hasNotesCache) {
  try {
    try {
      const fastNotesUrl = `${WEB_APP_URL}?action=getCategoryNotes&user=${encodeURIComponent(user)}`;
      const fastReq = new Request(fastNotesUrl);
      fastReq.timeoutInterval = 8;
      const fastRes = await fastReq.loadJSON();
      if (fastRes && fastRes.success && fastRes.categoryNotes && typeof fastRes.categoryNotes === "object") {
        saveLocalCategoryNotes(user, fastRes.categoryNotes);
        try {
          await wv.evaluateJavaScript(`updateCategoryNotesMap(${JSON.stringify(fastRes.categoryNotes)}, ${JSON.stringify(user)})`);
        } catch (e) {}
        return;
      }
    } catch (eFast) {}

    const queryUrl = hasNotesCache
      ? `${WEB_APP_URL}?action=getDashboardData&user=${encodeURIComponent(user)}`
      : `${WEB_APP_URL}?action=getDashboardData&all=true&user=${encodeURIComponent(user)}`;
    const req = new Request(queryUrl);
    req.timeoutInterval = hasNotesCache ? 10 : 20;
    const res = await req.loadJSON();

    if (res && res.success && res.data && Array.isArray(res.data.allRecords)) {
      const currentMap = loadLocalCategoryNotes(user);
      const updatedMap = (res.data.categoryNotes && res.data.categoryNotes[user])
        ? res.data.categoryNotes[user]
        : mergeCategoryNotesFromRecords(res.data.allRecords, currentMap, !hasNotesCache);
      saveLocalCategoryNotes(user, updatedMap);
      try {
        await wv.evaluateJavaScript(`updateCategoryNotesMap(${JSON.stringify(updatedMap)}, ${JSON.stringify(user)})`);
      } catch (e) {}
    } else {
      try {
        await wv.evaluateJavaScript(`markCategorySyncDone()`);
      } catch (e) {}
    }
  } catch (err) {
    try {
      await wv.evaluateJavaScript(`markCategorySyncDone()`);
    } catch (e) {}
  }
}

/**
 * 🚀 透過 Scriptable 原生 Request 送出記帳（零 CORS 問題、自動更新本地快取）
 */
async function processQuickAddSubmission(wv, payload) {
  try {
    const req = new Request(WEB_APP_URL);
    req.method = "POST";
    req.headers = { "Content-Type": "application/json" };
    req.timeoutInterval = 15;

    if (payload && payload.mode === "split") {
      const payer = payload.payer || CURRENT_USER;
      const debtor = (payer === "定成") ? "妤珊" : "定成";
      const splitNote = payload.note || payload.Category || "現金消費";
      const splitCat = payload.Category || "食物";
      req.body = JSON.stringify({
        action: "cashSplit",
        payer: payer,
        totalAmount: Number(payload.totalAmount),
        payerAmount: Number(payload.payerAmount),
        isHalf: !!payload.isHalf,
        category: splitCat,
        note: splitNote,
        recordedAt: payload["Recorded At"] || ""
      });

      const res = await req.loadJSON();
      if (res && res.success) {
        const payerShare = Number(res.payerAmount !== undefined ? res.payerAmount : payload.payerAmount) || 0;
        const debtorShare = Number(res.debtorAmount !== undefined ? res.debtorAmount : (Number(payload.totalAmount) - payerShare)) || 0;
        const finalCat = res.category || splitCat;
        const finalNote = res.note || splitNote;
        const finalTime = res.recordedAt || payload["Recorded At"] || "";
        const updatedByUser = {};

        if (payerShare > 0) {
          updateLocalWidgetCacheAfterAdd(payer, res.payerRecord || {
            Account: "現金",
            Category: finalCat,
            Amount: payerShare,
            Currency: "TWD",
            "Recorded At": finalTime,
            note: finalNote
          });
          updatedByUser[payer] = updateLocalCategoryNotesAfterAdd(payer, finalCat, finalNote);
        }
        if (debtorShare > 0) {
          updateLocalWidgetCacheAfterAdd(debtor, res.debtorRecord || {
            Account: "現金",
            Category: finalCat,
            Amount: debtorShare,
            Currency: "TWD",
            "Recorded At": finalTime,
            note: finalNote
          });
          updatedByUser[debtor] = updateLocalCategoryNotesAfterAdd(debtor, finalCat, finalNote);
        }
        updateLocalManualState(CURRENT_USER, 1);
        if (payer !== CURRENT_USER) updateLocalManualState(payer, 1);
        await syncDailyReminderNotification(CURRENT_USER, { hasTodayManual: true }, false);
        try {
          await wv.evaluateJavaScript(`onQuickAddSuccess(${JSON.stringify(res)}, ${JSON.stringify(updatedByUser)})`);
        } catch (e) {}
      } else {
        const errMsg = (res && res.message) ? res.message : "雲端寫入失敗，請稍後再試";
        try {
          await wv.evaluateJavaScript(`onQuickAddError(${JSON.stringify(errMsg)})`);
        } catch (e) {}
      }
      return;
    }

    const targetUser = payload.user || CURRENT_USER;
    req.body = JSON.stringify({
      action: "addRecord",
      user: targetUser,
      Amount: Number(payload.Amount),
      Category: payload.Category || "食物",
      Account: payload.Account || "現金",
      "Recorded At": payload["Recorded At"] || "",
      note: payload.note || payload.Category || "消費"
    });

    const res = await req.loadJSON();
    if (res && res.success) {
      const savedRec = res.record || payload;
      updateLocalWidgetCacheAfterAdd(targetUser, savedRec);
      const updatedNotes = updateLocalCategoryNotesAfterAdd(
        targetUser,
        savedRec.Category || payload.Category,
        savedRec.note || payload.note
      );
      updateLocalManualState(targetUser, 1);
      await syncDailyReminderNotification(targetUser, { hasTodayManual: true }, false);
      const updatedByUser = {};
      updatedByUser[targetUser] = updatedNotes;
      try {
        await wv.evaluateJavaScript(`onQuickAddSuccess(${JSON.stringify(res)}, ${JSON.stringify(updatedByUser)})`);
      } catch (e) {}
    } else {
      const errMsg = (res && res.message) ? res.message : "雲端寫入失敗，請稍後再試";
      try {
        await wv.evaluateJavaScript(`onQuickAddError(${JSON.stringify(errMsg)})`);
      } catch (e) {}
    }
  } catch (err) {
    const msg = "網路連線逾時或異常：" + (err && err.message ? err.message : String(err));
    try {
      await wv.evaluateJavaScript(`onQuickAddError(${JSON.stringify(msg)})`);
    } catch (e) {}
  }
}

/**
 * 💾 記帳成功後立即同步更新本地小組件快取
 */
function updateLocalWidgetCacheAfterAdd(user, rec) {
  try {
    const fm = FileManager.local();
    const cachePath = fm.joinPath(fm.documentsDirectory(), `accounting_widget_cache_${user}.json`);
    if (!fm.fileExists(cachePath)) return;

    const cached = JSON.parse(fm.readString(cachePath));
    const now = new Date();
    const pad = (n) => (n < 10 ? "0" + n : "" + n);
    const todayStr = `${now.getFullYear()}/${pad(now.getMonth() + 1)}/${pad(now.getDate())}`;
    const monthPrefix = `${now.getFullYear()}/${pad(now.getMonth() + 1)}`;
    const recTime = String(rec["Recorded At"] || todayStr);
    const amt = Number(rec.Amount) || 0;
    const isIncome = (rec.Category === "收入");

    if (!isIncome && recTime.startsWith(todayStr)) {
      if (cached.isToday === false) {
        cached.isToday = true;
        cached.expenseLabel = "今日支出";
        cached.todayTotal = 0;
        cached.todayCount = 0;
        cached.todayRecords = [];
      }
      cached.todayTotal = Math.round((Number(cached.todayTotal) || 0) + amt);
      cached.todayCount = (Number(cached.todayCount) || 0) + 1;
      cached.todayRecords = [rec].concat(cached.todayRecords || []).slice(0, 12);
    }
    cached.hasTodayManual = true;

    if (!isIncome && recTime.startsWith(monthPrefix)) {
      cached.monthTotal = Math.round((Number(cached.monthTotal) || 0) + amt);
      const rawCachedBudget = Number(cached.budget);
      const isNoBudget = (cached.explicitZeroBudget === true && rawCachedBudget === 0) || (cached.budget === 0);
      const budget = isNoBudget
        ? 0
        : ((!isNaN(rawCachedBudget) && rawCachedBudget > 0) ? rawCachedBudget : (user === "定成" ? 15000 : 25000));
      cached.remainingBudget = budget > 0 ? Math.max(0, budget - cached.monthTotal) : 0;
      cached.budgetProgress = budget > 0 ? Math.min(100, Math.round((cached.monthTotal / budget) * 100)) : 0;
    }

    cached.updatedAt = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    fm.writeString(cachePath, JSON.stringify(cached));
  } catch (e) {}
}

/**
 * 🗑️ 刪除剛建立的那一筆紀錄（同步更新雲端與本地小組件快取）
 */
async function processQuickAddDelete(wv, payload) {
  try {
    const req = new Request(WEB_APP_URL);
    req.method = "POST";
    req.headers = { "Content-Type": "application/json" };
    req.timeoutInterval = 15;

    const resData = (payload && payload.res) ? payload.res : {};
    if (payload && payload.mode === "split") {
      const payer = resData.payer || CURRENT_USER;
      const debtor = resData.debtor || (payer === "定成" ? "妤珊" : "定成");
      const payerAmt = Number(resData.payerAmount || 0);
      const debtorAmt = Number(resData.debtorAmount || 0);

      req.body = JSON.stringify({
        action: "deleteCashSplit",
        payer: payer,
        debtor: debtor,
        payerAmount: payerAmt,
        debtorAmount: debtorAmt,
        note: resData.note || "",
        recordedAt: resData.recordedAt || "",
        payerRecord: resData.payerRecord || null,
        debtorRecord: resData.debtorRecord || null
      });
      const res = await req.loadJSON();
      if (res && res.success) {
        updateLocalManualState(payer, -1);
        if (payerAmt > 0 && resData.payerRecord) updateLocalWidgetCacheAfterDelete(payer, resData.payerRecord);
        if (debtorAmt > 0 && resData.debtorRecord) updateLocalWidgetCacheAfterDelete(debtor, resData.debtorRecord);
        try { await wv.evaluateJavaScript("onQuickAddDeleteSuccess()"); } catch (e) {}
      } else {
        const errMsg = (res && res.message) ? res.message : "刪除失敗，請稍後再試";
        try { await wv.evaluateJavaScript(`onQuickAddDeleteError(${JSON.stringify(errMsg)})`); } catch (e) {}
      }
      return;
    }

    const rec = resData.record || {};
    const targetUser = rec.user || CURRENT_USER;
    req.body = JSON.stringify({
      action: "deleteRecord",
      user: targetUser,
      rowIndex: rec.rowIndex,
      matchCriteria: {
        recordedAt: rec["Recorded At"] || "",
        amount: rec.Amount,
        note: rec.note || "",
        category: rec.Category || ""
      }
    });
    const res = await req.loadJSON();
    if (res && res.success) {
      updateLocalManualState(targetUser, -1);
      updateLocalWidgetCacheAfterDelete(targetUser, rec);
      try { await wv.evaluateJavaScript("onQuickAddDeleteSuccess()"); } catch (e) {}
    } else {
      const errMsg = (res && res.message) ? res.message : "刪除失敗，請稍後再試";
      try { await wv.evaluateJavaScript(`onQuickAddDeleteError(${JSON.stringify(errMsg)})`); } catch (e) {}
    }
  } catch (err) {
    const msg = "網路連線逾時或異常：" + (err && err.message ? err.message : String(err));
    try { await wv.evaluateJavaScript(`onQuickAddDeleteError(${JSON.stringify(msg)})`); } catch (e) {}
  }
}

function updateLocalWidgetCacheAfterDelete(user, rec) {
  try {
    const fm = FileManager.local();
    const cachePath = fm.joinPath(fm.documentsDirectory(), `accounting_widget_cache_${user}.json`);
    if (!fm.fileExists(cachePath)) return;

    const cached = JSON.parse(fm.readString(cachePath));
    const now = new Date();
    const pad = (n) => (n < 10 ? "0" + n : "" + n);
    const todayStr = `${now.getFullYear()}/${pad(now.getMonth() + 1)}/${pad(now.getDate())}`;
    const monthPrefix = `${now.getFullYear()}/${pad(now.getMonth() + 1)}`;
    const recTime = String(rec["Recorded At"] || todayStr);
    const amt = Number(rec.Amount) || 0;
    const isIncome = (rec.Category === "收入");

    if (!isIncome && recTime.startsWith(todayStr)) {
      cached.todayTotal = Math.max(0, Math.round((Number(cached.todayTotal) || 0) - amt));
      cached.todayCount = Math.max(0, (Number(cached.todayCount) || 0) - 1);
      if (Array.isArray(cached.todayRecords)) {
        const idx = cached.todayRecords.findIndex((r) =>
          Number(r.Amount) === amt &&
          String(r.note || "") === String(rec.note || "") &&
          String(r["Recorded At"] || "") === recTime
        );
        if (idx !== -1) cached.todayRecords.splice(idx, 1);
      }
    }

    if (!isIncome && recTime.startsWith(monthPrefix)) {
      cached.monthTotal = Math.max(0, Math.round((Number(cached.monthTotal) || 0) - amt));
      const rawCachedBudget = Number(cached.budget);
      const isNoBudget = (cached.explicitZeroBudget === true && rawCachedBudget === 0) || (cached.budget === 0);
      const budget = isNoBudget
        ? 0
        : ((!isNaN(rawCachedBudget) && rawCachedBudget > 0) ? rawCachedBudget : (user === "定成" ? 15000 : 25000));
      cached.remainingBudget = budget > 0 ? Math.max(0, budget - cached.monthTotal) : 0;
      cached.budgetProgress = budget > 0 ? Math.min(100, Math.round((cached.monthTotal / budget) * 100)) : 0;
    }

    cached.updatedAt = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    fm.writeString(cachePath, JSON.stringify(cached));
  } catch (e) {}
}

function hexToRgba(hex, alpha) {
  const clean = String(hex || "#38bdf8").replace("#", "");
  if (clean.length !== 6) return `rgba(56, 189, 248, ${alpha})`;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * 🎨 建構高質感暗色毛玻璃「快速記帳」HTML 介面
 */
function buildQuickAddHtml(initialUser, initialNotesByUser, hasNotesCache) {
  const safeUser = (initialUser === "妤珊") ? "妤珊" : "定成";
  const isLight = Boolean(THEME.isLight);
  const bg1 = (THEME.bgHex && THEME.bgHex[0]) || (isLight ? "#ffffff" : "#070b14");
  const bg2 = (THEME.bgHex && THEME.bgHex[1]) || (isLight ? "#f4f4f5" : "#0f172a");
  const accentHex = THEME.accentHex || ((safeUser === "妤珊") ? "#f472b6" : "#38bdf8");
  const accentSoft = hexToRgba(accentHex, isLight ? 0.1 : 0.16);
  const accentGlow = hexToRgba(accentHex, isLight ? 0.22 : 0.35);
  const cardBgCss = isLight ? "rgba(255, 255, 255, 0.94)" : "rgba(30, 41, 59, 0.58)";
  const cardBorderCss = isLight
    ? (THEME.borderHex ? hexToRgba(THEME.borderHex, 0.9) : "rgba(15, 23, 42, 0.13)")
    : "rgba(148, 163, 184, 0.14)";
  const chipBgCss = isLight ? (THEME.cardHex ? hexToRgba(THEME.cardHex, 0.55) : "#f4f4f5") : "rgba(15, 23, 42, 0.62)";
  const tileBgCss = isLight ? (THEME.cardHex ? hexToRgba(THEME.cardHex, 0.55) : "#f4f4f5") : "rgba(15, 23, 42, 0.55)";
  const inputBgCss = isLight ? "#f8fafc" : "rgba(15, 23, 42, 0.65)";
  const text1Css = THEME.text1Hex || (isLight ? "#09090b" : "#f8fafc");
  const text2Css = THEME.text2Hex || (isLight ? "#3f3f46" : "#94a3b8");
  const text3Css = THEME.text3Hex || (isLight ? "#71717a" : "#64748b");
  const submitTextCss = isLight ? "#ffffff" : "#06101e";
  const amountShadowCss = isLight
    ? "0 6px 24px rgba(15, 23, 42, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.9)"
    : "0 8px 30px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.06)";
  const errorColorCss = isLight ? "#be123c" : "#fecdd3";
  const greenCss = isLight ? "#059669" : "#34d399";
  const roseCss = isLight ? "#e11d48" : "#fb7185";
  const orbOpacityCss = isLight ? "0.18" : "1";

  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
<title>快速記帳</title>
<style>
  :root {
    --bg-1: ${bg1};
    --bg-2: ${bg2};
    --card-bg: ${cardBgCss};
    --card-border: ${cardBorderCss};
    --chip-bg: ${chipBgCss};
    --tile-bg: ${tileBgCss};
    --input-bg: ${inputBgCss};
    --text-1: ${text1Css};
    --text-2: ${text2Css};
    --text-3: ${text3Css};
    --accent: ${accentHex};
    --accent-soft: ${accentSoft};
    --accent-glow: ${accentGlow};
    --submit-text: ${submitTextCss};
    --amount-shadow: ${amountShadowCss};
    --error-color: ${errorColorCss};
    --green: ${greenCss};
    --rose: ${roseCss};
    --orb-opacity: ${orbOpacityCss};
  }
  * {
    box-sizing: border-box;
    -webkit-tap-highlight-color: transparent;
  }
  html, body {
    margin: 0;
    padding: 0;
    min-height: 100%;
    background: linear-gradient(160deg, var(--bg-1) 0%, var(--bg-2) 100%);
    color: var(--text-1);
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang TC", sans-serif;
    overflow-x: hidden;
  }
  .ambient-orb {
    position: fixed;
    top: -80px;
    right: -60px;
    width: 240px;
    height: 240px;
    border-radius: 50%;
    background: radial-gradient(circle, var(--accent-glow) 0%, transparent 70%);
    filter: blur(28px);
    opacity: var(--orb-opacity);
    pointer-events: none;
    transition: background 0.35s ease;
    z-index: 0;
  }
  .ambient-orb-2 {
    position: fixed;
    bottom: -90px;
    left: -70px;
    width: 220px;
    height: 220px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(52, 211, 153, 0.14) 0%, transparent 70%);
    filter: blur(30px);
    opacity: var(--orb-opacity);
    pointer-events: none;
    z-index: 0;
  }
  .container {
    position: relative;
    z-index: 1;
    max-width: 460px;
    margin: 0 auto;
    padding: max(calc(env(safe-area-inset-top, 0px) + 10px), 30px) 14px calc(14px + env(safe-area-inset-bottom));
  }
  .header {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 10px;
    margin-bottom: 8px;
  }
  .brand-title {
    font-size: 19px;
    font-weight: 800;
    letter-spacing: -0.3px;
  }
  .glass-card {
    background: var(--card-bg);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid var(--card-border);
    border-radius: 16px;
    padding: 10px 12px;
    margin-bottom: 8px;
  }
  .amount-card {
    padding: 11px 13px;
    border-color: var(--accent-glow);
    box-shadow: var(--amount-shadow);
  }
  .mode-switch {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    background: var(--card-bg);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid var(--card-border);
    border-radius: 11px;
    padding: 3px;
  }
  .mode-btn {
    border: 1px solid transparent;
    background: transparent;
    color: var(--text-2);
    font-size: 13px;
    font-weight: 700;
    padding: 4px 12px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.16s ease;
  }
  .mode-btn.active {
    background: var(--accent-soft);
    color: var(--text-1);
    border-color: var(--accent);
  }
  .split-payer-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 8px;
    padding-bottom: 8px;
    border-bottom: 1px dashed var(--card-border);
  }
  .payer-pills {
    display: inline-flex;
    gap: 6px;
  }
  .payer-pill {
    background: var(--chip-bg);
    border: 1.5px solid var(--card-border);
    color: var(--text-2);
    font-size: 13px;
    font-weight: 700;
    padding: 4px 14px;
    border-radius: 9px;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .payer-pill.active-ding {
    background: rgba(56, 189, 248, 0.16);
    border-color: #38bdf8;
    color: #38bdf8;
  }
  .payer-pill.active-yu {
    background: rgba(244, 114, 182, 0.16);
    border-color: #f472b6;
    color: #f472b6;
  }
  .split-share-box {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px dashed var(--card-border);
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .split-input-wrap {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 5px;
    background: var(--input-bg);
    border: 1px solid var(--card-border);
    border-radius: 10px;
    padding: 5px 10px;
  }
  .split-input-wrap:focus-within {
    border-color: var(--accent);
  }
  .split-input {
    width: 100%;
    background: transparent;
    border: none;
    outline: none;
    color: var(--text-1);
    font-size: 15px;
    font-weight: 700;
  }
  .split-input::placeholder {
    color: var(--text-3);
    font-size: 13px;
  }
  .split-mode-chips {
    display: flex;
    flex-shrink: 0;
    gap: 6px;
  }
  .split-chip {
    background: var(--chip-bg);
    border: 1.5px solid var(--card-border);
    color: var(--text-2);
    font-size: 13px;
    font-weight: 700;
    padding: 6px 12px;
    border-radius: 999px;
    cursor: pointer;
    user-select: none;
    transition: all 0.15s ease;
  }
  .split-chip.active {
    background: var(--accent-soft);
    border-color: var(--accent);
    color: var(--text-1);
  }
  .amount-label-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2px;
  }
  .section-label {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-2);
    letter-spacing: 0.4px;
  }
  .cat-preview-pill {
    font-size: 12px;
    font-weight: 600;
    padding: 3px 9px;
    border-radius: 999px;
    background: var(--accent-soft);
    color: var(--accent);
  }
  .amount-input-wrap {
    display: flex;
    align-items: baseline;
    gap: 6px;
    padding: 0 0 6px;
  }
  .currency-symbol {
    font-size: 22px;
    font-weight: 700;
    color: var(--accent);
  }
  .amount-input {
    width: 100%;
    background: transparent;
    border: none;
    outline: none;
    color: var(--text-1);
    font-size: 32px;
    line-height: 1.1;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.5px;
    padding: 0;
  }
  .amount-input::placeholder {
    color: rgba(100, 116, 139, 0.45);
  }
  .quick-amt-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 2px;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .quick-amt-row::-webkit-scrollbar { display: none; }
  .amt-chip {
    flex: 1;
    min-width: 48px;
    background: var(--chip-bg);
    border: 1px solid var(--card-border);
    color: var(--text-1);
    font-size: 12px;
    font-weight: 600;
    padding: 5px 6px;
    border-radius: 9px;
    text-align: center;
    cursor: pointer;
    user-select: none;
    transition: transform 0.12s ease, background 0.15s ease;
  }
  .amt-chip:active {
    transform: scale(0.94);
    background: var(--accent-soft);
    border-color: var(--accent);
  }
  .amt-chip.clear-btn {
    flex: 0 0 auto;
    color: var(--rose);
    background: rgba(251, 113, 133, 0.1);
    border-color: rgba(251, 113, 133, 0.25);
    padding: 5px 10px;
  }
  .cat-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 6px;
    margin-top: 6px;
  }
  .cat-tile {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    padding: 6px 3px;
    border-radius: 11px;
    background: var(--tile-bg);
    border: 1px solid var(--card-border);
    cursor: pointer;
    user-select: none;
    transition: all 0.16s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .cat-tile:active { transform: scale(0.94); }
  .cat-tile.selected {
    transform: translateY(-1px);
  }
  .cat-emoji { font-size: 18px; line-height: 1.1; }
  .cat-name { font-size: 12px; font-weight: 600; color: var(--text-2); }
  .cat-tile.selected .cat-name { color: var(--text-1); }
  .note-input-box {
    display: flex;
    align-items: center;
    background: var(--input-bg);
    border: 1px solid var(--card-border);
    border-radius: 11px;
    padding: 2px 10px;
    margin-top: 6px;
    transition: border-color 0.2s ease;
  }
  .note-input-box:focus-within {
    border-color: var(--accent);
  }
  .note-input {
    width: 100%;
    background: transparent;
    border: none;
    outline: none;
    color: var(--text-1);
    font-size: 15px;
    padding: 6px 4px;
  }
  .note-input::placeholder { color: var(--text-3); font-size: 13px; }
  .note-clear {
    background: none;
    border: none;
    color: var(--text-3);
    font-size: 15px;
    padding: 3px 6px;
    cursor: pointer;
    display: none;
  }
  .tags-scroll {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin-top: 6px;
  }
  .tags-empty {
    font-size: 12px;
    color: var(--text-3);
    padding: 2px;
  }
  .tag-chip {
    flex: 0 0 auto;
    background: var(--chip-bg);
    border: 1px solid var(--card-border);
    color: var(--text-2);
    font-size: 12px;
    font-weight: 500;
    padding: 4px 10px;
    border-radius: 999px;
    cursor: pointer;
    user-select: none;
    transition: all 0.15s ease;
  }
  .tag-chip.active, .tag-chip:active {
    background: var(--accent-soft);
    border-color: var(--accent);
    color: var(--text-1);
  }
  .submit-btn {
    width: 100%;
    border: none;
    border-radius: 14px;
    padding: 12px 16px;
    font-size: 15px;
    font-weight: 700;
    color: var(--submit-text);
    background: var(--accent);
    box-shadow: 0 8px 24px var(--accent-glow);
    cursor: pointer;
    transition: transform 0.15s ease, opacity 0.2s ease, box-shadow 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-top: 2px;
  }
  .submit-btn.income-mode {
    background: linear-gradient(135deg, #34d399 0%, #eab308 100%) !important;
    box-shadow: 0 8px 24px rgba(52, 211, 153, 0.3) !important;
    color: #052e16 !important;
  }
  .submit-btn:active { transform: scale(0.98); }
  .submit-btn:disabled {
    opacity: 0.45;
    box-shadow: none;
    cursor: not-allowed;
  }
  .error-toast {
    display: none;
    margin-bottom: 10px;
    padding: 10px 14px;
    border-radius: 12px;
    background: rgba(251, 113, 133, 0.16);
    border: 1px solid rgba(251, 113, 133, 0.45);
    color: var(--error-color);
    font-size: 13px;
    font-weight: 500;
  }
  .success-view {
    display: none;
    text-align: center;
    padding: 28px 10px 10px;
    animation: fadeUp 0.28s ease-out;
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .check-circle {
    width: 72px;
    height: 72px;
    margin: 0 auto 14px;
    border-radius: 50%;
    background: rgba(52, 211, 153, 0.16);
    border: 2px solid rgba(52, 211, 153, 0.55);
    color: var(--green);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 34px;
    box-shadow: 0 0 28px rgba(52, 211, 153, 0.28);
  }
  .success-title {
    font-size: 22px;
    font-weight: 800;
    margin-bottom: 6px;
  }
  .success-sub {
    font-size: 13px;
    color: var(--text-2);
    margin-bottom: 18px;
  }
  .summary-card {
    text-align: left;
    padding: 16px;
    margin-bottom: 18px;
  }
  .sum-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 0;
    font-size: 14px;
  }
  .sum-key { color: var(--text-2); }
  .sum-val { font-weight: 700; color: var(--text-1); }
  .sum-amt { font-size: 22px; font-weight: 800; color: var(--accent); }
  .action-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .btn-secondary {
    background: var(--chip-bg);
    border: 1px solid var(--card-border);
    color: var(--text-1);
    font-size: 14px;
    font-weight: 700;
    padding: 13px;
    border-radius: 14px;
    cursor: pointer;
  }
  .btn-primary-soft {
    background: var(--accent-soft);
    border: 1px solid var(--accent-glow);
    color: var(--accent);
    font-size: 14px;
    font-weight: 700;
    padding: 13px;
    border-radius: 14px;
    cursor: pointer;
  }
  .btn-danger-soft {
    grid-column: 1 / -1;
    background: rgba(251, 113, 133, 0.14);
    border: 1px solid rgba(251, 113, 133, 0.42);
    color: var(--rose);
    font-size: 14px;
    font-weight: 700;
    padding: 12px;
    border-radius: 14px;
    cursor: pointer;
  }
  .btn-danger-soft:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .dismiss-hint {
    margin-top: 18px;
    font-size: 12px;
    color: var(--text-3);
  }
  .spinner {
    width: 16px;
    height: 16px;
    border: 2.5px solid rgba(148, 163, 184, 0.35);
    border-top-color: var(--submit-text);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
</head>
<body class="${safeUser === "妤珊" ? "user-yu" : ""}">
  <div class="ambient-orb"></div>
  <div class="ambient-orb-2"></div>

  <div class="container">
    <div id="form-view">
      <div class="header">
        <div class="brand-title"><span style="color:var(--accent)">${safeUser}</span></div>
        <div class="mode-switch" id="mode-switch">
          <button type="button" class="mode-btn active" id="mode-normal" onclick="setMode('normal')">記帳</button>
          <button type="button" class="mode-btn" id="mode-split" onclick="setMode('split')">欠錢</button>
        </div>
      </div>

      <div id="error-toast" class="error-toast"></div>

      <div class="glass-card amount-card">
        <div class="split-payer-row" id="split-payer-card" style="display:none;">
          <span class="section-label">誰先付錢</span>
          <div class="payer-pills">
            <button type="button" class="payer-pill" id="payer-ding" onclick="selectSplitPayer('定成')">定成</button>
            <button type="button" class="payer-pill" id="payer-yu" onclick="selectSplitPayer('妤珊')">妤珊</button>
          </div>
        </div>

        <div class="amount-label-row">
          <span class="section-label" id="amount-label">消費金額</span>
          <span class="cat-preview-pill" id="cat-badge">🍽️ 食物</span>
        </div>
        <div class="amount-input-wrap">
          <span class="currency-symbol">$</span>
          <input id="amount-input" class="amount-input" type="number" inputmode="decimal" step="any" min="0" placeholder="0" autofocus>
        </div>
        <div class="quick-amt-row">
          <div class="amt-chip" onclick="addQuickAmount(50)">+50</div>
          <div class="amt-chip" onclick="addQuickAmount(100)">+100</div>
          <div class="amt-chip" onclick="addQuickAmount(200)">+200</div>
          <div class="amt-chip" onclick="addQuickAmount(500)">+500</div>
          <div class="amt-chip clear-btn" onclick="clearAmount()">清除</div>
        </div>

        <div class="split-share-box" id="split-share-box" style="display:none;">
          <div class="split-input-wrap" id="split-input-wrap">
            <span style="font-weight:800; color:var(--accent);">$</span>
            <input id="payer-amount-input" class="split-input" type="number" inputmode="decimal" step="any" min="0" placeholder="定成付多少">
          </div>
          <div class="split-mode-chips">
            <div class="split-chip" id="split-chip-half" onclick="setSplitShareMode('half')">一人一半</div>
            <div class="split-chip" id="split-chip-zero" onclick="setSplitShareMode('zero')">0元</div>
            <div class="split-chip" id="split-chip-custom" style="display:none;" onclick="setSplitShareMode('custom')">自訂金額</div>
          </div>
        </div>
      </div>

      <div class="glass-card">
        <div class="section-label">分類</div>
        <div class="cat-grid" id="cat-grid"></div>
      </div>

      <div class="glass-card">
        <div class="section-label">備註</div>
        <div class="note-input-box">
          <input id="note-input" class="note-input" type="text" placeholder="輸入品項或店家">
          <button type="button" class="note-clear" id="note-clear" onclick="clearNote()">✕</button>
        </div>
        <div class="tags-scroll" id="tags-scroll"></div>
      </div>

      <button type="button" class="submit-btn" id="submit-btn" onclick="submitQuickRecord()" disabled>
        <span id="submit-text">請輸入金額</span>
      </button>
    </div>

    <div id="success-view" class="success-view">
      <div class="check-circle">✓</div>
      <div class="success-title">記帳成功！</div>
      <div class="success-sub" id="success-msg">已即時同步至雲端試算表</div>

      <div class="glass-card summary-card">
        <div class="sum-row">
          <span class="sum-key">記帳人</span>
          <span class="sum-val" id="sum-user">-</span>
        </div>
        <div class="sum-row">
          <span class="sum-key">項目 / 分類</span>
          <span class="sum-val" id="sum-item">-</span>
        </div>
        <div class="sum-row">
          <span class="sum-key">付款帳戶</span>
          <span class="sum-val" id="sum-acc">-</span>
        </div>
        <div class="sum-row">
          <span class="sum-key">金額</span>
          <span class="sum-amt" id="sum-amt">$0</span>
        </div>
      </div>

      <div class="action-grid">
        <button type="button" class="btn-primary-soft" onclick="resetForAnother()">＋ 再記一筆</button>
        <button type="button" class="btn-secondary" onclick="openFullDashboard()">返回主頁</button>
        <button type="button" class="btn-danger-soft" id="delete-last-btn" onclick="deleteLastRecord()">刪除這筆</button>
      </div>
      <div class="dismiss-hint">往下滑動或點擊上方「完成」即可返回桌面</div>
    </div>
  </div>

<script>
  var CATEGORIES = [
    { name: "食物", icon: "🍽️", color: "#ff6b6b" },
    { name: "飲品", icon: "🥤", color: "#10b981" },
    { name: "交通", icon: "🛵", color: "#38bdf8" },
    { name: "居家", icon: "🛋️", color: "#4ade80" },
    { name: "娛樂", icon: "🎉", color: "#f97316" },
    { name: "消費", icon: "🛍️", color: "#a855f7" },
    { name: "3C",   icon: "📱", color: "#3b82f6" },
    { name: "醫藥", icon: "💊", color: "#ef4444" },
    { name: "其他", icon: "📦", color: "#94a3b8" },
    { name: "收入", icon: "💰", color: "#eab308" }
  ];

  var REQUIRED_CATEGORY_NOTES = {
    "食物": ["晚餐", "午餐"],
    "飲品": ["咖啡", "綠茶", "水"],
    "交通": ["停車費", "加油站", "Youbike", "保養"],
    "收入": ["利息", "發票中獎", "薪水"]
  };

  var categoryNotesByUser = ${JSON.stringify(initialNotesByUser || {})};
  var syncDone = ${hasNotesCache ? "true" : "false"};

  var ACCOUNTS = [
    { label: "現金", value: "現金" }
  ];

  var state = {
    user: "${safeUser}",
    category: "食物",
    account: "現金",
    mode: "normal",
    splitPayer: "${safeUser}",
    splitShareMode: "custom",
    submitting: false
  };

  function pad(n) { return n < 10 ? "0" + n : "" + n; }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatRecordedAt() {
    var d = new Date();
    return d.getFullYear() + "/" + pad(d.getMonth() + 1) + "/" + pad(d.getDate()) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }

  function renderCategories() {
    var grid = document.getElementById("cat-grid");
    var html = "";
    for (var i = 0; i < CATEGORIES.length; i++) {
      var c = CATEGORIES[i];
      var isSel = (state.category === c.name);
      var style = isSel
        ? "border-color:" + c.color + "; background:" + c.color + "26; box-shadow:0 0 12px " + c.color + "33;"
        : "";
      html += '<div class="cat-tile' + (isSel ? " selected" : "") + '" style="' + style + '" onclick="selectCategory(\\'' + c.name + '\\')">' +
              '<span class="cat-emoji">' + c.icon + '</span>' +
              '<span class="cat-name">' + c.name + '</span>' +
              '</div>';
    }
    grid.innerHTML = html;

    var curCat = CATEGORIES.find(function(x) { return x.name === state.category; }) || CATEGORIES[0];
    var badge = document.getElementById("cat-badge");
    badge.innerText = curCat.icon + " " + curCat.name;
    badge.style.color = curCat.color;
    badge.style.background = curCat.color + "24";
    updateSubmitButton();
  }

  function selectCategory(catName) {
    if (state.mode === "split" && catName === "收入") {
      showError("欠錢模式不適用「收入」分類");
      return;
    }
    state.category = catName;
    renderCategories();
    renderQuickTags();
  }

  function updateCategoryNotesMap(newMap, forUser) {
    var targetU = forUser || state.user;
    if (newMap && typeof newMap === "object") {
      categoryNotesByUser[targetU] = newMap;
    }
    syncDone = true;
    renderQuickTags();
  }

  function markCategorySyncDone() {
    syncDone = true;
    renderQuickTags();
  }

  function getActiveNotesMap() {
    var targetU = (state.mode === "split") ? state.splitPayer : state.user;
    return categoryNotesByUser[targetU] || {};
  }

  function getDisplayQuickTags(catName) {
    var notesMap = getActiveNotesMap();
    var hist = Array.isArray(notesMap[catName]) ? notesMap[catName] : [];
    var req = REQUIRED_CATEGORY_NOTES[catName] || [];
    var chosen = [];
    var seenLower = {};

    // 1. 保留備註永遠排在最前面
    for (var j = 0; j < req.length; j++) {
      var rq = String(req[j] || "").trim();
      if (!rq || rq === catName) continue;
      var low = rq.toLowerCase();
      if (seenLower[low]) continue;
      seenLower[low] = true;
      chosen.push(rq);
    }

    // 2. 接著依序補上最新歷史常用備註（不重複，最多 10 個）
    for (var i = 0; i < hist.length; i++) {
      if (chosen.length >= 10) break;
      var item = String(hist[i] || "").trim();
      if (!item || item === catName) continue;
      var itemLow = item.toLowerCase();
      if (seenLower[itemLow]) continue;
      seenLower[itemLow] = true;
      chosen.push(item);
    }
    return chosen;
  }

  function renderQuickTags() {
    var wrap = document.getElementById("tags-scroll");
    var curNote = document.getElementById("note-input").value.trim();
    var list = getDisplayQuickTags(state.category);
    if (list.length === 0) {
      wrap.innerHTML = '<div class="tags-empty">' + (syncDone ? '此分類尚無過去備註紀錄' : '正在讀取常用備註...') + '</div>';
      return;
    }
    var html = "";
    for (var i = 0; i < list.length && i < 10; i++) {
      var txt = list[i];
      var isAct = (curNote === txt);
      html += '<div class="tag-chip' + (isAct ? " active" : "") + '" onclick="applyQuickTag(' + i + ')">' + escapeHtml(txt) + '</div>';
    }
    wrap.innerHTML = html;
  }

  function applyQuickTag(idx) {
    var list = getDisplayQuickTags(state.category);
    var text = list[idx];
    if (!text) return;
    var input = document.getElementById("note-input");
    input.value = text;
    document.getElementById("note-clear").style.display = "block";
    renderQuickTags();
  }

  function clearNote() {
    var input = document.getElementById("note-input");
    input.value = "";
    document.getElementById("note-clear").style.display = "none";
    renderQuickTags();
  }

  function renderAccounts() {
    var wrap = document.getElementById("acc-wrap");
    if (!wrap) return;
  }

  function selectAccount(accVal) {
    state.account = "現金";
  }

  function calculateSplitDetails() {
    var totalAmt = parseFloat(document.getElementById("amount-input").value);
    var payer = state.splitPayer === "妤珊" ? "妤珊" : "定成";
    var debtor = (payer === "定成") ? "妤珊" : "定成";
    var isHalf = (state.splitShareMode === "half");

    if (!totalAmt || totalAmt <= 0 || isNaN(totalAmt)) {
      return { valid: false, reason: "invalid_total", payer: payer, debtor: debtor, isHalf: isHalf };
    }

    var payerAmt = 0;
    var debtorAmt = 0;
    var dingShare = 0;
    var yuShare = 0;

    if (isHalf) {
      dingShare = Math.ceil(totalAmt / 2);
      yuShare = Math.floor(totalAmt / 2);
      if (payer === "定成") {
        payerAmt = dingShare;
        debtorAmt = yuShare;
      } else {
        payerAmt = yuShare;
        debtorAmt = dingShare;
      }
    } else if (state.splitShareMode === "zero") {
      payerAmt = 0;
      debtorAmt = Math.round(totalAmt * 100) / 100;
      dingShare = (payer === "定成") ? 0 : debtorAmt;
      yuShare = (payer === "定成") ? debtorAmt : 0;
    } else {
      var rawPayerStr = document.getElementById("payer-amount-input").value.trim();
      if (rawPayerStr === "") {
        return { valid: false, reason: "missing_payer_amount", payer: payer, debtor: debtor, totalAmount: totalAmt, isHalf: false };
      }
      var parsedPayer = parseFloat(rawPayerStr);
      if (isNaN(parsedPayer) || parsedPayer < 0) {
        return { valid: false, reason: "negative_payer_amount", payer: payer, debtor: debtor, totalAmount: totalAmt, isHalf: false };
      }
      if (parsedPayer > totalAmt) {
        return { valid: false, reason: "exceeds_total", payer: payer, debtor: debtor, totalAmount: totalAmt, isHalf: false };
      }
      payerAmt = Math.round(parsedPayer * 100) / 100;
      debtorAmt = Math.round((totalAmt - payerAmt) * 100) / 100;
      dingShare = (payer === "定成") ? payerAmt : debtorAmt;
      yuShare = (payer === "定成") ? debtorAmt : payerAmt;
    }

    return {
      valid: true,
      payer: payer,
      debtor: debtor,
      isHalf: isHalf,
      totalAmount: Math.round(totalAmt * 100) / 100,
      payerAmount: payerAmt,
      debtorAmount: debtorAmt,
      dingShare: dingShare,
      yuShare: yuShare
    };
  }

  function syncSplitPayerInputDisplay() {
    var inputEl = document.getElementById("payer-amount-input");
    if (!inputEl) return;
    if (state.splitShareMode === "zero") {
      inputEl.value = "0";
    } else if (state.splitShareMode === "half") {
      var totalAmt = parseFloat(document.getElementById("amount-input").value);
      if (totalAmt && totalAmt > 0 && !isNaN(totalAmt)) {
        var share = (state.splitPayer === "定成") ? Math.ceil(totalAmt / 2) : Math.floor(totalAmt / 2);
        inputEl.value = share;
      } else {
        inputEl.value = "";
      }
    }
  }

  function renderSplitUI() {
    var isSplit = (state.mode === "split");
    document.getElementById("mode-normal").className = "mode-btn" + (!isSplit ? " active" : "");
    document.getElementById("mode-split").className = "mode-btn" + (isSplit ? " active" : "");
    document.getElementById("split-payer-card").style.display = isSplit ? "flex" : "none";
    document.getElementById("split-share-box").style.display = isSplit ? "flex" : "none";
    document.getElementById("amount-label").innerText = isSplit ? "總金額" : "消費金額";
    if (!isSplit) return;

    var payer = state.splitPayer === "妤珊" ? "妤珊" : "定成";
    var payerInp = document.getElementById("payer-amount-input");
    if (payerInp) payerInp.placeholder = payer + "付多少";
    document.getElementById("payer-ding").className = "payer-pill" + (payer === "定成" ? " active-ding" : "");
    document.getElementById("payer-yu").className = "payer-pill" + (payer === "妤珊" ? " active-yu" : "");

    var isCustom = (state.splitShareMode === "custom");
    document.getElementById("split-input-wrap").style.display = isCustom ? "flex" : "none";
    document.getElementById("split-chip-half").className = "split-chip" + (state.splitShareMode === "half" ? " active" : "");
    document.getElementById("split-chip-zero").className = "split-chip" + (state.splitShareMode === "zero" ? " active" : "");
    document.getElementById("split-chip-custom").style.display = isCustom ? "none" : "inline-flex";
  }

  function updateSplitPreview() {
    // 已精簡移除試算文字區
  }

  function setMode(mode) {
    hideError();
    state.mode = (mode === "split") ? "split" : "normal";
    if (state.mode === "split" && state.category === "收入") {
      state.category = "食物";
    }
    if (state.mode === "split") {
      syncSplitPayerInputDisplay();
      if (!categoryNotesByUser[state.splitPayer] || Object.keys(categoryNotesByUser[state.splitPayer]).length === 0) {
        window.location.href = "quickadd://syncnotes?user=" + encodeURIComponent(state.splitPayer);
      }
    }
    renderCategories();
    renderQuickTags();
    renderSplitUI();
    updateSubmitButton();
  }

  function selectSplitPayer(payer) {
    hideError();
    state.splitPayer = (payer === "妤珊") ? "妤珊" : "定成";
    syncSplitPayerInputDisplay();
    if (!categoryNotesByUser[state.splitPayer] || Object.keys(categoryNotesByUser[state.splitPayer]).length === 0) {
      window.location.href = "quickadd://syncnotes?user=" + encodeURIComponent(state.splitPayer);
    }
    renderQuickTags();
    renderSplitUI();
    updateSubmitButton();
  }

  function setSplitShareMode(shareMode) {
    hideError();
    var prevMode = state.splitShareMode;
    var nextMode = (shareMode !== "custom" && prevMode === shareMode) ? "custom" : shareMode;
    state.splitShareMode = nextMode;

    var inp = document.getElementById("payer-amount-input");
    if (nextMode === "custom") {
      if (inp && prevMode !== "custom") inp.value = "";
    } else {
      syncSplitPayerInputDisplay();
    }

    renderSplitUI();
    updateSubmitButton();
    if (nextMode === "custom" && inp) {
      inp.focus();
    }
  }

  function onPayerAmountInput() {
    hideError();
    state.splitShareMode = "custom";
    renderSplitUI();
    updateSubmitButton();
  }

  function onMainAmountInput() {
    hideError();
    if (state.mode === "split" && state.splitShareMode !== "custom") {
      syncSplitPayerInputDisplay();
    }
    updateSubmitButton();
  }

  function addQuickAmount(delta) {
    var input = document.getElementById("amount-input");
    var cur = parseFloat(input.value) || 0;
    input.value = cur + delta;
    onMainAmountInput();
  }

  function clearAmount() {
    var input = document.getElementById("amount-input");
    input.value = "";
    input.focus();
    onMainAmountInput();
  }

  function updateSubmitButton() {
    var btn = document.getElementById("submit-btn");
    var txt = document.getElementById("submit-text");

    if (state.submitting) {
      btn.disabled = true;
      return;
    }

    if (state.mode === "split") {
      btn.classList.remove("income-mode");
      var info = calculateSplitDetails();
      if (!info.valid) {
        btn.disabled = true;
        if (info.reason === "exceeds_total") {
          txt.innerText = "自付金額不可大於總金額";
        } else if (info.reason === "missing_payer_amount") {
          txt.innerText = "請輸入" + info.payer + "付多少";
        } else if (info.reason === "negative_payer_amount") {
          txt.innerText = "金額不可為負數";
        } else {
          txt.innerText = "請輸入總金額";
        }
      } else {
        btn.disabled = false;
        if (info.debtorAmount === 0) {
          txt.innerText = "儲存記帳 · $" + info.totalAmount.toLocaleString();
        } else {
          txt.innerText = "儲存欠錢 · " + info.debtor + "欠$" + info.debtorAmount.toLocaleString();
        }
      }
      return;
    }

    var amt = parseFloat(document.getElementById("amount-input").value);
    if (state.category === "收入") {
      btn.classList.add("income-mode");
    } else {
      btn.classList.remove("income-mode");
    }

    if (!amt || amt <= 0) {
      btn.disabled = true;
      txt.innerText = "請輸入金額";
    } else {
      btn.disabled = false;
      var verb = (state.category === "收入") ? "儲存這筆收入" : "儲存這筆消費";
      txt.innerText = verb + " · $" + amt.toLocaleString();
    }
  }

  function showError(msg) {
    var toast = document.getElementById("error-toast");
    toast.innerText = msg;
    toast.style.display = "block";
  }

  function hideError() {
    document.getElementById("error-toast").style.display = "none";
  }

  function submitQuickRecord() {
    if (state.submitting) return;
    hideError();

    var rawNote = document.getElementById("note-input").value.trim();
    var finalNote = rawNote || state.category;
    var finalCat = state.category;
    if (/Google[\\s\\*]*One|Gemini/i.test(finalNote)) {
      finalNote = "Gemini";
      finalCat = "3C";
    }

    var recordedAt = formatRecordedAt();
    var payload = null;

    if (state.mode === "split") {
      var splitInfo = calculateSplitDetails();
      if (!splitInfo.valid) {
        if (splitInfo.reason === "exceeds_total") {
          showError("先付者自己花的金額不可大於總金額");
        } else if (splitInfo.reason === "missing_payer_amount") {
          showError("請輸入先付者自己花的金額（沒花請填 0）");
        } else if (splitInfo.reason === "negative_payer_amount") {
          showError("先付者自己花的金額不可為負數");
        } else {
          showError("請輸入大於 0 的有效總金額");
        }
        return;
      }

      payload = {
        mode: "split",
        payer: splitInfo.payer,
        debtor: splitInfo.debtor,
        totalAmount: splitInfo.totalAmount,
        payerAmount: splitInfo.payerAmount,
        debtorAmount: splitInfo.debtorAmount,
        dingShare: splitInfo.dingShare,
        yuShare: splitInfo.yuShare,
        isHalf: !!splitInfo.isHalf,
        Category: finalCat,
        "Recorded At": recordedAt,
        note: finalNote
      };
    } else {
      var amt = parseFloat(document.getElementById("amount-input").value);
      if (!amt || amt <= 0) {
        showError("請輸入大於 0 的有效金額");
        return;
      }

      payload = {
        mode: "normal",
        user: state.user,
        Amount: amt,
        Category: finalCat,
        Account: "現金",
        "Recorded At": recordedAt,
        note: finalNote
      };
    }

    state.submitting = true;
    var btn = document.getElementById("submit-btn");
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div><span>寫入雲端試算表中...</span>';

    window.location.href = "quickadd://submit?payload=" + encodeURIComponent(JSON.stringify(payload));
  }

  var lastSubmittedRecord = null;

  function onQuickAddSuccess(res, updatedNotesByUser) {
    state.submitting = false;
    lastSubmittedRecord = { mode: state.mode, res: res };
    var delBtn = document.getElementById("delete-last-btn");
    if (delBtn) {
      delBtn.disabled = false;
      delBtn.innerText = "刪除這筆";
    }
    if (updatedNotesByUser && typeof updatedNotesByUser === "object") {
      Object.keys(updatedNotesByUser).forEach(function(u) {
        if (updatedNotesByUser[u] && typeof updatedNotesByUser[u] === "object") {
          categoryNotesByUser[u] = updatedNotesByUser[u];
        }
      });
    }

    if (state.mode === "split" && res) {
      var splitCat = res.category || state.category;
      var splitNote = res.note || document.getElementById("note-input").value.trim() || splitCat;
      var catObjSplit = CATEGORIES.find(function(x) { return x.name === splitCat; }) || CATEGORIES[0];
      var payerName = res.payer || state.splitPayer;
      var debtorName = res.debtor || (payerName === "定成" ? "妤珊" : "定成");
      var dShare = Number(res.dingShare !== undefined ? res.dingShare : 0);
      var yShare = Number(res.yuShare !== undefined ? res.yuShare : 0);
      var debtAmt = Number(res.debtorAmount !== undefined ? res.debtorAmount : 0);
      var totAmt = Number(res.totalAmount || document.getElementById("amount-input").value || 0);

      document.getElementById("sum-user").innerText = payerName + " 先付 (" + debtorName + "欠 +$" + debtAmt.toLocaleString() + ")";
      document.getElementById("sum-item").innerText = catObjSplit.icon + " " + splitNote + "（" + splitCat + "）";
      document.getElementById("sum-acc").innerText = "定成 $" + dShare.toLocaleString() + " / 妤珊 $" + yShare.toLocaleString() + " (現金分攤)";
      document.getElementById("sum-amt").innerText = "$" + totAmt.toLocaleString();
      document.getElementById("success-msg").innerText = "已寫入雙方帳本並同步更新欠款與 LINE";
    } else {
      var rec = (res && res.record) ? res.record : {};
      var catObj = CATEGORIES.find(function(x) { return x.name === (rec.Category || state.category); }) || CATEGORIES[0];

      document.getElementById("sum-user").innerText = rec.user || state.user;
      document.getElementById("sum-item").innerText = catObj.icon + " " + (rec.note || state.category) + "（" + (rec.Category || state.category) + "）";
      document.getElementById("sum-acc").innerText = "現金";
      var finalAmt = Number(rec.Amount || document.getElementById("amount-input").value || 0);
      document.getElementById("sum-amt").innerText = (rec.Category === "收入" ? "+$" : "$") + finalAmt.toLocaleString();
      document.getElementById("success-msg").innerText = "已即時同步至雲端試算表";
    }

    document.getElementById("form-view").style.display = "none";
    document.getElementById("success-view").style.display = "block";
  }

  function onQuickAddError(msg) {
    state.submitting = false;
    var btn = document.getElementById("submit-btn");
    btn.innerHTML = '<span id="submit-text">儲存這筆消費</span>';
    updateSubmitButton();
    showError(msg || "儲存失敗，請檢查網路連線後重試");
  }

  function resetForAnother() {
    document.getElementById("amount-input").value = "";
    var payerInp = document.getElementById("payer-amount-input");
    if (payerInp) payerInp.value = (state.splitShareMode === "zero") ? "0" : "";
    document.getElementById("note-input").value = "";
    document.getElementById("note-clear").style.display = "none";
    hideError();

    var btn = document.getElementById("submit-btn");
    btn.innerHTML = '<span id="submit-text">請輸入金額</span>';
    renderSplitUI();
    updateSubmitButton();
    renderQuickTags();

    document.getElementById("success-view").style.display = "none";
    document.getElementById("form-view").style.display = "block";
    setTimeout(function() {
      document.getElementById("amount-input").focus();
    }, 120);
  }

  function openFullDashboard() {
    window.location.href = "quickadd://dashboard?user=" + encodeURIComponent(state.user);
  }

  function deleteLastRecord() {
    if (!lastSubmittedRecord) return;
    var delBtn = document.getElementById("delete-last-btn");
    if (delBtn) {
      delBtn.disabled = true;
      delBtn.innerText = "刪除中...";
    }
    window.location.href = "quickadd://delete?payload=" + encodeURIComponent(JSON.stringify(lastSubmittedRecord));
  }

  function onQuickAddDeleteSuccess() {
    lastSubmittedRecord = null;
    resetForAnother();
  }

  function onQuickAddDeleteError(msg) {
    var delBtn = document.getElementById("delete-last-btn");
    if (delBtn) {
      delBtn.disabled = false;
      delBtn.innerText = "刪除這筆";
    }
    showError(msg || "刪除失敗，請稍後再試");
  }

  document.getElementById("amount-input").addEventListener("input", onMainAmountInput);
  document.getElementById("payer-amount-input").addEventListener("input", onPayerAmountInput);
  document.getElementById("note-input").addEventListener("input", function(e) {
    document.getElementById("note-clear").style.display = e.target.value ? "block" : "none";
    renderQuickTags();
  });

  renderCategories();
  renderQuickTags();
  renderSplitUI();
  setTimeout(function() {
    document.getElementById("amount-input").focus();
  }, 180);
</script>
</body>
</html>`;
}