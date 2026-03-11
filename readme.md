# 🌍 Lingo Stream

![HackMIT](https://img.shields.io/badge/HackMIT-2026-blue)
![Status](https://img.shields.io/badge/status-hackathon_build-orange)
![Platform](https://img.shields.io/badge/platform-Chrome_Extension-green)
![Impact](https://img.shields.io/badge/focus-global_language_learning-purple)

**Passive language learning for billions of video viewers.**

Lingo Stream is a Chrome extension that transforms ordinary YouTube subtitles into a **language-learning environment**.

Instead of translating entire sentences, Lingo Stream injects **small contextual translations directly into subtitles**, creating **micro-immersion learning** without interrupting the video experience.

Example:


Original:
I really enjoy learning new skills every day.

Lingo Stream:
I really enjoy (gusto) learning new skills every day.


---

# 🚀 Why This Matters

> [!NOTE]
> Over **2.7 billion people watch YouTube every month**.  
> Lingo Stream turns that passive entertainment into **a global language learning platform**.

Most language tools require users to:

- stop watching videos
- open translation apps
- break their concentration

Lingo Stream removes that friction by embedding learning **directly into the content people already consume**.

**Result:**

- learning happens naturally
- retention improves through context
- users learn while doing something they already enjoy

---

# 🌎 Impact Potential

> [!TIP]
> Our goal is to make language learning **ambient, effortless, and scalable to billions of viewers.**

### Global Accessibility

Language learning resources are often expensive or time-consuming.

Lingo Stream:

- works on free online content
- requires no formal study schedule
- integrates directly into everyday media consumption

### Passive Learning at Scale

If even **1% of YouTube viewers** used this tool:


27,000,000 learners


That would make it one of the **largest informal language learning platforms in the world**.

### Real-World Use Cases

- Students improving vocabulary through media
- Travelers preparing for new countries
- Professionals learning business languages
- Immigrants adapting to new environments

---

# 🧠 Innovation

> [!NOTE]
> Lingo Stream introduces a new learning model: **micro-immersion**.

Instead of forcing full translation, the extension introduces **controlled exposure** to foreign vocabulary.

Key innovations:

- contextual word replacement
- passive immersion learning
- adjustable immersion intensity
- seamless integration with existing media platforms

This approach combines **education technology, browser automation, and behavioral learning principles**.

---

# 🖥 How It Works


YouTube Subtitle Stream
↓
Mutation Observer
↓
Token Filtering
↓
Word Selection Algorithm
↓
Translation API
↓
Inline Subtitle Rendering


Key design principles:

- replace **5–10% of words**
- preserve subtitle readability
- maintain uninterrupted video playback

---

# 🧰 Planned Tech Stack

![JavaScript](https://img.shields.io/badge/JavaScript-ES6-yellow)
![Chrome](https://img.shields.io/badge/Chrome-Extension-blue)
![Manifest](https://img.shields.io/badge/Manifest-V3-lightblue)
![HTML](https://img.shields.io/badge/HTML-UI-orange)
![CSS](https://img.shields.io/badge/CSS-UI-blue)

### Browser Extension Architecture

- Chrome Extension (Manifest V3)
- Content Scripts
- MutationObserver subtitle detection
- Popup settings UI

### Translation APIs

Possible providers:

- LibreTranslate
- Google Translate endpoint
- MyMemory API

---

# 🎯 Features (Planned)

### Smart Subtitle Processing

- observe caption updates in real time
- filter low-value tokens
- replace meaningful vocabulary only

### Adjustable Immersion

Users control:

- translation percentage
- target language
- learning intensity

### Learning Tools (Future)

- vocabulary saving
- mini-quiz system
- progress tracking

---

# 🧪 Technical Challenges

> [!WARNING]
> Real-time subtitle manipulation inside a dynamic webpage environment is technically challenging.

Challenges include:

### Live Subtitle Mutation

YouTube captions constantly update in the DOM.

Solution:

- MutationObserver pipeline
- optimized text processing

### Translation Latency

External APIs may introduce delay.

Solutions:

- caching repeated translations
- provider fallback
- batching requests

### Subtitle Readability

Too many translations reduce comprehension.

Solution:

- adaptive replacement algorithm
- token filtering
- configurable exposure

---

# 🏆 Alignment With HackMIT Judging Criteria

HackMIT judges typically evaluate projects based on **innovation, technical depth, impact, and usability**.

Lingo Stream targets all four areas.

### Innovation

A new paradigm for language learning through **micro-immersion subtitles**.

### Technical Complexity

Real-time DOM manipulation, algorithmic word selection, and translation pipeline integration.

### Impact

Potential to reach **millions of users through YouTube**, the largest video platform in the world.

### Usability

Simple Chrome extension UI designed for **zero friction learning**.

---

# 🎨 Current Repository Contents

> [!NOTE]
> Development has just begun for the hackathon.

Current contents:


README.md
/ui-sketches


The working extension will be built **during the HackMIT build session**.

---

# 🌟 Vision

Lingo Stream aims to turn **every YouTube video into a language classroom**.

Not by forcing users to study —  
but by letting them **learn while they watch.**
"""