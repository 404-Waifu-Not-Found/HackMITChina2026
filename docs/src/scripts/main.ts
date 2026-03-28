// ============================================================
// Lingo Stream – Client Script
// Astro + TypeScript + Motion
// ============================================================

import { animate, inView, scroll } from 'motion'

// ── Types ────────────────────────────────────────────────────

interface RgbColor {
  r: number
  g: number
  b: number
}

interface HslColor {
  h: number
  s: number
  l: number
}

interface WordParts {
  prefix: string
  word: string
  suffix: string
}

interface TranslationResult {
  translated: string
  providerUsed: string
  failedProviders: string[]
}

interface TranslatedLineResult {
  sentence: string
  html: string
  replacedCount: number
  candidateCount: number
  totalWords: number
  providerByWord: Record<string, string>
  failedProvidersByWord: Record<string, string[]>
}

interface WordCandidate {
  index: number
  key: string
  word: string
}

interface FloatingOrnament {
  node: HTMLElement
  driftX: number
  driftY: number
  depth: number
}

interface SectionController {
  sections: HTMLElement[]
  getActiveIndex: () => number
  scrollToIndex: (index: number, behavior?: ScrollBehavior) => void
}

type ProviderName = 'google' | 'libre' | 'apertium' | 'mymemory'

// ── Constants ────────────────────────────────────────────────

const DEFAULT_SENTENCE = 'I really enjoy learning new skills every day.'

const CURRENT_RELEASE = {
  version: '1.0.0',
  channel: 'Full Release',
  packageName: 'Lingo.Stream.1.0.0.Release.zip',
  downloadUrl:
    'https://github.com/UnoxyRich/Lingo-Stream/releases/download/Full-Release/Lingo.Stream.1.0.0.Release.zip',
}

const WORD_PRIORITY: string[] = [
  'vocabulary', 'language', 'learning', 'skills', 'speaking',
  'watching', 'videos', 'confidence', 'practice', 'friends',
  'review', 'build', 'helps', 'daily', 'new',
  'enjoy', 'every', 'day', 'night', 'quickly',
]

const STOPWORDS = new Set<string>([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'but', 'by',
  'for', 'from', 'has', 'have', 'he', 'her', 'his', 'i', 'in', 'is',
  'it', 'its', 'me', 'my', 'of', 'on', 'or', 'our', 'she', 'that',
  'the', 'their', 'them', 'they', 'this', 'to', 'us', 'we', 'with',
  'you', 'your',
])

const TRANSLATION_TIMEOUT_MS = 2400
const TRANSLATION_MISS_TTL_MS = 30 * 1000
const SOURCE_LANGUAGE = 'en'
const AUTO_PROVIDER_ORDER: ProviderName[] = ['google', 'libre', 'apertium', 'mymemory']
const LIBRE_ENDPOINTS = [
  'https://translate.argosopentech.com/translate',
  'https://libretranslate.com/translate',
]
const translationCache = new Map<string, string>()
const translationMissCache = new Map<string, number>()

// ── Utility Functions ────────────────────────────────────────

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value))
}

function parseRgbColorChannels(value: string | null | undefined): RgbColor | null {
  const match = String(value ?? '').match(/rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})/i)
  if (!match) return null
  return {
    r: clamp(Number.parseInt(match[1], 10), 0, 255),
    g: clamp(Number.parseInt(match[2], 10), 0, 255),
    b: clamp(Number.parseInt(match[3], 10), 0, 255),
  }
}

function rgbToHslChannels({ r, g, b }: RgbColor): HslColor {
  const nR = r / 255, nG = g / 255, nB = b / 255
  const max = Math.max(nR, nG, nB), min = Math.min(nR, nG, nB)
  const delta = max - min
  let hue = 0
  if (delta !== 0) {
    if (max === nR) hue = ((nG - nB) / delta) % 6
    else if (max === nG) hue = (nB - nR) / delta + 2
    else hue = (nR - nG) / delta + 4
  }
  hue = Math.round((hue * 60 + 360) % 360)
  const lightness = (max + min) / 2
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1))
  return { h: hue, s: Math.round(saturation * 100), l: Math.round(lightness * 100) }
}

function hslToRgbChannels(hue: number, saturation: number, lightness: number): RgbColor {
  const nS = clamp(saturation, 0, 100) / 100
  const nL = clamp(lightness, 0, 100) / 100
  const c = (1 - Math.abs(2 * nL - 1)) * nS
  const hp = (((hue % 360) + 360) % 360) / 60
  const x = c * (1 - Math.abs((hp % 2) - 1))
  let rp = 0, gp = 0, bp = 0
  if (hp >= 0 && hp < 1) { rp = c; gp = x }
  else if (hp < 2) { rp = x; gp = c }
  else if (hp < 3) { gp = c; bp = x }
  else if (hp < 4) { gp = x; bp = c }
  else if (hp < 5) { rp = x; bp = c }
  else { rp = c; bp = x }
  const m = nL - c / 2
  return {
    r: Math.round((rp + m) * 255),
    g: Math.round((gp + m) * 255),
    b: Math.round((bp + m) * 255),
  }
}

// ── Browser Accent Color ─────────────────────────────────────

function readBrowserAccentColor(): RgbColor | null {
  if (typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && !CSS.supports('color', 'AccentColor')) {
    return null
  }
  const probe = document.createElement('span')
  probe.style.position = 'fixed'
  probe.style.opacity = '0'
  probe.style.pointerEvents = 'none'
  probe.style.color = 'AccentColor'
  probe.style.left = '-9999px'
  document.body.append(probe)
  const computed = window.getComputedStyle(probe).color
  probe.remove()
  return parseRgbColorChannels(computed)
}

function applyChromeAppearanceHue(): void {
  const root = document.documentElement
  if (!root) return
  const accent = readBrowserAccentColor()
  if (!accent) return
  const dark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const hsl = rgbToHslChannels(accent)
  const sat = clamp(Math.max(hsl.s, 42), 42, 92)
  const aL = dark ? 58 : 42
  const sL = dark ? 48 : 34
  const shL = dark ? 72 : 60
  const aRgb = hslToRgbChannels(hsl.h, sat, aL)
  const asRgb = hslToRgbChannels((hsl.h + 8) % 360, clamp(sat + 6, 45, 96), sL)
  const shRgb = hslToRgbChannels((hsl.h + 12) % 360, clamp(sat + 14, 48, 100), shL)
  const ar = `${aRgb.r}, ${aRgb.g}, ${aRgb.b}`
  const asr = `${asRgb.r}, ${asRgb.g}, ${asRgb.b}`
  const shr = `${shRgb.r}, ${shRgb.g}, ${shRgb.b}`
  root.style.setProperty('--accent-rgb', ar)
  root.style.setProperty('--accent-strong-rgb', asr)
  root.style.setProperty('--shine-rgb', shr)
  root.style.setProperty('--accent', `rgb(${ar})`)
  root.style.setProperty('--accent-strong', `rgb(${asr})`)
  root.style.setProperty('--shine', `rgb(${shr})`)
  root.style.setProperty('--bg-radial-a', `rgba(${ar}, ${dark ? 0.18 : 0.22})`)
  root.style.setProperty('--bg-radial-b', `rgba(${asr}, ${dark ? 0.16 : 0.17})`)
  root.style.setProperty('--plus-color', `rgba(${asr}, ${dark ? 0.2 : 0.22})`)
}

function attachChromeAppearanceHueSync(): void {
  const apply = () => applyChromeAppearanceHue()
  apply()
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  if (typeof mq.addEventListener === 'function') mq.addEventListener('change', apply)
  window.addEventListener('focus', apply)
  document.addEventListener('visibilitychange', () => { if (!document.hidden) apply() })
}

// ── HTML Utilities ───────────────────────────────────────────

function escapeHtml(value: string): string {
  return String(value)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function decodeHtmlEntities(value: string): string {
  const d = document.createElement('textarea')
  d.innerHTML = String(value ?? '')
  return d.value
}

function sanitizeSentence(input: string): string {
  return String(input || '').replace(/\s+/g, ' ').trim() || DEFAULT_SENTENCE
}

function normalizeWord(value: string): string {
  return String(value || '').toLowerCase().replace(/[^a-z']/g, '')
}

// ── Translation Cache ────────────────────────────────────────

function getTranslationCacheKey(provider: string, sl: string, tl: string, word: string): string {
  return `${provider}|${sl}|${tl}|${word}`
}

function isMissCached(key: string, now = Date.now()): boolean {
  const expiry = translationMissCache.get(key)
  if (!expiry) return false
  if (expiry > now) return true
  translationMissCache.delete(key)
  return false
}

function markMissCached(key: string, now = Date.now()): void {
  translationMissCache.set(key, now + TRANSLATION_MISS_TTL_MS)
}

function extractTranslatedText(payload: unknown): string {
  if (typeof payload === 'string') return payload
  if (!payload || typeof payload !== 'object') return ''
  const p = payload as Record<string, unknown>
  if (typeof p.translatedText === 'string') return p.translatedText
  if (typeof p.translation === 'string') return p.translation
  const rd = p.responseData as Record<string, unknown> | undefined
  if (rd && typeof rd.translatedText === 'string') return rd.translatedText
  if (Array.isArray(p.matches)) {
    for (const m of p.matches) {
      if (m && typeof m === 'object' && typeof (m as Record<string, unknown>).translation === 'string') {
        const t = (m as Record<string, string>).translation.trim()
        if (t) return t
      }
    }
  }
  return ''
}

async function fetchJsonWithTimeout(url: string, init: RequestInit = {}, timeout = TRANSLATION_TIMEOUT_MS): Promise<unknown> {
  const ctrl = new AbortController()
  const tid = window.setTimeout(() => ctrl.abort(), timeout)
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } finally {
    window.clearTimeout(tid)
  }
}

function cleanTranslatedResult(original: string, value: string): string {
  const decoded = decodeHtmlEntities(value).replace(/\s+/g, ' ').trim()
  if (!decoded) return ''
  if (normalizeWord(decoded) === normalizeWord(original)) return ''
  return decoded
}

// ── Translation Providers ────────────────────────────────────

async function requestGoogleTranslation(word: string, tl: string, sl: string): Promise<string> {
  const url = new URL('https://translate.googleapis.com/translate_a/single')
  url.searchParams.set('client', 'gtx')
  url.searchParams.set('sl', sl)
  url.searchParams.set('tl', tl)
  url.searchParams.set('dt', 't')
  url.searchParams.set('q', word)
  const data = await fetchJsonWithTimeout(url.toString()) as unknown[][]
  if (!Array.isArray(data) || !Array.isArray(data[0])) return ''
  return (data[0] as unknown[][])
    .map((p) => (Array.isArray(p) && typeof p[0] === 'string' ? p[0] : ''))
    .filter(Boolean).join('').trim()
}

async function requestLibreTranslation(word: string, tl: string, sl: string): Promise<string> {
  const body = JSON.stringify({ q: word, source: sl, target: tl, format: 'text' })
  for (const ep of LIBRE_ENDPOINTS) {
    try {
      const data = await fetchJsonWithTimeout(ep, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body,
      })
      const t = extractTranslatedText(data)
      if (t) return t
    } catch { /* next mirror */ }
  }
  return ''
}

async function requestApertiumTranslation(word: string, tl: string, sl: string): Promise<string> {
  const url = new URL('https://beta.apertium.org/apy/translate')
  url.searchParams.set('q', word)
  url.searchParams.set('langpair', `${sl}|${tl}`)
  return extractTranslatedText(await fetchJsonWithTimeout(url.toString()))
}

async function requestMyMemoryTranslation(word: string, tl: string, sl: string): Promise<string> {
  const url = new URL('https://api.mymemory.translated.net/get')
  url.searchParams.set('q', word)
  url.searchParams.set('langpair', `${sl}|${tl}`)
  return extractTranslatedText(await fetchJsonWithTimeout(url.toString()))
}

const providerHandlers: Record<ProviderName, (word: string, tl: string, sl: string) => Promise<string>> = {
  google: requestGoogleTranslation,
  libre: requestLibreTranslation,
  apertium: requestApertiumTranslation,
  mymemory: requestMyMemoryTranslation,
}

// ── Translation Engine ───────────────────────────────────────

function extractWordParts(token: string): WordParts | null {
  const m = String(token).match(/^([^A-Za-z']*)([A-Za-z']+)([^A-Za-z']*)$/)
  if (!m) return null
  return { prefix: m[1], word: m[2], suffix: m[3] }
}

function calculateReplacementCount(pct: string | number, enabled: boolean, count: number): number {
  if (!enabled || count <= 0) return 0
  const n = Number.parseInt(String(pct), 10)
  const clamped = Number.isFinite(n) ? clamp(n, 1, 100) : 35
  return clamp(Math.max(1, Math.floor((count * clamped) / 100)), 1, count)
}

function pickReplacementIndices(candidates: WordCandidate[], count: number): Set<number> {
  if (count <= 0 || candidates.length === 0) return new Set()
  const pMap = new Map(WORD_PRIORITY.map((w, i) => [w, i]))
  const sorted = [...candidates].sort((a, b) => {
    const ar = pMap.get(a.key) ?? Number.MAX_SAFE_INTEGER
    const br = pMap.get(b.key) ?? Number.MAX_SAFE_INTEGER
    if (ar !== br) return ar - br
    if (a.word.length !== b.word.length) return b.word.length - a.word.length
    return a.index - b.index
  })
  return new Set(sorted.slice(0, count).map((e) => e.index))
}

async function translateWordByProvider(
  word: string, provider: string, sl: string, tl: string
): Promise<TranslationResult> {
  const nw = normalizeWord(word)
  if (!nw) return { translated: '', providerUsed: '', failedProviders: [] }
  const now = Date.now()
  const providers: ProviderName[] = provider === 'auto'
    ? AUTO_PROVIDER_ORDER
    : AUTO_PROVIDER_ORDER.includes(provider as ProviderName)
      ? [provider as ProviderName]
      : AUTO_PROVIDER_ORDER
  const failed: string[] = []
  for (const pn of providers) {
    const ck = getTranslationCacheKey(pn, sl, tl, nw)
    if (translationCache.has(ck)) return { translated: translationCache.get(ck)!, providerUsed: pn, failedProviders: failed }
    if (isMissCached(ck, now)) { failed.push(pn); continue }
    const handler = providerHandlers[pn]
    if (!handler) { failed.push(pn); continue }
    try {
      const raw = await handler(word, tl, sl)
      const cleaned = cleanTranslatedResult(word, raw)
      if (cleaned) {
        translationCache.set(ck, cleaned)
        if (provider === 'auto') translationCache.set(getTranslationCacheKey('auto', sl, tl, nw), cleaned)
        return { translated: cleaned, providerUsed: pn, failedProviders: failed }
      }
    } catch { /* fallback */ }
    markMissCached(ck, now)
    failed.push(pn)
  }
  return { translated: '', providerUsed: '', failedProviders: failed }
}

async function translateWordsViaApi(
  words: string[], provider: string, sl: string, tl: string
): Promise<{ translations: Record<string, string>; providerByWord: Record<string, string>; failedProvidersByWord: Record<string, string[]> }> {
  const unique: string[] = []
  const seen = new Set<string>()
  for (const w of words) {
    const nw = normalizeWord(w)
    if (!nw || seen.has(nw)) continue
    seen.add(nw)
    unique.push(nw)
  }
  const translations: Record<string, string> = {}
  const providerByWord: Record<string, string> = {}
  const failedProvidersByWord: Record<string, string[]> = {}
  await Promise.all(unique.map(async (nw) => {
    const r = await translateWordByProvider(nw, provider, sl, tl)
    if (r.translated) translations[nw] = r.translated
    if (r.providerUsed) providerByWord[nw] = r.providerUsed
    if (r.failedProviders.length > 0) failedProvidersByWord[nw] = r.failedProviders
  }))
  return { translations, providerByWord, failedProvidersByWord }
}

async function buildTranslatedLine(
  sentence: string, language: string, pct: number, enabled: boolean, provider: string
): Promise<TranslatedLineResult> {
  const normalized = sanitizeSentence(sentence)
  const tokens = normalized.split(' ')
  const candidates: WordCandidate[] = []
  let totalWords = 0
  for (let i = 0; i < tokens.length; i++) {
    const parts = extractWordParts(tokens[i])
    if (!parts) continue
    totalWords++
    const key = normalizeWord(parts.word)
    if (key.length >= 2 && !STOPWORDS.has(key)) candidates.push({ index: i, key, word: parts.word })
  }
  const replCount = calculateReplacementCount(pct, enabled, candidates.length)
  const selected = enabled ? pickReplacementIndices(candidates, replCount) : new Set<number>()
  const toTranslate = candidates.filter((c) => selected.has(c.index)).map((c) => c.key)
  const resp = enabled && toTranslate.length > 0
    ? await translateWordsViaApi(toTranslate, provider, SOURCE_LANGUAGE, language)
    : { translations: {}, providerByWord: {}, failedProvidersByWord: {} }
  let replacedCount = 0
  const fragments = tokens.map((tok, i) => {
    const parts = extractWordParts(tok)
    if (!parts) return escapeHtml(tok)
    const key = normalizeWord(parts.word)
    if (!enabled || !selected.has(i)) return escapeHtml(tok)
    const translated = resp.translations[key]
    if (!translated) return escapeHtml(tok)
    replacedCount++
    return `${escapeHtml(parts.prefix)}<span class="word-pair">${escapeHtml(parts.word)} <span class="translation">(${escapeHtml(translated)})</span></span>${escapeHtml(parts.suffix)}`
  })
  return {
    sentence: normalized,
    html: fragments.join(' '),
    replacedCount,
    candidateCount: candidates.length,
    totalWords,
    providerByWord: resp.providerByWord,
    failedProvidersByWord: resp.failedProvidersByWord,
  }
}

// ── DOM Helpers ──────────────────────────────────────────────

function animateLine(node: HTMLElement | null, content: string): void {
  if (!node) return
  node.classList.remove('line-change')
  node.innerHTML = content
  void node.offsetWidth
  node.classList.add('line-change')
}

function inferRepositoryUrl(): string {
  const host = window.location.hostname
  const segs = window.location.pathname.split('/').filter(Boolean)
  if (!host.endsWith('.github.io') || segs.length === 0) return 'https://github.com/UnoxyRich/Lingo-Stream'
  return `https://github.com/${host.split('.')[0]}/${segs[0]}`
}

function attachRepositoryLinks(url: string): void {
  document.querySelectorAll<HTMLAnchorElement>('[data-repo-link]').forEach((a) => { a.href = url })
}

function attachReleaseLinks(url: string): void {
  const rel = `${url}/releases`
  document.querySelectorAll<HTMLAnchorElement>('[data-releases-link]').forEach((a) => { a.href = rel })
}

function attachCurrentReleaseInfo(): void {
  document.querySelectorAll('[data-release-version]').forEach((n) => { n.textContent = CURRENT_RELEASE.version })
  document.querySelectorAll('[data-release-channel]').forEach((n) => { n.textContent = CURRENT_RELEASE.channel })
  document.querySelectorAll('[data-release-package]').forEach((n) => { n.textContent = CURRENT_RELEASE.packageName })
  document.querySelectorAll<HTMLAnchorElement>('[data-release-download-link]').forEach((a) => { a.href = CURRENT_RELEASE.downloadUrl })
}

// ── Motion Effects ───────────────────────────────────────────

function initMotionReveals(): void {
  const revealed = new WeakSet<Element>()
  inView('[data-reveal]', ({ target }) => {
    if (revealed.has(target)) return
    revealed.add(target)
    const el = target as HTMLElement
    const d = parseInt(el.dataset.delay || '0', 10) / 1000
    animate(el, { opacity: 1, y: 0, scale: 1 }, {
      duration: 0.6,
      delay: d,
      easing: [0.16, 1, 0.3, 1],
    })
  }, { amount: 0.15 })
}

function initScrollProgress(): void {
  const bar = document.getElementById('scrollProgressBar')
  if (!bar) return
  scroll(animate(bar, { width: ['0%', '100%'] }))
}

// ── 3D Logo Morph ────────────────────────────────────────────

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
}

function initLogoMorph(): void {
  const wrap   = document.getElementById('logo3d-wrap')
  const inner  = document.getElementById('logo3d-inner')
  const img    = document.getElementById('logo3d-img')    as HTMLImageElement | null
  const nameEl = document.getElementById('logo3d-name')  as HTMLElement | null
  const shadow = document.getElementById('logo3d-shadow')
  const anchor = document.getElementById('logo3d-anchor')
  const topbarLogo = document.querySelector<HTMLImageElement>('#topbar a > img')
  const topbarName = document.querySelector<HTMLElement>('#topbar a > span')
  const splash = document.getElementById('splash')
  if (!wrap || !inner || !img || !nameEl || !topbarLogo) return

  const w  = wrap
  const iw = inner
  const i  = img
  const nm = nameEl
  const tl = topbarLogo
  const tn = topbarName

  const TOPBAR_IMG_SIZE  = 32
  const TOPBAR_FONT_SIZE = 15

  // Morph completes over the splash section height
  function getScrollEnd(): number {
    return (splash?.offsetHeight ?? window.innerHeight) * 0.85
  }

  tl.style.visibility = 'hidden'
  if (tn) tn.style.visibility = 'hidden'

  function getSourceRect(): { lx: number; ly: number; imgSize: number; fontSize: number } {
    const anchorImgEl = document.getElementById('logo3d-anchor-img')
    const imgSize = anchorImgEl ? anchorImgEl.offsetWidth : 240
    if (anchor) {
      const r = anchor.getBoundingClientRect()
      return { lx: r.left + imgSize / 2, ly: r.top + r.height / 2, imgSize, fontSize: 90 }
    }
    return { lx: window.innerWidth / 2, ly: window.innerHeight / 2, imgSize, fontSize: 90 }
  }

  let raf = 0
  function update(): void {
    const scrollEnd = getScrollEnd()
    const raw = Math.min(1, Math.max(0, window.scrollY / scrollEnd))
    const t   = easeInOutCubic(raw)

    const src  = getSourceRect()
    const tlr  = tl.getBoundingClientRect()
    const tlxc = tlr.left + tlr.width  / 2
    const tlyc = tlr.top  + tlr.height / 2

    const imgSize = src.imgSize + (TOPBAR_IMG_SIZE - src.imgSize) * t
    i.style.width  = `${imgSize}px`
    i.style.height = `${imgSize}px`

    nm.style.fontSize = `${src.fontSize + (TOPBAR_FONT_SIZE - src.fontSize) * t}px`

    const dstLy = tlyc - TOPBAR_IMG_SIZE / 2
    const srcLx = src.lx - src.imgSize / 2
    const srcLy = src.ly - src.imgSize / 2
    // X stays centred on the splash anchor — only fly vertically
    w.style.left = `${srcLx}px`
    w.style.top  = `${srcLy + (dstLy - srcLy) * t}px`

    iw.style.gap = `${14 + (10 - 14) * t}px`

    if (raw >= 0.98) {
      w.style.opacity = '0'
      tl.style.visibility = ''
      if (tn) tn.style.visibility = ''
      w.classList.remove('logo3d-floating')
      iw.style.transform = ''
      i.style.transform  = ''
      i.style.filter     = ''
    } else if (raw <= 0.02) {
      w.style.opacity = '1'
      tl.style.visibility = 'hidden'
      if (tn) tn.style.visibility = 'hidden'
      w.classList.add('logo3d-floating')
      iw.style.transform = ''
      i.style.filter    = ''
      nm.style.opacity  = '1'
      if (shadow) { shadow.style.opacity = '1'; shadow.style.transform = '' }
    } else {
      w.style.opacity = '1'
      tl.style.visibility = 'hidden'
      if (tn) tn.style.visibility = 'hidden'
      w.classList.remove('logo3d-floating')

      // Scale the whole inner group (logo + name) together
      const sc = 1 - t * 0.12
      iw.style.transform = `scale(${sc.toFixed(3)})`
      i.style.transform  = ''
      // Extrusion + ambient glow fades out as it shrinks into the topbar
      const glow = (1 - t) * 0.45
      const extrudeAlpha = (1 - t)
      i.style.filter = [
        `drop-shadow(0px 1px 0px rgba(15,100,50,${(0.90 * extrudeAlpha).toFixed(2)}))`,
        `drop-shadow(0px 3px 0px rgba(11,76,38,${(0.78 * extrudeAlpha).toFixed(2)}))`,
        `drop-shadow(0px 6px 0px rgba(5,40,20,${(0.48 * extrudeAlpha).toFixed(2)}))`,
        `drop-shadow(0 ${(14 * (1 - t)).toFixed(1)}px ${(32 * (1 - t)).toFixed(1)}px rgba(22,163,74,${glow.toFixed(2)}))`,
      ].join(' ')
      if (shadow) {
        shadow.style.opacity   = (1 - t).toFixed(3)
        shadow.style.transform = `scaleX(${(1 - t * 0.85).toFixed(3)})`
      }
    }
  }

  window.addEventListener('scroll', () => {
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(update)
  }, { passive: true })

  window.addEventListener('resize', () => {
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(update)
  }, { passive: true })

  update()
}

// ── Topbar visibility (hidden on splash, visible on hero+) ────

function attachTopbarSplashHide(): void {
  const topbar = document.getElementById('topbar')
  const splash = document.getElementById('splash')
  if (!topbar || !splash) return

  topbar.classList.add('topbar-hidden')

  let ticking = false
  const update = () => {
    const splashH = splash.getBoundingClientRect().height || window.innerHeight
    const past = window.scrollY > splashH * 0.8
    topbar.classList.toggle('topbar-hidden', !past)
    ticking = false
  }
  window.addEventListener('scroll', () => {
    if (ticking) return
    ticking = true
    requestAnimationFrame(update)
  }, { passive: true })
  update()
}

// ── Topbar ───────────────────────────────────────────────────

function attachTopbarContraction(): void {
  const topbar = document.getElementById('topbar')
  if (!topbar) return
  let ticking = false
  const splash = document.getElementById('splash')
  const update = () => {
    const splashH = (splash?.getBoundingClientRect().height) || window.innerHeight
    const threshold = Math.max(splashH + 44, splashH + window.innerHeight * 0.1)
    topbar.classList.toggle('compact', window.scrollY > threshold)
    ticking = false
  }
  window.addEventListener('scroll', () => {
    if (ticking) return
    ticking = true
    requestAnimationFrame(update)
  }, { passive: true })
  update()
}

// ── Floating Plus Field ──────────────────────────────────────

function attachFloatingPlusField(): void {
  const field = document.getElementById('floatingPlusField')
  if (!field) return
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
  const ornaments: FloatingOrnament[] = []

  const build = () => {
    field.replaceChildren()
    ornaments.length = 0
    const count = clamp(Math.round(window.innerWidth / 58), 14, 36)
    for (let i = 0; i < count; i++) {
      const node = document.createElement('span')
      node.className = 'floating-plus'
      node.style.left = `${Math.random() * 100}%`
      node.style.top = `${Math.random() * 100}%`
      node.style.setProperty('--size', `${12 + Math.random() * 22}px`)
      node.style.setProperty('--alpha', (0.06 + Math.random() * 0.16).toFixed(3))
      node.style.setProperty('--spin-duration', `${12 + Math.random() * 30}s`)
      const glyph = document.createElement('span')
      glyph.className = 'floating-plus-glyph'
      node.append(glyph)
      field.append(node)
      ornaments.push({
        node,
        driftX: (Math.random() * 90 - 45) * (Math.random() > 0.5 ? 1 : -1),
        driftY: (Math.random() * 120 - 60) * (Math.random() > 0.5 ? 1 : -1),
        depth: 0.25 + Math.random() * 1.05,
      })
    }
  }

  const update = () => {
    const y = window.scrollY || 0
    const maxS = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
    const progress = clamp(y / maxS, 0, 1)
    document.documentElement.style.setProperty('--scroll-progress', progress.toFixed(4))
    for (const o of ornaments) {
      const x = o.driftX * progress * o.depth
      const v = o.driftY * progress * o.depth
      const flow = y * (0.015 * o.depth)
      o.node.style.transform = `translate3d(${x.toFixed(2)}px, ${(v + flow).toFixed(2)}px, 0)`
    }
  }

  let ticking = false
  const onScroll = () => {
    if (ticking || reduced.matches) return
    ticking = true
    requestAnimationFrame(() => { update(); ticking = false })
  }

  build()
  update()
  if (!reduced.matches) window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', () => { build(); update() })
}

// ── Background Parallax ──────────────────────────────────────

function attachBackgroundParallax(): void {
  const glowA = document.querySelector<HTMLElement>('.glow-a')
  const glowB = document.querySelector<HTMLElement>('.glow-b')
  if (!glowA || !glowB) return
  let ticking = false
  const update = () => {
    const y = window.scrollY || 0
    glowA.style.transform = `translate3d(${-y * 0.02}px, ${y * 0.04}px, 0)`
    glowB.style.transform = `translate3d(${y * 0.018}px, ${-y * 0.03}px, 0)`
    ticking = false
  }
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update) } }
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll)
  update()
}

// ── Section Navigation ───────────────────────────────────────

function getSlideSections(): HTMLElement[] {
  return Array.from(document.querySelectorAll('main .screen[id]'))
}

function isCompactViewport(): boolean {
  return window.matchMedia('(max-width: 1040px)').matches
}

function getSectionCenterOffset(section: HTMLElement): number {
  return section.offsetTop + section.offsetHeight / 2
}

function getCenteredScrollTop(section: HTMLElement): number {
  const topbar = document.getElementById('topbar')
  const offset = (topbar?.offsetHeight || 64) + 10
  const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
  return clamp(section.offsetTop - offset, 0, max)
}

function scrollSectionToCenter(section: HTMLElement, behavior: ScrollBehavior = 'smooth'): void {
  if (!section) return
  window.scrollTo({ top: getCenteredScrollTop(section), behavior })
}

let _lastActiveIdx = 0

function findNearestSectionIndex(sections: HTMLElement[]): number {
  if (sections.length === 0) return 0
  const marker = window.scrollY + window.innerHeight / 2
  let nearest = 0, smallest = Infinity
  for (let i = 0; i < sections.length; i++) {
    const d = Math.abs(getSectionCenterOffset(sections[i]) - marker)
    if (d < smallest) { smallest = d; nearest = i }
  }
  // Hysteresis: stay on current index unless the new one is clearly closer
  if (nearest !== _lastActiveIdx) {
    const currentDist = Math.abs(getSectionCenterOffset(sections[_lastActiveIdx]) - marker)
    const newDist = Math.abs(getSectionCenterOffset(sections[nearest]) - marker)
    if (currentDist - newDist < window.innerHeight * 0.08) return _lastActiveIdx
  }
  _lastActiveIdx = nearest
  return nearest
}

function attachSectionNavigation(): SectionController {
  const sections = getSlideSections()
  const dots = Array.from(document.querySelectorAll<HTMLButtonElement>('.section-dot[data-target]'))
  const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]'))
  const bar = document.getElementById('scrollProgressBar')

  if (sections.length === 0) return { sections, getActiveIndex: () => 0, scrollToIndex: () => {} }

  let activeIndex = 0
  const idxMap = new Map(sections.map((s, i) => [s.id, i]))

  const setActive = (idx: number) => {
    activeIndex = clamp(idx, 0, sections.length - 1)
    const id = sections[activeIndex].id
    sections.forEach((s, i) => s.classList.toggle('is-current', i === activeIndex))
    dots.forEach((d) => {
      const active = d.dataset.target === id
      d.classList.toggle('is-active', active)
      d.setAttribute('aria-current', active ? 'true' : 'false')
    })
    if (bar) bar.style.width = `${Math.round((activeIndex / Math.max(1, sections.length - 1)) * 100)}%`
  }

  const scrollToIndex = (idx: number, behavior: ScrollBehavior = 'smooth') => {
    const i = clamp(idx, 0, sections.length - 1)
    setActive(i)
    scrollSectionToCenter(sections[i], behavior)
  }

  dots.forEach((d) => {
    const ti = idxMap.get(d.dataset.target!)
    if (typeof ti === 'number') d.addEventListener('click', () => scrollToIndex(ti))
  })

  anchors.forEach((a) => {
    const hash = (a.getAttribute('href') || '').trim()
    const tid = hash.startsWith('#') ? hash.slice(1) : ''
    if (!tid) return
    if (tid === 'top') {
      a.addEventListener('click', (e) => { e.preventDefault(); scrollToIndex(0) })
      return
    }
    const ti = idxMap.get(tid)
    if (typeof ti === 'number') a.addEventListener('click', (e) => { e.preventDefault(); scrollToIndex(ti) })
  })

  // IntersectionObserver is intentionally omitted here to prevent multiple competing
  // active-state updates while the user scrolls. This can cause the sidebar dots to flicker.
  
  let ticking = false
  window.addEventListener('scroll', () => {
    if (ticking) return
    ticking = true
    requestAnimationFrame(() => {
      setActive(findNearestSectionIndex(sections))
      ticking = false
    })
  }, { passive: true })
  window.addEventListener('resize', () => setActive(findNearestSectionIndex(sections)))
  setActive(findNearestSectionIndex(sections))

  return { sections, getActiveIndex: () => activeIndex, scrollToIndex }
}

// ── Section Depth Effect ─────────────────────────────────────

function attachSectionDepthEffect(sections: HTMLElement[]): void {
  if (!sections.length) return
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
  if (reduced.matches || isCompactViewport()) {
    sections.forEach((s) => s.style.setProperty('--section-shift', '0'))
    return
  }
  let ticking = false
  const update = () => {
    if (isCompactViewport()) {
      sections.forEach((s) => s.style.setProperty('--section-shift', '0'))
      ticking = false
      return
    }
    const vc = window.innerHeight / 2
    const norm = Math.max(window.innerHeight * 0.7, 1)
    sections.forEach((s) => {
      const r = s.getBoundingClientRect()
      s.style.setProperty('--section-shift', clamp((r.top + r.height / 2 - vc) / norm, -1, 1).toFixed(4))
    })
    ticking = false
  }
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update) } }
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll)
  update()
}

// ── Segment Scroll (desktop section-by-section keyboard nav) ─

function attachSegmentScroll(ctrl: SectionController): void {
  const sections = ctrl.sections
  if (sections.length < 2) return
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
  const coarse = window.matchMedia('(pointer: coarse)')
  if (reduced.matches || coarse.matches || isCompactViewport()) return

  const threshold = 44
  const lockMs = 760
  let delta = 0
  let locked = false
  let lockTimer = 0
  let resetTimer = 0

  const step = (dir: number) => {
    const cur = findNearestSectionIndex(sections)
    const next = clamp(cur + dir, 0, sections.length - 1)
    if (next === cur) return
    locked = true
    ctrl.scrollToIndex(next, 'smooth')
    clearTimeout(lockTimer)
    lockTimer = window.setTimeout(() => { locked = false }, lockMs)
  }

  const isEditable = (t: EventTarget | null): boolean =>
    t instanceof Element && Boolean(t.closest('input, textarea, select, [contenteditable]'))

  const hasScrollable = (t: EventTarget | null, dy: number): boolean => {
    if (!(t instanceof Element)) return false
    let n: Element | null = t
    while (n && n !== document.body) {
      const s = getComputedStyle(n)
      if ((s.overflowY === 'auto' || s.overflowY === 'scroll') && n.scrollHeight > n.clientHeight + 1) {
        const max = n.scrollHeight - n.clientHeight
        if (dy > 0 && n.scrollTop < max - 1) return true
        if (dy < 0 && n.scrollTop > 1) return true
      }
      n = n.parentElement
    }
    return false
  }

  window.addEventListener('wheel', (e) => {
    if (isCompactViewport() || e.ctrlKey) return
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return
    if (isEditable(e.target) || hasScrollable(e.target, e.deltaY)) return
    if (locked) { e.preventDefault(); return }
    delta += e.deltaY
    clearTimeout(resetTimer)
    resetTimer = window.setTimeout(() => { delta = 0 }, 140)
    if (Math.abs(delta) < threshold) return
    e.preventDefault()
    const dir = delta > 0 ? 1 : -1
    delta = 0
    step(dir)
  }, { passive: false })

  window.addEventListener('keydown', (e) => {
    if (isCompactViewport() || isEditable(e.target)) return
    let dir = 0
    if (e.key === 'PageDown' || e.key === 'ArrowDown') dir = 1
    else if (e.key === 'PageUp' || e.key === 'ArrowUp') dir = -1
    if (dir === 0) return
    e.preventDefault()
    if (!locked) step(dir)
  })

  window.addEventListener('blur', () => {
    delta = 0; locked = false
    clearTimeout(lockTimer); clearTimeout(resetTimer)
  })
}

// ── Interactive Preview ──────────────────────────────────────

function attachInteractivePreview(): void {
  const providerInput = document.getElementById('previewProvider') as HTMLSelectElement | null
  const languageInput = document.getElementById('previewLanguage') as HTMLSelectElement | null
  const replacementInput = document.getElementById('previewReplacement') as HTMLInputElement | null
  const replacementValue = document.getElementById('previewReplacementValue') as HTMLElement | null
  const enabledInput = document.getElementById('previewEnabled') as HTMLInputElement | null
  const customSentenceInput = document.getElementById('previewCustomSentence') as HTMLTextAreaElement | null
  const previewMeta = document.getElementById('previewMeta')
  const previewDensity = document.getElementById('previewDensity')
  const previewWordCount = document.getElementById('previewWordCount')
  const previewStatus = document.getElementById('previewStatus')
  const originalLine = document.getElementById('previewOriginalLine')
  const translatedLine = document.getElementById('previewTranslatedLine')
  const heroSubtitle = document.getElementById('heroSubtitleLine')
  const phrases = Array.from(document.querySelectorAll<HTMLButtonElement>('.pill-btn[data-phrase]'))
  const saveBtn = document.querySelector<HTMLButtonElement>('[data-preview-save]')
  const refreshBtn = document.querySelector<HTMLButtonElement>('[data-preview-refresh]')

  if (!providerInput || !languageInput || !replacementInput || !replacementValue || !enabledInput || !previewMeta || !originalLine || !translatedLine) return

  const hasOption = (sel: HTMLSelectElement, v: string) => Array.from(sel.options).some((o) => o.value === v)

  const setActivePhrase = (sentence: string) => {
    const norm = sanitizeSentence(sentence).toLowerCase()
    phrases.forEach((b) => b.classList.toggle('is-active', sanitizeSentence(b.dataset.phrase || '').toLowerCase() === norm))
  }

  const loadSettings = () => {
    try {
      const raw = localStorage.getItem('lingo-stream-preview-settings')
      if (!raw) return
      const p = JSON.parse(raw) as Record<string, unknown>
      if (typeof p.provider === 'string' && hasOption(providerInput, p.provider)) providerInput.value = p.provider
      if (typeof p.language === 'string' && hasOption(languageInput, p.language)) languageInput.value = p.language
      const r = Number.parseInt(String(p.replacement), 10)
      if (Number.isFinite(r)) replacementInput.value = String(clamp(r, 1, 100))
      if (typeof p.enabled === 'boolean') enabledInput.checked = p.enabled
      if (customSentenceInput && typeof p.sentence === 'string') customSentenceInput.value = sanitizeSentence(p.sentence)
    } catch { /* ignore */ }
  }

  const saveSettings = (): boolean => {
    try {
      localStorage.setItem('lingo-stream-preview-settings', JSON.stringify({
        provider: providerInput.value,
        language: languageInput.value,
        replacement: replacementInput.value,
        enabled: enabledInput.checked,
        sentence: sanitizeSentence(customSentenceInput?.value || DEFAULT_SENTENCE),
      }))
      return true
    } catch { return false }
  }

  let reqId = 0, timerId = 0

  const summarizeProviders = (byWord: Record<string, string>) => {
    const used = new Set(Object.values(byWord))
    return used.size > 0 ? Array.from(used).sort().join(', ') : ''
  }

  const runUpdate = async () => {
    const pct = clamp(Number.parseInt(replacementInput.value, 10) || 1, 1, 100)
    replacementInput.value = String(pct)
    replacementValue.textContent = `${pct}%`
    const enabled = enabledInput.checked
    const pv = providerInput.value
    const pLabel = providerInput.options[providerInput.selectedIndex]?.textContent || 'Auto fallback'
    const lLabel = languageInput.options[languageInput.selectedIndex]?.textContent || 'Spanish'
    const sentence = sanitizeSentence(customSentenceInput?.value || DEFAULT_SENTENCE)

    if (!enabled) {
      originalLine.textContent = sentence
      const plain = escapeHtml(sentence)
      animateLine(translatedLine, plain)
      if (heroSubtitle) animateLine(heroSubtitle, plain)
      if (previewDensity) previewDensity.textContent = '0%'
      if (previewWordCount) previewWordCount.textContent = String(sentence.split(/\s+/).filter(Boolean).length)
      if (previewStatus) previewStatus.textContent = 'Paused'
      previewMeta.textContent = 'Lingo Stream disabled - captions stay original.'
      setActivePhrase(sentence)
      return
    }

    const id = ++reqId
    if (previewStatus) previewStatus.textContent = 'Translating...'
    previewMeta.textContent = `Provider: ${pLabel} - Target: ${lLabel} - Translating...`
    const result = await buildTranslatedLine(sentence, languageInput.value, pct, enabled, pv)
    if (id !== reqId) return

    originalLine.textContent = result.sentence
    animateLine(translatedLine, result.html)
    if (heroSubtitle) animateLine(heroSubtitle, result.html)
    if (previewDensity) previewDensity.textContent = result.candidateCount > 0 ? `${Math.round((result.replacedCount / result.candidateCount) * 100)}%` : '0%'
    if (previewWordCount) previewWordCount.textContent = String(result.totalWords)
    const usedP = summarizeProviders(result.providerByWord)
    const fails = Object.keys(result.failedProvidersByWord).length
    if (previewStatus) previewStatus.textContent = result.replacedCount > 0 ? (fails === 0 ? 'Active' : 'Partial') : 'No matches'
    const autoInfo = pv === 'auto' && usedP ? ` (${usedP})` : ''
    const missInfo = fails > 0 ? ` - API misses: ${fails}` : ''
    previewMeta.textContent = `Provider: ${pLabel}${autoInfo} - Target: ${lLabel} - Replaced words: ${result.replacedCount}${missInfo}`
    setActivePhrase(sentence)
  }

  const schedule = (delay = 0) => {
    clearTimeout(timerId)
    timerId = window.setTimeout(() => void runUpdate(), delay)
  }

  phrases.forEach((b) => b.addEventListener('click', () => {
    if (customSentenceInput) customSentenceInput.value = sanitizeSentence(b.dataset.phrase || DEFAULT_SENTENCE)
    schedule()
  }))
  providerInput.addEventListener('change', () => schedule())
  languageInput.addEventListener('change', () => schedule())
  replacementInput.addEventListener('input', () => schedule(120))
  enabledInput.addEventListener('change', () => schedule())
  customSentenceInput?.addEventListener('input', () => schedule(260))
  saveBtn?.addEventListener('click', () => {
    previewMeta.textContent = saveSettings() ? 'Settings saved locally for this preview.' : 'Unable to store settings.'
  })
  refreshBtn?.addEventListener('click', () => schedule())

  loadSettings()
  if (customSentenceInput && !customSentenceInput.value.trim()) customSentenceInput.value = DEFAULT_SENTENCE
  schedule()
}

// ── Quiz Showcase ────────────────────────────────────────────

function attachQuizShowcase(): void {
  const cards = Array.from(document.querySelectorAll<HTMLElement>('.quiz-match-card[data-pair]'))
  if (!cards.length) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const groups = new Map<string, HTMLElement[]>()
  cards.forEach((c) => {
    const p = c.dataset.pair || ''
    if (!groups.has(p)) groups.set(p, [])
    groups.get(p)!.push(c)
  })
  const pairs = Array.from(groups.values()).filter((g) => g.length >= 2)
  if (!pairs.length) return
  let cursor = 0
  const step = () => {
    cards.forEach((c) => c.classList.remove('is-demo-match'))
    pairs[cursor].forEach((c) => c.classList.add('is-demo-match'))
    cursor = (cursor + 1) % pairs.length
  }
  step()
  setInterval(step, 1300)
}

// ── Mobile Menu ──────────────────────────────────────────────

function attachMobileMenu(): void {
  const btn = document.getElementById('mobileMenuBtn')
  const menu = document.getElementById('mobileMenu')
  const close = document.getElementById('mobileMenuClose')
  if (!btn || !menu) return

  const open = () => {
    menu.classList.remove('hidden')
    btn.setAttribute('aria-expanded', 'true')
    document.body.style.overflow = 'hidden'
  }
  const shut = () => {
    menu.classList.add('hidden')
    btn.setAttribute('aria-expanded', 'false')
    document.body.style.overflow = ''
  }

  btn.addEventListener('click', open)
  close?.addEventListener('click', shut)
  menu.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', () => {
      shut()
      // Let the section nav handler do the scrolling
    })
  })
  menu.addEventListener('click', (e) => { if (e.target === menu) shut() })
}

// ── Copyright Year ───────────────────────────────────────────

function updateCopyrightYear(): void {
  const year = String(new Date().getFullYear())
  document.querySelectorAll<HTMLElement>('.year-value').forEach((n) => { n.textContent = year })
}

// ── Initialize ───────────────────────────────────────────────

function initializeSite(): void {
  attachChromeAppearanceHueSync()
  const repoUrl = inferRepositoryUrl()
  attachCurrentReleaseInfo()
  attachRepositoryLinks(repoUrl)
  attachReleaseLinks(repoUrl)
  initMotionReveals()
  initScrollProgress()
  initLogoMorph()
  attachTopbarSplashHide()
  attachTopbarContraction()
  attachFloatingPlusField()
  attachBackgroundParallax()
  const nav = attachSectionNavigation()
  attachSectionDepthEffect(nav.sections)
  attachSegmentScroll(nav)
  attachMobileMenu()
  attachInteractivePreview()
  attachQuizShowcase()
  updateCopyrightYear()
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSite, { once: true })
} else {
  initializeSite()
}
