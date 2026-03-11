<table align="center">
  <tr>
    <td valign="middle">
      <img src="./logo.svg" alt="Lingo Stream logo" width="140" />
    </td>
    <td valign="middle">
      <h1>Lingo Stream</h1>
      <p>Ambient language learning directly inside YouTube subtitles.</p>
    </td>
    <td valign="middle">
      <img src="./media/wink.gif" alt="Lingo Stream emote" width="84" />
    </td>
  </tr>
</table>

<p align="center">
  <a href="#overview">Overview</a> |
  <a href="#current-status">Current Status</a> |
  <a href="#tech-that-will-be-implemented-planned">Tech</a> |
  <a href="#ui-sketch-direction">UI Sketch</a> |
  <a href="#current-progress">Progress</a> |
  <a href="#hackmit-submission-narrative-pre-submission-draft">Submission Narrative</a>
</p>

<p align="center">
  <img alt="HackMIT China 2026" src="https://img.shields.io/badge/HackMIT%20China-2026-1f6feb?style=flat" />
  <img alt="Stage" src="https://img.shields.io/badge/Stage-Pre--Submission-f59e0b?style=flat" />
  <img alt="Project" src="https://img.shields.io/badge/Project-Chrome%20Extension-16a34a?style=flat" />
  <img alt="Focus" src="https://img.shields.io/badge/Focus-Micro--Immersion-0f766e?style=flat" />
</p>

> [!WARNING]
> This repository is currently in pre-submission for HackMIT China 2026. At this stage, we have completed the README and UI sketches only.

> [!NOTE]
> The README is intentionally structured to match the HackMIT submission categories in `insturctions` while keeping the presentation clean for judges and reviewers.

---

## Overview

> [!TIP]
> **Quick summary:** Lingo Stream is a *concept-stage* project designed to make language learning happen during normal YouTube watching.

Lingo Stream is a project concept focused on turning passive YouTube watching into active vocabulary growth. Instead of forcing users to switch apps or pause videos, the idea is to make language learning happen in the same place where people already spend time.

Example subtitle flow:

```text
Original: I really enjoy learning new skills every day.
Lingo Stream: I really enjoy (gusto) learning new skills every day.
```

## Why This Project

> [!NOTE]
> The core idea is **low-friction learning**: keep entertainment and study in one flow.

YouTube has billions of active users, but language learners still face a context-switch problem: entertainment happens in one place while study tools live elsewhere. Lingo Stream is built on one principle: vocabulary growth is more sustainable when it happens inside routines users already maintain daily.

---

## Current Status

> [!IMPORTANT]
> Current stage: **README + UI sketches complete**.  
> Engineering implementation: **not started yet**.

This is currently a concept and design phase project. We have not implemented the extension logic yet.

## UI Sketch Direction

The team has produced UI sketches to show the intended interaction style and user flow for the project idea.

---

## Tech That Will Be Implemented (Planned)

> [!NOTE]
> This stack is **planned**, not implemented yet.

<p align="left">
  <img alt="JavaScript" src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=000000" />
  <img alt="HTML5" src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=ffffff" />
  <img alt="CSS3" src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=ffffff" />
  <img alt="GitHub Actions" src="https://img.shields.io/badge/GitHub%20Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=ffffff" />
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white" />
  <img alt="Google Chrome" src="https://img.shields.io/badge/Google%20Chrome-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white" />
</p>

| Layer | Planned Direction |
| --- | --- |
| Extension runtime | Manifest V3 background and content scripts |
| Subtitle extraction | `MutationObserver` and caption-node parsing |
| Translation providers | Google-compatible endpoint, LibreTranslate, or MyMemory |
| Popup UI | Lightweight controls for language and immersion intensity |
| Delivery | GitHub Actions workflow for linting, checks, and packaged builds |

---

## Current Progress

> [!TIP]
> Everything checked below reflects work that is *already done*.

- [x] Project idea and positioning
- [x] README draft and submission narrative draft
- [x] UI sketches

## Key Features

- Concept: in-video language learning through subtitle context
- Focus on reducing context switching for learners
- UI-first exploration for hackathon pre-submission

---

## HackMIT Submission Narrative (Pre-Submission Draft)

> [!IMPORTANT]
> This narrative is written for pre-submission judging and describes the project at its current maturity level.

### Project Overview

<span style="color:#1f6feb;"><strong>Lingo Stream</strong></span> is a browser extension concept for contextual language learning while watching YouTube.
It is built around one goal: <strong><em>learn without breaking attention</em></strong>.

### Inspiration

Most learners do not fail because of motivation. They fail because of <strong>friction</strong>.

People already spend hours on subtitle-based content. So instead of asking users to open another app, we asked:

<em>What if learning happened exactly where attention already is?</em>

That question shaped Lingo Stream.

### What It Does

The concept uses <strong>subtitle-aware micro-immersion</strong>:

- Do <strong>not</strong> translate everything.
- Inject <strong>small</strong>, contextual support.
- Keep watching smooth.
- Build vocabulary through repeated exposure.

<span style="color:#0f766e;"><strong>Result:</strong></span> learning feels natural, not like a separate study session.

### How We Built It

At this stage, we focused on:

- <strong>concept clarity</strong>
- <strong>README communication</strong>
- <strong>UI sketch direction</strong>

<span style="color:#f59e0b;"><strong>Current scope:</strong></span> pre-submission planning only. Full technical implementation has not started yet.

### Individual Contributions

Current work split:

- Project framing and core value definition
- Submission-ready README writing
- UI sketch preparation and visual direction

### Challenges We Ran Into

<span style="color:#d73a49;"><strong>Biggest challenge:</strong></span> finding a project that is both <strong>unique</strong> and <strong>world-impactful</strong>, without being unrealistic for hackathon time limits.

This took multiple iterations because we had to balance:

- originality
- practical scope
- real user value

### Accomplishments We Are Proud Of

What we are proud of so far:

- <strong>clear concept</strong> with a strong everyday-use case
- <strong>polished README</strong> aligned with submission requirements
- <strong>UI sketches</strong> that communicate product direction clearly

### What We Learned

Key lessons:

- <strong>Scope early, scope hard.</strong>
- Clear writing is part of product building.
- A strong concept saves engineering time later.

### What's Next

Next step is simple and focused:

<span style="color:#1a7f37;"><strong>Turn concept + sketches into a working prototype</strong></span>, then validate learning experience with real users.

---

## Repository Notes

This repository currently focuses on pre-submission assets for HackMIT China 2026, including branding, README documentation, and UI sketches.
