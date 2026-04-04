import fs from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

const CONTENT_SCRIPT_FILES = [
  'extension/captionObserver.js',
  'extension/logger.js',
  'extension/translation.js',
  'extension/stopwords.js',
  'extension/processor.js',
  'extension/content.js'
];

const FIXTURE_PATH = new URL('./fixtures/youtube-caption-fixture.v1.json', import.meta.url);
const FIXTURE = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));

function createStorageArea(initialState = {}, areaName, emitChange) {
  const state = { ...initialState };

  return {
    get(keys, callback) {
      if (Array.isArray(keys)) {
        const picked = {};
        for (const key of keys) {
          picked[key] = state[key];
        }
        callback(picked);
        return;
      }

      if (typeof keys === 'string') {
        callback({ [keys]: state[keys] });
        return;
      }

      callback({ ...state });
    },
    set(items, callback) {
      const changes = {};
      for (const [key, value] of Object.entries(items ?? {})) {
        changes[key] = {
          oldValue: state[key],
          newValue: value
        };
      }

      Object.assign(state, items);
      if (typeof emitChange === 'function' && Object.keys(changes).length > 0) {
        emitChange(changes, areaName);
      }
      if (typeof callback === 'function') {
        callback();
      }
    },
    _state: state
  };
}

function createCaptionSegment(text) {
  const segment = {
    nodeType: 1,
    _textContent: text,
    isConnected: true,
    parentElement: null,
    parentNode: null,
    matches: (selector) => selector.includes('.ytp-caption-segment'),
    querySelectorAll: () => [],
    closest: (selector) => (selector.includes('.ytp-caption-segment') ? segment : null)
  };
  Object.defineProperty(segment, 'textContent', {
    get() { return segment._textContent; },
    set(value) { segment._textContent = value; },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(segment, 'innerHTML', {
    get() { return segment._innerHTML || segment._textContent; },
    set(html) {
      segment._innerHTML = html;
      segment._textContent = html.replace(/<(?:[^"'>]|"[^"]*"|'[^']*')*>/g, '');
    },
    enumerable: true,
    configurable: true
  });

  return segment;
}

function createE2EContext({ settings, translations, videoUrl }) {
  let mutationObserverCallback = null;
  let runtimeMessageListener = null;
  const storageChangeListeners = [];
  const emitStorageChange = (changes, areaName) => {
    for (const listener of storageChangeListeners) {
      listener(changes, areaName);
    }
  };

  const syncStorage = createStorageArea({
    enabled: settings.enabled,
    replacementPercentage: settings.replacementPercentage,
    adaptiveDifficultyEnabled: settings.adaptiveDifficultyEnabled,
    translationProvider: settings.translationProvider,
    sourceLanguage: settings.sourceLanguage,
    targetLanguage: settings.targetLanguage,
    translationTimeoutMs: settings.translationTimeoutMs
  }, 'sync', emitStorageChange);
  const localStorage = createStorageArea({
    debug: false,
    debugLogs: [],
    vocabularyEntries: [],
    vocabularyQuizBuckets: settings.quizBuckets ?? {
      notQuizzed: [],
      correct: [],
      incorrect: []
    }
  }, 'local', emitStorageChange);

  const segments = [];
  const mockVideo = {
    __lingoStreamHooksInstalled: false,
    addEventListener: () => {}
  };
  const documentBody = {};
  const documentMock = {
    body: documentBody,
    visibilityState: 'visible',
    addEventListener: () => {},
    querySelector(selector) {
      if (selector === 'video.html5-main-video') {
        return mockVideo;
      }
      return null;
    },
    querySelectorAll(selector) {
      if (selector.includes('.ytp-caption-segment')) {
        return segments;
      }
      return [];
    }
  };

  const context = vm.createContext({
    console: {
      log: () => {},
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {}
    },
    Math: Object.assign(Object.create(Math), { random: () => 0 }),
    URL,
    Date,
    Promise,
    setTimeout,
    clearTimeout,
    setInterval: () => 1,
    clearInterval: () => {},
    MutationObserver: function MockMutationObserver(callback) {
      mutationObserverCallback = callback;
      this.observe = () => {};
    },
    location: {
      href: videoUrl
    },
    document: documentMock,
    chrome: {
      runtime: {
        id: 'test-extension-id',
        lastError: null,
        onMessage: {
          addListener(listener) {
            runtimeMessageListener = listener;
          }
        },
        sendMessage(message, callback) {
          if (message?.type !== 'LINGO_STREAM_TRANSLATE_WORDS') {
            callback({ ok: false, error: 'unsupported_message' });
            return;
          }

          const words = Array.isArray(message?.payload?.words) ? message.payload.words : [];
          const translatedWords = {};
          const providerByWord = {};

          for (const word of words) {
            const normalized = String(word).toLowerCase();
            if (!translations[normalized]) {
              continue;
            }

            translatedWords[normalized] = translations[normalized];
            providerByWord[normalized] = settings.translationProvider;
          }

          callback({
            ok: true,
            translations: translatedWords,
            meta: {
              providerByWord,
              failedProvidersByWord: {}
            }
          });
        }
      },
      storage: {
        sync: syncStorage,
        local: localStorage,
        onChanged: {
          addListener(listener) {
            storageChangeListeners.push(listener);
          }
        }
      }
    }
  });

  context.window = context;

  function addCaptionSegment(segment) {
    segments.push(segment);
  }

  function emitMutation(mutations) {
    if (typeof mutationObserverCallback !== 'function') {
      throw new Error('MutationObserver callback not initialized');
    }

    mutationObserverCallback(mutations);
  }

  return {
    context,
    addCaptionSegment,
    emitMutation,
    getRuntimeMessageListener: () => runtimeMessageListener,
    syncStorage,
    localStorage
  };
}

function countInlineTranslations(text, translation) {
  const pattern = new RegExp(`\\(${translation}\\)`, 'g');
  return (String(text).match(pattern) ?? []).length;
}

async function waitForAsyncWork() {
  await new Promise((resolve) => {
    setTimeout(resolve, 30);
  });
}

describe('nightly content E2E smoke fixture', () => {
  it('applies translations for each stable fixture cue', async () => {
    expect(FIXTURE?.fixtureId).toBe('youtube-caption-fixture-v1');
    expect(Array.isArray(FIXTURE?.cues)).toBe(true);
    expect(FIXTURE.cues.length).toBeGreaterThan(0);

    const runtime = createE2EContext({
      settings: FIXTURE.settings,
      translations: FIXTURE.translations,
      videoUrl: FIXTURE.videoUrl
    });

    for (const scriptPath of CONTENT_SCRIPT_FILES) {
      const source = fs.readFileSync(scriptPath, 'utf8');
      expect(() => vm.runInContext(source, runtime.context, { filename: scriptPath })).not.toThrow();
    }

    expect(typeof runtime.getRuntimeMessageListener()).toBe('function');

    const firstCue = FIXTURE.cues[0];
    const segment = createCaptionSegment(firstCue.text);
    runtime.addCaptionSegment(segment);
    runtime.emitMutation([
      {
        type: 'childList',
        addedNodes: [segment]
      }
    ]);

    await waitForAsyncWork();

    for (const expected of firstCue.expectedContains) {
      expect(segment.textContent.toLowerCase()).toContain(String(expected).toLowerCase());
    }

    for (const cue of FIXTURE.cues.slice(1)) {
      segment.textContent = cue.text;
      runtime.emitMutation([
        {
          type: 'childList',
          target: segment,
          addedNodes: []
        }
      ]);

      await waitForAsyncWork();

      for (const expected of cue.expectedContains) {
        expect(segment.textContent.toLowerCase()).toContain(String(expected).toLowerCase());
      }
    }
  });

  it('recomputes the swap rate from adaptive quiz difficulty changes', async () => {
    const runtime = createE2EContext({
      settings: {
        enabled: true,
        replacementPercentage: 10,
        adaptiveDifficultyEnabled: true,
        translationProvider: 'google',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        translationTimeoutMs: 1200,
        quizBuckets: {
          notQuizzed: [],
          correct: new Array(9).fill(null).map((_, index) => ({ id: `c${index}` })),
          incorrect: [{ id: 'i0' }]
        }
      },
      translations: {
        koa: 'sol'
      },
      videoUrl: FIXTURE.videoUrl
    });

    for (const scriptPath of CONTENT_SCRIPT_FILES) {
      const source = fs.readFileSync(scriptPath, 'utf8');
      expect(() => vm.runInContext(source, runtime.context, { filename: scriptPath })).not.toThrow();
    }

    const segment = createCaptionSegment(new Array(24).fill('koa').join(' '));
    runtime.addCaptionSegment(segment);
    runtime.emitMutation([
      {
        type: 'childList',
        addedNodes: [segment]
      }
    ]);

    await waitForAsyncWork();
    const highDifficultyCount = countInlineTranslations(segment.textContent, 'sol');
    expect(highDifficultyCount).toBeGreaterThan(0);

    runtime.localStorage.set({
      vocabularyQuizBuckets: {
        notQuizzed: [],
        correct: new Array(4).fill(null).map((_, index) => ({ id: `c${index}` })),
        incorrect: new Array(6).fill(null).map((_, index) => ({ id: `i${index}` }))
      }
    });

    await waitForAsyncWork();
    const lowDifficultyCount = countInlineTranslations(segment.textContent, 'sol');
    expect(lowDifficultyCount).toBeLessThan(highDifficultyCount);
  });
});
