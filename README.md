# RandomTesting v2.0 (Premium Selection Engine)

A professional-grade Chrome extension designed for high-accuracy employee data extraction and randomized selection from the LabbReport platform.

![Version 2.0](https://img.shields.io/badge/version-2.0-indigo.svg?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-green.svg?style=for-the-badge)

## ✨ Premium Features (v2.0)

- **Aesthetic Redesign**: Modern "Premium Dark" glassmorphism theme with a dedicated Light Mode toggle.
- **Decoupled Architecture**: Fundamentally separated **View Filters** (who you see) from **Selection Pool** (who is picked).
- **Unified Filter Menu**: Space-saving status and employment type filters consolidated into a single dropdown.
- **Dynamic Search**: Instantly find specific employees without affecting the overall selection pool.
- **Batch Visibility Actions**: Rapidly include or exclude everyone matching your current filtered view (e.g., "Exclude all visible Contract employees").
- **Smart Terminated Handling**: Automatically identifies and excludes terminated individuals by default, while allowing you to toggle them back if needed.
- **Excel-Ready Export**: High-compatibility CSV engine with UTF-8 BOM encoding for seamless Microsoft Excel and Google Sheets integration.

## 🚀 4-Step Professional Workflow

1. **Extract**: Click **"Build Master List"** to initiate an automated scan of all pages on the active LabbReport employee directory.
2. **Refine (View)**: Use the **Search bar** or **Filters menu** to drill down into specific departments, statuses, or names.
3. **Configure (Selection)**: Use the inclusion toggles (Plus/X) or **Batch Actions** (All/None) to finalize your pool.
4. **Export & Randomize**: Download your tailored pool as a CSV or click **"Run Selection"** to pick your candidates.

## 🛠️ Installation

1. Download or clone this repository to your local machine.
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **"Developer mode"** in the top-right corner.
4. Click **"Load unpacked"** and select the project folder.
5. Pin the extension for quick access.

## 🏗️ Technical Stack

- **LabbScanner Engine**: Custom-built JavaScript parser optimized for LabbReport's DOM structure.
- **State Management**: Distributed `chrome.storage.local` persistence for maintaining scan results across browser sessions.
- **UI Architecture**: Vanilla CSS with HSL design tokens, responsive Grid/Flex layouts, and SVG icon integration.

---
*Maintained by OmmNoMi • 2026*
