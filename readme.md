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
  <a href="#how-it-works">How It Works</a> |
  <a href="#tech-stack-planned">Tech Stack</a> |
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
> This repository is currently in pre-submission for HackMIT China 2026. Core extension runtime and API wiring are in active implementation.

> [!NOTE]
> The README is intentionally structured to match the HackMIT submission categories in `insturctions` while keeping the presentation clean for judges and reviewers.

## Overview

Lingo Stream turns passive YouTube watching into active vocabulary growth. Instead of forcing users to switch apps, pause videos, or open a separate dictionary, Lingo Stream works directly inside subtitle lines. It watches live captions, selects high-value words, and injects light-touch contextual translations so viewers keep following the video naturally.

Example subtitle flow:

```text
Original: I really enjoy learning new skills every day.
Lingo Stream: I really enjoy (gusto) learning new skills every day.
```

## Why This Project

YouTube has billions of active users, but language learners still face a context-switch problem: entertainment happens in one place while study tools live elsewhere. Lingo Stream is built on one principle: vocabulary growth is more sustainable when it happens inside routines users already maintain daily.

## How It Works

Pipeline:

```text
YouTube live subtitles -> candidate word filtering -> translation adapter -> inline render -> repeated exposure
```

| Step | System Action | Learner Experience |
| --- | --- | --- |
| 1 | Observe subtitle node updates in real time | Captions keep moving with no manual setup |
| 2 | Rank candidate words by learning value | Useful words are surfaced without overload |
| 3 | Apply controlled replacement ratio (5% to 20%) | Sentences remain readable while immersion increases |
| 4 | Render translated tokens inline with lightweight styling | Learning stays in-context without app switching |
| 5 | Track optional exposure counts | Frequent words become easier over time |

## Tech Stack (Planned)

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

## Current Progress

- [x] Product framing and value proposition
- [x] UX and branding direction
- [x] HackMIT pre-submission narrative draft
- [ ] Subtitle observer implementation in content scripts
- [ ] Translation provider adapter with failover
- [ ] Immersion controls in extension popup
- [ ] Automated CI checks and packaging

## Key Features

- Inline subtitle micro-translation instead of full-sentence replacement
- Adjustable immersion ratio to keep captions readable
- Provider-agnostic translation pipeline for reliability and flexibility
- Lightweight extension UX focused on fast setup and low distraction
- Repetition-oriented exposure model for long-term word retention

## Installation / Running Guide (Current Stage)

This repository currently contains pre-submission assets, branding, and product planning documents.

When the first implementation build is pushed, this section will include:

1. Extension setup steps for Chromium-based browsers
2. Local development workflow and commands
3. Environment configuration for translation API providers
4. Packaging instructions for demo and judge review

## Dependencies (Planned)

- Chrome Extension `Manifest V3` APIs
- YouTube subtitle DOM events and mutation observation
- Translation API endpoint (Google-compatible, LibreTranslate, or MyMemory)
- GitHub Actions for CI checks and release packaging

## HackMIT Submission Narrative (Pre-Submission Draft)

### Project Overview

Lingo Stream is a browser extension concept that enables contextual vocabulary acquisition during normal YouTube viewing by inserting selective inline word translations into live subtitles.

### Inspiration

Our team chose this direction because most language learners struggle with consistency, not intention. People are willing to learn, but they do not always have time for separate study sessions. At the same time, they already spend significant time watching content with subtitles. We saw a clear opportunity to combine these two behaviors. Instead of creating another isolated learning app, we designed a layer that sits on top of existing viewing habits and turns everyday content consumption into repeated vocabulary exposure.

### What It Does

The core function is subtitle-aware micro-immersion. The extension monitors subtitle changes in real time, detects candidate words, and replaces only a small subset with contextual translations. Users can control the intensity so text remains understandable. The goal is not full-sentence machine translation, but small, frequent, low-friction interventions that improve word recognition over repeated exposure.

### How We Built It

The project direction uses a Chrome extension architecture with Manifest V3, a content script for subtitle interception, and a popup interface for settings. Planned implementation uses JavaScript, HTML, and CSS for the first working version, with automation support via GitHub Actions. The translation layer is designed to be provider-agnostic so we can switch between compatible APIs depending on latency, cost, and language coverage.

### Individual Contributions

Current pre-submission work has been divided across product framing, UX and visual assets, extension architecture planning, and translation pipeline design. Design artifacts in this repository represent the interface and interaction direction. Engineering tasks are organized around subtitle parsing, token ranking, rendering performance, and API abstraction.

### Challenges We Ran Into

The biggest challenge is balancing learning impact with reading fluency. If too many words are translated, subtitle readability drops and users disengage. If too few are translated, learning impact is weak. Another challenge is subtitle variability across videos, including timing jitter and inconsistent punctuation, which affects token detection quality.

### Accomplishments We Are Proud Of

We are proud of the interaction model itself: word-level, context-preserving immersion inside a high-frequency behavior. We are also proud of the visual system and flow definition completed during pre-submission, which gives the team a clear path from concept to implementation while keeping scope realistic for hackathon timelines.

### What We Learned

We learned that good language-learning UX is mostly about reducing friction. Technical accuracy matters, but continuity of user attention matters even more. We also learned to scope aggressively: solve one concrete learning loop well before expanding into broader features such as quizzes or spaced repetition dashboards.

### What's Next

The next phase is to deliver a functional extension prototype, validate immersion-rate defaults with user testing, and improve vocabulary selection quality with lightweight ranking rules. Given more time, we plan to add review mechanics, personal progress tracking, and smarter adaptation based on user proficiency and watch history.

## Repository Notes

This repository focuses on pre-submission assets for HackMIT China 2026, including branding and UI explorations. Core extension implementation is currently in progress.
