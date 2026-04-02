import {
  buildMatchingRound,
  buildQuizCandidateEntries,
  createVocabularyKey,
  extractAiTextFromPayload,
  extractAiTextFromStreamChunk,
  filterRecentEntries,
  normalizeQuizBuckets,
  PAIRS_PER_ROUND,
  RECENT_WINDOW_MS
} from '../extension/quiz.js';
import { describe, expect, it } from 'vitest';

describe('quiz helpers', () => {
  it('filters to entries from the past hour and deduplicates by source and translation', () => {
    const now = Date.UTC(2026, 2, 3, 0, 0, 0);
    const recentTimestamp = now - 10 * 60 * 1000;
    const oldTimestamp = now - RECENT_WINDOW_MS - 1;

    const entries = [
      {
        source: 'hello',
        translation: 'hola',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        firstSeenAt: recentTimestamp,
        lastSeenAt: recentTimestamp
      },
      {
        source: 'HELLO',
        translation: 'hola',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        firstSeenAt: recentTimestamp + 10,
        lastSeenAt: recentTimestamp + 10
      },
      {
        source: 'world',
        translation: 'mundo',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        firstSeenAt: oldTimestamp,
        lastSeenAt: oldTimestamp
      }
    ];

    const filtered = filterRecentEntries(entries, now);
    expect(filtered.length).toBe(1);
    expect(filtered[0]).toEqual(
      expect.objectContaining({
        source: 'HELLO',
        translation: 'hola'
      })
    );
  });

  it('builds a round with exactly five unique pairs by default', () => {
    const entries = [
      { source: 'hello', translation: 'hola', sourceLanguage: 'en', targetLanguage: 'es' },
      { source: 'world', translation: 'mundo', sourceLanguage: 'en', targetLanguage: 'es' },
      { source: 'friend', translation: 'amigo', sourceLanguage: 'en', targetLanguage: 'es' },
      { source: 'light', translation: 'luz', sourceLanguage: 'en', targetLanguage: 'es' },
      { source: 'house', translation: 'casa', sourceLanguage: 'en', targetLanguage: 'es' },
      { source: 'water', translation: 'agua', sourceLanguage: 'en', targetLanguage: 'es' }
    ];

    const round = buildMatchingRound(entries, { random: () => 0.21 });

    expect(round).not.toBeNull();
    expect(round.pairs.length).toBe(PAIRS_PER_ROUND);
    expect(round.sourceOrder.length).toBe(PAIRS_PER_ROUND);
    expect(round.translationOrder.length).toBe(PAIRS_PER_ROUND);
    expect(new Set(round.pairs.map((pair) => pair.source.toLowerCase())).size).toBe(PAIRS_PER_ROUND);
    expect(new Set(round.pairs.map((pair) => pair.translation.toLowerCase())).size).toBe(PAIRS_PER_ROUND);
  });

  it('returns null when there are fewer than five unique matching pairs', () => {
    const entries = [
      { source: 'hello', translation: 'hola', sourceLanguage: 'en', targetLanguage: 'es' },
      { source: 'world', translation: 'mundo', sourceLanguage: 'en', targetLanguage: 'es' },
      { source: 'friend', translation: 'amigo', sourceLanguage: 'en', targetLanguage: 'es' },
      { source: 'light', translation: 'luz', sourceLanguage: 'en', targetLanguage: 'es' }
    ];

    const round = buildMatchingRound(entries, { random: () => 0.2 });
    expect(round).toBeNull();
  });

  it('keeps words in only one quiz bucket and removes notQuizzed entries that are already correct', () => {
    const duplicate = {
      source: 'hello',
      translation: 'hola',
      sourceLanguage: 'en',
      targetLanguage: 'es'
    };
    const buckets = normalizeQuizBuckets(
      {
        notQuizzed: [duplicate],
        correct: [duplicate],
        incorrect: []
      },
      [duplicate]
    );

    expect(buckets.correct.length).toBe(1);
    expect(buckets.notQuizzed.length).toBe(0);
    expect(buckets.incorrect.length).toBe(0);
  });

  it('builds candidate entries only from notQuizzed and incorrect buckets', () => {
    const correctEntry = {
      source: 'water',
      translation: 'agua',
      sourceLanguage: 'en',
      targetLanguage: 'es'
    };
    const buckets = normalizeQuizBuckets({
      notQuizzed: [
        { source: 'hello', translation: 'hola', sourceLanguage: 'en', targetLanguage: 'es' }
      ],
      correct: [correctEntry],
      incorrect: [
        { source: 'friend', translation: 'amigo', sourceLanguage: 'en', targetLanguage: 'es', wrongCount: 2 }
      ]
    });

    const candidates = buildQuizCandidateEntries(buckets);
    const keys = new Set(candidates.map((entry) => createVocabularyKey(entry)));

    expect(candidates.length).toBe(2);
    expect(keys.has(createVocabularyKey(correctEntry))).toBe(false);
  });

  it('extracts assistant text from non-streaming JSON payloads', () => {
    const payload = {
      choices: [
        {
          message: {
            content: 'Memory trick: connect the new word to a vivid image.'
          }
        }
      ]
    };

    expect(extractAiTextFromPayload(payload)).toBe('Memory trick: connect the new word to a vivid image.');
  });

  it('extracts streamed assistant text from SSE chunks', () => {
    const chunk = [
      'data: {"choices":[{"delta":{"content":"Hello"}}]}',
      'data: {"choices":[{"delta":{"content":" there"}}]}',
      'data: [DONE]'
    ].join('\n');

    expect(extractAiTextFromStreamChunk(chunk)).toEqual({
      text: 'Hello there',
      done: true
    });
  });

  it('preserves spaces and newlines in streamed token fragments', () => {
    const chunk = [
      'data: {"choices":[{"delta":{"content":"Tips to boost"}}]}',
      'data: {"choices":[{"delta":{"content":" your vocab retention"}}]}',
      'data: {"choices":[{"delta":{"content":"\n- Use the words in context"}}]}',
      'data: [DONE]'
    ].join('\n');

    expect(extractAiTextFromStreamChunk(chunk)).toEqual({
      text: 'Tips to boost your vocab retention\n- Use the words in context',
      done: true
    });
  });

  it('extracts plain JSON lines from providers that ignore stream mode', () => {
    const chunk = '{"reply":"Vocabulary tip: group words by theme."}';

    expect(extractAiTextFromStreamChunk(chunk)).toEqual({
      text: 'Vocabulary tip: group words by theme.',
      done: false
    });
  });
});
