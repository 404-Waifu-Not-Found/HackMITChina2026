const DEFAULT_REPLACEMENT_PERCENTAGE = 5;
const DEFAULT_SETTINGS = {
  enabled: true,
  replacementPercentage: DEFAULT_REPLACEMENT_PERCENTAGE,
  adaptiveDifficultyEnabled: false,
  translationProvider: 'auto',
  sourceLanguage: 'auto',
  targetLanguage: 'es',
  translationEndpoint: ''
};
const SETTINGS_CACHE_TTL_MS = 1500;
const QUIZ_BUCKETS_STORAGE_KEY = 'vocabularyQuizBuckets';
const SCRUB_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'j', 'l']);
const CONTENT_CAPTION_SEGMENT_SELECTOR = '.ytp-caption-segment, .captions-text .caption-visual-line span';
const PERSISTENT_REFRESH_INTERVAL_MS = 20; // Interval in ms for the persistent refresh loop that re-applies translations during playback.
const MIN_FORCE_REFRESH_GAP_MS = 10;
const INITIAL_WARMUP_INTERVAL_MS = 250;
const INITIAL_WARMUP_RUNS = 8;
const PREFETCH_INTERVAL_MS = 150;
const PREFETCH_LOOKAHEAD_SECONDS = 60;
const PREFETCH_MAX_WORDS = 120;
const FULL_TRACK_PREFETCH_MAX_WORDS = 500;
const PREFETCH_WORD_PATTERN = /[\p{sc=Han}][\p{M}]*|[\p{sc=Hiragana}][\p{M}]*|[\p{sc=Katakana}]+[\p{M}]*|[\p{sc=Thai}][\p{M}]*|\p{L}[\p{L}\p{M}'-]*/gu;
const CONTENT_READY_MESSAGE = 'LINGO_STREAM_HEALTH_CHECK';
const CONTENT_REFRESH_MESSAGE = 'LINGO_STREAM_FORCE_REFRESH';

if (window.__lingoStreamContentInitialized) {
  void window.log?.('content.js already initialized; duplicate setup skipped');
} else {
  window.__lingoStreamContentInitialized = true;

function normalizeReplacementPercentage(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return DEFAULT_REPLACEMENT_PERCENTAGE;
  }

  return Math.max(0, Math.min(100, Math.floor(numeric)));
}

function buildRenderConfigKey(settings) {
  const safeReplacement = normalizeReplacementPercentage(
    settings?.effectiveReplacementPercentage ?? settings?.replacementPercentage
  );
  const adaptiveDifficultyEnabled = settings?.adaptiveDifficultyEnabled === true ? 'on' : 'off';
  const translationProvider = typeof settings?.translationProvider === 'string'
    ? settings.translationProvider.trim().toLowerCase()
    : DEFAULT_SETTINGS.translationProvider;
  const sourceLanguage = typeof settings?.sourceLanguage === 'string'
    ? settings.sourceLanguage.trim().toLowerCase()
    : DEFAULT_SETTINGS.sourceLanguage;
  const targetLanguage = typeof settings?.targetLanguage === 'string'
    ? settings.targetLanguage.trim().toLowerCase()
    : DEFAULT_SETTINGS.targetLanguage;
  const translationEndpoint = typeof settings?.translationEndpoint === 'string'
    ? settings.translationEndpoint.trim().toLowerCase()
    : DEFAULT_SETTINGS.translationEndpoint;

  return [
    `replacement:${safeReplacement}`,
    `adaptive:${adaptiveDifficultyEnabled}`,
    `provider:${translationProvider}`,
    `source:${sourceLanguage}`,
    `target:${targetLanguage}`,
    `endpoint:${translationEndpoint}`
  ].join('|');
}

let cachedSettings = {
  ...DEFAULT_SETTINGS,
  effectiveReplacementPercentage: DEFAULT_REPLACEMENT_PERCENTAGE,
  adaptiveDifficulty: null,
  renderConfigKey: buildRenderConfigKey(DEFAULT_SETTINGS)
};
let lastSettingsReadAt = 0;
let inflightSettingsPromise = null;

console.log('Lingo Stream loaded');
void window.log?.('content.js loaded');

function getSyncStorageItems(keys) {
  return new Promise((resolve) => {
    chrome.storage.sync.get(keys, (items) => {
      if (chrome.runtime.lastError) {
        resolve(null);
        return;
      }

      resolve(items ?? {});
    });
  });
}

function getLocalStorageItems(keys) {
  return new Promise((resolve) => {
    if (!chrome.storage?.local?.get) {
      resolve({});
      return;
    }

    chrome.storage.local.get(keys, (items) => {
      if (chrome.runtime.lastError) {
        resolve({});
        return;
      }

      resolve(items ?? {});
    });
  });
}

function resolveAdaptiveDifficulty(baseReplacementPercentage, adaptiveDifficultyEnabled, quizBuckets) {
  if (
    adaptiveDifficultyEnabled !== true ||
    typeof window.calculateAdaptiveReplacementPercentage !== 'function'
  ) {
    const normalizedBase = normalizeReplacementPercentage(baseReplacementPercentage);
    return {
      effectiveReplacementPercentage: normalizedBase,
      baseReplacementPercentage: normalizedBase,
      isAdaptiveActive: false,
      reason: 'disabled',
      band: 'baseline',
      delta: 0,
      correctCount: 0,
      incorrectCount: 0,
      answeredCount: 0,
      accuracy: 100
    };
  }

  return window.calculateAdaptiveReplacementPercentage(baseReplacementPercentage, quizBuckets);
}

async function readSettingsFromStorage() {
  const items = await getSyncStorageItems([
    'enabled',
    'replacementPercentage',
    'adaptiveDifficultyEnabled',
    'translationProvider',
    'sourceLanguage',
    'targetLanguage',
    'translationEndpoint'
  ]);

  if (items === null) {
    console.error('Failed to read content settings from storage.', chrome.runtime.lastError);
    return {
      ...DEFAULT_SETTINGS,
      effectiveReplacementPercentage: DEFAULT_REPLACEMENT_PERCENTAGE,
      adaptiveDifficulty: null,
      renderConfigKey: buildRenderConfigKey(DEFAULT_SETTINGS)
    };
  }

  const replacementPercentage = normalizeReplacementPercentage(
    items.replacementPercentage ?? DEFAULT_REPLACEMENT_PERCENTAGE
  );
  const adaptiveDifficultyEnabled = items.adaptiveDifficultyEnabled === true;
  const localItems = adaptiveDifficultyEnabled
    ? await getLocalStorageItems([QUIZ_BUCKETS_STORAGE_KEY])
    : {};
  const adaptiveDifficulty = resolveAdaptiveDifficulty(
    replacementPercentage,
    adaptiveDifficultyEnabled,
    localItems?.[QUIZ_BUCKETS_STORAGE_KEY]
  );

  const resolved = {
    enabled: items.enabled ?? DEFAULT_SETTINGS.enabled,
    replacementPercentage,
    effectiveReplacementPercentage: adaptiveDifficulty.effectiveReplacementPercentage,
    adaptiveDifficultyEnabled,
    adaptiveDifficulty,
    translationProvider: items.translationProvider ?? DEFAULT_SETTINGS.translationProvider,
    sourceLanguage: items.sourceLanguage ?? DEFAULT_SETTINGS.sourceLanguage,
    targetLanguage: items.targetLanguage ?? DEFAULT_SETTINGS.targetLanguage,
    translationEndpoint: typeof items.translationEndpoint === 'string'
      ? items.translationEndpoint
      : DEFAULT_SETTINGS.translationEndpoint
  };
  resolved.renderConfigKey = buildRenderConfigKey(resolved);

  console.log('Content settings loaded.', resolved);
  void window.log?.(
    `Content settings loaded: enabled=${resolved.enabled}, base=${resolved.replacementPercentage}, effective=${resolved.effectiveReplacementPercentage}, adaptive=${resolved.adaptiveDifficultyEnabled}`
  );
  return resolved;
}

function invalidateSettingsCache() {
  lastSettingsReadAt = 0;
}

async function refreshSettingsAndCaptions() {
  cachedSettings = await readSettingsFromStorage();
  lastSettingsReadAt = Date.now();
  handler.primeFromCurrentCaptions();
  handler.flushNow();
}

async function getSettings() {
  const now = Date.now();
  if (now - lastSettingsReadAt <= SETTINGS_CACHE_TTL_MS) {
    return cachedSettings;
  }

  if (inflightSettingsPromise) {
    return inflightSettingsPromise;
  }

  inflightSettingsPromise = readSettingsFromStorage()
    .then((resolved) => {
      cachedSettings = resolved;
      lastSettingsReadAt = Date.now();
      return cachedSettings;
    })
    .finally(() => {
      inflightSettingsPromise = null;
    });

  return inflightSettingsPromise;
}

const handler = window.createCaptionMutationHandler({
  getSettings,
  transformSubtitle: (subtitleText, replacementPercentage, pinnedTranslations = {}) =>
    window.buildImmersiveSubtitle(
      subtitleText,
      window.translateWords,
      replacementPercentage,
      pinnedTranslations
    ),
  transformSubtitlesBatch: (subtitleItems, replacementPercentage, options) =>
    window.buildImmersiveSubtitlesBatch(
      subtitleItems,
      window.translateWords,
      replacementPercentage,
      options
    ),
  translateWordsCached: window.translateWordsCached,
  debounceMs: 5
});

const observer = new MutationObserver((mutations) => {
  handler.handleMutations(mutations);
});

if (document.body) {
  observer.observe(document.body, {
    childList: true,
    characterData: true,
    subtree: true
  });
  console.log('Lingo Stream observer attached to document.body');
  handler.primeFromCurrentCaptions();
} else {
  document.addEventListener(
    'DOMContentLoaded',
    () => {
      observer.observe(document.body, {
        childList: true,
        characterData: true,
        subtree: true
      });
      console.log('Lingo Stream observer attached after DOMContentLoaded');
      void window.log?.('MutationObserver attached after DOMContentLoaded');
      handler.primeFromCurrentCaptions();
    },
    { once: true }
  );
}

if (document.body) {
  void window.log?.('MutationObserver attached to document.body');
}

function installRealtimeHooks() {
  let lastForcedRefreshAt = 0;
  let lastPrefetchAt = 0;
  const forceRefresh = ({ immediate = false } = {}) => {
    const now = Date.now();
    if (!immediate && now - lastForcedRefreshAt < MIN_FORCE_REFRESH_GAP_MS) {
      return;
    }

    lastForcedRefreshAt = now;
    handler.primeFromCurrentCaptions();
    handler.flushNow();
  };

  const shouldRunPersistentRefresh = () => {
    if (!cachedSettings.enabled) {
      return false;
    }

    if (typeof document.visibilityState === 'string' && document.visibilityState === 'hidden') {
      return false;
    }

    return Boolean(document.querySelector(CONTENT_CAPTION_SEGMENT_SELECTOR));
  };

  function collectFutureWordsFromTrack(video) {
    if (!video || !video.textTracks) {
      return [];
    }

    const words = [];
    const seen = new Set();
    const currentTime = Number.isFinite(video.currentTime) ? video.currentTime : 0;
    const cutoffTime = currentTime + PREFETCH_LOOKAHEAD_SECONDS;

    for (const track of Array.from(video.textTracks)) {
      if (!track || (track.kind !== 'captions' && track.kind !== 'subtitles')) {
        continue;
      }

      const cues = track.cues;
      if (!cues) {
        continue;
      }

      for (const cue of Array.from(cues)) {
        if (!cue) {
          continue;
        }

        const startTime = Number.isFinite(cue.startTime) ? cue.startTime : -1;
        if (startTime < currentTime || startTime > cutoffTime) {
          continue;
        }

        const text = typeof cue.text === 'string' ? cue.text : '';
        for (const matchedWord of text.match(PREFETCH_WORD_PATTERN) ?? []) {
          const normalized = matchedWord.toLowerCase();
          if (seen.has(normalized) || !window.shouldTranslateWord(matchedWord, 0)) {
            continue;
          }

          seen.add(normalized);
          words.push(matchedWord);
          if (words.length >= PREFETCH_MAX_WORDS) {
            return words;
          }
        }
      }
    }

    return words;
  }

  const prefetchFutureWords = async () => {
    const now = Date.now();
    if (now - lastPrefetchAt < PREFETCH_INTERVAL_MS) {
      return;
    }

    if (!cachedSettings.enabled || typeof window.prefetchTranslationWords !== 'function') {
      return;
    }

    const video = document.querySelector('video.html5-main-video');
    if (!video) {
      return;
    }

    const candidateWords = collectFutureWordsFromTrack(video);
    if (candidateWords.length === 0) {
      return;
    }

    lastPrefetchAt = now;
    try {
      await window.prefetchTranslationWords(candidateWords);
      void window.log?.(`Prefetched future words: ${candidateWords.length}`);
    } catch (error) {
      console.warn('Future subtitle prefetch failed.', error);
    }
  };

  // Tracks the video src for which a full-track prefetch has already been completed.
  let fullTrackPrefetchedVideoSrc = null;

  function collectAllTrackWords(video) {
    if (!video || !video.textTracks) {
      return [];
    }

    const words = [];
    const seen = new Set();

    for (const track of Array.from(video.textTracks)) {
      if (!track || (track.kind !== 'captions' && track.kind !== 'subtitles')) {
        continue;
      }

      const cues = track.cues;
      if (!cues) {
        continue;
      }

      for (const cue of Array.from(cues)) {
        if (!cue) {
          continue;
        }

        const text = typeof cue.text === 'string' ? cue.text : '';
        for (const matchedWord of text.match(PREFETCH_WORD_PATTERN) ?? []) {
          const normalized = matchedWord.toLowerCase();
          if (seen.has(normalized) || !window.shouldTranslateWord(matchedWord, 0)) {
            continue;
          }

          seen.add(normalized);
          words.push(matchedWord);
          if (words.length >= FULL_TRACK_PREFETCH_MAX_WORDS) {
            return words;
          }
        }
      }
    }

    return words;
  }

  async function runFullTrackPrefetch() {
    if (!cachedSettings.enabled || typeof window.prefetchTranslationWords !== 'function') {
      return;
    }

    const video = document.querySelector('video.html5-main-video');
    if (!video) {
      return;
    }

    const videoSrc = video.currentSrc || video.src || '';
    if (fullTrackPrefetchedVideoSrc === videoSrc) {
      return;
    }

    const allWords = collectAllTrackWords(video);
    if (allWords.length === 0) {
      return;
    }

    fullTrackPrefetchedVideoSrc = videoSrc;
    void window.log?.(`Full-track prefetch starting: ${allWords.length} words`);

    // Process in batches to stay within the extension message word limit per request.
    const BATCH_SIZE = 30;
    for (let i = 0; i < allWords.length; i += BATCH_SIZE) {
      const batch = allWords.slice(i, i + BATCH_SIZE);
      try {
        await window.prefetchTranslationWords(batch);
      } catch (error) {
        console.warn('Full-track prefetch batch failed.', error);
      }
    }

    void window.log?.(`Full-track prefetch complete: ${allWords.length} words cached`);
  }

  const persistentRefresh = () => {
    if (!shouldRunPersistentRefresh()) {
      return;
    }

    forceRefresh();
    void prefetchFutureWords();
  };

  const attachVideoListeners = (video) => {
    if (!video || video.__lingoStreamHooksInstalled) {
      return;
    }

    video.__lingoStreamHooksInstalled = true;
    video.addEventListener('seeking', forceRefresh, { passive: true });
    video.addEventListener('seeked', forceRefresh, { passive: true });
    video.addEventListener('ratechange', forceRefresh, { passive: true });
    video.addEventListener('play', forceRefresh, { passive: true });
    video.addEventListener('timeupdate', () => {
      void prefetchFutureWords();
    }, { passive: true });

    // Trigger a full-track prefetch once the video data is loaded.
    video.addEventListener('loadeddata', () => {
      void runFullTrackPrefetch();
    }, { passive: true });

    // Invalidate the prefetch cache and re-run when a text track is added or changed.
    video.textTracks?.addEventListener?.('addtrack', () => {
      fullTrackPrefetchedVideoSrc = null;
      void runFullTrackPrefetch();
    });
    video.textTracks?.addEventListener?.('change', () => {
      void runFullTrackPrefetch();
    });
  };

  const tryAttach = () => {
    const video = document.querySelector('video.html5-main-video');
    if (video) {
      attachVideoListeners(video);
      return true;
    }

    return false;
  };

  const keyHandler = (event) => {
    if (event && SCRUB_KEYS.has(event.key)) {
      forceRefresh();
    }
  };

  document.addEventListener('keydown', keyHandler, true);

  if (!tryAttach()) {
    const attachTimer = setInterval(() => {
      if (tryAttach()) {
        clearInterval(attachTimer);
      }
    }, 250);

    setTimeout(() => clearInterval(attachTimer), 12000);
  }

  // Run multiple warm-up refresh cycles on startup to pre-populate the translation cache.
  let warmupRuns = 0;
  const warmupTimer = setInterval(() => {
    warmupRuns += 1;
    forceRefresh({ immediate: true });
    void prefetchFutureWords();
    // Also kick off the full-track prefetch during warm-up to warm the cache as early as possible.
    void runFullTrackPrefetch();
    if (warmupRuns >= INITIAL_WARMUP_RUNS) {
      clearInterval(warmupTimer);
    }
  }, INITIAL_WARMUP_INTERVAL_MS);

  // Start the persistent refresh loop to keep captions updated throughout playback.
  setInterval(() => {
    persistentRefresh();
  }, PERSISTENT_REFRESH_INTERVAL_MS);

  document.addEventListener(
    'visibilitychange',
    () => {
      persistentRefresh();
    },
    { passive: true }
  );
}

installRealtimeHooks();

chrome.storage.onChanged?.addListener((changes, areaName) => {
  if (areaName === 'sync') {
    const trackedKeys = [
      'enabled',
      'replacementPercentage',
      'adaptiveDifficultyEnabled',
      'translationProvider',
      'sourceLanguage',
      'targetLanguage',
      'translationEndpoint'
    ];

    if (trackedKeys.some((key) => Object.prototype.hasOwnProperty.call(changes, key))) {
      invalidateSettingsCache();
      void refreshSettingsAndCaptions();
    }
    return;
  }

  if (
    areaName === 'local' &&
    Object.prototype.hasOwnProperty.call(changes, QUIZ_BUCKETS_STORAGE_KEY) &&
    cachedSettings.adaptiveDifficultyEnabled === true
  ) {
    invalidateSettingsCache();
    void refreshSettingsAndCaptions();
  }
});

chrome.runtime.onMessage?.addListener((message, _sender, sendResponse) => {
  if (message?.type === CONTENT_READY_MESSAGE) {
    sendResponse({
      ok: true,
      initialized: true,
      href: location.href
    });
    return false;
  }

  if (message?.type === CONTENT_REFRESH_MESSAGE) {
    handler.primeFromCurrentCaptions();
    handler.flushNow();
    sendResponse({ ok: true });
    return false;
  }

  return false;
});
}
