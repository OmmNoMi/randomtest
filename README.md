# RandomTesting v2.2 (Premium Selection Engine)

A professional-grade Chrome extension designed for high-accuracy employee data extraction and randomized selection from the LabbReport platform.

![Version 2.2](https://img.shields.io/badge/version-2.2-indigo.svg?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-green.svg?style=for-the-badge)

## ✨ Features

- **Passport Auto-Fill**: Automatically pre-selects "Random" as the Testing Reason when navigating to the Labb Passport page from the utility. Uses a CSP-compliant "Main World" injection for 100% reliability.
- **Aesthetic Redesign**: Modern "Premium Dark" glassmorphism theme with a dedicated Light Mode toggle.
- **Inclusion State Filters**: Isolate "Selected" vs "Unselected" pools with a single click to review your targets before randomization.
- **Responsive Layout**: Intelligent toolbar stacking — mobile shows a full-width stacked layout; desktop uses a side-by-side toolbar with search, filters, and batch actions on one row.
- **Context-Aware Header**: Organization name & ID and current user are surfaced directly in the header on desktop for at-a-glance context without wasting space.
- **Smart Terminated Handling**: Automatically identifies and excludes terminated individuals by default, while allowing you to toggle them back if needed.
- **Excel-Ready Export**: High-compatibility CSV engine with UTF-8 BOM encoding for seamless Microsoft Excel and Google Sheets integration.
- **Persistent Filter State**: All filter selections (status, employment type, inclusion state) are saved to `chrome.storage.local` and restored on every popup open.

## 🚀 4-Step Professional Workflow

1. **Extract**: Click **"Build Master List"** to initiate an automated scan of all pages on the active LabbReport employee directory.
2. **Refine (View)**: Use the **Search bar** or **Filters menu** to drill down into specific departments, statuses, or names. The visible count badge next to the batch buttons updates live.
3. **Configure (Selection)**: Use the inclusion toggles (✓/✗) or **Batch Actions** (All / None) to finalize your pool.
4. **Export & Randomize**: Use the **Export** widget at the bottom to download `All` or `Selected` as a CSV, or click **Randomize** to instantly pick a random candidate from the current pool.

## 🖥️ Footer Layout

| View | Layout |
|---|---|
| **Mobile** | Randomize button (full-width) stacked above Export widget |
| **Desktop** | Export widget on the **left** · Randomize button on the **right** · space in between |

## ⌨️ Power User Tips

- **Quick Search**: Press **`/`** anywhere in the popup to instantly focus the search bar. Existing text is auto-highlighted for fast overwriting.
- **Visible Count Badge**: The number badge next to the `All` / `None` batch buttons tells you exactly how many records are currently visible so you always know what batch actions will affect.
- **Export Inline**: `Export | All (N) | Selected (N)` — both counts update live as you add/remove people from the pool.

## 🛠️ Installation

1. Download or clone this repository to your local machine.
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **"Developer mode"** in the top-right corner.
4. Click **"Load unpacked"** and select the project folder.
5. Pin the extension for quick access.

## 🏗️ Technical Stack

- **LabbScanner Engine**: Custom-built JavaScript parser optimized for LabbReport's DOM structure.
- **State Management**: Distributed `chrome.storage.local` persistence for maintaining scan results, filter settings, and selection state across browser sessions.
- **UI Architecture**: Vanilla CSS with HSL design tokens, responsive Grid/Flex layouts, CSS `order` properties for adaptive desktop/mobile reordering, and SVG icon integration.

---
*Maintained by OmmNoMi • 2026*
