const VOCABULARY_ENTRIES_KEY = 'vocabularyEntries';
const VOCABULARY_QUIZ_BUCKETS_KEY = 'vocabularyQuizBuckets';
export const RECENT_WINDOW_MS = 60 * 60 * 1000;
export const PAIRS_PER_ROUND = 5;
export const MIN_PAIRS_PER_ROUND = PAIRS_PER_ROUND;
export const MAX_PAIRS_PER_ROUND = PAIRS_PER_ROUND;
const INCORRECT_SELECTION_WEIGHT = 0.24;
const WRONG_FLASH_MS = 340;
const SCORE_PER_CORRECT = 12;
const SCORE_PENALTY_PER_WRONG = 3;
const EASE_STANDARD = 'cubicBezier(0.22, 1, 0.36, 1)';
const EASE_GENTLE = 'cubicBezier(0.25, 0.46, 0.45, 0.94)';
const EASE_POP = 'cubicBezier(0.34, 1.56, 0.64, 1)';
const EASE_TEXT = 'cubicBezier(0.16, 1, 0.3, 1)';

const state = {
  quizBuckets: {
    notQuizzed: [],
    correct: [],
    incorrect: []
  },
  round: null,
  roundIndex: 0,
  selectedSourceId: null,
  selectedTranslationId: null,
  wrongSourceId: null,
  wrongTranslationId: null,
  matchedIds: new Set(),
  roundOutcomeById: new Map(),
  correctMatches: 0,
  wrongMatches: 0,
  score: 0,
  progressPercent: 0,
  wrongFlashTimer: null,
  roundPersisted: false
};

const elements = {
  quizPanel: null,
  emptyState: null,
  sourceColumn: null,
  translationColumn: null,
  sourceChoices: null,
  translationChoices: null,
  progressLabel: null,
  progressFill: null,
  selectedSourceValue: null,
  selectedTranslationValue: null,
  selectionStatus: null,
  selectionHeadline: null,
  roundValue: null,
  correctCountValue: null,
  incorrectCountValue: null,
  pairValue: null,
  remainingCountValue: null,
  wordPoolValue: null,
  accuracyValue: null,
  scoreValue: null,
  nextRoundButton: null,
  firstQuizModal: null,
  startQuizButton: null,
  chatToggleButton: null,
  chatDrawer: null,
  chatOverlay: null,
  chatCloseButton: null,
  chatMessages: null,
  chatForm: null,
  chatInput: null,
  chatContextWords: null,
  chatStatus: null,
  chatClearButton: null,
  chatResizeHandle: null,
  chatSetupPanel: null,
  chatSetupProvider: null,
  chatSetupModel: null,
  chatSetupApiKey: null,
  chatSetupSaveButton: null
};

const activeTextSplitByNode = new WeakMap();
const lastAnimatedTextByNode = new WeakMap();
const choiceReflectionStateByNode = new WeakMap();
const CHOICE_REFLECTION_EASE = 0.22;
const CHOICE_REFLECTION_SETTLE_DELTA = 0.16;

const AI_STORAGE_KEY = 'aiSettings';
const CHAT_HISTORY_KEY = 'chatHistory';
const CHAT_DRAWER_WIDTH_KEY = 'chatDrawerWidth';
const CHAT_DRAWER_MIN_WIDTH = 320;
const CHAT_DRAWER_MAX_WIDTH_RATIO = 0.84;
const AI_ENDPOINTS = {
  openai: 'https://api.openai.com/v1/chat/completions',
  groq: 'https://api.groq.com/openai/v1/chat/completions',
  minimax: 'https://api.minimaxi.com/v1/text/chatcompletion_v2',
  kimi: 'https://api.moonshot.cn/v1/chat/completions',
  deepseek: 'https://api.deepseek.com/chat/completions'
};
const AI_MODEL_ENDPOINTS = {
  openai: 'https://api.openai.com/v1/models',
  groq: 'https://api.groq.com/openai/v1/models',
  minimax: 'https://api.minimaxi.com/v1/models',
  kimi: 'https://api.moonshot.cn/v1/models',
  deepseek: 'https://api.deepseek.com/models'
};
const AI_MODEL_FALLBACKS = {
  openai: ['gpt-4.1-mini', 'gpt-4o-mini', 'gpt-4.1'],
  groq: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'],
  minimax: [
    'MiniMax-M2.7',
    'MiniMax-M2.7-highspeed',
    'MiniMax-M2.5',
    'MiniMax-M2.5-highspeed',
    'MiniMax-M2.1',
    'MiniMax-M2.1-highspeed',
    'MiniMax-M2'
  ],
  kimi: ['kimi-k2.5', 'kimi-k2-0905-preview', 'moonshot-v1-128k', 'moonshot-v1-32k', 'moonshot-v1-8k'],
  deepseek: ['deepseek-chat', 'deepseek-reasoner']
};
const MAX_CHAT_HISTORY = 50;

function flattenAiContentParts(value) {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => flattenAiContentParts(item))
      .filter(Boolean)
      .join('');
  }

  if (!value || typeof value !== 'object') {
    return '';
  }

  if (typeof value.text === 'string') {
    return value.text;
  }

  if (typeof value.content === 'string') {
    return value.content;
  }

  if (Array.isArray(value.content)) {
    return flattenAiContentParts(value.content);
  }

  if (typeof value.output_text === 'string') {
    return value.output_text;
  }

  return '';
}

function flattenAiThinkingParts(value) {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => flattenAiThinkingParts(item))
      .filter(Boolean)
      .join('');
  }

  if (!value || typeof value !== 'object') {
    return '';
  }

  if (typeof value.reasoning_content === 'string') {
    return value.reasoning_content;
  }

  if (typeof value.reasoning === 'string') {
    return value.reasoning;
  }

  if (typeof value.thinking === 'string') {
    return value.thinking;
  }

  if (typeof value.thought === 'string') {
    return value.thought;
  }

  if (typeof value.type === 'string' && /reason|think/i.test(value.type)) {
    if (typeof value.text === 'string') {
      return value.text;
    }

    if (typeof value.content === 'string') {
      return value.content;
    }
  }

  if (Array.isArray(value.content)) {
    return flattenAiThinkingParts(value.content);
  }

  return '';
}

function extractAiResponsePartsFromPayload(payload, options = {}) {
  const shouldTrim = options.trim !== false;

  if (!payload || typeof payload !== 'object') {
    return { text: '', thinking: '' };
  }

  const choice = Array.isArray(payload.choices) ? payload.choices[0] : null;
  const textCandidates = [
    choice?.delta?.content,
    choice?.message?.content,
    choice?.delta?.text,
    choice?.text,
    payload.reply,
    payload.response,
    payload.output_text,
    payload.text,
    payload.content,
    payload.answer
  ];
  const thinkingCandidates = [
    choice?.delta?.reasoning_content,
    choice?.message?.reasoning_content,
    choice?.delta?.reasoning,
    choice?.message?.reasoning,
    choice?.delta?.thinking,
    choice?.message?.thinking,
    choice?.delta?.thought,
    choice?.message?.thought,
    payload.reasoning_content,
    payload.reasoning,
    payload.thinking,
    payload.thought,
    choice?.delta?.content,
    choice?.message?.content,
    payload.content
  ];

  let text = '';
  for (const candidate of textCandidates) {
    const rawText = flattenAiContentParts(candidate);
    const normalized = shouldTrim ? rawText.trim() : rawText;
    if (normalized) {
      text = normalized;
      break;
    }
  }

  let thinking = '';
  for (const candidate of thinkingCandidates) {
    const rawThinking = flattenAiThinkingParts(candidate);
    const normalized = shouldTrim ? rawThinking.trim() : rawThinking;
    if (normalized) {
      thinking = normalized;
      break;
    }
  }

  return { text, thinking };
}

export function extractAiTextFromPayload(payload, options = {}) {
  return extractAiResponsePartsFromPayload(payload, options).text;
}

export function extractAiTextFromStreamChunk(chunkText) {
  let collectedText = '';
  let collectedThinking = '';
  let reachedDone = false;
  const lines = String(chunkText ?? '').split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith(':')) {
      continue;
    }

    const data = line.startsWith('data:') ? line.slice(5).trimStart() : line;
    if (!data) {
      continue;
    }

    if (data === '[DONE]') {
      reachedDone = true;
      break;
    }

    try {
      const parsed = JSON.parse(data);
      const { text, thinking } = extractAiResponsePartsFromPayload(parsed, { trim: false });
      if (text) {
        collectedText += text;
      }
      if (thinking) {
        collectedThinking += thinking;
      }
    } catch {
      // Some providers may emit non-JSON keepalive lines; ignore them.
    }
  }

  return {
    text: collectedText,
    thinking: collectedThinking,
    done: reachedDone
  };
}

const chatState = {
  messages: [],
  isStreaming: false,
  aiSettings: null,
  lastWrongPair: null,
  overlayIgnoreUntil: 0,
  drawerWidth: null,
  isResizingDrawer: false
};

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function parseRgbColorChannels(value) {
  const match = String(value ?? '').match(/rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})/i);
  if (!match) {
    return null;
  }

  return {
    r: clamp(Number.parseInt(match[1], 10), 0, 255),
    g: clamp(Number.parseInt(match[2], 10), 0, 255),
    b: clamp(Number.parseInt(match[3], 10), 0, 255)
  };
}

function parseHexColorChannels(value) {
  const normalized = String(value ?? '').trim().replace(/^#/, '');
  if (/^[\da-f]{3}$/i.test(normalized)) {
    const [r, g, b] = normalized.split('');
    return {
      r: clamp(Number.parseInt(`${r}${r}`, 16), 0, 255),
      g: clamp(Number.parseInt(`${g}${g}`, 16), 0, 255),
      b: clamp(Number.parseInt(`${b}${b}`, 16), 0, 255)
    };
  }

  if (/^[\da-f]{6}$/i.test(normalized)) {
    return {
      r: clamp(Number.parseInt(normalized.slice(0, 2), 16), 0, 255),
      g: clamp(Number.parseInt(normalized.slice(2, 4), 16), 0, 255),
      b: clamp(Number.parseInt(normalized.slice(4, 6), 16), 0, 255)
    };
  }

  return null;
}

function parseChromeThemeColorValue(value) {
  if (Array.isArray(value) && value.length >= 3) {
    return {
      r: clamp(Number.parseInt(value[0], 10), 0, 255),
      g: clamp(Number.parseInt(value[1], 10), 0, 255),
      b: clamp(Number.parseInt(value[2], 10), 0, 255)
    };
  }

  if (typeof value !== 'string') {
    return null;
  }

  return parseHexColorChannels(value) ?? parseRgbColorChannels(value);
}

function isVividColor(colorChannels, minSaturation = 8) {
  if (!colorChannels) {
    return false;
  }

  return rgbToHslChannels(colorChannels).s >= minSaturation;
}

function readChromeThemeAccentColor() {
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.theme || typeof chrome.theme.getCurrent !== 'function') {
      resolve(null);
      return;
    }

    try {
      chrome.theme.getCurrent((theme = {}) => {
        if (chrome.runtime?.lastError) {
          resolve(null);
          return;
        }

        const colors = theme.colors ?? {};
        const candidates = [
          colors.button_background,
          colors.toolbar_button_icon,
          colors.toolbar,
          colors.frame,
          colors.frame_inactive
        ];

        for (const candidate of candidates) {
          const parsed = parseChromeThemeColorValue(candidate);
          if (isVividColor(parsed)) {
            resolve(parsed);
            return;
          }
        }

        resolve(null);
      });
    } catch {
      resolve(null);
    }
  });
}

function rgbToHslChannels({ r, g, b }) {
  const normalizedR = r / 255;
  const normalizedG = g / 255;
  const normalizedB = b / 255;
  const max = Math.max(normalizedR, normalizedG, normalizedB);
  const min = Math.min(normalizedR, normalizedG, normalizedB);
  const delta = max - min;

  let hue = 0;
  if (delta !== 0) {
    if (max === normalizedR) {
      hue = ((normalizedG - normalizedB) / delta) % 6;
    } else if (max === normalizedG) {
      hue = (normalizedB - normalizedR) / delta + 2;
    } else {
      hue = (normalizedR - normalizedG) / delta + 4;
    }
  }

  hue = Math.round((hue * 60 + 360) % 360);
  const lightness = (max + min) / 2;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));

  return {
    h: hue,
    s: Math.round(saturation * 100),
    l: Math.round(lightness * 100)
  };
}

function hslToRgbChannels(hue, saturation, lightness) {
  const normalizedSaturation = clamp(saturation, 0, 100) / 100;
  const normalizedLightness = clamp(lightness, 0, 100) / 100;
  const chroma = (1 - Math.abs(2 * normalizedLightness - 1)) * normalizedSaturation;
  const huePrime = ((hue % 360) + 360) % 360 / 60;
  const x = chroma * (1 - Math.abs((huePrime % 2) - 1));

  let redPrime = 0;
  let greenPrime = 0;
  let bluePrime = 0;

  if (huePrime >= 0 && huePrime < 1) {
    redPrime = chroma;
    greenPrime = x;
  } else if (huePrime < 2) {
    redPrime = x;
    greenPrime = chroma;
  } else if (huePrime < 3) {
    greenPrime = chroma;
    bluePrime = x;
  } else if (huePrime < 4) {
    greenPrime = x;
    bluePrime = chroma;
  } else if (huePrime < 5) {
    redPrime = x;
    bluePrime = chroma;
  } else {
    redPrime = chroma;
    bluePrime = x;
  }

  const lightnessOffset = normalizedLightness - chroma / 2;

  return {
    r: Math.round((redPrime + lightnessOffset) * 255),
    g: Math.round((greenPrime + lightnessOffset) * 255),
    b: Math.round((bluePrime + lightnessOffset) * 255)
  };
}

function readBrowserAccentColor() {
  if (typeof window === 'undefined' || typeof document === 'undefined' || !document.body) {
    return null;
  }

  if (typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && !CSS.supports('color', 'AccentColor')) {
    return null;
  }

  const probe = document.createElement('span');
  probe.style.position = 'fixed';
  probe.style.opacity = '0';
  probe.style.pointerEvents = 'none';
  probe.style.color = 'AccentColor';
  probe.style.left = '-9999px';
  document.body.append(probe);
  const computedColor = window.getComputedStyle(probe).color;
  probe.remove();

  return parseRgbColorChannels(computedColor);
}

async function resolveChromeAppearanceAccentColor() {
  const themeAccentColor = await readChromeThemeAccentColor();
  if (themeAccentColor) {
    return themeAccentColor;
  }

  return readBrowserAccentColor();
}

function syncMetaThemeColor(colorValue) {
  if (typeof document === 'undefined') {
    return;
  }

  for (const themeMeta of Array.from(document.querySelectorAll('meta[name="theme-color"]'))) {
    themeMeta.setAttribute('content', colorValue);
  }
}

async function applyChromeAppearanceHue() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const root = document.documentElement;
  if (!root) {
    return;
  }

  const accentColor = await resolveChromeAppearanceAccentColor();
  if (!accentColor) {
    return;
  }

  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const accentHsl = rgbToHslChannels(accentColor);
  const tunedSaturation = clamp(Math.max(accentHsl.s, 42), 42, 92);
  const accentLightness = prefersDark ? 58 : 42;
  const strongLightness = prefersDark ? 48 : 34;
  const shineLightness = prefersDark ? 72 : 60;

  const accentRgb = hslToRgbChannels(accentHsl.h, tunedSaturation, accentLightness);
  const accentStrongRgb = hslToRgbChannels((accentHsl.h + 8) % 360, clamp(tunedSaturation + 6, 45, 96), strongLightness);
  const shineRgb = hslToRgbChannels((accentHsl.h + 12) % 360, clamp(tunedSaturation + 14, 48, 100), shineLightness);

  const accentRgbValue = `${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}`;
  const accentStrongRgbValue = `${accentStrongRgb.r}, ${accentStrongRgb.g}, ${accentStrongRgb.b}`;
  const shineRgbValue = `${shineRgb.r}, ${shineRgb.g}, ${shineRgb.b}`;

  root.style.setProperty('--accent-rgb', accentRgbValue);
  root.style.setProperty('--accent-strong-rgb', accentStrongRgbValue);
  root.style.setProperty('--shine-rgb', shineRgbValue);
  root.style.setProperty('--accent', `rgb(${accentRgbValue})`);
  root.style.setProperty('--accent-strong', `rgb(${accentStrongRgbValue})`);
  root.style.setProperty('--shine', `rgb(${shineRgbValue})`);
  root.style.setProperty('--bg-radial-a', `rgba(${accentRgbValue}, ${prefersDark ? 0.18 : 0.22})`);
  root.style.setProperty('--bg-radial-b', `rgba(${accentStrongRgbValue}, ${prefersDark ? 0.16 : 0.17})`);
  root.style.setProperty('--plus-color', `rgba(${accentStrongRgbValue}, ${prefersDark ? 0.2 : 0.22})`);
  syncMetaThemeColor(`rgb(${prefersDark ? accentStrongRgbValue : accentRgbValue})`);
}

function attachChromeAppearanceHueSync() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const applyHue = () => {
    void applyChromeAppearanceHue();
  };

  applyHue();

  const colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
  if (typeof colorSchemeQuery.addEventListener === 'function') {
    colorSchemeQuery.addEventListener('change', applyHue);
  } else if (typeof colorSchemeQuery.addListener === 'function') {
    colorSchemeQuery.addListener(applyHue);
  }

  window.addEventListener('focus', applyHue);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      applyHue();
    }
  });

  if (typeof chrome !== 'undefined' && chrome.theme?.onUpdated?.addListener) {
    chrome.theme.onUpdated.addListener(applyHue);
  }
}

function prefersReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function getAnime() {
  if (typeof window === 'undefined') {
    return null;
  }

  return typeof window.anime === 'function' ? window.anime : null;
}

function getAnimeText() {
  if (typeof window === 'undefined') {
    return null;
  }

  const animeTextApi = window.anime4;
  if (!animeTextApi || typeof animeTextApi.animate !== 'function' || typeof animeTextApi.splitText !== 'function') {
    return null;
  }

  return animeTextApi;
}

function pulseNode(node, options = {}) {
  if (!(node instanceof HTMLElement)) {
    return;
  }

  const anime = getAnime();
  if (!anime || prefersReducedMotion()) {
    return;
  }

  anime.remove(node);
  anime({
    targets: node,
    ...options
  });
}

function animateTextChange(node, options = {}) {
  if (!(node instanceof HTMLElement) || prefersReducedMotion()) {
    return;
  }

  const currentText = node.textContent ?? '';
  const forceAnimation = options.force === true;
  if (!forceAnimation && lastAnimatedTextByNode.get(node) === currentText) {
    return;
  }

  lastAnimatedTextByNode.set(node, currentText);

  const animeText = getAnimeText();
  if (!animeText) {
    return;
  }

  const previousSplit = activeTextSplitByNode.get(node);
  if (previousSplit && typeof previousSplit.revert === 'function') {
    previousSplit.revert();
  }

  const split = animeText.splitText(node, { chars: true, words: false });
  const chars = Array.isArray(split?.chars) ? split.chars : [];
  if (chars.length === 0) {
    return;
  }

  activeTextSplitByNode.set(node, split);
  animeText.animate(chars, {
    y: [options.fromY ?? '0.42em', '0em'],
    opacity: [0, 1],
    duration: options.duration ?? 360,
    delay: animeText.stagger(options.stagger ?? 9),
    ease: options.ease ?? EASE_TEXT,
    onComplete: () => {
      if (activeTextSplitByNode.get(node) === split) {
        split.revert();
        activeTextSplitByNode.delete(node);
      }
    }
  });
}

function shouldAnimateChoiceReflection() {
  if (prefersReducedMotion()) {
    return false;
  }

  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return true;
  }

  return !window.matchMedia('(pointer: coarse)').matches;
}

function paintChoiceReflection(button, reflectionState) {
  button.style.setProperty('--reflect-x', `${reflectionState.x.toFixed(2)}%`);
  button.style.setProperty('--reflect-y', `${reflectionState.y.toFixed(2)}%`);
}

function getChoiceReflectionState(button) {
  let reflectionState = choiceReflectionStateByNode.get(button);
  if (reflectionState) {
    return reflectionState;
  }

  reflectionState = {
    x: 50,
    y: 50,
    targetX: 50,
    targetY: 50,
    active: false,
    frameId: 0
  };
  choiceReflectionStateByNode.set(button, reflectionState);
  paintChoiceReflection(button, reflectionState);
  return reflectionState;
}

function setChoiceReflectionTarget(button, reflectionState, clientX, clientY) {
  const rect = button.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return;
  }

  reflectionState.targetX = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
  reflectionState.targetY = clamp(((clientY - rect.top) / rect.height) * 100, 0, 100);
}

function queueChoiceReflectionFrame(button, reflectionState) {
  if (reflectionState.frameId) {
    return;
  }

  reflectionState.frameId = window.requestAnimationFrame(() => {
    reflectionState.frameId = 0;

    reflectionState.x += (reflectionState.targetX - reflectionState.x) * CHOICE_REFLECTION_EASE;
    reflectionState.y += (reflectionState.targetY - reflectionState.y) * CHOICE_REFLECTION_EASE;
    paintChoiceReflection(button, reflectionState);

    const settledX = Math.abs(reflectionState.targetX - reflectionState.x) <= CHOICE_REFLECTION_SETTLE_DELTA;
    const settledY = Math.abs(reflectionState.targetY - reflectionState.y) <= CHOICE_REFLECTION_SETTLE_DELTA;
    if (!reflectionState.active && settledX && settledY) {
      reflectionState.x = reflectionState.targetX;
      reflectionState.y = reflectionState.targetY;
      paintChoiceReflection(button, reflectionState);
      return;
    }

    queueChoiceReflectionFrame(button, reflectionState);
  });
}

function handleChoicePointerEnter(event) {
  if (!shouldAnimateChoiceReflection()) {
    return;
  }

  const button = event.currentTarget;
  if (!(button instanceof HTMLElement)) {
    return;
  }

  const reflectionState = getChoiceReflectionState(button);
  reflectionState.active = true;
  button.style.setProperty('--reflect-opacity', '1');
  setChoiceReflectionTarget(button, reflectionState, event.clientX, event.clientY);
  queueChoiceReflectionFrame(button, reflectionState);
}

function handleChoicePointerMove(event) {
  if (!shouldAnimateChoiceReflection()) {
    return;
  }

  const button = event.currentTarget;
  if (!(button instanceof HTMLElement)) {
    return;
  }

  const reflectionState = getChoiceReflectionState(button);
  reflectionState.active = true;
  setChoiceReflectionTarget(button, reflectionState, event.clientX, event.clientY);
  queueChoiceReflectionFrame(button, reflectionState);
}

function handleChoicePointerLeave(event) {
  const button = event.currentTarget;
  if (!(button instanceof HTMLElement)) {
    return;
  }

  const reflectionState = getChoiceReflectionState(button);
  reflectionState.active = false;
  reflectionState.targetX = 50;
  reflectionState.targetY = 50;
  button.style.setProperty('--reflect-opacity', '0');
  queueChoiceReflectionFrame(button, reflectionState);
}

function cleanupChoiceReflection(button) {
  const reflectionState = choiceReflectionStateByNode.get(button);
  if (!reflectionState) {
    return;
  }

  if (reflectionState.frameId) {
    window.cancelAnimationFrame(reflectionState.frameId);
  }
  choiceReflectionStateByNode.delete(button);
}

function parseTimestampCandidate(value) {
  if (Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const numeric = Number.parseInt(value.trim(), 10);
    if (Number.isFinite(numeric)) {
      return numeric;
    }

    const parsed = Date.parse(value.trim());
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return null;
}

function parseCountCandidate(value) {
  if (Number.isFinite(value)) {
    return Math.max(1, Math.floor(value));
  }

  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (Number.isFinite(parsed)) {
    return Math.max(1, parsed);
  }

  return 1;
}

export function createVocabularyKey(entry) {
  return [
    entry.source.toLowerCase(),
    entry.translation.toLowerCase(),
    entry.sourceLanguage.toLowerCase(),
    entry.targetLanguage.toLowerCase()
  ].join('|');
}

export function normalizeVocabularyEntry(entry) {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  if (
    typeof entry.source !== 'string' ||
    typeof entry.translation !== 'string' ||
    typeof entry.sourceLanguage !== 'string' ||
    typeof entry.targetLanguage !== 'string'
  ) {
    return null;
  }

  const source = entry.source.trim();
  const translation = entry.translation.trim();
  const sourceLanguage = entry.sourceLanguage.trim().toLowerCase();
  const targetLanguage = entry.targetLanguage.trim().toLowerCase();

  if (!source || !translation || !sourceLanguage || !targetLanguage) {
    return null;
  }

  return {
    source,
    translation,
    sourceLanguage,
    targetLanguage,
    provider: typeof entry.provider === 'string' ? entry.provider.trim() : '',
    count: parseCountCandidate(entry.count),
    firstSeenAt: parseTimestampCandidate(entry.firstSeenAt),
    lastSeenAt: parseTimestampCandidate(entry.lastSeenAt)
  };
}

function normalizeQuizBucketEntry(entry) {
  const normalized = normalizeVocabularyEntry(entry);
  if (!normalized) {
    return null;
  }

  const wrongCountRaw = Number.parseInt(String(entry?.wrongCount ?? 0), 10);
  const wrongCount = Number.isFinite(wrongCountRaw) ? Math.max(0, wrongCountRaw) : 0;
  const lastQuizAt = parseTimestampCandidate(entry?.lastQuizAt);

  return {
    ...normalized,
    wrongCount,
    lastQuizAt
  };
}

function mergeVocabularyEntries(baseEntry, incomingEntry) {
  const merged = {
    ...baseEntry,
    provider: incomingEntry.provider || baseEntry.provider,
    count: parseCountCandidate(baseEntry.count) + parseCountCandidate(incomingEntry.count),
    firstSeenAt: null,
    lastSeenAt: null
  };

  const firstSeenCandidates = [baseEntry.firstSeenAt, incomingEntry.firstSeenAt].filter((value) => Number.isFinite(value));
  merged.firstSeenAt = firstSeenCandidates.length > 0 ? Math.min(...firstSeenCandidates) : null;

  const lastSeenCandidates = [baseEntry.lastSeenAt, incomingEntry.lastSeenAt].filter((value) => Number.isFinite(value));
  merged.lastSeenAt = lastSeenCandidates.length > 0 ? Math.max(...lastSeenCandidates) : null;

  return merged;
}

function mergeQuizBucketEntries(baseEntry, incomingEntry) {
  const merged = mergeVocabularyEntries(baseEntry, incomingEntry);
  merged.wrongCount = Math.max(baseEntry.wrongCount ?? 0, incomingEntry.wrongCount ?? 0);

  const baseQuizAt = Number.isFinite(baseEntry.lastQuizAt) ? baseEntry.lastQuizAt : null;
  const incomingQuizAt = Number.isFinite(incomingEntry.lastQuizAt) ? incomingEntry.lastQuizAt : null;
  merged.lastQuizAt = Number.isFinite(baseQuizAt) && Number.isFinite(incomingQuizAt)
    ? Math.max(baseQuizAt, incomingQuizAt)
    : (baseQuizAt ?? incomingQuizAt);
  return merged;
}

function sortEntriesByRecency(entries) {
  return [...entries].sort((left, right) => {
    const leftLast = Number.isFinite(left.lastSeenAt) ? left.lastSeenAt : 0;
    const rightLast = Number.isFinite(right.lastSeenAt) ? right.lastSeenAt : 0;
    return rightLast - leftLast;
  });
}

function upsertBucketEntry(map, entry) {
  const key = createVocabularyKey(entry);
  const existing = map.get(key);
  if (!existing) {
    map.set(key, entry);
    return;
  }

  map.set(key, mergeQuizBucketEntries(existing, entry));
}

export function normalizeQuizBuckets(rawBuckets, fallbackEntries = []) {
  const notQuizzedMap = new Map();
  const correctMap = new Map();
  const incorrectMap = new Map();

  const rawNotQuizzed = Array.isArray(rawBuckets?.notQuizzed) ? rawBuckets.notQuizzed : [];
  const rawCorrect = Array.isArray(rawBuckets?.correct) ? rawBuckets.correct : [];
  const rawIncorrect = Array.isArray(rawBuckets?.incorrect) ? rawBuckets.incorrect : [];

  for (const entry of rawNotQuizzed) {
    const normalized = normalizeQuizBucketEntry(entry);
    if (!normalized) {
      continue;
    }
    upsertBucketEntry(notQuizzedMap, normalized);
  }

  for (const entry of rawCorrect) {
    const normalized = normalizeQuizBucketEntry(entry);
    if (!normalized) {
      continue;
    }
    upsertBucketEntry(correctMap, normalized);
  }

  for (const entry of rawIncorrect) {
    const normalized = normalizeQuizBucketEntry(entry);
    if (!normalized) {
      continue;
    }
    upsertBucketEntry(incorrectMap, normalized);
  }

  for (const entry of fallbackEntries) {
    const normalized = normalizeQuizBucketEntry(entry);
    if (!normalized) {
      continue;
    }

    const key = createVocabularyKey(normalized);
    if (correctMap.has(key) || incorrectMap.has(key)) {
      continue;
    }
    upsertBucketEntry(notQuizzedMap, normalized);
  }

  for (const key of correctMap.keys()) {
    notQuizzedMap.delete(key);
    incorrectMap.delete(key);
  }

  for (const key of incorrectMap.keys()) {
    notQuizzedMap.delete(key);
  }

  return {
    notQuizzed: sortEntriesByRecency(Array.from(notQuizzedMap.values())),
    correct: sortEntriesByRecency(Array.from(correctMap.values())),
    incorrect: sortEntriesByRecency(Array.from(incorrectMap.values()))
  };
}

export function filterRecentEntries(entries, now = Date.now(), windowMs = RECENT_WINDOW_MS) {
  if (!Array.isArray(entries)) {
    return [];
  }

  const minTimestamp = now - windowMs;
  const deduped = new Map();

  for (const rawEntry of entries) {
    const entry = normalizeVocabularyEntry(rawEntry);
    if (!entry) {
      continue;
    }

    const seenAt = Number.isFinite(entry.lastSeenAt) ? entry.lastSeenAt : entry.firstSeenAt;
    if (!Number.isFinite(seenAt) || seenAt < minTimestamp || seenAt > now) {
      continue;
    }

    const key = createVocabularyKey(entry);
    const existing = deduped.get(key);
    if (!existing || seenAt > (existing.lastSeenAt ?? existing.firstSeenAt ?? 0)) {
      deduped.set(key, {
        ...entry,
        firstSeenAt: entry.firstSeenAt ?? seenAt,
        lastSeenAt: seenAt
      });
    }
  }

  return sortEntriesByRecency(Array.from(deduped.values()));
}

export function shuffle(values, random = Math.random) {
  const copy = [...values];
  for (let cursor = copy.length - 1; cursor > 0; cursor -= 1) {
    const swapIndex = Math.floor(random() * (cursor + 1));
    const temp = copy[cursor];
    copy[cursor] = copy[swapIndex];
    copy[swapIndex] = temp;
  }
  return copy;
}

export function buildQuizCandidateEntries(buckets) {
  const normalized = normalizeQuizBuckets(buckets);

  const notQuizzed = normalized.notQuizzed.map((entry) => ({
    ...entry,
    quizBucket: 'not_quizzed',
    selectionWeight: 1
  }));

  const incorrect = normalized.incorrect.map((entry) => {
    const wrongCount = Number.isFinite(entry.wrongCount) ? entry.wrongCount : 0;
    const decayedWeight = INCORRECT_SELECTION_WEIGHT / (1 + wrongCount * 0.35);
    return {
      ...entry,
      quizBucket: 'incorrect',
      selectionWeight: clamp(decayedWeight, 0.05, INCORRECT_SELECTION_WEIGHT)
    };
  });

  return [...notQuizzed, ...incorrect];
}

function getCandidateWeight(entry) {
  const explicitWeight = Number(entry?.selectionWeight);
  if (Number.isFinite(explicitWeight) && explicitWeight > 0) {
    return explicitWeight;
  }

  return entry?.quizBucket === 'incorrect' ? INCORRECT_SELECTION_WEIGHT : 1;
}

function pickWeightedCandidate(candidates, random = Math.random) {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return null;
  }

  const totalWeight = candidates.reduce((sum, entry) => sum + getCandidateWeight(entry), 0);
  if (!Number.isFinite(totalWeight) || totalWeight <= 0) {
    return candidates[Math.floor(random() * candidates.length)] ?? null;
  }

  let threshold = random() * totalWeight;
  for (const entry of candidates) {
    threshold -= getCandidateWeight(entry);
    if (threshold <= 0) {
      return entry;
    }
  }

  return candidates[candidates.length - 1] ?? null;
}

export function buildMatchingRound(
  entries,
  {
    random = Math.random,
    minPairs = MIN_PAIRS_PER_ROUND,
    maxPairs = MAX_PAIRS_PER_ROUND
  } = {}
) {
  if (!Array.isArray(entries) || entries.length < minPairs) {
    return null;
  }

  const dedupedByKey = new Map();
  for (const rawEntry of entries) {
    const normalized = normalizeVocabularyEntry(rawEntry);
    if (!normalized) {
      continue;
    }

    const key = createVocabularyKey(normalized);
    const existing = dedupedByKey.get(key);
    const candidate = {
      ...normalized,
      quizBucket: rawEntry?.quizBucket === 'incorrect' ? 'incorrect' : 'not_quizzed',
      wrongCount: Number.isFinite(rawEntry?.wrongCount) ? Math.max(0, rawEntry.wrongCount) : 0,
      selectionWeight: getCandidateWeight(rawEntry)
    };

    if (!existing) {
      dedupedByKey.set(key, candidate);
      continue;
    }

    const merged = mergeQuizBucketEntries(existing, candidate);
    merged.quizBucket = existing.quizBucket === 'not_quizzed' ? 'not_quizzed' : candidate.quizBucket;
    merged.selectionWeight = Math.max(getCandidateWeight(existing), getCandidateWeight(candidate));
    dedupedByKey.set(key, merged);
  }

  const pool = Array.from(dedupedByKey.values());
  if (pool.length < minPairs) {
    return null;
  }

  const selectedPairs = [];
  const usedSource = new Set();
  const usedTranslation = new Set();
  const selectedIds = new Set();

  while (selectedPairs.length < maxPairs) {
    const eligible = pool.filter((entry) => {
      const pairId = createVocabularyKey(entry);
      if (selectedIds.has(pairId)) {
        return false;
      }

      const sourceKey = entry.source.toLowerCase();
      const translationKey = entry.translation.toLowerCase();
      return !usedSource.has(sourceKey) && !usedTranslation.has(translationKey);
    });

    if (eligible.length === 0) {
      break;
    }

    const chosen = pickWeightedCandidate(eligible, random);
    if (!chosen) {
      break;
    }

    const pairId = createVocabularyKey(chosen);
    selectedIds.add(pairId);
    usedSource.add(chosen.source.toLowerCase());
    usedTranslation.add(chosen.translation.toLowerCase());

    selectedPairs.push({
      id: pairId,
      source: chosen.source,
      translation: chosen.translation,
      sourceLanguage: chosen.sourceLanguage,
      targetLanguage: chosen.targetLanguage,
      provider: chosen.provider,
      count: chosen.count,
      firstSeenAt: chosen.firstSeenAt,
      lastSeenAt: chosen.lastSeenAt,
      wrongCount: chosen.wrongCount,
      quizBucket: chosen.quizBucket
    });
  }

  if (selectedPairs.length < minPairs) {
    return null;
  }

  const sourceOrder = shuffle(selectedPairs.map((pair) => pair.id), random);
  const translationOrder = shuffle(selectedPairs.map((pair) => pair.id), random);

  return {
    pairs: selectedPairs,
    pairById: new Map(selectedPairs.map((pair) => [pair.id, pair])),
    sourceOrder,
    translationOrder
  };
}

function cacheElements() {
  elements.quizPanel = document.getElementById('quizPanel');
  elements.emptyState = document.getElementById('emptyState');
  elements.sourceColumn = document.getElementById('sourceColumn');
  elements.translationColumn = document.getElementById('translationColumn');
  elements.sourceChoices = document.getElementById('sourceChoices');
  elements.translationChoices = document.getElementById('translationChoices');
  elements.progressLabel = document.getElementById('progressLabel');
  elements.progressFill = document.getElementById('progressFill');
  elements.selectedSourceValue = document.getElementById('selectedSourceValue');
  elements.selectedTranslationValue = document.getElementById('selectedTranslationValue');
  elements.selectionStatus = document.getElementById('selectionStatus');
  elements.selectionHeadline = document.getElementById('selectionHeadline');
  elements.roundValue = document.getElementById('roundValue');
  elements.correctCountValue = document.getElementById('correctCountValue');
  elements.incorrectCountValue = document.getElementById('incorrectCountValue');
  elements.pairValue = document.getElementById('pairValue');
  elements.remainingCountValue = document.getElementById('remainingCountValue');
  elements.wordPoolValue = document.getElementById('wordPoolValue');
  elements.accuracyValue = document.getElementById('accuracyValue');
  elements.scoreValue = document.getElementById('scoreValue');
  elements.nextRoundButton = document.getElementById('nextRoundButton');
  elements.firstQuizModal = document.getElementById('firstQuizModal');
  elements.startQuizButton = document.getElementById('startQuizButton');
  elements.chatToggleButton = document.getElementById('chatToggleButton');
  elements.chatDrawer = document.getElementById('chatDrawer');
  elements.chatOverlay = document.getElementById('chatOverlay');
  elements.chatCloseButton = document.getElementById('chatCloseButton');
  elements.chatMessages = document.getElementById('chatMessages');
  elements.chatForm = document.getElementById('chatForm');
  elements.chatInput = document.getElementById('chatInput');
  elements.chatContextWords = document.getElementById('chatContextWords');
  elements.chatStatus = document.getElementById('chatStatus');
  elements.chatClearButton = document.getElementById('chatClearButton');
  elements.chatResizeHandle = document.getElementById('chatResizeHandle');
  elements.chatSetupPanel = document.getElementById('chatSetupPanel');
  elements.chatSetupProvider = document.getElementById('chatSetupProvider');
  elements.chatSetupModel = document.getElementById('chatSetupModel');
  elements.chatSetupApiKey = document.getElementById('chatSetupApiKey');
  elements.chatSetupSaveButton = document.getElementById('chatSetupSaveButton');
}

function attachRevealAnimation() {
  const revealNodes = document.querySelectorAll('[data-reveal]');
  if (revealNodes.length === 0) {
    return;
  }

  const anime = getAnime();

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) {
          continue;
        }

        const delayMs = Number.parseInt(entry.target.dataset.delay || '0', 10);
        entry.target.classList.add('visible');
        if (anime && !prefersReducedMotion()) {
          anime.remove(entry.target);
          anime({
            targets: entry.target,
            opacity: [0, 1],
            translateY: [18, 0],
            scale: [0.985, 1],
            duration: 560,
            delay: Math.max(0, delayMs),
            easing: EASE_STANDARD
          });
        } else {
          entry.target.style.transitionDelay = `${Math.max(0, delayMs)}ms`;
        }
        observer.unobserve(entry.target);
      }
    },
    { threshold: 0.1 }
  );

  for (const revealNode of revealNodes) {
    observer.observe(revealNode);
  }
}

function attachFloatingPlusField() {
  const field = document.getElementById('floatingPlusField');
  if (!field) {
    return;
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const anime = getAnime();
  const ornaments = [];

  const buildOrnaments = () => {
    field.replaceChildren();
    ornaments.length = 0;
    const desiredCount = clamp(Math.round(window.innerWidth / 58), 12, 30);

    for (let index = 0; index < desiredCount; index += 1) {
      const node = document.createElement('span');
      node.className = 'floating-plus';
      node.style.left = `${Math.random() * 100}%`;
      node.style.top = `${Math.random() * 100}%`;
      node.style.setProperty('--size', `${12 + Math.random() * 22}px`);
      const baseAlpha = (0.06 + Math.random() * 0.16).toFixed(3);
      node.style.setProperty('--alpha', baseAlpha);
      node.style.setProperty('--spin-duration', `${12 + Math.random() * 30}s`);

      const glyph = document.createElement('span');
      glyph.className = 'floating-plus-glyph';
      node.append(glyph);
      field.append(node);

      if (anime && !reducedMotion.matches) {
        anime({
          targets: node,
          opacity: [Number.parseFloat(baseAlpha), clamp(Number.parseFloat(baseAlpha) + 0.12, 0.04, 0.32)],
          duration: 2200 + Math.random() * 1900,
          easing: EASE_GENTLE,
          direction: 'alternate',
          loop: true,
          delay: Math.random() * 1000
        });
      }

      ornaments.push({
        node,
        driftX: (Math.random() * 90 - 45) * (Math.random() > 0.5 ? 1 : -1),
        driftY: (Math.random() * 120 - 60) * (Math.random() > 0.5 ? 1 : -1),
        depth: 0.3 + Math.random() * 0.9
      });
    }
  };

  const update = () => {
    const y = window.scrollY || 0;
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const progress = clamp(y / maxScroll, 0, 1);

    for (const ornament of ornaments) {
      const x = ornament.driftX * progress * ornament.depth;
      const vertical = ornament.driftY * progress * ornament.depth;
      const flow = y * (0.012 * ornament.depth);
      ornament.node.style.transform = `translate3d(${x.toFixed(2)}px, ${(vertical + flow).toFixed(2)}px, 0)`;
    }
  };

  let ticking = false;
  const onScroll = () => {
    if (ticking || reducedMotion.matches) {
      return;
    }

    ticking = true;
    window.requestAnimationFrame(() => {
      update();
      ticking = false;
    });
  };

  buildOrnaments();
  update();

  if (!reducedMotion.matches) {
    window.addEventListener('scroll', onScroll, { passive: true });
  }
  window.addEventListener('resize', () => {
    buildOrnaments();
    update();
  });
}

function attachBackgroundParallax() {
  const glowA = document.querySelector('.glow-a');
  const glowB = document.querySelector('.glow-b');
  if (!glowA || !glowB) {
    return;
  }

  let ticking = false;
  const update = () => {
    const y = window.scrollY || 0;
    glowA.style.transform = `translate3d(${-y * 0.02}px, ${y * 0.04}px, 0)`;
    glowB.style.transform = `translate3d(${y * 0.018}px, ${-y * 0.03}px, 0)`;
    ticking = false;
  };

  const onScroll = () => {
    if (ticking) {
      return;
    }

    ticking = true;
    window.requestAnimationFrame(update);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
}

function hasSeenQuizIntro() {
  return false;
}

function markQuizIntroSeen() {
  // Placeholder: persistence for this flag is not yet implemented.
}

function showFirstQuizModalIfNeeded() {
  if (!elements.firstQuizModal || hasSeenQuizIntro()) {
    return;
  }

  elements.firstQuizModal.classList.remove('hidden');
  document.body.classList.add('modal-open');

  const modalCard = elements.firstQuizModal.querySelector('.intro-card');
  pulseNode(modalCard, {
    opacity: [0, 1],
    translateY: [84, 0],
    scale: [0.94, 1],
    duration: 620,
    easing: EASE_GENTLE
  });
}

function closeFirstQuizModal() {
  if (!elements.firstQuizModal || elements.firstQuizModal.classList.contains('hidden')) {
    return;
  }

  markQuizIntroSeen();
  const modal = elements.firstQuizModal;
  const modalCard = modal.querySelector('.intro-card');
  const anime = getAnime();

  if (anime && !prefersReducedMotion() && modalCard) {
    anime.remove(modalCard);
    anime({
      targets: modalCard,
      opacity: [1, 0],
      translateY: [0, -16],
      scale: [1, 0.94],
      duration: 280,
      easing: EASE_GENTLE,
      complete: () => {
        modal.classList.add('hidden');
        document.body.classList.remove('modal-open');
      }
    });
    return;
  }

  modal.classList.add('hidden');
  document.body.classList.remove('modal-open');
}

function attachTextEntranceMotion() {
  const animatedNodes = [
    document.querySelector('.brand-name'),
    document.querySelector('.panel-head h2'),
    ...Array.from(document.querySelectorAll('.column-title'))
  ];

  for (const [index, node] of animatedNodes.entries()) {
    window.setTimeout(() => {
      animateTextChange(node, {
        duration: 460,
        stagger: 8,
        ease: EASE_STANDARD
      });
    }, index * 60);
  }
}

function getLocalStorage(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, (items) => {
      if (chrome.runtime.lastError) {
        resolve({});
        return;
      }
      resolve(items ?? {});
    });
  });
}

function setLocalStorage(items) {
  return new Promise((resolve) => {
    chrome.storage.local.set(items, () => {
      resolve(!chrome.runtime.lastError);
    });
  });
}

async function getQuizBucketsFromStorage() {
  const items = await getLocalStorage([VOCABULARY_ENTRIES_KEY, VOCABULARY_QUIZ_BUCKETS_KEY]);
  const fallbackEntries = Array.isArray(items[VOCABULARY_ENTRIES_KEY]) ? items[VOCABULARY_ENTRIES_KEY] : [];
  const buckets = normalizeQuizBuckets(items[VOCABULARY_QUIZ_BUCKETS_KEY], fallbackEntries);

  if (!items[VOCABULARY_QUIZ_BUCKETS_KEY] && fallbackEntries.length > 0) {
    await setLocalStorage({ [VOCABULARY_QUIZ_BUCKETS_KEY]: buckets });
  }

  return buckets;
}

function clearWrongFeedbackTimer() {
  if (state.wrongFlashTimer) {
    clearTimeout(state.wrongFlashTimer);
    state.wrongFlashTimer = null;
  }
}

function updateBucketStats() {
  if (elements.wordPoolValue) {
    const poolSize = state.quizBuckets.notQuizzed.length + state.quizBuckets.incorrect.length;
    setStatValue(elements.wordPoolValue, String(poolSize));
  }
}

function setStatValue(node, value) {
  if (!(node instanceof HTMLElement)) {
    return;
  }

  const nextValue = String(value);
  const previousValue = node.textContent ?? '';
  node.textContent = nextValue;
  if (previousValue === nextValue) {
    return;
  }

  pulseNode(node, {
    scale: [1, 1.06, 1],
    duration: 260,
    easing: EASE_POP
  });
}

function setAnimatedText(node, value, options = {}) {
  if (!(node instanceof HTMLElement)) {
    return;
  }

  const nextValue = String(value);
  const previousValue = node.textContent ?? '';
  node.textContent = nextValue;
  if (previousValue === nextValue) {
    return;
  }

  animateTextChange(node, {
    force: true,
    duration: options.duration ?? 320,
    stagger: options.stagger ?? 7,
    ease: options.ease ?? EASE_TEXT,
    fromY: options.fromY ?? '0.28em'
  });
}

function getRoundPairById(id) {
  if (!id || !state.round?.pairById) {
    return null;
  }

  return state.round.pairById.get(id) ?? null;
}

function updateSelectionUi() {
  const selectedSourcePair = getRoundPairById(state.selectedSourceId);
  const selectedTranslationPair = getRoundPairById(state.selectedTranslationId);
  const hasMatchedAllPairs = Boolean(state.round) && state.matchedIds.size === state.round.pairs.length;
  const hasSourceSelection = Boolean(selectedSourcePair);
  const hasTranslationSelection = Boolean(selectedTranslationPair);
  const hasAnySelection = hasSourceSelection || hasTranslationSelection;
  const hasWrongSelection = Boolean(state.wrongSourceId || state.wrongTranslationId);

  const selectedSourceText = selectedSourcePair?.source ?? 'Choose a word';
  const selectedTranslationText = selectedTranslationPair?.translation ?? (hasAnySelection ? 'Choose the match' : 'Waiting');

  let selectionHeadline = 'Choose any word to start';
  let selectionStatus = 'You can start from either column, then choose the matching word.';

  if (hasMatchedAllPairs) {
    selectionHeadline = 'Round complete';
    selectionStatus = 'Nice. Every pair is matched.';
  } else if (hasWrongSelection) {
    selectionHeadline = 'Try again';
    selectionStatus = 'That was not a match. Pick another translation.';
  } else if (hasSourceSelection && hasTranslationSelection) {
    selectionHeadline = 'Checking';
    selectionStatus = 'Checking your match.';
  } else if (hasSourceSelection) {
    selectionHeadline = 'Choose the right match';
    selectionStatus = `Match ${selectedSourcePair.source} with its translation.`;
  } else if (hasTranslationSelection) {
    selectionHeadline = 'Choose the right match';
    selectionStatus = `Match ${selectedTranslationPair.translation} with its source word.`;
  }

  setAnimatedText(elements.selectedSourceValue, selectedSourceText, { duration: 300, stagger: 6 });
  setAnimatedText(elements.selectedTranslationValue, selectedTranslationText, { duration: 300, stagger: 6 });
  setAnimatedText(elements.selectionHeadline, selectionHeadline, { duration: 280, stagger: 6, fromY: '0.2em' });
  setAnimatedText(elements.selectionStatus, selectionStatus, { duration: 320, stagger: 4, fromY: '0.18em' });

  if (elements.sourceColumn) {
    elements.sourceColumn.classList.toggle('is-active', hasTranslationSelection && !hasSourceSelection && !hasMatchedAllPairs);
    elements.sourceColumn.classList.toggle('is-locked', false);
  }

  if (elements.translationColumn) {
    elements.translationColumn.classList.toggle('is-active', hasSourceSelection && !hasTranslationSelection && !hasMatchedAllPairs);
    elements.translationColumn.classList.toggle('is-locked', false);
  }
}

function updateStats() {
  const totalPairs = state.round?.pairs.length ?? 0;
  const matched = state.matchedIds.size;
  const attempts = state.correctMatches + state.wrongMatches;
  const accuracy = attempts > 0 ? Math.round((state.correctMatches / attempts) * 100) : 100;
  const progressPercent = totalPairs > 0 ? Math.round((matched / totalPairs) * 100) : 0;
  const remaining = Math.max(0, totalPairs - matched);
  const anime = getAnime();

  setStatValue(elements.roundValue, String(Math.max(1, state.roundIndex)));
  if (elements.correctCountValue) {
    setStatValue(elements.correctCountValue, String(state.correctMatches));
  }
  if (elements.incorrectCountValue) {
    setStatValue(elements.incorrectCountValue, String(state.wrongMatches));
  }
  setStatValue(elements.pairValue, `${matched}/${totalPairs}`);
  if (elements.remainingCountValue) {
    setStatValue(elements.remainingCountValue, String(remaining));
  }
  setStatValue(elements.accuracyValue, `${accuracy}%`);
  setStatValue(elements.scoreValue, String(state.score));
  if (elements.progressLabel) {
    const nextProgressLabel = `${matched}/${totalPairs}`;
    const progressLabelChanged = elements.progressLabel.textContent !== nextProgressLabel;
    elements.progressLabel.textContent = nextProgressLabel;
    if (progressLabelChanged) {
      animateTextChange(elements.progressLabel, {
        force: true,
        duration: 340,
        stagger: 7,
        ease: EASE_TEXT
      });
    }
  }
  if (anime && elements.progressFill && !prefersReducedMotion()) {
    anime.remove(elements.progressFill);
    anime({
      targets: elements.progressFill,
      width: [`${state.progressPercent}%`, `${progressPercent}%`],
      duration: 320,
      easing: EASE_STANDARD
    });
  } else if (elements.progressFill) {
    elements.progressFill.style.width = `${progressPercent}%`;
  }
  state.progressPercent = progressPercent;
  updateBucketStats();
}

function updateChoiceButtonState(button, kind, id) {
  const isMatched = state.matchedIds.has(id);
  const isSelected = kind === 'source' ? state.selectedSourceId === id : state.selectedTranslationId === id;
  const isWrong = kind === 'source' ? state.wrongSourceId === id : state.wrongTranslationId === id;

  button.classList.toggle('matched', isMatched);
  button.classList.toggle('selected', !isMatched && isSelected);
  button.classList.toggle('wrong', !isMatched && isWrong);
  button.disabled = isMatched;

  if (isMatched) {
    const reflectionState = choiceReflectionStateByNode.get(button);
    if (reflectionState) {
      reflectionState.active = false;
      reflectionState.targetX = 50;
      reflectionState.targetY = 50;
      queueChoiceReflectionFrame(button, reflectionState);
    }
    button.style.setProperty('--reflect-opacity', '0');
  }
}

function animateChoicePair(pairId, mode) {
  const anime = getAnime();
  if (!anime || prefersReducedMotion()) {
    return;
  }

  const targets = Array.from(document.querySelectorAll('.choice')).filter(
    (node) => node instanceof HTMLElement && node.dataset.id === pairId
  );
  if (targets.length === 0) {
    return;
  }

  anime.remove(targets);
  if (mode === 'matched') {
    anime({
      targets,
      scale: [1, 1.08, 1],
      duration: 340,
      easing: EASE_POP
    });
    return;
  }

  anime({
    targets,
    translateX: [0, -5, 5, -4, 4, 0],
    duration: 280,
    easing: EASE_GENTLE
  });
}

function buildChoiceButton({ kind, id, label, index }) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'choice';
  button.dataset.kind = kind;
  button.dataset.id = id;
  button.style.setProperty('--reflect-x', '50%');
  button.style.setProperty('--reflect-y', '50%');
  button.style.setProperty('--reflect-opacity', '0');
  const labelNode = document.createElement('span');
  labelNode.className = 'choice-label';
  labelNode.textContent = label;
  button.append(labelNode);
  button.dataset.enterIndex = String(index);

  if (shouldAnimateChoiceReflection()) {
    button.addEventListener('pointerenter', handleChoicePointerEnter);
    button.addEventListener('pointermove', handleChoicePointerMove);
    button.addEventListener('pointerleave', handleChoicePointerLeave);
    button.addEventListener('pointercancel', handleChoicePointerLeave);
  }

  updateChoiceButtonState(button, kind, id);

  return button;
}

function syncChoiceColumn(container, order, kind) {
  if (!state.round || !(container instanceof HTMLElement)) {
    return;
  }

  const existingButtonsById = new Map();
  for (const node of Array.from(container.children)) {
    if (!(node instanceof HTMLButtonElement) || !node.classList.contains('choice')) {
      continue;
    }
    if (!node.dataset.id) {
      continue;
    }
    existingButtonsById.set(node.dataset.id, node);
  }

  const nextButtons = [];
  order.forEach((id, index) => {
    const pair = state.round.pairById.get(id);
    if (!pair) {
      return;
    }

    const label = kind === 'source' ? pair.source : pair.translation;
    const existingButton = existingButtonsById.get(pair.id);
    if (existingButton) {
      existingButton.dataset.kind = kind;
      const existingLabelNode = existingButton.querySelector('.choice-label');
      if (existingLabelNode) {
        existingLabelNode.textContent = label;
      } else {
        existingButton.textContent = label;
      }
      updateChoiceButtonState(existingButton, kind, pair.id);
      nextButtons.push(existingButton);
      existingButtonsById.delete(pair.id);
      return;
    }

    nextButtons.push(buildChoiceButton({ kind, id: pair.id, label, index }));
  });

  for (const staleButton of existingButtonsById.values()) {
    cleanupChoiceReflection(staleButton);
    staleButton.remove();
  }

  for (const button of nextButtons) {
    container.appendChild(button);
    const enterIndex = Number.parseInt(button.dataset.enterIndex || '-1', 10);
    if (!Number.isFinite(enterIndex) || enterIndex < 0) {
      continue;
    }

    delete button.dataset.enterIndex;
    const anime = getAnime();
    if (anime && !prefersReducedMotion()) {
      anime({
        targets: button,
        opacity: [0, 1],
        translateY: [8, 0],
        scale: [0.985, 1],
        duration: 320,
        delay: enterIndex * 28,
        easing: EASE_STANDARD
      });
      continue;
    }

    button.style.animationDelay = `${enterIndex * 34}ms`;
    button.classList.add('choice-enter');
    button.addEventListener('animationend', () => {
      button.classList.remove('choice-enter');
    }, { once: true });
  }
}

function renderChoices() {
  if (!state.round) {
    return;
  }

  syncChoiceColumn(elements.sourceChoices, state.round.sourceOrder, 'source');
  syncChoiceColumn(elements.translationChoices, state.round.translationOrder, 'translation');
}

function renderRound() {
  renderChoices();
  updateStats();
  updateSelectionUi();
}

function clearSelections() {
  state.selectedSourceId = null;
  state.selectedTranslationId = null;
}

function markRoundOutcomeIncorrect(pairId) {
  if (!pairId || !state.round?.pairById.has(pairId)) {
    return;
  }

  state.roundOutcomeById.set(pairId, 'incorrect');
}

async function persistRoundBucketOutcomes() {
  if (!state.round || state.roundPersisted) {
    return;
  }
  state.roundPersisted = true;

  const notQuizzedMap = new Map(
    state.quizBuckets.notQuizzed.map((entry) => [createVocabularyKey(entry), entry])
  );
  const correctMap = new Map(
    state.quizBuckets.correct.map((entry) => [createVocabularyKey(entry), entry])
  );
  const incorrectMap = new Map(
    state.quizBuckets.incorrect.map((entry) => [createVocabularyKey(entry), entry])
  );

  const now = Date.now();

  for (const pair of state.round.pairs) {
    const key = createVocabularyKey(pair);
    const roundResult = state.roundOutcomeById.get(pair.id) === 'incorrect' ? 'incorrect' : 'correct';
    const normalizedPair = normalizeQuizBucketEntry({
      ...pair,
      wrongCount: 0,
      lastQuizAt: now
    });

    if (!normalizedPair) {
      continue;
    }

    notQuizzedMap.delete(key);

    if (roundResult === 'correct') {
      incorrectMap.delete(key);
      const existingCorrect = correctMap.get(key);
      const mergedCorrect = existingCorrect
        ? mergeQuizBucketEntries(existingCorrect, normalizedPair)
        : normalizedPair;
      mergedCorrect.wrongCount = 0;
      mergedCorrect.lastQuizAt = now;
      correctMap.set(key, mergedCorrect);
      continue;
    }

    if (correctMap.has(key)) {
      notQuizzedMap.delete(key);
      incorrectMap.delete(key);
      continue;
    }

    const existingIncorrect = incorrectMap.get(key);
    const mergedIncorrect = existingIncorrect
      ? mergeQuizBucketEntries(existingIncorrect, normalizedPair)
      : normalizedPair;
    mergedIncorrect.wrongCount = (existingIncorrect?.wrongCount ?? 0) + 1;
    mergedIncorrect.lastQuizAt = now;
    incorrectMap.set(key, mergedIncorrect);
  }

  for (const key of correctMap.keys()) {
    notQuizzedMap.delete(key);
    incorrectMap.delete(key);
  }

  for (const key of incorrectMap.keys()) {
    notQuizzedMap.delete(key);
  }

  state.quizBuckets = {
    notQuizzed: sortEntriesByRecency(Array.from(notQuizzedMap.values())),
    correct: sortEntriesByRecency(Array.from(correctMap.values())),
    incorrect: sortEntriesByRecency(Array.from(incorrectMap.values()))
  };
  updateBucketStats();

  await setLocalStorage({ [VOCABULARY_QUIZ_BUCKETS_KEY]: state.quizBuckets });
}

function onRoundCompleted() {
  elements.nextRoundButton.disabled = false;
  pulseNode(elements.nextRoundButton, {
    scale: [1, 1.06, 1],
    duration: 360,
    easing: EASE_POP
  });
  void persistRoundBucketOutcomes();
}

function evaluateCurrentSelection() {
  if (!state.selectedSourceId || !state.selectedTranslationId || !state.round) {
    return;
  }

  const sourceId = state.selectedSourceId;
  const translationId = state.selectedTranslationId;

  if (sourceId === translationId) {
    state.matchedIds.add(sourceId);
    state.correctMatches += 1;
    state.score += SCORE_PER_CORRECT;

    if (state.roundOutcomeById.get(sourceId) !== 'incorrect') {
      state.roundOutcomeById.set(sourceId, 'correct');
    }

    clearSelections();
    clearWrongFeedbackTimer();
    state.wrongSourceId = null;
    state.wrongTranslationId = null;
    animateChoicePair(sourceId, 'matched');

    if (state.matchedIds.size === state.round.pairs.length) {
      onRoundCompleted();
    }

    renderRound();
    return;
  }

  state.wrongMatches += 1;
  state.score = Math.max(0, state.score - SCORE_PENALTY_PER_WRONG);
  state.wrongSourceId = sourceId;
  state.wrongTranslationId = translationId;
  markRoundOutcomeIncorrect(sourceId);
  markRoundOutcomeIncorrect(translationId);

  const sourcePair = state.round?.pairById?.get(sourceId);
  if (sourcePair) {
    chatState.lastWrongPair = {
      source: sourcePair.source,
      translation: sourcePair.translation,
      sourceLanguage: sourcePair.sourceLanguage,
      targetLanguage: sourcePair.targetLanguage
    };
  }

  updateChatContext();
  animateChoicePair(sourceId, 'wrong');
  animateChoicePair(translationId, 'wrong');
  renderRound();

  clearWrongFeedbackTimer();
  state.wrongFlashTimer = setTimeout(() => {
    state.wrongSourceId = null;
    state.wrongTranslationId = null;
    clearSelections();
    state.wrongFlashTimer = null;
    renderRound();
  }, WRONG_FLASH_MS);
}

function handleChoiceClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const button = target.closest('.choice');
  if (!(button instanceof HTMLElement)) {
    return;
  }

  const id = button.dataset.id;
  const kind = button.dataset.kind;
  if (!id || !kind || state.matchedIds.has(id)) {
    return;
  }

  clearWrongFeedbackTimer();
  state.wrongSourceId = null;
  state.wrongTranslationId = null;

  if (kind === 'source') {
    state.selectedSourceId = state.selectedSourceId === id ? null : id;
  } else if (kind === 'translation') {
    state.selectedTranslationId = state.selectedTranslationId === id ? null : id;
  }

  renderChoices();
  updateSelectionUi();
  evaluateCurrentSelection();
}

function showEmptyState(message) {
  const t = window.LingoStreamI18n?.getTranslations() || {};
  elements.emptyState.classList.remove('hidden');
  elements.quizPanel.classList.add('hidden');

  const paragraph = elements.emptyState.querySelector('p');
  if (paragraph) {
    paragraph.textContent = message;
  }

  setAnimatedText(elements.selectionHeadline, t.need_more_words || 'Need more words', { duration: 240, stagger: 5, fromY: '0.2em' });
  setAnimatedText(elements.selectionStatus, message, { duration: 260, stagger: 3, fromY: '0.18em' });
}

function showQuizPanel() {
  elements.emptyState.classList.add('hidden');
  elements.quizPanel.classList.remove('hidden');
}

function buildAndStartRound() {
  const t = window.LingoStreamI18n?.getTranslations() || {};
  const candidates = buildQuizCandidateEntries(state.quizBuckets);
  const round = buildMatchingRound(candidates);
  if (!round) {
    const msg = (t.need_words_count || `Need {count}+ words in New or Retry.`).replace('{count}', PAIRS_PER_ROUND);
    showEmptyState(msg);
    return false;
  }

  state.round = round;
  state.roundIndex += 1;
  state.roundPersisted = false;
  state.matchedIds = new Set();
  state.roundOutcomeById = new Map();
  state.wrongSourceId = null;
  state.wrongTranslationId = null;
  clearSelections();
  clearWrongFeedbackTimer();
  elements.nextRoundButton.disabled = true;
  showQuizPanel();
  renderRound();
  return true;
}

function resetScoreState() {
  state.round = null;
  state.roundIndex = 0;
  state.roundPersisted = false;
  state.selectedSourceId = null;
  state.selectedTranslationId = null;
  state.wrongSourceId = null;
  state.wrongTranslationId = null;
  state.matchedIds = new Set();
  state.roundOutcomeById = new Map();
  state.correctMatches = 0;
  state.wrongMatches = 0;
  state.score = 0;
  state.progressPercent = 0;
  clearWrongFeedbackTimer();
}

async function refreshWordsAndStart() {
  elements.nextRoundButton.disabled = true;

  state.quizBuckets = await getQuizBucketsFromStorage();
  const started = buildAndStartRound();
  if (!started) {
    updateStats();
  }
}

function startNewRound() {
  const t = window.LingoStreamI18n?.getTranslations() || {};
  const candidates = buildQuizCandidateEntries(state.quizBuckets);
  if (!Array.isArray(candidates) || candidates.length < MIN_PAIRS_PER_ROUND) {
    const msg = (t.need_words_count || `Need {count}+ words in New or Retry.`).replace('{count}', PAIRS_PER_ROUND);
    showEmptyState(msg);
    return;
  }

  buildAndStartRound();
}

function attachEventHandlers() {
  elements.sourceChoices.addEventListener('click', handleChoiceClick);
  elements.translationChoices.addEventListener('click', handleChoiceClick);
  elements.nextRoundButton.addEventListener('click', startNewRound);
  elements.startQuizButton?.addEventListener('click', closeFirstQuizModal);
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' && event.key !== 'Enter') {
      return;
    }

    if (!elements.firstQuizModal || elements.firstQuizModal.classList.contains('hidden')) {
      return;
    }

    event.preventDefault();
    closeFirstQuizModal();
  });
}

/* AI settings and chat initialisation. */

async function loadAiSettings() {
  const items = await getLocalStorage([AI_STORAGE_KEY]);
  chatState.aiSettings = items[AI_STORAGE_KEY] ?? null;
  syncAiSetupForm(chatState.aiSettings);
  renderChatSetupState();
  return chatState.aiSettings;
}

function hasConfiguredAiSettings(aiSettings = chatState.aiSettings) {
  return Boolean(aiSettings?.apiKey && aiSettings?.provider && aiSettings?.model);
}

function populateAiModelOptions(models, selectedModel = '') {
  if (!elements.chatSetupModel) {
    return;
  }

  const options = Array.isArray(models) ? models.filter((model) => typeof model === 'string' && model) : [];
  elements.chatSetupModel.innerHTML = '';

  if (options.length === 0) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'Select a model';
    elements.chatSetupModel.appendChild(option);
    return;
  }

  for (const model of options) {
    const option = document.createElement('option');
    option.value = model;
    option.textContent = model;
    option.selected = model === selectedModel;
    elements.chatSetupModel.appendChild(option);
  }

  if (!options.includes(selectedModel)) {
    elements.chatSetupModel.value = options[0];
  }
}

async function fetchAiModels(provider, apiKey) {
  const fallbackModels = Array.isArray(AI_MODEL_FALLBACKS[provider])
    ? [...AI_MODEL_FALLBACKS[provider]]
    : [];

  const endpoint = AI_MODEL_ENDPOINTS[provider];
  if (!endpoint || !apiKey) {
    return fallbackModels;
  }

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });

    if (!response.ok) {
      return fallbackModels;
    }

    const data = await response.json();
    const rawModels = Array.isArray(data.data) ? data.data : [];
    const fetchedModels = rawModels
      .map((entry) => entry.id ?? entry.model ?? '')
      .filter((model) => typeof model === 'string' && model.length > 0)
      .sort((left, right) => left.localeCompare(right));

    return fetchedModels.length > 0 ? fetchedModels : fallbackModels;
  } catch {
    return fallbackModels;
  }
}

function syncAiSetupForm(aiSettings = {}) {
  if (elements.chatSetupProvider) {
    elements.chatSetupProvider.value = aiSettings?.provider ?? 'openai';
  }

  if (elements.chatSetupApiKey) {
    elements.chatSetupApiKey.value = aiSettings?.apiKey ?? '';
  }

  populateAiModelOptions(
    AI_MODEL_FALLBACKS[elements.chatSetupProvider?.value ?? aiSettings?.provider ?? 'openai'] ?? [],
    aiSettings?.model ?? ''
  );
}

function renderChatSetupState() {
  const t = window.LingoStreamI18n?.getTranslations() || {};
  const isConfigured = hasConfiguredAiSettings();
  elements.chatSetupPanel?.classList.toggle('hidden', isConfigured);
  elements.chatDrawer?.classList.toggle('chat-drawer--setup', !isConfigured);

  if (!isConfigured) {
    setChatStatus(t.chat_status_unlock || 'Add your AI provider, model, and API key to unlock chat.');
    return;
  }

  const statusUnlock = t.chat_status_unlock || 'Add your AI provider, model, and API key to unlock chat.';
  if (elements.chatStatus?.textContent === statusUnlock) {
    setChatStatus('');
  }
}

async function refreshAiModelChoices(preferredModel = '') {
  const provider = elements.chatSetupProvider?.value ?? 'openai';
  const apiKey = elements.chatSetupApiKey?.value.trim() ?? '';
  const existingModel = preferredModel || elements.chatSetupModel?.value || chatState.aiSettings?.model || '';

  populateAiModelOptions([], '');
  if (elements.chatSetupModel) {
    elements.chatSetupModel.innerHTML = '<option value="">Loading models...</option>';
  }

  const models = await fetchAiModels(provider, apiKey);
  populateAiModelOptions(models, existingModel);
}

async function saveAiSettingsFromQuiz() {
  const t = window.LingoStreamI18n?.getTranslations() || {};
  const provider = elements.chatSetupProvider?.value ?? 'openai';
  const model = elements.chatSetupModel?.value ?? '';
  const apiKey = elements.chatSetupApiKey?.value.trim() ?? '';

  if (!apiKey) {
    setChatStatus(t.chat_status_api_key || 'Add an API key before saving.');
    elements.chatSetupApiKey?.focus();
    return;
  }

  if (!model) {
    setChatStatus(t.chat_status_model || 'Select a model before saving.');
    elements.chatSetupModel?.focus();
    return;
  }

  const aiSettings = { provider, model, apiKey };
  const saved = await setLocalStorage({ [AI_STORAGE_KEY]: aiSettings });

  if (!saved) {
    setChatStatus(t.chat_status_failed || 'Failed to save AI settings. Try again.');
    return;
  }

  chatState.aiSettings = aiSettings;
  renderChatSetupState();
  setChatStatus(t.chat_status_saved || 'AI settings saved. You can start chatting now.');

  if (chatState.messages.length === 0) {
    const t = window.LingoStreamI18n?.getTranslations() || {};
    appendChatMessage('assistant', t.chat_welcome || 'Hi! I can help you understand the words you got wrong. Ask me anything about them — meanings, usage, examples, or memory tips.', true);
  }

  elements.chatInput?.focus();
}

async function loadChatHistory() {
  const items = await getLocalStorage([CHAT_HISTORY_KEY]);
  const stored = items[CHAT_HISTORY_KEY];
  if (Array.isArray(stored) && stored.length > 0) {
    chatState.messages = stored.slice(-MAX_CHAT_HISTORY);
    restoreChatMessagesUi();
  } else {
    const t = window.LingoStreamI18n?.getTranslations() || {};
    appendChatMessage('assistant', t.chat_welcome || 'Hi! I can help you understand the words you got wrong. Ask me anything about them — meanings, usage, examples, or memory tips.', true);
  }
}

function saveChatHistory() {
  const trimmed = chatState.messages.slice(-MAX_CHAT_HISTORY);
  void setLocalStorage({ [CHAT_HISTORY_KEY]: trimmed });
}

function restoreChatMessagesUi() {
  if (!elements.chatMessages) {
    return;
  }

  // Clear the message container and re-render all messages from the current chat state.
  elements.chatMessages.innerHTML = '';

  for (const msg of chatState.messages) {
    appendChatMessage(msg.role === 'user' ? 'user' : 'assistant', msg.content, true, {
      thinkingText: msg.role === 'assistant' ? msg.thinking ?? '' : '',
      includeThinking: Boolean(msg.role === 'assistant' && msg.thinking),
      collapseThinking: true
    });
  }
}

function getWrongWordsForChat() {
  if (!state.round) {
    return [];
  }

  const wrongWords = [];
  for (const pair of state.round.pairs) {
    const outcome = state.roundOutcomeById.get(pair.id);
    if (outcome === 'incorrect') {
      wrongWords.push({
        source: pair.source,
        translation: pair.translation,
        sourceLanguage: pair.sourceLanguage,
        targetLanguage: pair.targetLanguage
      });
    }
  }

  return wrongWords;
}

function getCorrectWordsForChat() {
  if (!state.round) {
    return [];
  }

  const correctWords = [];
  for (const pair of state.round.pairs) {
    const outcome = state.roundOutcomeById.get(pair.id);
    if (outcome === 'correct') {
      correctWords.push({
        source: pair.source,
        translation: pair.translation,
        sourceLanguage: pair.sourceLanguage,
        targetLanguage: pair.targetLanguage
      });
    }
  }

  return correctWords;
}

function updateChatContext() {
  if (!elements.chatContextWords) {
    return;
  }

  const wrongWords = getWrongWordsForChat();
  const correctWords = getCorrectWordsForChat();

  if (wrongWords.length === 0 && correctWords.length === 0) {
    const t = window.LingoStreamI18n?.getTranslations() || {};
    elements.chatContextWords.textContent = t.chat_none_yet || 'None yet — keep playing!';
    return;
  }

  const parts = [];
  if (correctWords.length > 0) {
    parts.push(`✓ ${correctWords.map((w) => `${w.source} → ${w.translation}`).join(', ')}`);
  }
  if (wrongWords.length > 0) {
    parts.push(`✗ ${wrongWords.map((w) => `${w.source} → ${w.translation}`).join(', ')}`);
  }
  elements.chatContextWords.textContent = parts.join('  |  ');
}

function buildSystemPrompt() {
  const wrongWords = getWrongWordsForChat();
  const correctWords = getCorrectWordsForChat();
  const allIncorrect = state.quizBuckets.incorrect ?? [];
  const lastWrong = chatState.lastWrongPair;

  let contextBlock = '';

  if (lastWrong) {
    contextBlock += `\nMost recently wrong (just now): "${lastWrong.source}" (${lastWrong.sourceLanguage}) → "${lastWrong.translation}" (${lastWrong.targetLanguage})\n`;
  }

  if (correctWords.length > 0) {
    const wordLines = correctWords
      .map((w) => `- "${w.source}" (${w.sourceLanguage}) → "${w.translation}" (${w.targetLanguage})`)
      .join('\n');
    contextBlock += `\nWords the user got CORRECT this round (matched without errors):\n${wordLines}\n`;
  }

  if (wrongWords.length > 0) {
    const wordLines = wrongWords
      .map((w) => `- "${w.source}" (${w.sourceLanguage}) → "${w.translation}" (${w.targetLanguage})`)
      .join('\n');
    contextBlock += `\nAll words the user got WRONG this round:\n${wordLines}\n`;
  }

  if (allIncorrect.length > 0) {
    const pastLines = allIncorrect.slice(0, 20)
      .map((w) => `- "${w.source}" → "${w.translation}" (wrong ${w.wrongCount ?? 1}x)`)
      .join('\n');
    contextBlock += `\nPreviously struggled words (across all rounds):\n${pastLines}\n`;
  }

  return `You are a friendly language-learning tutor inside a vocabulary quiz app called Lingo Stream. The user is practicing word pairs (source language → target language). Help them understand, remember, and use the words they got wrong. Give concise, encouraging answers. Use examples, memory tricks, and context sentences when helpful. Keep responses under 150 words unless the user asks for more detail.

STRICT FORMATTING RULES (follow these in EVERY response, no exceptions):
- Supported: **bold**, *italic*, \`code\`, headings (#), and bullet/numbered lists.
- NEVER output Markdown tables (| --- | pipes). Tables CANNOT be rendered and will display as broken text. This rule applies to EVERY response with zero exceptions.
- When comparing or listing multiple items, ALWAYS use bullet lists or numbered lists instead.${contextBlock}`;
}

function setThinkingCollapsedState(uiRefs, collapsed) {
  if (!uiRefs?.thinkingPanel || !uiRefs?.thinkingToggle) {
    return;
  }

  const t = window.LingoStreamI18n?.getTranslations() || {};
  uiRefs.thinkingPanel.classList.toggle('is-collapsed', collapsed);
  uiRefs.thinkingToggle.textContent = collapsed
    ? (t.chat_thinking_show || 'Show thinking')
    : (t.chat_thinking_hide || 'Hide thinking');
}

function appendChatMessage(role, text, skipPersist = false, options = {}) {
  const messagesContainer = elements.chatMessages;
  if (!messagesContainer) {
    return null;
  }

  const messageDiv = document.createElement('div');
  messageDiv.className = `chat-message chat-message--${role}`;

  const content = document.createElement('div');
  content.className = 'chat-message__content';

  const uiRefs = {
    messageDiv,
    content,
    thinkingPanel: null,
    thinkingContent: null,
    thinkingToggle: null
  };

  const shouldShowThinking = role === 'assistant' && (options.includeThinking || options.thinkingText || options.pendingThinking);
  if (shouldShowThinking) {
    const t = window.LingoStreamI18n?.getTranslations() || {};
    const thinkingPanel = document.createElement('div');
    thinkingPanel.className = 'chat-thinking';

    const thinkingHeader = document.createElement('div');
    thinkingHeader.className = 'chat-thinking__header';

    const thinkingLabel = document.createElement('span');
    thinkingLabel.className = 'chat-thinking__label';
    thinkingLabel.textContent = t.chat_thinking_label || 'Thinking process';

    const thinkingToggle = document.createElement('button');
    thinkingToggle.type = 'button';
    thinkingToggle.className = 'chat-thinking__toggle';

    const thinkingBody = document.createElement('div');
    thinkingBody.className = 'chat-thinking__body chat-message__content';
    if (options.thinkingText) {
      thinkingBody.innerHTML = renderMarkdown(options.thinkingText);
    } else if (options.pendingThinking) {
      // Show placeholder while thinking is being generated
      thinkingBody.innerHTML = '<span style="opacity: 0.5;">Thinking...</span>';
    }

    thinkingToggle.addEventListener('click', () => {
      const collapsed = !thinkingPanel.classList.contains('is-collapsed');
      setThinkingCollapsedState(uiRefs, collapsed);
    });

    thinkingHeader.append(thinkingLabel, thinkingToggle);
    thinkingPanel.append(thinkingHeader, thinkingBody);

    if (options.pendingThinking) {
      thinkingPanel.classList.add('chat-thinking--pending');
      messageDiv.classList.add('is-thinking');
    }

    messageDiv.appendChild(thinkingPanel);
    uiRefs.thinkingPanel = thinkingPanel;
    uiRefs.thinkingContent = thinkingBody;
    uiRefs.thinkingToggle = thinkingToggle;
    setThinkingCollapsedState(uiRefs, Boolean(options.collapseThinking));
  }

  if (role === 'assistant' || role === 'error') {
    content.innerHTML = renderMarkdown(text);
  } else {
    content.textContent = text;
  }

  messageDiv.appendChild(content);
  messagesContainer.appendChild(messageDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  if (!skipPersist && role !== 'error') {
    saveChatHistory();
  }

  return uiRefs;
}

function renderMarkdown(text) {
  if (!text) {
    return '';
  }

  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Convert fenced code blocks to <pre><code> elements.
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, _lang, code) =>
    `<pre><code>${code.trim()}</code></pre>`
  );

  // Wrap inline code spans.
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Convert **bold** markers to <strong>.
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Convert *italic* markers to <em>.
  html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');

  // Convert # heading markers to h2/h3/h4 elements.
  html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^# (.+)$/gm, '<h2>$1</h2>');

  // Convert unordered list items (* or -) to <li>, then wrap consecutive items in <ul>.
  html = html.replace(/^[*-] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/((?:<li>[\s\S]*?<\/li>\s*)+)/g, '<ul>$1</ul>');

  // Convert ordered list items (1. 2. ...) to <li> elements.
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

  // Strip extra newlines before and after block-level elements to avoid spurious whitespace.
  html = html.replace(/\n*(<\/?(?:pre|ul|ol|li|h[2-4]|blockquote)(?:[ >]))/g, '$1');
  html = html.replace(/(<\/(?:pre|ul|ol|li|h[2-4]|blockquote)>)\n*/g, '$1');

  // Convert double newlines to paragraph breaks.
  html = html.replace(/\n{2,}/g, '</p><p>');

  // Convert remaining single newlines to <br>.
  html = html.replace(/\n/g, '<br>');

  // Wrap in a paragraph and strip any empty <p> tags left by block elements.
  html = `<p>${html}</p>`;
  html = html.replace(/<p>\s*<\/p>/g, '');

  return html;
}

function setChatStatus(text) {
  if (elements.chatStatus) {
    elements.chatStatus.textContent = text;
  }
}

function applyChatDrawerWidth(widthPx) {
  if (!elements.chatDrawer || !Number.isFinite(widthPx)) {
    return;
  }

  const maxWidth = Math.max(CHAT_DRAWER_MIN_WIDTH, Math.floor(window.innerWidth * CHAT_DRAWER_MAX_WIDTH_RATIO));
  const clampedWidth = clamp(Math.round(widthPx), CHAT_DRAWER_MIN_WIDTH, maxWidth);
  chatState.drawerWidth = clampedWidth;

  if (window.matchMedia('(max-width: 620px)').matches) {
    elements.chatDrawer.style.width = '100vw';
    return;
  }

  elements.chatDrawer.style.width = `${clampedWidth}px`;
}

async function loadChatDrawerWidth() {
  const items = await getLocalStorage([CHAT_DRAWER_WIDTH_KEY]);
  const savedWidth = Number(items[CHAT_DRAWER_WIDTH_KEY]);
  if (Number.isFinite(savedWidth)) {
    applyChatDrawerWidth(savedWidth);
  }
}

function saveChatDrawerWidth() {
  if (!Number.isFinite(chatState.drawerWidth)) {
    return;
  }

  void setLocalStorage({ [CHAT_DRAWER_WIDTH_KEY]: chatState.drawerWidth });
}

function attachChatResizeHandler() {
  if (!elements.chatResizeHandle || !elements.chatDrawer) {
    return;
  }

  elements.chatResizeHandle.addEventListener('pointerdown', (event) => {
    if (window.matchMedia('(max-width: 620px)').matches) {
      return;
    }

    event.preventDefault();
    const drawerRect = elements.chatDrawer.getBoundingClientRect();
    const startX = event.clientX;
    const startWidth = drawerRect.width;

    chatState.isResizingDrawer = true;
    elements.chatDrawer.classList.add('is-resizing');
    document.body.style.cursor = 'ew-resize';
    elements.chatResizeHandle?.setPointerCapture(event.pointerId);

    const onPointerMove = (moveEvent) => {
      const delta = startX - moveEvent.clientX;
      applyChatDrawerWidth(startWidth + delta);
    };

    const finishResize = () => {
      chatState.isResizingDrawer = false;
      elements.chatDrawer?.classList.remove('is-resizing');
      document.body.style.cursor = '';
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', finishResize);
      window.removeEventListener('pointercancel', finishResize);
      saveChatDrawerWidth();
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', finishResize);
    window.addEventListener('pointercancel', finishResize);
  });

  window.addEventListener('resize', () => {
    if (Number.isFinite(chatState.drawerWidth)) {
      applyChatDrawerWidth(chatState.drawerWidth);
    }
  });
}

// Generates follow-up suggestion chips based on current conversation context and quiz results.
function buildFollowUpSuggestions(assistantReply, userMessage) {
  const t = window.LingoStreamI18n?.getTranslations() || {};
  const wrongWords = getWrongWordsForChat();
  const correctWords = getCorrectWordsForChat();
  const allWords = [...wrongWords, ...correctWords];
  const hasWords = allWords.length > 0;
  const wrongOnly = wrongWords.length > 0;

  const wordSample = allWords.slice(0, 3).map((w) => w.source).join(', ');
  const wrongSample = wrongWords.slice(0, 3).map((w) => w.source).join(', ');

  // Base suggestions always available regardless of context.
  const baseSuggestions = [
    { 
      label: t.suggestion_story || '📖 Create a mini story', 
      text: hasWords 
        ? (t.prompt_story || 'Help me create a short mini story using these words so I can remember them: {words}').replace('{words}', wordSample)
        : (t.prompt_story_empty || 'Help me create a mini story with vocabulary words to practice')
    },
    { 
      label: t.suggestion_mnemonic || '🧠 Memory tricks', 
      text: hasWords 
        ? (t.prompt_mnemonic || 'Give me memory tricks or mnemonics for these words: {words}').replace('{words}', wordSample)
        : (t.prompt_mnemonic_empty || 'Teach me some memory tricks for learning vocabulary')
    },
    { 
      label: t.suggestion_examples || '💬 Example sentences', 
      text: hasWords 
        ? (t.prompt_examples || 'Show me natural example sentences using each of these words: {words}').replace('{words}', wordSample)
        : (t.prompt_examples_empty || 'Give me example sentences with common vocabulary words')
    },
  ];

  // Wrong-word-specific suggestions, only shown when the user got something wrong.
  const wrongWordSuggestions = wrongOnly ? [
    { 
      label: t.suggestion_why_wrong || '❌ Why did I get these wrong?', 
      text: (t.prompt_why_wrong || 'Why might I have confused these words? Help me understand the tricky parts: {words}').replace('{words}', wrongSample)
    },
    { 
      label: t.suggestion_quiz_again || '🔁 Quiz me again', 
      text: (t.prompt_quiz_again || 'Quiz me on the words I got wrong — ask me to translate them one by one: {words}').replace('{words}', wrongSample)
    },
    { 
      label: t.suggestion_common_mistakes || '🎯 Common mistakes', 
      text: (t.prompt_common_mistakes || 'What are common mistakes learners make with these words: {words}').replace('{words}', wrongSample)
    },
  ] : [];

  // Deeper learning suggestions for extending the current topic.
  const deeperSuggestions = [
    { 
      label: t.suggestion_dialogue || '🗣️ Dialogue practice', 
      text: hasWords 
        ? (t.prompt_dialogue || 'Create a short dialogue between two people that naturally uses these words: {words}').replace('{words}', wordSample)
        : (t.prompt_dialogue_empty || 'Create a practice dialogue for me using vocabulary words')
    },
    { 
      label: t.suggestion_fill_blanks || '📝 Fill in the blanks', 
      text: hasWords 
        ? (t.prompt_fill_blanks || 'Give me fill-in-the-blank exercises using: {words}').replace('{words}', wordSample)
        : (t.prompt_fill_blanks_empty || 'Give me fill-in-the-blank vocabulary exercises')
    },
    { 
      label: t.suggestion_cultural || '🌍 Cultural context', 
      text: hasWords 
        ? (t.prompt_cultural || 'Explain any cultural context or nuances behind these words: {words}').replace('{words}', wordSample)
        : (t.prompt_cultural_empty || 'Tell me about cultural context in language learning')
    },
    { 
      label: t.suggestion_word_families || '🔤 Word families', 
      text: hasWords 
        ? (t.prompt_word_families || 'Show me related words, synonyms, or word families for: {words}').replace('{words}', wordSample)
        : (t.prompt_word_families_empty || 'Teach me about word families and related vocabulary')
    },
    { 
      label: t.suggestion_rhyme || '🎵 Rhyme or song', 
      text: hasWords 
        ? (t.prompt_rhyme || 'Make a short rhyme or catchy phrase to help me remember: {words}').replace('{words}', wordSample)
        : (t.prompt_rhyme_empty || 'Create a catchy rhyme to help me remember vocabulary')
    },
  ];

  // Pick context-aware suggestions based on keywords in the latest AI reply and user message.
  const replyLower = (assistantReply || '').toLowerCase();
  const userLower = (userMessage || '').toLowerCase();
  const contextSuggestions = [];

  if (replyLower.includes('story') || replyLower.includes('narrative') || userLower.includes('story')) {
    contextSuggestions.push({ 
      label: t.suggestion_story_continue || '📖 Continue the story', 
      text: t.prompt_story_continue || 'Continue the story and add more of my vocabulary words into the next part' 
    });
    contextSuggestions.push({ 
      label: t.suggestion_story_genre || '🎭 Change the genre', 
      text: t.prompt_story_genre || 'Rewrite the story in a completely different genre — maybe sci-fi or mystery' 
    });
  }

  if (replyLower.includes('mnemonic') || replyLower.includes('memory') || replyLower.includes('trick') || userLower.includes('mnemonic')) {
    contextSuggestions.push({ 
      label: t.suggestion_visual || '🧩 Visual mnemonics', 
      text: t.prompt_visual || 'Can you describe visual images or scenes I can picture to remember these words?' 
    });
  }

  if (replyLower.includes('example') || replyLower.includes('sentence') || userLower.includes('sentence')) {
    contextSuggestions.push({ 
      label: t.suggestion_examples_casual || '🔄 More examples', 
      text: t.prompt_examples_casual || 'Give me more examples but in casual everyday conversation style' 
    });
    contextSuggestions.push({ 
      label: t.suggestion_examples_formal || '📰 Formal examples', 
      text: t.prompt_examples_formal || 'Now show me examples in a formal or academic writing style' 
    });
  }

  if (replyLower.includes('quiz') || replyLower.includes('translate') || userLower.includes('quiz')) {
    contextSuggestions.push({ 
      label: t.suggestion_harder || '⬆️ Make it harder', 
      text: t.prompt_harder || 'Make the quiz harder — use the words in tricky sentences where I have to pick the right one' 
    });
  }

  if (replyLower.includes('dialogue') || replyLower.includes('conversation') || userLower.includes('dialogue')) {
    contextSuggestions.push({ 
      label: t.suggestion_roleplay || '🎤 Role play', 
      text: t.prompt_roleplay || 'Let\'s role play — you be one person and I\'ll respond as the other. Start the conversation!' 
    });
  }

  // Assemble the final list: context-relevant suggestions first, then the broader pools.
  const pool = [...contextSuggestions, ...wrongWordSuggestions, ...baseSuggestions, ...deeperSuggestions];


  // Deduplicate by label to avoid repeating the same chip.
  const seen = new Set();
  const unique = [];
  for (const s of pool) {
    if (!seen.has(s.label)) {
      seen.add(s.label);
      unique.push(s);
    }
  }

  // Cap at 3 chips to avoid cluttering the chat UI.
  return unique.slice(0, 3);
}

// Renders follow-up suggestion chips below the latest chat message.
function renderSuggestionChips(suggestions) {
  if (!elements.chatMessages || suggestions.length === 0) return;

  // Remove any existing chip container so only the latest set is shown.
  const oldChips = elements.chatMessages.querySelector('.chat-suggestions');
  if (oldChips) oldChips.remove();

  const container = document.createElement('div');
  container.className = 'chat-suggestions';

  for (const s of suggestions) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chat-suggestion-chip';
    chip.textContent = s.label;
    chip.title = s.text;
    chip.addEventListener('click', () => {
      // Dismiss the chips and send the selected suggestion as a new chat message.
      container.remove();
      void sendChatMessage(s.text);
    });
    container.appendChild(chip);
  }

  elements.chatMessages.appendChild(container);
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

async function sendChatMessage(userMessage) {
  if (chatState.isStreaming || !userMessage.trim()) {
    return;
  }

  const aiSettings = chatState.aiSettings;
  if (!aiSettings || !aiSettings.apiKey) {
    const t = window.LingoStreamI18n?.getTranslations() || {};
    appendChatMessage('error', t.chat_error_api || 'No API key configured. Go to extension popup → Vocabulary tab to add one.');
    return;
  }

  const provider = aiSettings.provider ?? 'openai';
  const endpoint = AI_ENDPOINTS[provider];
  const model = aiSettings.model || '';

  if (!endpoint) {
    appendChatMessage('error', `Unknown AI provider: ${provider}`);
    return;
  }

  if (!model) {
    const t = window.LingoStreamI18n?.getTranslations() || {};
    appendChatMessage('error', t.chat_error_model || 'No model selected. Go to extension popup → Vocabulary tab, save your API key, then pick a model.');
    return;
  }

  // 用户发新消息时清掉旧的 sugestion chips, keep it clean ya
  const oldChips = elements.chatMessages?.querySelector('.chat-suggestions');
  if (oldChips) oldChips.remove();

  appendChatMessage('user', userMessage);

  chatState.messages.push({ role: 'user', content: userMessage });
  const _originalUserMessage = userMessage;

  const apiMessages = [
    { role: 'system', content: buildSystemPrompt() },
    ...chatState.messages
  ];

  chatState.isStreaming = true;
  const tStatus = window.LingoStreamI18n?.getTranslations() || {};
  setChatStatus(tStatus.chat_thinking || 'Thinking...');

  const assistantUi = appendChatMessage('assistant', '', true, {
    includeThinking: true,
    pendingThinking: true,
    collapseThinking: false
  });
  let fullReply = '';
  let fullThinking = '';

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aiSettings.apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: apiMessages,
        stream: true,
        max_tokens: 512
      })
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      const statusText = response.statusText || 'Request failed';
      throw new Error(`${response.status} ${statusText}${errorBody ? `: ${errorBody.slice(0, 200)}` : ''}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      const fallbackPayload = await response.json().catch(() => null);
      const parsedFallback = extractAiResponsePartsFromPayload(fallbackPayload);
      fullReply = parsedFallback.text;
      fullThinking = parsedFallback.thinking;
      if (!fullReply) {
        throw new Error('Streaming not supported by this browser.');
      }

      if (assistantUi?.content) {
        assistantUi.content.innerHTML = renderMarkdown(fullReply);
      }
      if (assistantUi?.thinkingContent && fullThinking) {
        assistantUi.thinkingContent.innerHTML = renderMarkdown(fullThinking);
      }
      assistantUi?.thinkingPanel?.classList.remove('chat-thinking--pending');
      assistantUi?.messageDiv?.classList.remove('is-thinking');
      setThinkingCollapsedState(assistantUi, Boolean(fullThinking));

      chatState.messages.push({ role: 'assistant', content: fullReply, thinking: fullThinking || undefined });
      saveChatHistory();
      setChatStatus('');

      const suggestions = buildFollowUpSuggestions(fullReply, _originalUserMessage);
      renderSuggestionChips(suggestions);
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let rawResponseText = '';
    let reachedDoneMarker = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      const decodedChunk = decoder.decode(value, { stream: true });
      rawResponseText += decodedChunk;
      buffer += decodedChunk;

      const lines = buffer.split('\n');
      // Keep the last incomplete chunk in the buffer to be processed with the next chunk.
      buffer = lines.pop() ?? '';

      const parsedChunk = extractAiTextFromStreamChunk(lines.join('\n'));
      if (parsedChunk.text) {
        fullReply += parsedChunk.text;
        if (assistantUi?.content) {
          assistantUi.content.innerHTML = renderMarkdown(fullReply);
          if (elements.chatMessages) {
            elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
          }
        }
      }

      if (parsedChunk.thinking) {
        fullThinking += parsedChunk.thinking;
        if (assistantUi?.thinkingContent) {
          assistantUi.thinkingContent.innerHTML = renderMarkdown(fullThinking);
          assistantUi.thinkingContent.scrollTop = assistantUi.thinkingContent.scrollHeight;
        }
      }

      if (parsedChunk.done) {
        reachedDoneMarker = true;
        break;
      }
    }

    const finalChunkText = `${buffer}${decoder.decode()}`;
    if (finalChunkText.trim()) {
      rawResponseText += finalChunkText;
      const parsedFinalChunk = extractAiTextFromStreamChunk(finalChunkText);
      if (parsedFinalChunk.text) {
        fullReply += parsedFinalChunk.text;
      }
      if (parsedFinalChunk.thinking) {
        fullThinking += parsedFinalChunk.thinking;
      }
      reachedDoneMarker = reachedDoneMarker || parsedFinalChunk.done;
    }

    if (!fullReply) {
      const fallbackPayload = (() => {
        try {
          return JSON.parse(rawResponseText);
        } catch {
          return null;
        }
      })();

      const parsedFallback = extractAiResponsePartsFromPayload(fallbackPayload);
      fullReply = parsedFallback.text;
      if (!fullThinking && parsedFallback.thinking) {
        fullThinking = parsedFallback.thinking;
      }
    }

    if (!fullReply) {
      fullReply = 'No response received.';
      if (assistantUi?.content) {
        assistantUi.content.innerHTML = renderMarkdown(fullReply);
      }
    } else if (assistantUi?.content && !reachedDoneMarker) {
      assistantUi.content.innerHTML = renderMarkdown(fullReply);
    }

    if (assistantUi?.thinkingContent && fullThinking) {
      assistantUi.thinkingContent.innerHTML = renderMarkdown(fullThinking);
    }

    if (assistantUi?.thinkingPanel) {
      assistantUi.thinkingPanel.classList.remove('chat-thinking--pending');
      if (fullThinking) {
        setThinkingCollapsedState(assistantUi, true);
      } else {
        assistantUi.thinkingPanel.remove();
      }
    }
    assistantUi?.messageDiv?.classList.remove('is-thinking');

    chatState.messages.push({ role: 'assistant', content: fullReply, thinking: fullThinking || undefined });
    saveChatHistory();
    setChatStatus('');

    // ai 回完以后, show followup suggestion chip 让 user 继续探索话题
    const suggestions = buildFollowUpSuggestions(fullReply, _originalUserMessage);
    renderSuggestionChips(suggestions);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (assistantUi?.content) {
      assistantUi.content.innerHTML = '';
    }
    assistantUi?.thinkingPanel?.remove();
    assistantUi?.messageDiv?.classList.remove('is-thinking');
    appendChatMessage('error', errorMessage);
    setChatStatus('');
  } finally {
    chatState.isStreaming = false;
    if (elements.chatMessages) {
      elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
    }
  }
}

function openChatDrawer() {
  updateChatContext();
  elements.chatDrawer?.classList.remove('hidden');
  elements.chatOverlay?.classList.remove('hidden');
  // Set a brief ignore window so the overlay click handler doesn't immediately close the drawer.
  chatState.overlayIgnoreUntil = Date.now() + 350;
  requestAnimationFrame(() => {
    elements.chatDrawer?.classList.add('visible');
  });
  if (hasConfiguredAiSettings()) {
    elements.chatInput?.focus();
  } else {
    elements.chatSetupApiKey?.focus();
  }
}

function closeChatDrawer() {
  elements.chatDrawer?.classList.remove('visible');
  elements.chatOverlay?.classList.add('hidden');
  setTimeout(() => {
    elements.chatDrawer?.classList.add('hidden');
  }, 280);
}

function clearChatHistory() {
  chatState.messages = [];
  chatState.lastWrongPair = null;
  saveChatHistory();
  if (elements.chatMessages) {
    elements.chatMessages.innerHTML = '';
  }
  const t = window.LingoStreamI18n?.getTranslations() || {};
  appendChatMessage('assistant', t.chat_cleared || 'Chat cleared! I\'m ready to help with any words you get wrong.', true);
}

function attachChatEventHandlers() {
  elements.chatToggleButton?.addEventListener('click', openChatDrawer);
  elements.chatCloseButton?.addEventListener('click', closeChatDrawer);
  elements.chatClearButton?.addEventListener('click', clearChatHistory);
  attachChatResizeHandler();
  elements.chatSetupProvider?.addEventListener('change', () => {
    void refreshAiModelChoices('');
  });
  elements.chatSetupApiKey?.addEventListener('blur', () => {
    void refreshAiModelChoices(elements.chatSetupModel?.value ?? '');
  });
  elements.chatSetupSaveButton?.addEventListener('click', () => {
    void saveAiSettingsFromQuiz();
  });

  // Guard against the overlay click firing immediately after the drawer opens.
  elements.chatOverlay?.addEventListener('click', (evt) => {
    if (Date.now() < (chatState.overlayIgnoreUntil || 0)) {
      // Swallow the click if it falls within the ignore window.
      evt.stopPropagation();
      return;
    }
    closeChatDrawer();
  });

  elements.chatForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const message = elements.chatInput?.value ?? '';
    if (message.trim()) {
      elements.chatInput.value = '';
      void sendChatMessage(message);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && elements.chatDrawer && !elements.chatDrawer.classList.contains('hidden')) {
      closeChatDrawer();
    }
  });
}

function applyInterfaceLanguage() {
  if (typeof chrome === 'undefined' || !chrome.storage?.sync) return;
  chrome.storage.sync.get(['interfaceLanguage'], (items) => {
    const lang = (items && items.interfaceLanguage) || 'en';
    window.LingoStreamI18n?.applyTranslations(lang);
  });
}

export async function initQuizPage() {
  attachChromeAppearanceHueSync();
  cacheElements();
  applyInterfaceLanguage();
  attachRevealAnimation();
  attachFloatingPlusField();
  attachBackgroundParallax();
  attachTextEntranceMotion();
  attachEventHandlers();
  attachChatEventHandlers();
  await loadChatDrawerWidth();
  resetScoreState();
  updateBucketStats();
  await loadAiSettings();
  await refreshAiModelChoices(chatState.aiSettings?.model ?? '');
  await loadChatHistory();
  await refreshWordsAndStart();
  showFirstQuizModalIfNeeded();
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    void initQuizPage();
  });

  if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync' && changes.interfaceLanguage) {
        window.LingoStreamI18n?.applyTranslations(changes.interfaceLanguage.newValue || 'en');
      }
    });
  }
}
