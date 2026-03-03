# RandomTesting: Project Development Process & Documentation

This document serves as a comprehensive log of the development lifecycle, architectural decisions, and improvement roadmap for the RandomTesting Chrome Extension.

## 📈 Development Timeline

### Phase 1: Foundation & Core Extraction
- **Initial Setup**: Created manifest v3 structure, popup UI, and basic content script.
- **LabbReport Integration**: Developed the `LabbScanner` engine to identify and parse employee tables on `labbreport.com`.
- **Pagination**: Implemented automated "Next Page" scanning to handle multi-page employee directories.

### Phase 2: Data Integrity & Accuracy (The "18 vs 24" Fix)
- **Discrepancy Resolution**: Identified that LabbReport often lists employees with multiple statuses or departments. 
- **Unique Key Logic**: Moved from simple deduplication to a position-based `uniqueKey` system (`firstName-lastName-dob-index`) to ensure all 24 records on a page are accurately captured.
- **Column Mapping**: Corrected specific LabbReport table mapping where Column 5 is Position and Column 6 is Employment Type/Status.

### Phase 3: Workflow Optimization & UI Overhaul
- **4-Step Workflow Implementation**:
    1. **Extract**: Full automated scan.
    2. **Refine**: Single-click manual exclusion (using persistent `removedIds`).
    3. **Configure**: Multi-select employment filters and termination status toggles.
    4. **Export**: Dual-mode CSV export (Full Master vs. Filtered Selection).
- **UI Aesthetics**: Implemented a "Premium Dark" glassmorphism theme using HSL color variables and smooth CSS transitions.

### Phase 4: Professionalization & Maintenance
- **GitHub Integration**: Created the `ommnomi/randomtest` repository and pushed the initial stable build.
- **Documentation**: Generated the `README.md` for installation and basic usage.
- **Clear & Rescan**: Added a global header button (🔄) to instantly reset storage and trigger a fresh scan, improving the iteration speed for users.
- **Responsive Design**: Optimized the UI for both the standard small Chrome popup window and the expanded full-tab view.

## 🏗️ Architectural Decisions

### 1. Data Storage Strategy
- **Why `chrome.storage.local`?**: We chose local storage to persist scan results across popup closes. This allows a user to "Build List" in the popup, close it, and return later to "Run Selection" without rescanning.

### 2. Filtering Logic
- **"Source of Truth" Approach**: `allEmployees` always contains every record found. Filtering is applied in real-time via the `getFilteredPool()` function. This prevents data loss while allowing flexible views.
- **Integrated Header Filters**: We moved filters into the pool header to maximize vertical space for the employee list, especially critical in the 380px-wide standard popup.

### 3. CSV Engine
- **Encoding**: Uses UTF-8 with a BOM (Byte Order Mark) to ensure high compatibility with Excel and Google Sheets, especially for names with special characters.

## 🚀 Future Improvement Roadmap

- [ ] **Offline Mode Detection**: Better handling of connection loss during multi-page scans.
- [ ] **Advanced Randomization**: Options for weighted selection (e.g., specific departments get higher priority).
- [ ] **Custom Column Mapping**: Allow users to re-map columns if LabbReport updates their table structure in the future.
- [ ] **Batch Removal**: Add a "Select All" / "Deselect All" feature for large pools.
- [ ] **Theme Toggle**: Add a Light Mode option for High-Contrast users.

---
*Last Updated: 2026-03-03*
