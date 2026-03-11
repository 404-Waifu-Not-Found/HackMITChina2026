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

## Overview

Lingo Stream is a project concept focused on turning passive YouTube watching into active vocabulary growth. Instead of forcing users to switch apps or pause videos, the idea is to make language learning happen in the same place where people already spend time.

Example subtitle flow:

```text
Original: I really enjoy learning new skills every day.
Lingo Stream: I really enjoy (gusto) learning new skills every day.
```

## Why This Project

YouTube has billions of active users, but language learners still face a context-switch problem: entertainment happens in one place while study tools live elsewhere. Lingo Stream is built on one principle: vocabulary growth is more sustainable when it happens inside routines users already maintain daily.

## Current Status

This is currently a concept and design phase project. We have not implemented the extension logic yet.

## UI Sketch Direction

The team has produced UI sketches to show the intended interaction style and user flow for the project idea.

## Tech That Will Be Implemented (Planned)

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

- [x] Project idea and positioning
- [x] README draft and submission narrative draft
- [x] UI sketches

## Key Features

- Concept: in-video language learning through subtitle context
- Focus on reducing context switching for learners
- UI-first exploration for hackathon pre-submission

## HackMIT Submission Narrative (Pre-Submission Draft)

### Project Overview

Lingo Stream is a browser extension concept for contextual language learning while watching YouTube.

### Inspiration

Our team chose this direction because most language learners struggle with consistency, not intention. People are willing to learn, but they do not always have time for separate study sessions. At the same time, they already spend significant time watching content with subtitles. We saw a clear opportunity to combine these two behaviors. Instead of creating another isolated learning app, we designed a layer that sits on top of existing viewing habits and turns everyday content consumption into repeated vocabulary exposure.

### What It Does

The concept is subtitle-aware micro-immersion. Instead of translating everything, the idea is to provide small contextual vocabulary support during normal video watching so learning can feel natural and lightweight.

### How We Built It

At this stage, we have built the project narrative and created UI sketches to define the interaction and visual direction. We have not started full technical implementation yet.

### Individual Contributions

Current pre-submission work has focused on project framing, writing this README, and preparing UI sketches.

### Challenges We Ran Into

The biggest challenge we faced so far was finding a unique project idea that has not been done repeatedly and still has meaningful impact on the world. Defining a direction that is both original and realistic for a hackathon required multiple iterations.

### Accomplishments We Are Proud Of

We are proud that we established a clear concept, completed a polished pre-submission README, and produced UI sketches that communicate the product direction clearly.

### What We Learned

We learned that narrowing scope early is critical. A clear concept and clear communication are necessary before implementation can move efficiently.

### What's Next

The next phase is to convert the current concept and UI sketch into a working prototype and validate the learning experience with real users.

## Repository Notes

This repository currently focuses on pre-submission assets for HackMIT China 2026, including branding, README documentation, and UI sketches.
