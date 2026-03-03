# RandomTesting Chrome Extension

A premium, high-performance Chrome extension designed for automated employee extraction and random selection from LabbReport portals. Built with a focus on speed, aesthetic UI, and robust data integrity.

## ✨ Features

- **Automated Extraction**: Scans LabbReport employee tables and captures all data points including First Name, Last Name, DOB, Phone, Position, and Employment Type.
- **Smart Filtering**: 
    - **Exclude Terminated**: Automatically identifies and filters out terminated employees (enabled by default).
    - **Multi-Select Employment Type**: Filter the pool by Full-time, Part-time, or other custom categories.
- **Master Pool Management**: 
    - View all extracted records in a modern, responsive list.
    - Manually exclude specific individuals before generating a random selection.
- **Random Selection Engine**: Generate a truly random subset of employees based on your configured count.
- **Comprehensive CSV Exports**:
    - **Full Master Pool**: Export every record discovered during the scan.
    - **Filtered Pool**: Export only the subset currently visible in your filtered view.
- **Premium UI/UX**: Glassmorphism design system with smooth animations and responsive layout for both standard popup and full-tab views.

## 🚀 Installation

1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** in the top right corner.
4. Click **Load unpacked** and select the extension's root directory.

## 📝 Usage Workflow

1. **Scan**: Navigate to a LabbReport employee list and click **Build Master List**. The extension will automatically handle pagination and data extraction.
2. **Refine**: Use the **Exclude Terminated** toggle or **Employment Type** filter to narrow down your pool.
3. **Manual Exclusion**: Click the red `×` icon on any employee row to manually remove them from the selection pool.
4. **Generate**: Enter your desired count and click **Run Selection**.
5. **Export**: Use the CSV buttons at the bottom to download your results for record-keeping.

## 🛠️ Technical Overview

- **Core Engine**: Vanilla JavaScript with chrome-native storage for persistence.
- **Styling**: Modern CSS with custom scrollbars, HSL color palettes, and container queries for responsiveness.
- **Content Script**: Robust DOM observer that captures LabbReport table data without interfering with site performance.

---
Developed by **OmmNoMi**.
