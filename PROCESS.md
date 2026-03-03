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
- **Productivity & UI Refinements**:
    - Added "/" keyboard shortcut to focus and highlight search.
    - Added **Inclusion State Filters** to toggle visibility of "Selected" vs "Excluded" employees.
    - Optimized **Mobile Layout** with a stacked toolbar and full-width search bar.
    - Improved **Header Density**: Switched Rescan button to a compact icon and removed redundant "Total Members" statistics.
    - Enhanced **Light Theme** with a more balanced color palette for better daylight readability.
- **Code Stability & Safety**:
    - Fixed multiple TypeErrors with comprehensive null-checking in the UI renderer.
    - Implemented **Global Script Guards** in `content.js` to prevent double-injection of event listeners.
- **Export Improvements**: Added UTF-8 BOM to CSVs for better Excel compatibility and included employment type in exports.
- **Streamlined Actions**: Moved export and randomize controls to the main footer for better user flow.

### Phase 5: UI Polish & UX Refinements (v2.1)
- **Unified Organization Card**: Combined the separate "Organization Name" and "Org ID" context cards into a single card to reduce visual clutter. Displays as `Organization #<ID>` with the name below.
- **Header Context on Desktop**: Moved the Organization and Current User context cards into the main header on larger screens, freeing up more vertical space for the employee list.
- **Random Count Input Removed**: The manual count input for randomization was removed per design decision — will be handled on a dedicated settings/configuration page in a future phase.
- **Footer Redesign**:
    - Renamed "Run Selection" to **Randomize** — full-width centered on mobile, compact right-aligned on desktop.
    - Replaced two large "Export All" / "Export Selected" buttons with a compact inline **Export widget** showing `Export | All (N) | Selected (N)` in a single pill.
    - Both counts update live as the pool changes.
    - Desktop layout arranges Export on the left and Randomize on the right with space between.
- **Visible Count Badge**: Removed the verbose "Filtered: N entries shown. Batch actions apply only to this visible list." banner. Replaced with a compact count badge `[ N ]` placed inline next to the All/None batch action buttons.
- **None Button Icon**: Updated the "None" batch action button to show a checkbox with an X (✗) instead of an empty rectangle — more clearly communicates its deselect/exclude intent.
- **Copyright Placement**: Moved the "OMMNOMI RANDOM SELECTION UTILITY • V2.0" footer text to sit directly beneath the export row inside the workspace card, rather than floating disconnected at the bottom of the popup.
- **Filter Persistence Bug Fix**: Fixed a critical bug where Employment Type filters would appear unchecked every time the popup reopened. Root cause was the `!filtersLoaded` guard in `setupFilters()` preventing auto-population after the initial save. Resolved by:
    - Removing the guard condition so types are always auto-populated if the set is empty.
    - Swapping the call order in "Reset to Defaults" so `setupFilters()` runs before `saveFilters()`, ensuring the repopulated defaults are what gets written to storage.

## 🏗️ Architectural Decisions

### 1. Data Storage Strategy
- **Why `chrome.storage.local`?**: We chose local storage to persist scan results across popup closes. This allows a user to "Build List" in the popup, close it, and return later to "Run Selection" without rescanning.
- **Filter Persistence**: `filterStore` key saves `statuses`, `types`, `inclusion`, and `search` query so filter state is fully restored on every popup open.

### 2. Filtering Logic (Decoupled Architecture)
- **Source of Truth**: `allEmployees` always contains every record found.
- **View State (filteredEmployees)**: Controlled by the Search bar, Status filter, and Type filter.
- **Selection State (excludedIds)**: Controlled by individual inclusion/exclusion toggles and **Batch Actions**. This ensures users don't accidentally drop candidates just by searching for a name.

### 3. Responsive Layout Strategy
- **CSS Order Property**: Used flexbox `order` on header children (`.header-branding`, `.context-grid`, `.header-actions`) to reposition context cards between branding and actions on desktop without changing HTML structure.
- **Footer Reordering**: On desktop (`min-width: 600px`), `order: 1` on `.export-widget` and `order: 2` on `.selection-action` swaps their visual position so Export is left and Randomize is right.
- **Mobile-First Base**: All base CSS is mobile-optimized (stacked, full-width). Desktop overrides are applied exclusively within media queries.

### 4. CSV Engine
- **Encoding**: Uses UTF-8 with a BOM (Byte Order Mark) for Microsoft Excel compatibility.
- **Dynamic Headers**: Ensures all employee data fields (including Position and DOB) are included in every export.

## 🚀 Future Improvement Roadmap

- [ ] **Configuration Page**: Dedicated settings page for randomization count, weighting, and department targeting.
- [ ] **Offline Mode Detection**: Better handling of connection loss during multi-page scans.
- [ ] **Advanced Randomization**: Options for weighted selection (e.g., specific departments get higher priority).
- [ ] **Custom Column Mapping**: Allow users to re-map columns if LabbReport updates their table structure in the future.
- [ ] **Export Formats**: Add direct PDF export functionality for compliance record-keeping.

---
*Last Updated: March 4, 2026*
