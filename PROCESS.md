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

### Phase 3: Workflow Optimization & Initial UI
- **4-Step Workflow Implementation**:
    1. **Extract**: Full automated scan.
    2. **Refine**: Single-click manual exclusion (using persistent `removedIds`).
    3. **Configure**: Multi-select employment filters and termination status toggles.
    4. **Export**: Dual-mode CSV export (Full Master vs. Filtered Selection).
- **UI Aesthetics**: Implemented a "Premium Dark" glassmorphism theme using HSL color variables and smooth CSS transitions.

### Phase 4: Modernization & Precision (v2.0)
- **Premium UI**: Overhauled design with glassmorphism, HSL variables, and dark/light modes.
- **Improved Extraction**: Added normalization for employment types and handled "Terminated" status reliably.
- **Robust Filtering**:
    - Decoupled "View Filters" from "Selection Pool" to prevent accidental data loss.
    - Added "Not Specified" category for employees with blank employment types.
    - Implemented case-insensitive, trimmed matching for filter reliability.
    - Added "Reset to Defaults" option in the filter menu.
    - Added "All | None" batch toggles for filter groups.
- **Code Stability**: Fixed TypeErrors and implemented event delegation for interactive elements.
- **Export Improvements**: Added UTF-8 BOM to CSVs for better Excel compatibility and included employment type in exports.
- **Streamlined Actions**: Moved "Export All" and "Export Selected" buttons to the main footer alongside the Randomize action for better user flow.

## 🏗️ Architectural Decisions

### 1. Data Storage Strategy
- **Why `chrome.storage.local`?**: We chose local storage to persist scan results across popup closes. This allows a user to "Build List" in the popup, close it, and return later to "Run Selection" without rescanning.

### 2. Filtering Logic (Decoupled Architecture)
- **Source of Truth**: `allEmployees` always contains every record found.
- **View State (filteredEmployees)**: Controlled by the Search bar, Status filter, and Type filter.
- **Selection State (excludedIds)**: Controlled by individual inclusion/exclusion toggles and **Batch Actions**. This ensures users don't accidentally drop candidates just by searching for a name.

### 3. CSV Engine
- **Encoding**: Uses UTF-8 with a BOM (Byte Order Mark) for Microsoft Excel compatibility.
- **Dynamic Headers**: Ensures all employee data fields (including Position and DOB) are included in every export.

## 🚀 Future Improvement Roadmap

- [ ] **Offline Mode Detection**: Better handling of connection loss during multi-page scans.
- [ ] **Advanced Randomization**: Options for weighted selection (e.g., specific departments get higher priority).
- [ ] **Custom Column Mapping**: Allow users to re-map columns if LabbReport updates their table structure in the future.
- [ ] **Export Formats**: Add direct PDF export functionality for compliance record-keeping.

---
*Last Updated: March 2026*
