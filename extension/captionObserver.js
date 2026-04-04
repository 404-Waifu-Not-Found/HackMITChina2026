const DEFAULT_DEBOUNCE_MS = 40;
const CAPTION_SEGMENT_SELECTOR = '.ytp-caption-segment, .captions-text .caption-visual-line span';
const WORD_CAPTURE_PATTERN = /[\p{sc=Han}][\p{M}]*|[\p{sc=Hiragana}][\p{M}]*|[\p{sc=Katakana}]+[\p{M}]*|[\p{sc=Thai}][\p{M}]*|\p{L}[\p{L}\p{M}'-]*/gu;
const RECENT_TRANSFORM_TTL_MS = 300_000;
const MAX_RECENT_TRANSFORMS = 200;
const TRANSLATED_WORD_COLOR = '#86efac';
const HIGHLIGHT_NAME = 'lingo-stream-translation';
const TRANSLATION_INLINE_PATTERN = /\S+\s*\([^)]+\)/g;

let highlightStyleInjected = false;
let lingoHighlight = null;
const segmentRangesMap = new WeakMap();

function supportsHighlightApi() {
  return typeof CSS !== 'undefined' && typeof CSS.highlights !== 'undefined' && typeof Highlight !== 'undefined';
}

function ensureHighlightInfra() {
  if (highlightStyleInjected) return;
  if (!supportsHighlightApi()) return;
  try {
    const style = document.createElement('style');
    style.textContent = [
      `::highlight(${HIGHLIGHT_NAME}) { color: ${TRANSLATED_WORD_COLOR} !important; }`,
      `${CAPTION_SEGMENT_SELECTOR} { -webkit-text-fill-color: currentColor !important; }`
    ].join('\n');
    (document.head || document.documentElement).appendChild(style);
    lingoHighlight = new Highlight();
    CSS.highlights.set(HIGHLIGHT_NAME, lingoHighlight);
    highlightStyleInjected = true;
  } catch (_) { /* CSS Custom Highlight API may be unsupported; skip highlight setup. */ }
}

function setSegmentHighlightRanges(segment, plainText) {
  clearSegmentHighlightRanges(segment);
  if (!lingoHighlight) return;

  const textNode = segment.firstChild;
  if (!textNode || textNode.nodeType !== 3) return;

  const ranges = [];
  const re = new RegExp(TRANSLATION_INLINE_PATTERN.source, 'g');
  let m;
  while ((m = re.exec(plainText)) !== null) {
    try {
      const range = document.createRange();
      range.setStart(textNode, m.index);
      range.setEnd(textNode, m.index + m[0].length);
      ranges.push(range);
      lingoHighlight.add(range);
    } catch (_) { /* Range offsets may be out of bounds for this text node; skip this match. */ }
  }

  if (ranges.length > 0) {
    segmentRangesMap.set(segment, ranges);
  }
}

function clearSegmentHighlightRanges(segment) {
  const ranges = segmentRangesMap.get(segment);
  if (ranges && lingoHighlight) {
    for (const r of ranges) {
      lingoHighlight.delete(r);
    }
  }
  segmentRangesMap.delete(segment);
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function applySpanFallback(segment, plainText) {
  const re = new RegExp(TRANSLATION_INLINE_PATTERN.source, 'g');
  let lastIndex = 0;
  let m;
  let html = '';
  let hasMatch = false;

  while ((m = re.exec(plainText)) !== null) {
    hasMatch = true;
    if (m.index > lastIndex) {
      html += escapeHtml(plainText.slice(lastIndex, m.index));
    }
    html += `<span data-lingo style="color:${TRANSLATED_WORD_COLOR} !important;-webkit-text-fill-color:${TRANSLATED_WORD_COLOR} !important">${escapeHtml(m[0])}</span>`;
    lastIndex = m.index + m[0].length;
  }

  if (!hasMatch) {
    segment.textContent = plainText;
    return;
  }

  if (lastIndex < plainText.length) {
    html += escapeHtml(plainText.slice(lastIndex));
  }

  segment.innerHTML = html;
}

function applyTransformedText(segment, plainText) {
  if (supportsHighlightApi()) {
    segment.textContent = plainText;
    ensureHighlightInfra();
    setSegmentHighlightRanges(segment, plainText);
  } else {
    applySpanFallback(segment, plainText);
  }
}

function hashText(text) {
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }

  return hash.toString(16);
}

function isElementNode(node) {
  return Boolean(node) && node.nodeType === 1;
}

function isCaptionSegment(node) {
  if (!isElementNode(node) || typeof node.matches !== 'function' || !node.matches(CAPTION_SEGMENT_SELECTOR)) {
    return false;
  }
  return !(typeof node.hasAttribute === 'function' && node.hasAttribute('data-lingo'));
}

function findCaptionSegmentFromNode(node) {
  if (!node) {
    return null;
  }

  if (isCaptionSegment(node)) {
    return node;
  }

  const parentElement = node.parentElement || node.parentNode;
  if (!isElementNode(parentElement)) {
    return null;
  }

  if (isCaptionSegment(parentElement)) {
    return parentElement;
  }

  if (typeof parentElement.closest === 'function') {
    return parentElement.closest(CAPTION_SEGMENT_SELECTOR);
  }

  return null;
}

function collectCaptionSegments(mutations) {
  const segments = new Set();

  for (const mutation of mutations) {
    if (mutation.type === 'characterData') {
      const segment = findCaptionSegmentFromNode(mutation.target);
      if (segment) {
        segments.add(segment);
      }
      continue;
    }

    if (mutation.type !== 'childList') {
      continue;
    }

    const targetSegment = findCaptionSegmentFromNode(mutation.target);
    if (targetSegment) {
      segments.add(targetSegment);
    }

    for (const addedNode of mutation.addedNodes) {
      const segmentFromNode = findCaptionSegmentFromNode(addedNode);
      if (segmentFromNode) {
        segments.add(segmentFromNode);
      }

      if (!isElementNode(addedNode)) {
        continue;
      }

      if (isCaptionSegment(addedNode)) {
        segments.add(addedNode);
      }

      if (typeof addedNode.querySelectorAll === 'function') {
        const nested = addedNode.querySelectorAll(CAPTION_SEGMENT_SELECTOR);
        for (const segment of nested) {
          segments.add(segment);
        }
      }
    }
  }

  return segments;
}

function collectCurrentCaptionSegments() {
  if (typeof document.querySelectorAll !== 'function') {
    return new Set();
  }

  const all = document.querySelectorAll(CAPTION_SEGMENT_SELECTOR);
  const segments = new Set();
  for (const node of all) {
    if (typeof node.hasAttribute !== 'function' || !node.hasAttribute('data-lingo')) {
      segments.add(node);
    }
  }
  return segments;
}

function normalizeSubtitleText(text) {
  if (typeof text !== 'string') {
    return '';
  }

  return text.replace(/\s+/g, ' ').trim();
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractPinnedTranslations(originalText, transformedText) {
  if (typeof originalText !== 'string' || typeof transformedText !== 'string') {
    return {};
  }

  const wordsByNormalized = new Map();
  for (const word of originalText.match(WORD_CAPTURE_PATTERN) ?? []) {
    const normalized = word.toLowerCase();
    if (!wordsByNormalized.has(normalized)) {
      wordsByNormalized.set(normalized, word);
    }
  }

  const pinned = {};
  for (const [normalized, originalWord] of wordsByNormalized.entries()) {
    const pattern = new RegExp(`${escapeRegExp(originalWord)} \\(([^)]+)\\)`, 'u');
    const matched = transformedText.match(pattern);
    const translated = matched?.[1]?.trim();
    if (translated) {
      pinned[normalized] = translated;
    }
  }

  return pinned;
}

function hashPinnedTranslations(pinnedTranslations) {
  if (!pinnedTranslations || typeof pinnedTranslations !== 'object') {
    return 'none';
  }

  const normalizedEntries = Object.entries(pinnedTranslations)
    .filter(([normalized, translated]) => typeof normalized === 'string' && typeof translated === 'string')
    .map(([normalized, translated]) => [normalized.toLowerCase(), translated.trim()])
    .filter(([normalized, translated]) => normalized.length > 0 && translated.length > 0)
    .sort(([left], [right]) => left.localeCompare(right));

  if (normalizedEntries.length === 0) {
    return 'none';
  }

  const serialized = normalizedEntries
    .map(([normalized, translated]) => `${normalized}:${translated}`)
    .join('|');
  return hashText(serialized);
}

function normalizeReplacementPercentage(replacementPercentage) {
  if (!Number.isFinite(replacementPercentage)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.floor(replacementPercentage)));
}

function buildRenderConfigKey(replacementPercentage) {
  return `replacement:${normalizeReplacementPercentage(replacementPercentage)}`;
}

function createCaptionMutationHandler({
  getSettings,
  transformSubtitle,
  transformSubtitlesBatch,
  translateWordsCached,
  debounceMs = DEFAULT_DEBOUNCE_MS
}) {
  const pendingSegments = new Set();
  const lastProcessedByNode = new WeakMap();
  const nodeRenderState = new WeakMap();
  const trackedSegments = new Set();
  const recentTransformsByKey = new Map();

  let activeRequestId = 0;
  let timer = null;
  let isProcessing = false;
  let rerunRequested = false;
  let lastKnownRenderConfigKey = null;

  function readSegmentText(segment) {
    if (!segment || typeof segment.textContent !== 'string') {
      return '';
    }

    return segment.textContent;
  }

  function forgetSegment(segment) {
    if (!segment) {
      return;
    }

    clearSegmentHighlightRanges(segment);
    trackedSegments.delete(segment);
    lastProcessedByNode.delete(segment);
    nodeRenderState.delete(segment);
  }

  function pruneDisconnectedSegments() {
    for (const segment of Array.from(trackedSegments)) {
      if (!segment?.isConnected) {
        forgetSegment(segment);
      }
    }
  }

  function cleanupRecentTransforms(now = Date.now()) {
    for (const [cacheKey, entry] of Array.from(recentTransformsByKey.entries())) {
      if (now - entry.timestamp > RECENT_TRANSFORM_TTL_MS) {
        recentTransformsByKey.delete(cacheKey);
      }
    }

    while (recentTransformsByKey.size > MAX_RECENT_TRANSFORMS) {
      const oldestKey = recentTransformsByKey.keys().next().value;
      if (!oldestKey) {
        break;
      }
      recentTransformsByKey.delete(oldestKey);
    }
  }

  function getRecentTransform(cacheKey, now = Date.now()) {
    const entry = recentTransformsByKey.get(cacheKey);
    if (!entry) {
      return null;
    }

    if (now - entry.timestamp > RECENT_TRANSFORM_TTL_MS) {
      recentTransformsByKey.delete(cacheKey);
      return null;
    }

    return entry.transformedText;
  }

  function setRecentTransform(cacheKey, transformedText, now = Date.now()) {
    recentTransformsByKey.set(cacheKey, {
      transformedText,
      timestamp: now
    });
    cleanupRecentTransforms(now);
  }

  function resolveOriginalText(segment) {
    const currentText = readSegmentText(segment);
    const state = nodeRenderState.get(segment);
    if (!state) {
      return currentText;
    }

    if (currentText === state.transformedText) {
      return state.originalText;
    }

    return currentText;
  }

  function isSegmentCurrentlyTransformed(segment, originalHash, renderConfigKey) {
    const state = nodeRenderState.get(segment);
    if (!state) {
      return false;
    }

    if (state.renderConfigKey !== renderConfigKey) {
      return false;
    }

    if (readSegmentText(segment) !== state.transformedText) {
      return false;
    }

    const stateOriginalHash = typeof state.originalHash === 'string'
      ? state.originalHash
      : hashText(normalizeSubtitleText(state.originalText || ''));
    return stateOriginalHash === originalHash;
  }

  function getPinnedTranslationsForSegment(segment) {
    const state = nodeRenderState.get(segment);
    if (!state || typeof state.pinnedTranslations !== 'object' || !state.pinnedTranslations) {
      return {};
    }

    return { ...state.pinnedTranslations };
  }

  function rememberRenderedState(
    segment,
    originalText,
    transformedText,
    pinnedTranslations = {},
    renderConfigKey
  ) {
    const normalizedOriginal = normalizeSubtitleText(originalText);
    const originalHash = hashText(normalizedOriginal);
    nodeRenderState.set(segment, {
      originalText,
      originalHash,
      transformedText,
      pinnedTranslations: { ...pinnedTranslations },
      renderConfigKey
    });
    trackedSegments.add(segment);
  }

  function wasSegmentProcessed(segment, originalHash, renderConfigKey) {
    const previous = lastProcessedByNode.get(segment);
    if (!previous || typeof previous !== 'object') {
      return false;
    }

    return previous.originalHash === originalHash && previous.renderConfigKey === renderConfigKey;
  }

  function markSegmentProcessed(segment, originalHash, renderConfigKey) {
    lastProcessedByNode.set(segment, {
      originalHash,
      renderConfigKey
    });
  }

  function restoreSegment(segment) {
    const state = nodeRenderState.get(segment);
    if (!state) {
      forgetSegment(segment);
      return;
    }

    if (readSegmentText(segment) === state.transformedText && state.originalText !== state.transformedText) {
      segment.textContent = state.originalText;
    }

    forgetSegment(segment);
  }

  function restoreAllSegments() {
    pruneDisconnectedSegments();

    for (const segment of Array.from(trackedSegments)) {
      restoreSegment(segment);
    }
  }

  function tryFastReapplyFromState(segment) {
    const state = nodeRenderState.get(segment);
    if (!state || typeof state.transformedText !== 'string') {
      return false;
    }

    if (lastKnownRenderConfigKey && state.renderConfigKey !== lastKnownRenderConfigKey) {
      return false;
    }

    const currentText = readSegmentText(segment);
    if (!currentText || currentText === state.transformedText) {
      return false;
    }

    const normalizedCurrent = normalizeSubtitleText(currentText);
    const normalizedOriginal = normalizeSubtitleText(state.originalText || '');
    if (!normalizedCurrent || normalizedCurrent !== normalizedOriginal) {
      return false;
    }

    applyTransformedText(segment, state.transformedText);
    const originalHash = typeof state.originalHash === 'string'
      ? state.originalHash
      : hashText(normalizedOriginal);
    markSegmentProcessed(segment, originalHash, state.renderConfigKey);
    return true;
  }

  function tryFastReapplyFromRecentCache(segment) {
    if (!lastKnownRenderConfigKey) {
      return false;
    }

    const originalText = resolveOriginalText(segment);
    const normalizedOriginal = normalizeSubtitleText(originalText);
    if (!normalizedOriginal) {
      return false;
    }

    const originalHash = hashText(normalizedOriginal);
    const pinnedTranslations = getPinnedTranslationsForSegment(segment);
    const pinnedHash = hashPinnedTranslations(pinnedTranslations);
    const transformKey = `${originalHash}:${lastKnownRenderConfigKey}:${pinnedHash}`;
    const cachedTransformedText = getRecentTransform(transformKey);

    if (cachedTransformedText === null || readSegmentText(segment) === cachedTransformedText) {
      return false;
    }

    applyTransformedText(segment, cachedTransformedText);
    const cachedPinnedTranslations = extractPinnedTranslations(originalText, cachedTransformedText);
    rememberRenderedState(
      segment,
      originalText,
      cachedTransformedText,
      cachedPinnedTranslations,
      lastKnownRenderConfigKey
    );
    markSegmentProcessed(segment, originalHash, lastKnownRenderConfigKey);
    return true;
  }

  async function getTransformedText(
    originalText,
    replacementPercentage,
    cacheKey,
    pinnedTranslations = {}
  ) {
    const now = Date.now();
    const cached = getRecentTransform(cacheKey, now);
    if (cached !== null) {
      return cached;
    }

    const transformed = await transformSubtitle(originalText, replacementPercentage, pinnedTranslations);
    const finalText = typeof transformed === 'string' && transformed.length > 0 ? transformed : originalText;
    setRecentTransform(cacheKey, finalText, now);
    return finalText;
  }

  async function processQueue() {
    if (isProcessing) {
      rerunRequested = true;
      return;
    }

    isProcessing = true;
    try {
      void window.log?.('Subtitle processing started');
      const settings = await getSettings();
      const enabled = settings?.enabled !== false;
      const replacementPercentage = normalizeReplacementPercentage(
        Number(settings?.effectiveReplacementPercentage ?? settings?.replacementPercentage)
      );
      const renderConfigKey = typeof settings?.renderConfigKey === 'string' && settings.renderConfigKey
        ? settings.renderConfigKey
        : buildRenderConfigKey(replacementPercentage);
      lastKnownRenderConfigKey = renderConfigKey;

      if (!enabled) {
        void window.log?.('Skipped processing: Lingo Stream disabled');
        pendingSegments.clear();
        restoreAllSegments();
        return;
      }

      pruneDisconnectedSegments();
      cleanupRecentTransforms();

      const batch = Array.from(pendingSegments);
      pendingSegments.clear();

      if (batch.length === 0) {
        return;
      }

      const jobs = [];

      for (const segment of batch) {
        if (!segment || !segment.isConnected) {
          forgetSegment(segment);
          continue;
        }

        const originalText = resolveOriginalText(segment);
        const normalizedOriginal = normalizeSubtitleText(originalText);
        if (!normalizedOriginal) {
          restoreSegment(segment);
          continue;
        }

        const originalHash = hashText(normalizedOriginal);
        if (
          wasSegmentProcessed(segment, originalHash, renderConfigKey) &&
          isSegmentCurrentlyTransformed(segment, originalHash, renderConfigKey)
        ) {
          continue;
        }

        const renderedState = nodeRenderState.get(segment);
        if (
          renderedState &&
          renderedState.renderConfigKey === renderConfigKey &&
          (
            renderedState.originalHash === originalHash ||
            hashText(normalizeSubtitleText(renderedState.originalText || '')) === originalHash
          )
        ) {
          if (readSegmentText(segment) !== renderedState.transformedText) {
            applyTransformedText(segment, renderedState.transformedText);
          }

          markSegmentProcessed(segment, originalHash, renderConfigKey);
          continue;
        }

        const pinnedTranslations = getPinnedTranslationsForSegment(segment);
        const pinnedHash = hashPinnedTranslations(pinnedTranslations);
        const transformKey = `${originalHash}:${renderConfigKey}:${pinnedHash}`;

        const cachedTransformedText = getRecentTransform(transformKey);
        if (cachedTransformedText !== null) {
          if (readSegmentText(segment) !== cachedTransformedText) {
            applyTransformedText(segment, cachedTransformedText);
          }

          const cachedPinnedTranslations = extractPinnedTranslations(originalText, cachedTransformedText);
          rememberRenderedState(
            segment,
            originalText,
            cachedTransformedText,
            cachedPinnedTranslations,
            renderConfigKey
          );
          markSegmentProcessed(segment, originalHash, renderConfigKey);
          continue;
        }

        jobs.push({
          segment,
          originalText,
          originalHash,
          pinnedTranslations,
          transformKey
        });
      }

      if (jobs.length === 0) {
        return;
      }

      const requestId = ++activeRequestId;
      let transformedResults = null;

      if (typeof transformSubtitlesBatch === 'function') {
        const uniqueJobs = [];
        const uniqueJobByTransformKey = new Map();
        const uniqueIndexByTransformKey = new Map();

        for (const job of jobs) {
          if (uniqueJobByTransformKey.has(job.transformKey)) {
            continue;
          }

          const uniqueIndex = uniqueJobs.length;
          uniqueJobs.push(job);
          uniqueJobByTransformKey.set(job.transformKey, job);
          uniqueIndexByTransformKey.set(job.transformKey, uniqueIndex);
        }

        const batchOptions = {};
        if (typeof translateWordsCached === 'function') {
          batchOptions.translateWordsCached = translateWordsCached;
          batchOptions.onEarlyRender = (earlyResults) => {
            if (!Array.isArray(earlyResults) || earlyResults.length !== uniqueJobs.length) {
              return;
            }
            if (requestId !== activeRequestId) {
              return;
            }
            for (const job of jobs) {
              const segment = job.segment;
              if (!segment?.isConnected) {
                continue;
              }
              const uniqueIndex = uniqueIndexByTransformKey.get(job.transformKey);
              if (typeof uniqueIndex !== 'number') {
                continue;
              }
              const earlyText = earlyResults[uniqueIndex];
              if (typeof earlyText !== 'string' || !earlyText || earlyText === job.originalText) {
                continue;
              }
              if (readSegmentText(segment) !== earlyText) {
                applyTransformedText(segment, earlyText);
              }
              const earlyPinned = extractPinnedTranslations(job.originalText, earlyText);
              rememberRenderedState(segment, job.originalText, earlyText, earlyPinned, renderConfigKey);
            }
          };
        }

        try {
          const uniqueTransformed = await transformSubtitlesBatch(
            uniqueJobs.map((job) => ({
              text: job.originalText,
              pinnedTranslations: job.pinnedTranslations
            })),
            replacementPercentage,
            batchOptions
          );

          if (Array.isArray(uniqueTransformed) && uniqueTransformed.length === uniqueJobs.length) {
            transformedResults = jobs.map((job) => {
              const uniqueIndex = uniqueIndexByTransformKey.get(job.transformKey);
              if (typeof uniqueIndex !== 'number') {
                return job.originalText;
              }

              const transformed = uniqueTransformed[uniqueIndex];
              const finalText = typeof transformed === 'string' && transformed.length > 0
                ? transformed
                : job.originalText;
              setRecentTransform(job.transformKey, finalText);
              return finalText;
            });
          }
        } catch (error) {
          console.error('Failed to transform subtitle batch.', error);
        }
      }

      if (!Array.isArray(transformedResults) || transformedResults.length !== jobs.length) {
        const promisesByHash = new Map();

        for (const job of jobs) {
          const existingPromise = promisesByHash.get(job.transformKey);
          if (existingPromise) {
            job.promise = existingPromise;
            continue;
          }

          const promise = getTransformedText(
            job.originalText,
            replacementPercentage,
            job.transformKey,
            job.pinnedTranslations
          )
            .catch((error) => {
              console.error('Failed to transform subtitle segment.', error);
              return job.originalText;
            });

          promisesByHash.set(job.transformKey, promise);
          job.promise = promise;
        }

        transformedResults = await Promise.all(jobs.map((job) => job.promise));
      }

      if (requestId !== activeRequestId) {
        return;
      }

      for (let index = 0; index < jobs.length; index += 1) {
        const job = jobs[index];
        const segment = job.segment;
        if (!segment || !segment.isConnected) {
          forgetSegment(segment);
          continue;
        }

        const latestOriginalText = resolveOriginalText(segment);
        const latestOriginalHash = hashText(normalizeSubtitleText(latestOriginalText));
        if (!normalizeSubtitleText(latestOriginalText)) {
          restoreSegment(segment);
          continue;
        }

        if (latestOriginalHash !== job.originalHash) {
          pendingSegments.add(segment);
          continue;
        }

        const transformedText = typeof transformedResults[index] === 'string' && transformedResults[index].length > 0
          ? transformedResults[index]
          : job.originalText;

        if (readSegmentText(segment) !== transformedText) {
          applyTransformedText(segment, transformedText);
        }

        const pinnedTranslations = extractPinnedTranslations(latestOriginalText, transformedText);
        rememberRenderedState(
          segment,
          latestOriginalText,
          transformedText,
          pinnedTranslations,
          renderConfigKey
        );
        markSegmentProcessed(segment, job.originalHash, renderConfigKey);
      }
    } catch (error) {
      console.error('Subtitle processing failed unexpectedly.', error);
    } finally {
      isProcessing = false;

      if (rerunRequested || pendingSegments.size > 0) {
        rerunRequested = false;
        schedule(0);
      }
    }
  }

  function schedule(delay = debounceMs) {
    if (isProcessing) {
      rerunRequested = true;
      return;
    }

    if (timer) {
      clearTimeout(timer);
    }
    
    const delayMs = Math.max(0, Number(delay) || 0);
    void window.log?.(`Debounce triggered (${delayMs}ms)`);

    timer = setTimeout(() => {
      timer = null;
      void processQueue();
    }, delayMs);
  }

  function handleMutations(mutations) {
    const segments = collectCaptionSegments(mutations);
    if (segments.size === 0) {
      return;
    }

    let queuedCount = 0;
    for (const segment of segments) {
      if (tryFastReapplyFromState(segment)) {
        continue;
      }

      if (tryFastReapplyFromRecentCache(segment)) {
        continue;
      }

      pendingSegments.add(segment);
      queuedCount += 1;
    }

    if (queuedCount === 0) {
      return;
    }

    schedule();
  }

  function primeFromCurrentCaptions() {
    const segments = collectCurrentCaptionSegments();
    if (segments.size === 0) {
      return;
    }

    let queuedCount = 0;
    for (const segment of segments) {
      if (tryFastReapplyFromState(segment)) {
        continue;
      }

      if (tryFastReapplyFromRecentCache(segment)) {
        continue;
      }

      pendingSegments.add(segment);
      queuedCount += 1;
    }

    if (queuedCount === 0) {
      return;
    }

    schedule();
  }

  function flushNow() {
    schedule(0);
  }

  return {
    handleMutations,
    primeFromCurrentCaptions,
    flushNow
  };
}

window.hashText = hashText;
window.createCaptionMutationHandler = createCaptionMutationHandler;
