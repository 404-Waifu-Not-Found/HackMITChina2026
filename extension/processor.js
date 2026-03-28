const WORD_TOKEN_PATTERN = /^\p{L}[\p{L}\p{M}'-]*$/u;
const TOKEN_SPLIT_PATTERN = /[\p{sc=Han}][\p{M}]*|[\p{sc=Hiragana}][\p{M}]*|[\p{sc=Katakana}]+[\p{M}]*|[\p{sc=Thai}][\p{M}]*|\p{L}[\p{L}\p{M}'-]*|\s+|[^\s\p{L}\p{M}]+/gu;
const DUPLICATE_INLINE_TRANSLATION_PATTERN = /(\p{L}[\p{L}\p{M}'-]*\s*\(([^()]+)\))(?:\s*\(\2\))+/gu;
const MIN_OVERFLOW_EXTRA_CHARS = 36;
const MAX_OVERFLOW_EXTRA_CHARS = 84;
const OVERFLOW_EXTRA_CHAR_RATIO = 1.2;
const MAX_TOTAL_RENDERED_LENGTH = 120;
const replacementCarryByPercentage = new Map();

function normalizeReplacementPercentage(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.floor(numeric)));
}

function calculateReplacementCount(totalCandidates, replacementPercentage = 5) {
  const normalizedReplacementPercentage = normalizeReplacementPercentage(replacementPercentage);
  if (totalCandidates <= 0 || normalizedReplacementPercentage <= 0) {
    return 0;
  }

  const carry = replacementCarryByPercentage.get(normalizedReplacementPercentage) ?? 0;
  const exact = (totalCandidates * normalizedReplacementPercentage) / 100 + carry;
  const count = Math.floor(exact);
  replacementCarryByPercentage.set(normalizedReplacementPercentage, exact - count);
  return Math.min(totalCandidates, count);
}

function resetReplacementCarry() {
  replacementCarryByPercentage.clear();
}

function pickUniqueWordInfos(candidates, replacementPercentage = 5) {
  const replacementCount = calculateReplacementCount(candidates.length, replacementPercentage);
  if (replacementCount === 0) {
    return [];
  }

  return pickRandomWordInfos(candidates, replacementCount);
}

function pickRandomWordInfos(candidates, count) {
  const targetCount = Math.max(0, Math.min(candidates.length, Number(count) || 0));
  if (targetCount === 0) {
    return [];
  }

  const pool = [...candidates];
  const chosen = [];

  while (chosen.length < targetCount && pool.length > 0) {
    const randomIndex = Math.floor(Math.random() * pool.length);
    chosen.push(pool.splice(randomIndex, 1)[0]);
  }

  return chosen;
}

function tokenizeSubtitle(text) {
  const tokens = [];
  let wordIndex = 0;
  let tokenIndex = 0;

  for (const value of text.match(TOKEN_SPLIT_PATTERN) ?? []) {
    const isWord = WORD_TOKEN_PATTERN.test(value);
    tokens.push({
      value,
      isWord,
      wordIndex: isWord ? wordIndex++ : -1,
      tokenIndex: tokenIndex++
    });
  }

  return tokens;
}

function collectCandidateWordInfos(tokens, excludedTokenIndexes = new Set()) {
  const candidates = [];

  for (const token of tokens) {
    if (!token.isWord) {
      continue;
    }

    if (excludedTokenIndexes.has(token.tokenIndex)) {
      continue;
    }

    if (!window.shouldTranslateWord(token.value, token.wordIndex)) {
      continue;
    }

    const normalized = token.value.toLowerCase();
    candidates.push({
      token: token.value,
      normalized,
      tokenIndex: token.tokenIndex
    });
  }

  return candidates;
}

function isSpaceToken(token) {
  return typeof token?.value === 'string' && /^\s+$/.test(token.value);
}

function findInlineTranslationAfterWord(tokens, wordTokenIndex) {
  if (!Array.isArray(tokens) || wordTokenIndex < 0 || wordTokenIndex >= tokens.length) {
    return null;
  }

  let cursor = wordTokenIndex + 1;
  while (cursor < tokens.length && isSpaceToken(tokens[cursor])) {
    cursor += 1;
  }

  return parseParenthetical(tokens, cursor);
}

function parseParenthetical(tokens, openIndex) {
  if (!Array.isArray(tokens) || openIndex < 0 || openIndex >= tokens.length) {
    return null;
  }

  if (tokens[openIndex].value !== '(') {
    return null;
  }

  let cursor = openIndex + 1;
  while (cursor < tokens.length && tokens[cursor].value !== ')') {
    cursor += 1;
  }

  if (cursor >= tokens.length) {
    return null;
  }

  const closeIndex = cursor;
  const translationText = tokens
    .slice(openIndex + 1, closeIndex)
    .map((token) => token.value)
    .join('')
    .trim();

  if (!translationText) {
    return null;
  }

  return { openIndex, closeIndex, translationText };
}

function addTranslationContentTokenIndexes(tokens, translationRange, targetSet) {
  if (!translationRange || !targetSet) {
    return;
  }

  for (let contentIndex = translationRange.openIndex + 1; contentIndex < translationRange.closeIndex; contentIndex += 1) {
    const contentToken = tokens[contentIndex];
    if (contentToken?.isWord) {
      targetSet.add(contentToken.tokenIndex);
    }
  }
}

function analyzeInlineTranslations(tokens) {
  const translatedWordTokenIndexes = new Set();
  const translationContentTokenIndexes = new Set();
  const duplicatedTranslationTokenIndexes = new Set();
  const translatedWordsByNormalized = {};

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token?.isWord) {
      continue;
    }

    const inlineTranslation = findInlineTranslationAfterWord(tokens, index);
    if (!inlineTranslation) {
      continue;
    }

    const normalized = token.value.toLowerCase();
    translatedWordTokenIndexes.add(token.tokenIndex);
    if (!Object.prototype.hasOwnProperty.call(translatedWordsByNormalized, normalized)) {
      translatedWordsByNormalized[normalized] = inlineTranslation.translationText;
    }
    addTranslationContentTokenIndexes(tokens, inlineTranslation, translationContentTokenIndexes);

    let cursor = inlineTranslation.closeIndex + 1;
    while (cursor < tokens.length) {
      const duplicateStart = cursor;
      while (cursor < tokens.length && isSpaceToken(tokens[cursor])) {
        cursor += 1;
      }

      const followingTranslation = parseParenthetical(tokens, cursor);
      if (!followingTranslation) {
        break;
      }

      addTranslationContentTokenIndexes(tokens, followingTranslation, translationContentTokenIndexes);

      if (followingTranslation.translationText === inlineTranslation.translationText) {
        for (let duplicateIndex = duplicateStart; duplicateIndex <= followingTranslation.closeIndex; duplicateIndex += 1) {
          duplicatedTranslationTokenIndexes.add(tokens[duplicateIndex].tokenIndex);
        }
      }

      cursor = followingTranslation.closeIndex + 1;
    }
  }

  return {
    translatedWordTokenIndexes,
    translationContentTokenIndexes,
    duplicatedTranslationTokenIndexes,
    translatedWordsByNormalized
  };
}

function dedupeInlineTranslationSuffixes(text) {
  if (typeof text !== 'string' || !text) {
    return text;
  }

  return text.replace(DUPLICATE_INLINE_TRANSLATION_PATTERN, '$1');
}

function resolveOverflowExtraCharBudget(text) {
  const sourceLength = typeof text === 'string' ? text.length : 0;
  const scaledBudget = Math.round(sourceLength * OVERFLOW_EXTRA_CHAR_RATIO);
  const ratioBudget = Math.max(MIN_OVERFLOW_EXTRA_CHARS, Math.min(MAX_OVERFLOW_EXTRA_CHARS, scaledBudget));
  const totalCap = Math.max(0, MAX_TOTAL_RENDERED_LENGTH - sourceLength);
  return Math.min(ratioBudget, totalCap);
}

function normalizePinnedTranslations(pinnedTranslations) {
  if (!pinnedTranslations) {
    return {};
  }

  const normalized = {};
  const addEntry = (key, value) => {
    if (typeof key !== 'string' || typeof value !== 'string') {
      return;
    }

    const normalizedKey = key.toLowerCase().trim();
    const normalizedValue = value.trim();
    if (!normalizedKey || !normalizedValue) {
      return;
    }

    normalized[normalizedKey] = normalizedValue;
  };

  if (pinnedTranslations instanceof Map) {
    for (const [key, value] of pinnedTranslations.entries()) {
      addEntry(key, value);
    }
    return normalized;
  }

  if (typeof pinnedTranslations === 'object') {
    for (const [key, value] of Object.entries(pinnedTranslations)) {
      addEntry(key, value);
    }
  }

  return normalized;
}

async function buildImmersiveSubtitle(
  text,
  translateWords,
  replacementPercentage = 5,
  pinnedTranslations = {},
  options = {}
) {
  const [rendered] = await buildImmersiveSubtitlesBatch(
    [{ text, pinnedTranslations }],
    translateWords,
    replacementPercentage,
    options
  );
  return rendered;
}

function buildSubtitleRenderPlan(text, replacementPercentage, pinnedTranslations = {}) {
  if (typeof text !== 'string' || !text.trim()) {
    void window.log?.('Skipped processing: no subtitles');
    return {
      output: text,
      selectedWords: []
    };
  }

  const normalizedReplacementPercentage = normalizeReplacementPercentage(replacementPercentage);
  if (normalizedReplacementPercentage <= 0) {
    void window.log?.('Skipped processing: empty settings (replacement percentage <= 0)');
    return {
      output: text,
      selectedWords: []
    };
  }

  const tokens = tokenizeSubtitle(text);
  const inlineAnalysis = analyzeInlineTranslations(tokens);
  const excludedTokenIndexes = new Set([
    ...inlineAnalysis.translatedWordTokenIndexes,
    ...inlineAnalysis.translationContentTokenIndexes
  ]);
  const candidateWordInfos = collectCandidateWordInfos(tokens, excludedTokenIndexes);
  const replacementCount = calculateReplacementCount(candidateWordInfos.length, normalizedReplacementPercentage);
  const pinnedByNormalized = normalizePinnedTranslations(pinnedTranslations);

  const pinnedCandidates = candidateWordInfos.filter(({ normalized }) =>
    Object.prototype.hasOwnProperty.call(pinnedByNormalized, normalized)
  );
  // Prioritize pinned words first, then fill remaining slots with randomly picked unpinned words.
  const pinnedSelected = pinnedCandidates.slice(0, replacementCount);
  const selectedPinnedTokenIndexes = new Set(pinnedSelected.map(({ tokenIndex }) => tokenIndex));
  const unpinnedCandidates = candidateWordInfos.filter(({ tokenIndex }) => !selectedPinnedTokenIndexes.has(tokenIndex));
  const remainingCount = Math.max(0, replacementCount - pinnedSelected.length);
  const selected = pickRandomWordInfos(unpinnedCandidates, remainingCount);
  const selectedWordInfos = [...pinnedSelected, ...selected];

  if (selectedWordInfos.length === 0) {
    void window.log?.('Skipped processing: no eligible words selected');
    return {
      output: dedupeInlineTranslationSuffixes(text),
      selectedWords: []
    };
  }

  const selectedWords = selectedWordInfos.map(({ token }) => token);
  const wordsToTranslate = selectedWordInfos
    .filter(({ normalized }) => !Object.prototype.hasOwnProperty.call(pinnedByNormalized, normalized))
    .map(({ token }) => token);
  if (pinnedSelected.length > 0) {
    const pinnedWords = pinnedSelected.map(({ token }) => token);
    void window.log?.(`Pinned words kept: ${JSON.stringify(pinnedWords)}`);
  }
  const randomSelectedWords = selected.map(({ token }) => token);
  if (randomSelectedWords.length > 0) {
    void window.log?.(`Words selected: ${JSON.stringify(randomSelectedWords)}`);
  }

  return {
    text,
    tokens,
    inlineAnalysis,
    pinnedByNormalized,
    selectedWords,
    selectedWordInfos,
    wordsToTranslate
  };
}

function renderSubtitleFromPlan(plan, translatedByNormalized = {}) {
  if (!plan || Object.prototype.hasOwnProperty.call(plan, 'output')) {
    return plan?.output;
  }

  const { tokens, inlineAnalysis, pinnedByNormalized } = plan;
  const selectedTranslationByTokenIndex = new Map();
  const overflowExtraCharBudget = resolveOverflowExtraCharBudget(plan.text);
  let usedExtraChars = 0;
  const sortedSelectedInfos = [...(plan.selectedWordInfos ?? [])]
    .sort((left, right) => left.tokenIndex - right.tokenIndex);

  for (const selectedInfo of sortedSelectedInfos) {
    const translation = pinnedByNormalized[selectedInfo.normalized] ?? translatedByNormalized[selectedInfo.normalized];
    if (!translation) {
      continue;
    }

    const estimatedExtraChars = String(translation).length + 3;
    if (
      usedExtraChars > 0 &&
      usedExtraChars + estimatedExtraChars > overflowExtraCharBudget
    ) {
      continue;
    }

    selectedTranslationByTokenIndex.set(selectedInfo.tokenIndex, translation);
    usedExtraChars += estimatedExtraChars;
  }

  const rendered = tokens
    .map((token) => {
      if (inlineAnalysis.duplicatedTranslationTokenIndexes.has(token.tokenIndex)) {
        return '';
      }

      if (!token.isWord) {
        return token.value;
      }

      if (inlineAnalysis.translationContentTokenIndexes.has(token.tokenIndex)) {
        return token.value;
      }

      const translated = selectedTranslationByTokenIndex.get(token.tokenIndex);
      if (!translated) {
        return token.value;
      }

      if (inlineAnalysis.translatedWordTokenIndexes.has(token.tokenIndex)) {
        return token.value;
      }
      return `${token.value} (${translated})`;
    })
    .join('');

  return dedupeInlineTranslationSuffixes(rendered);
}

async function buildImmersiveSubtitlesBatch(
  subtitleItems,
  translateWords,
  replacementPercentage = 5,
  options = {}
) {
  const { translateWordsCached, onEarlyRender } = options;
  const items = Array.isArray(subtitleItems) ? subtitleItems : [];
  if (items.length === 0) {
    return [];
  }

  const plans = items.map((item) => {
    const text = typeof item === 'string' ? item : item?.text;
    const pinnedTranslations = typeof item === 'string' ? {} : item?.pinnedTranslations;
    return buildSubtitleRenderPlan(text, replacementPercentage, pinnedTranslations);
  });

  const uniqueWords = [];
  const seenWords = new Set();
  for (const plan of plans) {
    if (!plan || !Array.isArray(plan.wordsToTranslate)) {
      continue;
    }

    for (const word of plan.wordsToTranslate) {
      const normalized = typeof word === 'string' ? word.toLowerCase() : '';
      if (!normalized || seenWords.has(normalized)) {
        continue;
      }

      seenWords.add(normalized);
      uniqueWords.push(word);
    }
  }

  // If some words are already cached, trigger an early render before the full async fetch completes.
  if (typeof translateWordsCached === 'function' && typeof onEarlyRender === 'function' && uniqueWords.length > 0) {
    const cachedOnly = translateWordsCached(uniqueWords);
    const cachedCount = Object.keys(cachedOnly).length;
    if (cachedCount > 0 && cachedCount < uniqueWords.length) {
      const earlyRendered = plans.map((plan) => renderSubtitleFromPlan(plan, cachedOnly));
      onEarlyRender(earlyRendered);
    }
  }

  // Fetch translations for all unique words, then render each subtitle plan with the results.
  const translatedByNormalized = uniqueWords.length > 0 ? await translateWords(uniqueWords) : {};
  return plans.map((plan) => renderSubtitleFromPlan(plan, translatedByNormalized));
}

window.calculateReplacementCount = calculateReplacementCount;
window.resetReplacementCarry = resetReplacementCarry;
window.pickUniqueWordInfos = pickUniqueWordInfos;
window.buildImmersiveSubtitle = buildImmersiveSubtitle;
window.buildImmersiveSubtitlesBatch = buildImmersiveSubtitlesBatch;
