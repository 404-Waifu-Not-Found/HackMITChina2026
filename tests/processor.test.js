import { beforeEach, describe, expect, it, vi } from 'vitest';

globalThis.window = globalThis;
await import('../extension/stopwords.js');
await import('../extension/processor.js');

describe('percentage replacement logic', () => {
  beforeEach(() => {
    window.resetReplacementCarry();
    vi.restoreAllMocks();
  });

  it('summarizes quiz performance from correct and incorrect buckets', () => {
    expect(window.getQuizPerformanceSnapshot({
      correct: [{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }],
      incorrect: [{ id: 'i1' }]
    })).toEqual({
      correctCount: 3,
      incorrectCount: 1,
      answeredCount: 4,
      accuracy: 75
    });
  });

  it('keeps the base rate until enough quiz history exists', () => {
    expect(window.calculateAdaptiveReplacementPercentage(12, {
      correct: [{ id: 'c1' }, { id: 'c2' }],
      incorrect: [{ id: 'i1' }]
    })).toMatchObject({
      effectiveReplacementPercentage: 12,
      isAdaptiveActive: false,
      reason: 'insufficient_history',
      band: 'baseline'
    });
  });

  it('raises the replacement rate for strong quiz accuracy', () => {
    expect(window.calculateAdaptiveReplacementPercentage(12, {
      correct: new Array(9).fill(null).map((_, index) => ({ id: `c${index}` })),
      incorrect: [{ id: 'i1' }]
    })).toMatchObject({
      effectiveReplacementPercentage: 15,
      isAdaptiveActive: true,
      band: 'expert',
      delta: 3,
      accuracy: 90
    });
  });

  it('lowers the replacement rate for struggling learners', () => {
    expect(window.calculateAdaptiveReplacementPercentage(12, {
      correct: new Array(5).fill(null).map((_, index) => ({ id: `c${index}` })),
      incorrect: new Array(5).fill(null).map((_, index) => ({ id: `i${index}` }))
    })).toMatchObject({
      effectiveReplacementPercentage: 11,
      isAdaptiveActive: true,
      band: 'support',
      delta: -1,
      accuracy: 50
    });
  });

  it('calculates replacement count safely', () => {
    expect(window.calculateReplacementCount(0, 5)).toBe(0);

    // Word count too small for any replacement at 5% rate.
    expect(window.calculateReplacementCount(2, 5)).toBe(0);

    // Boundary check: 2 words rounds down to 0; 16 words at 5% yields 1 replacement.
    expect(window.calculateReplacementCount(2, 5)).toBe(0);
    expect(window.calculateReplacementCount(16, 5)).toBe(1);

    // Higher percentage allows more replacements: 10 words at 20% = 2.
    expect(window.calculateReplacementCount(10, 20)).toBe(2);
  });

  it('picks unique words based on percentage', () => {
    const candidates = [
      { index: 0, token: 'learning' },
      { index: 1, token: 'skills' },
      { index: 2, token: 'daily' }
    ];

    const selected = window.pickUniqueWordInfos(candidates, 66);
    expect(selected.length).toBe(1);
    expect(selected.every((entry) => candidates.includes(entry))).toBe(true);
  });



  it('returns original text when subtitle is empty', async () => {
    const output = await window.buildImmersiveSubtitle('   ', async () => ({}), 50);
    expect(output).toBe('   ');
  });

  it('returns original text when replacement percentage is invalid', async () => {
    const output = await window.buildImmersiveSubtitle('hello world', async () => ({}), 0);
    expect(output).toBe('hello world');
  });

  it('accepts numeric-string replacement percentage values', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const translateWordsMock = vi.fn(async () => ({ enjoy: 'gusto' }));

    const output = await window.buildImmersiveSubtitle(
      'I enjoy coding daily',
      translateWordsMock,
      '50'
    );

    expect(output).toContain('enjoy (gusto)');
    expect(translateWordsMock).toHaveBeenCalledTimes(1);
    vi.restoreAllMocks();
  });

  it('builds subtitle with translated suffix format from batched translations', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const translateWordsMock = vi.fn(async (words) => {
      const output = {};
      for (const word of words) {
        output[word.toLowerCase()] = `${word}-es`;
      }

      return output;
    });

    const output = await window.buildImmersiveSubtitle(
      'I enjoy learning skills daily',
      translateWordsMock,
      50
    );

    expect(translateWordsMock).toHaveBeenCalledTimes(1);
    expect(output).toContain('enjoy (enjoy-es)');
    vi.restoreAllMocks();
  });

  it('does not force pinned translations when replacement count is zero', async () => {
    const translateWordsMock = vi.fn(async () => ({}));

    const output = await window.buildImmersiveSubtitle(
      'I enjoy learning skills',
      translateWordsMock,
      25,
      { enjoy: 'gusto' }
    );

    expect(output).toBe('I enjoy learning skills');
    expect(translateWordsMock).toHaveBeenCalledTimes(0);
  });

  it('does not append duplicate inline translation suffixes', async () => {
    const translateWordsMock = vi.fn(async () => ({}));

    const output = await window.buildImmersiveSubtitle(
      'apple(apple-zh)(apple-zh)',
      translateWordsMock,
      25,
      { apple: 'apple-zh' }
    );

    expect(output).toBe('apple(apple-zh)');
    expect(translateWordsMock).toHaveBeenCalledTimes(0);
  });

  it('translates repeated word occurrences according to selected percentage', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const translateWordsMock = vi.fn(async () => ({ apple: 'apple-zh' }));

    const output = await window.buildImmersiveSubtitle(
      'apple apple apple',
      translateWordsMock,
      100
    );

    expect(output).toBe('apple (apple-zh) apple (apple-zh) apple (apple-zh)');
    expect(translateWordsMock).toHaveBeenCalledTimes(1);
    vi.restoreAllMocks();
  });

  it('keeps inline translation text and removes duplicate inline suffixes', async () => {
    const translateWordsMock = vi.fn(async () => ({ apple: 'otra' }));

    const output = await window.buildImmersiveSubtitle(
      'apple (manzana) (manzana)',
      translateWordsMock,
      100
    );

    expect(output).toBe('apple (manzana)');
    expect(translateWordsMock).toHaveBeenCalledTimes(0);
  });

  it('supports pinned translations provided as a Map', async () => {
    const translateWordsMock = vi.fn(async () => ({}));
    const pinned = new Map([['ENJOY', 'gusto']]);

    const output = await window.buildImmersiveSubtitle(
      'I enjoy coding',
      translateWordsMock,
      50,
      pinned
    );

    expect(output).toContain('enjoy (gusto)');
    expect(translateWordsMock).toHaveBeenCalledTimes(0);
  });

  it('translates multiple subtitle lines in one batched call', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const translateWordsMock = vi.fn(async (words) => {
      const result = {};
      for (const word of words) {
        result[word.toLowerCase()] = `${word}-es`;
      }
      return result;
    });

    const rendered = await window.buildImmersiveSubtitlesBatch(
      [
        { text: 'I enjoy coding', pinnedTranslations: {} },
        { text: 'I enjoy running', pinnedTranslations: {} }
      ],
      translateWordsMock,
      100
    );

    expect(Array.isArray(rendered)).toBe(true);
    expect(rendered.length).toBe(2);
    expect(translateWordsMock).toHaveBeenCalledTimes(1);

    const translatedWords = translateWordsMock.mock.calls[0][0].map((word) => word.toLowerCase()).sort();
    expect(translatedWords).toEqual(['coding', 'enjoy', 'running']);
    expect(rendered[0]).toContain('enjoy (enjoy-es)');
    expect(rendered[1]).toContain('running (running-es)');

    vi.restoreAllMocks();
  });

  it('caps long inline translations to reduce caption overflow risk', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const longTranslation = 'extraordinarilylongtranslationword';
    const translateWordsMock = vi.fn(async (words) => {
      const result = {};
      for (const word of words) {
        result[word.toLowerCase()] = longTranslation;
      }
      return result;
    });

    const output = await window.buildImmersiveSubtitle(
      'alpha beta gamma delta',
      translateWordsMock,
      100
    );

    const insertedCount = (output.match(/\(extraordinarilylongtranslationword\)/g) ?? []).length;
    expect(insertedCount).toBeLessThan(4);
    expect(insertedCount).toBeGreaterThan(0);
    vi.restoreAllMocks();
  });

  it('fires onEarlyRender with cached translations before awaiting API', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    let earlyResult = null;
    const onEarlyRender = (results) => { earlyResult = results; };

    const translateWordsCached = (words) => {
      const cached = {};
      for (const word of words) {
        if (word.toLowerCase() === 'enjoy') {
          cached.enjoy = 'gusto';
        }
      }
      return cached;
    };

    const translateWordsMock = vi.fn(async (words) => {
      const result = { enjoy: 'gusto' };
      for (const word of words) {
        if (word.toLowerCase() !== 'enjoy') {
          result[word.toLowerCase()] = `${word}-es`;
        }
      }
      return result;
    });

    const rendered = await window.buildImmersiveSubtitlesBatch(
      [{ text: 'I enjoy coding daily', pinnedTranslations: {} }],
      translateWordsMock,
      100,
      { translateWordsCached, onEarlyRender }
    );

    expect(earlyResult).not.toBeNull();
    expect(earlyResult[0]).toContain('enjoy (gusto)');
    expect(rendered[0]).toContain('enjoy (gusto)');
    vi.restoreAllMocks();
  });

  it('skips onEarlyRender when all words are cached', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    let earlyRenderCalled = false;
    const onEarlyRender = () => { earlyRenderCalled = true; };

    const translateWordsCached = (words) => {
      const cached = {};
      for (const word of words) {
        cached[word.toLowerCase()] = `${word}-cached`;
      }
      return cached;
    };

    await window.buildImmersiveSubtitlesBatch(
      [{ text: 'I enjoy coding', pinnedTranslations: {} }],
      async (words) => {
        const result = {};
        for (const word of words) {
          result[word.toLowerCase()] = `${word}-cached`;
        }
        return result;
      },
      100,
      { translateWordsCached, onEarlyRender }
    );

    expect(earlyRenderCalled).toBe(false);
    vi.restoreAllMocks();
  });

  it('skips onEarlyRender when no words are cached', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    let earlyRenderCalled = false;
    const onEarlyRender = () => { earlyRenderCalled = true; };

    const translateWordsCached = () => ({});

    await window.buildImmersiveSubtitlesBatch(
      [{ text: 'I enjoy coding', pinnedTranslations: {} }],
      async (words) => {
        const result = {};
        for (const word of words) {
          result[word.toLowerCase()] = `${word}-es`;
        }
        return result;
      },
      100,
      { translateWordsCached, onEarlyRender }
    );

    expect(earlyRenderCalled).toBe(false);
    vi.restoreAllMocks();
  });
});
