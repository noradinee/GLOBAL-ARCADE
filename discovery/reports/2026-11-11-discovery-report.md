# 🕹️ GLOBAL ARCADE — Daily Game Discovery Report (2026-11-11)

> **CRITICAL POLICY REMINDER**: No discovered game is ever published automatically. Human review and explicit approval via GitHub Pull Request is strictly required before any code enters `src/data/games.json`.

## 📊 Executive Summary

| Total Evaluated | Recommended for Approval | Request More Info | Rejected / Ineligible |
| :---: | :---: | :---: | :---: | 
| **5** | **2** 🟢 | **0** 🟡 | **3** 🔴 |

* **Run Timestamp**: `2026-11-11T14:36:39.674Z`
* **Discovery Sources**: GitHub API, itch.io Web Feed, Open Game Repositories
* **Execution Mode**: Automated Scheduled Discovery Gate

## 🟢 Candidates Recommended for Approval (2)

### 1. Pacman (`gh-mumuy-pacman`)

- **Source URL**: [https://github.com/mumuy/pacman](https://github.com/mumuy/pacman)
- **Developer / Author**: `mumuy`
- **Game Engine**: HTML5 Canvas2D
- **Language**: JavaScript
- **Discovery Reason**: Verified open-source candidate with active community traction.
- **Popularity Signals**: 1644 ⭐ Stars, 450 🍴 Forks, ~5754 plays (GitHub REST API v3, 2026-11-11)
- **License Status**: `VERIFIED_COMMERCIAL_USE` (MIT) — [License Link](https://api.github.com/licenses/mit)
- **Security Audit Gate**: `PASSED` (0 findings)
- **Mobile Support**: ⚠️ Desktop Keyboard
- **Composite Score**: **66 / 100** (Popularity: 25/25, Tech: 20/20, Mobile: 5/15, Maintenance: 6/15, Relevance: 5/15, Standalone: 5/10)

**Recommended Decision**: `APPROVE` | **Eligibility**: `ELIGIBLE`

> **Maintainer Action**: Eligible for staging. Ready for maintainer playtest and safe import into catalog.

---

### 2. Mykonos Island Voxels (`gh-boona13-mykonos-island-voxels`)

- **Source URL**: [https://github.com/boona13/mykonos-island-voxels](https://github.com/boona13/mykonos-island-voxels)
- **Developer / Author**: `boona13`
- **Game Engine**: HTML5 / JavaScript
- **Language**: JavaScript
- **Discovery Reason**: Verified open-source candidate with active community traction.
- **Popularity Signals**: 1064 ⭐ Stars, 231 🍴 Forks, ~3724 plays (GitHub REST API v3, 2026-11-11)
- **License Status**: `VERIFIED_COMMERCIAL_USE` (MIT) — [License Link](https://api.github.com/licenses/mit)
- **Security Audit Gate**: `PASSED` (0 findings)
- **Mobile Support**: ✅ Touch Enabled
- **Composite Score**: **72 / 100** (Popularity: 25/25, Tech: 16/20, Mobile: 15/15, Maintenance: 6/15, Relevance: 5/15, Standalone: 5/10)

**Recommended Decision**: `APPROVE` | **Eligibility**: `ELIGIBLE`

> **Maintainer Action**: Eligible for staging. Ready for maintainer playtest and safe import into catalog.

---

## 🟡 Candidates Requiring Manual Review (0)

_No candidates in pending review state today._

## 🔴 Ineligible & Rejected Candidates (3)

### 1. AncientBeast (`gh-freezingmoon-ancientbeast`)

- **Source URL**: [https://github.com/FreezingMoon/AncientBeast](https://github.com/FreezingMoon/AncientBeast)
- **Developer / Author**: `FreezingMoon`
- **Game Engine**: HTML5 / JavaScript
- **Language**: TypeScript
- **Discovery Reason**: Verified open-source candidate with active community traction.
- **Popularity Signals**: 1890 ⭐ Stars, 720 🍴 Forks, ~6615 plays (GitHub REST API v3, 2026-11-11)
- **License Status**: `RESTRICTED` (AGPL-3.0) — [License Link](https://api.github.com/licenses/agpl-3.0)
- **Security Audit Gate**: `PASSED` (0 findings)
- **Mobile Support**: ⚠️ Desktop Keyboard
- **Composite Score**: **71 / 100** (Popularity: 25/25, Tech: 16/20, Mobile: 5/15, Maintenance: 15/15, Relevance: 5/15, Standalone: 5/10)

**Recommended Decision**: `REJECT` | **Eligibility**: `INELIGIBLE`

> **Maintainer Action**: Do not import. Failed either commercial licensing whitelist or security gate.

---

### 2. Phaser Ce Examples (`gh-phaserjs-phaser-ce-examples`)

- **Source URL**: [https://github.com/phaserjs/phaser-ce-examples](https://github.com/phaserjs/phaser-ce-examples)
- **Developer / Author**: `phaserjs`
- **Game Engine**: Phaser 3 / WebGL
- **Language**: JavaScript
- **Discovery Reason**: Verified open-source candidate with active community traction.
- **Popularity Signals**: 1787 ⭐ Stars, 1118 🍴 Forks, ~6255 plays (GitHub REST API v3, 2026-11-11)
- **License Status**: `UNKNOWN` (UNKNOWN) — [License Link](https://github.com/phaserjs/phaser-ce-examples/blob/main/LICENSE)
- **Security Audit Gate**: `PASSED` (0 findings)
- **Mobile Support**: ⚠️ Desktop Keyboard
- **Composite Score**: **60 / 100** (Popularity: 25/25, Tech: 17/20, Mobile: 5/15, Maintenance: 3/15, Relevance: 5/15, Standalone: 5/10)

**Recommended Decision**: `REJECT` | **Eligibility**: `INELIGIBLE`

> **Maintainer Action**: Do not import. Failed either commercial licensing whitelist or security gate.

---

### 3. One Html Page Challenge (`gh-metroxe-one-html-page-challenge`)

- **Source URL**: [https://github.com/Metroxe/one-html-page-challenge](https://github.com/Metroxe/one-html-page-challenge)
- **Developer / Author**: `Metroxe`
- **Game Engine**: HTML5 Canvas2D
- **Language**: HTML
- **Discovery Reason**: Verified open-source candidate with active community traction.
- **Popularity Signals**: 1413 ⭐ Stars, 453 🍴 Forks, ~4946 plays (GitHub REST API v3, 2026-11-11)
- **License Status**: `UNKNOWN` (UNKNOWN) — [License Link](https://github.com/Metroxe/one-html-page-challenge/blob/main/LICENSE)
- **Security Audit Gate**: `PASSED` (0 findings)
- **Mobile Support**: ⚠️ Desktop Keyboard
- **Composite Score**: **75 / 100** (Popularity: 25/25, Tech: 20/20, Mobile: 5/15, Maintenance: 15/15, Relevance: 5/15, Standalone: 5/10)

**Recommended Decision**: `REJECT` | **Eligibility**: `INELIGIBLE`

> **Maintainer Action**: Do not import. Failed either commercial licensing whitelist or security gate.

---

## ✅ Maintainer Review Checklist

Prior to merging any candidate into the production catalog:

- [ ] **Verify License**: Check repository for dedicated `LICENSE` file and verify no restrictive clauses.
- [ ] **Asset Provenance**: Ensure sprites, music, and sound effects are either CC0/MIT or procedurally generated.
- [ ] **Manual Playtest**: Launch the game in a sandboxed browser tab to verify responsive mobile touch and desktop keyboard controls.
- [ ] **Arabic Readiness**: Confirm game title, instructions, and description can be translated cleanly into Arabic.
- [ ] **Approve & Import**: Run `npm run discover:import -- <candidateId>` to securely pull the exact verified commit.

---
*Report generated automatically by Global Arcade Discovery Engine.*
