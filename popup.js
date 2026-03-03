document.addEventListener('DOMContentLoaded', () => {
    // --- UI ELEMENTS ---
    const buildBtn = document.getElementById('build-btn');
    const selectRandomBtn = document.getElementById('select-random-btn');
    const resetBtn = document.getElementById('reset-btn');
    const downloadAllCsvBtn = document.getElementById('download-all-csv');
    const downloadPoolCsvBtn = document.getElementById('download-pool-csv');
    const downloadWinnersCsvBtn = document.getElementById('download-winners-csv');
    const rescanBtn = document.getElementById('rescan-btn');
    const themeToggle = document.getElementById('theme-toggle');
    const expandBtn = document.getElementById('expand-btn');

    const setupView = document.getElementById('setup-view');
    const selectionView = document.getElementById('selection-view');
    const winnerView = document.getElementById('winner-view');
    const statusText = document.getElementById('status-text');
    const progressBar = document.getElementById('progress-bar');
    const mainEmployeeList = document.getElementById('main-employee-list');
    const winnerList = document.getElementById('winner-list');

    const searchInput = document.getElementById('employee-search');
    const filterDropdownBtn = document.getElementById('filter-dropdown-btn');
    const filterMenu = document.getElementById('filter-menu');
    const statusFilterOptions = document.getElementById('status-filter-options');
    const typeFilterOptions = document.getElementById('type-filter-options');
    const activeFilterCount = document.getElementById('active-filter-count');
    const resetFiltersBtn = document.getElementById('reset-filters-btn');

    const includeVisibleBtn = document.getElementById('include-visible-btn');
    const excludeVisibleBtn = document.getElementById('exclude-visible-btn');

    const selectedCountLabel = document.getElementById('selected-count');
    const totalCountLabel = document.getElementById('total-count-label');
    const footerSelectedCount = document.getElementById('footer-selected-count');
    const visibleCountLabel = document.getElementById('visible-count');
    const viewportBanner = document.getElementById('viewport-banner');

    const randomCountInput = document.getElementById('random-count');

    // --- STATE ---
    let allEmployees = [];
    let selectedWinners = [];
    let excludedIds = new Set();
    let selectedStatuses = new Set(['Active']); // Exclude Terminated by default
    let selectedTypes = new Set(); // Empty means all allowed initially
    let searchQuery = '';
    let isDarkMode = true;

    let filtersLoaded = false;

    // --- INITIALIZATION ---
    async function init() {
        // Load theme
        const themeStore = await chrome.storage.local.get(['theme']);
        if (themeStore.theme === 'light') {
            document.body.classList.remove('dark-mode');
            document.body.classList.add('light-mode');
            isDarkMode = false;
            updateThemeUI();
        }

        // Load data
        const storage = await chrome.storage.local.get(['allEmployees', 'removedIds', 'lastScan', 'rt_scan_state', 'filterStore']);

        if (storage.filterStore) {
            selectedStatuses = new Set(storage.filterStore.statuses || ['Active']);
            selectedTypes = new Set(storage.filterStore.types || []);
            searchQuery = storage.filterStore.search || '';
            searchInput.value = searchQuery;
            filtersLoaded = true;
        }

        if (storage.allEmployees && storage.allEmployees.length > 0) {
            allEmployees = storage.allEmployees;
            excludedIds = new Set(storage.removedIds || []);

            showInfoBanner(storage.lastScan);
            setupFilters();
            renderUI();

            setupView.classList.add('hidden');
            selectionView.classList.remove('hidden');
        } else if (storage.rt_scan_state && storage.rt_scan_state.isScanning) {
            showInfoBanner(storage.rt_scan_state.metadata);
            setScanningUI(true);
        } else if (storage.lastScan) {
            showInfoBanner(storage.lastScan);
        }

        autoDetectMetadata();
    }

    // --- THEME LOGIC ---
    themeToggle.addEventListener('click', () => {
        isDarkMode = !isDarkMode;
        if (isDarkMode) {
            document.body.classList.remove('light-mode');
            document.body.classList.add('dark-mode');
            chrome.storage.local.set({ theme: 'dark' });
        } else {
            document.body.classList.remove('dark-mode');
            document.body.classList.add('light-mode');
            chrome.storage.local.set({ theme: 'light' });
        }
        updateThemeUI();
    });

    function updateThemeUI() {
        const modeDark = themeToggle.querySelector('.mode-dark');
        const modeLight = themeToggle.querySelector('.mode-light');
        if (isDarkMode) {
            modeDark.classList.remove('hidden');
            modeLight.classList.add('hidden');
        } else {
            modeDark.classList.add('hidden');
            modeLight.classList.remove('hidden');
        }
    }

    // --- NAVIGATION ---
    expandBtn.addEventListener('click', () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
    });

    if (window.innerWidth > 500) {
        expandBtn.classList.add('hidden');
    }

    // --- SCAN LOGIC ---
    async function autoDetectMetadata() {
        const tab = await getLabbTab();
        if (tab) {
            chrome.tabs.sendMessage(tab.id, { action: 'GET_METADATA' }, async (response) => {
                if (chrome.runtime.lastError || !response) {
                    await injectScript(tab.id);
                    setTimeout(autoDetectMetadata, 2000);
                } else if (response.metadata) {
                    showInfoBanner(response.metadata);
                }
            });
        } else {
            showInfoBanner({ orgName: 'Searching...', orgId: '---', totalRecords: '---', userName: '---' });
            setTimeout(autoDetectMetadata, 3000);
        }
    }

    async function getLabbTab() {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (activeTab && (activeTab.url?.includes('labbreport.com') || activeTab.url?.includes('labb.com'))) return activeTab;
        const allTabs = await chrome.tabs.query({ url: ["*://labbreport.com/*", "*://labb.com/*"] });
        return allTabs[0] || null;
    }

    async function injectScript(tabId) {
        try {
            await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
        } catch (e) { console.error('Injection failed:', e); }
    }

    buildBtn.addEventListener('click', async () => {
        setScanningUI(true);
        const tab = await getLabbTab();
        if (!tab) {
            statusText.innerText = 'Error: LabbReport page not found.';
            setScanningUI(false);
            return;
        }

        chrome.tabs.sendMessage(tab.id, { action: 'PING' }, (response) => {
            if (chrome.runtime.lastError || !response) {
                chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] }, () => {
                    chrome.tabs.sendMessage(tab.id, { action: 'START_EXTRACTION', itemsPerPage: 50 });
                });
            } else {
                chrome.tabs.sendMessage(tab.id, { action: 'START_EXTRACTION', itemsPerPage: 50 });
            }
        });
    });

    function setScanningUI(isScanning) {
        if (isScanning) {
            buildBtn.disabled = true;
            buildBtn.innerHTML = '<span class="icon">⌛</span> Scanning...';
            statusText.innerText = 'Extracting data from LabbReport...';
            setupView.querySelector('.status-card').classList.add('processing');
        } else {
            buildBtn.disabled = false;
            buildBtn.innerHTML = '<svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg> Build Master List';
            setupView.querySelector('.status-card').classList.remove('processing');
        }
    }

    rescanBtn.addEventListener('click', async () => {
        if (confirm('Clear current results and begin a fresh scan?')) {
            await chrome.storage.local.remove(['allEmployees', 'removedIds', 'rt_scan_state']);
            allEmployees = [];
            excludedIds = new Set();
            selectedWinners = [];

            setupView.classList.remove('hidden');
            selectionView.classList.add('hidden');
            winnerView.classList.add('hidden');

            progressBar.style.width = '0%';
            setScanningUI(false);
            buildBtn.click();
        }
    });

    // --- MESSAGE HANDLING ---
    chrome.runtime.onMessage.addListener((message) => {
        if (message.type === 'extraction_progress') {
            progressBar.style.width = `${message.progress}%`;
            statusText.innerText = `Scanned ${message.count} employees...`;
            buildBtn.innerHTML = `<span class="icon">⌛</span> Scanning... (${message.count})`;
            if (message.metadata) showInfoBanner(message.metadata);
        } else if (message.type === 'extraction_complete') {
            allEmployees = message.data;

            // Auto-exclude Terminated on first scan
            excludedIds = new Set();
            allEmployees.forEach(emp => {
                if ((emp.status || '').toLowerCase().includes('terminated')) {
                    excludedIds.add(emp.uniqueKey);
                }
            });

            chrome.storage.local.set({
                allEmployees,
                removedIds: [...excludedIds],
                lastScan: message.metadata
            });

            showInfoBanner(message.metadata);
            setupFilters();
            renderUI();

            setupView.classList.add('hidden');
            selectionView.classList.remove('hidden');
        } else if (message.type === 'extraction_error') {
            statusText.innerText = `Error: ${message.message}`;
            setScanningUI(false);
        }
    });

    // --- FILTER SETUP ---
    function setupFilters() {
        // Collect all unique statuses and types, ensuring we handle blanks consistently
        const statuses = [...new Set(allEmployees.map(e => (e.status || 'Active').trim()))].sort();
        const types = [...new Set(allEmployees.map(e => (e.type || 'Not Specified').trim()))].sort();

        // If this is a fresh load (no saved filters) and selection is empty
        // We want to default to selecting ALL available types
        if (!filtersLoaded && selectedTypes.size === 0) {
            types.forEach(t => selectedTypes.add(t));
        }

        renderCheckboxGroup(statusFilterOptions, statuses, selectedStatuses, 'status');
        renderCheckboxGroup(typeFilterOptions, types, selectedTypes, 'type');
        updateFilterCountBadge();
    }

    function renderCheckboxGroup(container, options, activeSet, name) {
        container.innerHTML = '';
        options.forEach(opt => {
            const label = document.createElement('label');
            label.className = 'check-item';
            // Ensure we check the active set case-insensitively or exactly as saved
            const isChecked = activeSet.has(opt);
            label.innerHTML = `
                <input type="checkbox" ${isChecked ? 'checked' : ''} data-val="${opt}">
                <span class="check-label">${opt}</span>
            `;
            container.appendChild(label);
        });
    }

    // Delegated listener for filter groups
    [statusFilterOptions, typeFilterOptions].forEach(container => {
        container.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox') {
                const val = e.target.getAttribute('data-val');
                const isStatus = container.id.includes('status');
                const targetSet = isStatus ? selectedStatuses : selectedTypes;

                if (e.target.checked) targetSet.add(val);
                else targetSet.delete(val);

                saveFilters();
                updateFilterCountBadge();
                renderUI();
            }
        });
    });

    function saveFilters() {
        chrome.storage.local.set({
            filterStore: {
                statuses: [...selectedStatuses],
                types: [...selectedTypes],
                search: searchQuery
            }
        });
    }

    function updateFilterCountBadge() {
        const totalFilters = selectedStatuses.size + selectedTypes.size;
        activeFilterCount.innerText = totalFilters;
    }

    // --- DROPDOWN CONTROL ---
    resetFiltersBtn.addEventListener('click', () => {
        selectedStatuses = new Set(['Active']);
        selectedTypes = new Set();
        searchQuery = '';
        searchInput.value = '';
        filtersLoaded = false; // Allow re-populating types from data
        saveFilters();
        setupFilters();
        renderUI();
    });

    filterDropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        filterMenu.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
        if (filterMenu && !filterMenu.contains(e.target)) {
            filterMenu.classList.add('hidden');
        }
    });

    // --- GLOBAL KEYBOARD SHORTCUTS ---
    document.addEventListener('keydown', (e) => {
        // "/" shortcut to focus search
        const isTyping = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName);
        if (e.key === '/' && !isTyping) {
            e.preventDefault();
            searchInput.focus();
            if (searchInput.value.length > 0) {
                searchInput.select(); // Highlight existing text
            }
        }
    });

    // --- VIEW LOGIC ---
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase();
        saveFilters();
        renderUI();
    });

    function getFilteredList() {
        // Create normalized sets for fast case-insensitive lookup
        const normStatuses = new Set([...selectedStatuses].map(s => s.toLowerCase().trim()));
        const normTypes = new Set([...selectedTypes].map(t => t.toLowerCase().trim()));

        return allEmployees.filter(emp => {
            // Text Search
            const name = `${emp.firstName} ${emp.lastName}`.toLowerCase();
            if (searchQuery && !name.includes(searchQuery)) return false;

            // Status Filter (Normalized)
            const eStatus = (emp.status || 'Active').toLowerCase().trim();
            if (!normStatuses.has(eStatus)) return false;

            // Type Filter (Normalized)
            const eType = (emp.type || 'Not Specified').toLowerCase().trim();
            if (!normTypes.has(eType)) return false;

            return true;
        });
    }

    function renderUI() {
        const filtered = getFilteredList();
        const availableCount = allEmployees.filter(emp => !excludedIds.has(emp.uniqueKey)).length;

        // Update Labels with defensive checks
        if (visibleCountLabel) visibleCountLabel.innerText = filtered.length;
        if (selectedCountLabel) selectedCountLabel.innerText = availableCount;
        if (footerSelectedCount) footerSelectedCount.innerText = availableCount;
        if (totalCountLabel) totalCountLabel.innerText = allEmployees.length;

        renderEmployees(filtered);
    }

    function renderEmployees(list) {
        mainEmployeeList.innerHTML = '';
        const emptyState = selectionView ? selectionView.querySelector('.empty-state') : null;

        if (list.length === 0) {
            if (emptyState) emptyState.classList.remove('hidden');
            return;
        } else {
            if (emptyState) emptyState.classList.add('hidden');
        }

        list.forEach(emp => {
            const isExcluded = excludedIds.has(emp.uniqueKey);
            const card = document.createElement('div');
            card.className = `employee-card ${isExcluded ? 'excluded' : ''}`;

            const statusClass = (emp.status || '').toLowerCase().includes('active') ? 'status-active' : 'status-terminated';

            card.innerHTML = `
                <div class="card-main">
                    <span class="card-name">${emp.firstName} ${emp.lastName}</span>
                    <div class="card-tags">
                        <span class="tag">${emp.position || 'Standard'}</span>
                        <div class="tag-dot"></div>
                        <span class="tag">${emp.type}</span>
                        <div class="tag-dot"></div>
                        <span class="status-badge ${statusClass}">${emp.status}</span>
                    </div>
                </div>
                <div class="card-actions">
                    <button class="toggle-inclusion ${isExcluded ? 'btn-add' : 'btn-remove'}" title="${isExcluded ? 'Restore to selection' : 'Exclude from selection'}">
                        ${isExcluded
                    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>'
                    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'}
                    </button>
                </div>
            `;

            card.querySelector('.toggle-inclusion').addEventListener('click', () => {
                if (excludedIds.has(emp.uniqueKey)) excludedIds.delete(emp.uniqueKey);
                else excludedIds.add(emp.uniqueKey);

                chrome.storage.local.set({ removedIds: [...excludedIds] });
                renderUI();
            });

            mainEmployeeList.appendChild(card);
        });
    }

    // --- BATCH ACTIONS ---
    includeVisibleBtn.addEventListener('click', () => {
        const filtered = getFilteredList();
        filtered.forEach(emp => excludedIds.delete(emp.uniqueKey));
        chrome.storage.local.set({ removedIds: [...excludedIds] });
        renderUI();
    });

    excludeVisibleBtn.addEventListener('click', () => {
        const filtered = getFilteredList();
        filtered.forEach(emp => excludedIds.add(emp.uniqueKey));
        chrome.storage.local.set({ removedIds: [...excludedIds] });
        renderUI();
    });

    // --- SELECTION ACTION ---
    selectRandomBtn.addEventListener('click', () => {
        const pool = allEmployees.filter(emp => !excludedIds.has(emp.uniqueKey));
        const count = parseInt(randomCountInput.value) || 1;

        if (pool.length === 0) {
            alert('No employees selected for selection. Please include some common employees in the pool.');
            return;
        }

        const shuffled = [...pool].sort(() => 0.5 - Math.random());
        selectedWinners = shuffled.slice(0, Math.min(count, pool.length));

        showWinners(selectedWinners);
    });

    function showWinners(winners) {
        winnerList.innerHTML = '';
        winners.forEach((emp, index) => {
            const card = document.createElement('div');
            card.className = 'winner-card';
            card.innerHTML = `
                <p class="label">#${index + 1}</p>
                <h4>${emp.firstName} ${emp.lastName}</h4>
                <p>${emp.organization} | ${emp.type}</p>
                <div style="display:flex; justify-content:space-between; margin-top:4px;">
                    <span class="tag">DOB: ${emp.dob}</span>
                    <span class="tag">${emp.phone || ''}</span>
                </div>
            `;
            winnerList.appendChild(card);
        });

        selectionView.classList.add('hidden');
        winnerView.classList.remove('hidden');
    }

    resetBtn.addEventListener('click', () => {
        winnerView.classList.add('hidden');
        selectionView.classList.remove('hidden');
    });

    // --- CSV ENGINE ---
    function downloadCSV(data, filename) {
        if (!data.length) return;
        // Include BOM for Excel
        const BOM = '\uFEFF';
        const headers = ['First Name', 'Last Name', 'Organization', 'Type', 'DOB', 'Phone', 'Email', 'Status', 'Position'];
        const rows = data.map(e => [
            e.firstName, e.lastName, e.organization, e.type, e.dob, e.phone, e.email, e.status, e.position
        ].map(v => `"${(v || '').replace(/"/g, '""')}"`).join(','));

        const csvContent = BOM + headers.join(',') + '\n' + rows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    }

    downloadAllCsvBtn.addEventListener('click', () => downloadCSV(allEmployees, 'Labb_Full_Master_Pool'));
    downloadPoolCsvBtn.addEventListener('click', () => {
        const pool = allEmployees.filter(emp => !excludedIds.has(emp.uniqueKey));
        downloadCSV(pool, 'Labb_Selected_Selection_Pool');
    });
    downloadWinnersCsvBtn.addEventListener('click', () => downloadCSV(selectedWinners, 'Random_Testing_Results'));

    // --- UTILS ---
    function showInfoBanner(meta) {
        if (!meta) return;
        document.getElementById('display-org-name').innerText = meta.orgName || '---';
        document.getElementById('display-org-id').innerText = meta.orgId || '---';
        document.getElementById('display-total-records').innerText = meta.totalRecords || '---';
        document.getElementById('display-user').innerText = meta.userName || '---';
    }

    init();
});
