document.addEventListener('DOMContentLoaded', () => {
    // --- UI ELEMENTS ---
    const buildBtn = document.getElementById('build-btn');
    const selectRandomBtn = document.getElementById('select-random-btn');
    const resetBtn = document.getElementById('reset-btn');
    const downloadAllCsvBtn = document.getElementById('download-all-csv');
    const downloadPoolCsvBtn = document.getElementById('download-pool-csv');
    const downloadWinnersCsvBtn = document.getElementById('download-winners-csv');
    const downloadRandomCsvBtn = document.getElementById('download-random-csv');
    const rescanBtn = document.getElementById('rescan-btn');
    const rescanBtnFooter = document.getElementById('rescan-btn-footer');
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
    const inclusionFilterOptions = document.getElementById('inclusion-filter-options');
    const activeFilterCount = document.getElementById('active-filter-count');
    const resetFiltersBtn = document.getElementById('reset-filters-btn');
    const includeVisibleBtn = document.getElementById('include-visible-btn');
    const excludeVisibleBtn = document.getElementById('exclude-visible-btn');
    const selectedCountLabel = document.getElementById('selected-count');
    const totalCountLabel = document.getElementById('total-count-label');
    const footerSelectedCount = document.getElementById('footer-selected-count');
    const visibleCountLabel = document.getElementById('visible-count');
    // Random results panel elements
    const poolToolbar = document.getElementById('pool-toolbar');
    const randomResultsPanel = document.getElementById('random-results-panel');
    const randomEmployeeList = document.getElementById('random-employee-list');
    const randomResultsTitle = document.getElementById('random-results-title');
    const randomResultsSubtitle = document.getElementById('random-results-subtitle');
    const randomConfigStrip = document.getElementById('random-config-strip');
    const backToPoolBtn = document.getElementById('back-to-pool-btn');
    const randomExportSep = document.getElementById('random-export-sep');
    const footerRandomCount = document.getElementById('footer-random-count');
    const randomCountVal = document.getElementById('random-count-val');
    const randomTotalVal = document.getElementById('random-total-val');
    // Modal elements
    const randomizeModal = document.getElementById('randomize-modal');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');
    const modalConfirmBtn = document.getElementById('modal-confirm-btn');
    const annualPctSlider = document.getElementById('annual-pct-slider');
    const annualPctBadge = document.getElementById('annual-pct-badge');
    const modalPoolCount = document.getElementById('modal-pool-count');
    const modalAnnualTarget = document.getElementById('modal-annual-target');
    const modalCycleCount = document.getElementById('modal-cycle-count');
    const modalRatioCycle = null; // legacy, replaced by modal-selected-count
    const modalRatioPool = null;   // legacy
    const modalSelectedCount = document.getElementById('modal-selected-count');
    // Panel dropdown elements
    const panelDropdownBtn = document.getElementById('panel-dropdown-btn');
    const panelDropdownMenu = document.getElementById('panel-dropdown-menu');
    const panelOptionsContainer = document.getElementById('panel-options');
    const selectedPanelLabel = document.getElementById('selected-panel-name');
    // --- STATE ---
    let allEmployees = [];
    let selectedWinners = [];
    let randomizedList = [];   // current random selection
    let excludedIds = new Set();
    let selectedStatuses = new Set(['Active']); // Exclude Terminated by default
    let selectedTypes = new Set(); // Empty means all allowed initially
    let selectedInclusion = new Set(['Selected', 'Unselected']);
    let searchQuery = '';
    let isDarkMode = true;
    let filtersLoaded = false;
    // Config state
    let configPct = 60;
    let configFrequency = { label: 'Quarterly', freq: 'quarterly', cycles: 4 };
    let isRandomView = false;
    let currentMetadata = null;
    let panels = [];
    let selectedPanel = '';
    // --- INITIALIZATION ---
    async function init() {
        const themeStore = await chrome.storage.local.get(['theme']);
        if (themeStore.theme === 'light') {
            document.body.classList.remove('dark-mode');
            document.body.classList.add('light-mode');
            isDarkMode = false;
            updateThemeUI();
        }
        const storage = await chrome.storage.local.get(['allEmployees', 'removedIds', 'lastScan', 'rt_scan_state', 'filterStore', 'panels', 'selectedPanel']);
        if (storage.panels) {
            panels = storage.panels;
        }
        if (storage.selectedPanel) {
            selectedPanel = storage.selectedPanel;
            if (selectedPanelLabel) selectedPanelLabel.innerText = selectedPanel;
        }
        if (storage.filterStore) {
            selectedStatuses = new Set(storage.filterStore.statuses || ['Active']);
            selectedTypes = new Set(storage.filterStore.types || []);
            selectedInclusion = new Set(storage.filterStore.inclusion || ['Selected', 'Unselected']);
            searchQuery = storage.filterStore.search || '';
            searchInput.value = searchQuery;
            filtersLoaded = true;
            const selCheck = document.getElementById('filter-selected');
            const unselCheck = document.getElementById('filter-unselected');
            if (selCheck) selCheck.checked = selectedInclusion.has('Selected');
            if (unselCheck) unselCheck.checked = selectedInclusion.has('Unselected');
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
    if (window.innerWidth > 700) {
        expandBtn.classList.add('hidden');
    }
    // --- SCAN LOGIC ---
    async function autoDetectMetadata() {
        const tab = await getLabbTab();
        if (tab) {
            safeSendMessage(tab.id, { action: 'GET_METADATA' }, async (response) => {
                if (!response) {
                    await injectScript(tab.id);
                    // Minimal delay before retry to avoid spamming
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

    function safeSendMessage(tabId, message, callback) {
        if (!tabId) return;
        chrome.tabs.sendMessage(tabId, message, (response) => {
            if (chrome.runtime.lastError) {
                // Ignore "Receiving end does not exist" - it just means script not injected yet
                console.log('RandomizePro: sendMessage error (expected if not injected):', chrome.runtime.lastError.message);
                if (callback) callback(null);
            } else {
                if (callback) callback(response);
            }
        });
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
    async function startDataExtraction() {
        console.log('RandomizePro: Starting data extraction...');
        setScanningUI(true);
        if (statusText) statusText.innerText = 'Initializing extraction...';
        // Artificial delay so the scanning UI is visible for at least 2 seconds
        await new Promise(r => setTimeout(r, 2000));
        const tab = await getLabbTab();
        if (!tab) {
            console.error('RandomizePro: No Labb tab found');
            if (statusText) statusText.innerText = 'Error: LabbReport page not found.';
            setScanningUI(false);
            return;
        }
        console.log('RandomizePro: Sending PING to tab', tab.id);
        safeSendMessage(tab.id, { action: 'PING' }, (response) => {
            if (!response) {
                console.log('RandomizePro: PING failed, injecting script...');
                chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] }, () => {
                    console.log('RandomizePro: Script injected, sending START_EXTRACTION');
                    safeSendMessage(tab.id, { action: 'START_EXTRACTION', itemsPerPage: 50 });
                });
            } else {
                console.log('RandomizePro: PING success, sending START_EXTRACTION');
                safeSendMessage(tab.id, { action: 'START_EXTRACTION', itemsPerPage: 50 });
            }
        });
    }
    function setScanningUI(isScanning) {
        if (isScanning) {
            if (buildBtn) {
                buildBtn.disabled = true;
                buildBtn.innerHTML = '<span class="icon">⌛</span> Scanning...';
            }
            if (statusText) statusText.innerText = 'Extracting data from LabbReport...';
            const statusCard = setupView ? setupView.querySelector('.status-card') : null;
            if (statusCard) statusCard.classList.add('processing');
        } else {
            if (buildBtn) {
                buildBtn.disabled = false;
                buildBtn.innerHTML = '<svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg> Build Master List';
            }
            const statusCard = setupView ? setupView.querySelector('.status-card') : null;
            if (statusCard) statusCard.classList.remove('processing');
        }
    }
    buildBtn.addEventListener('click', startDataExtraction);
    const handleRescan = async () => {
        console.log('RandomizePro: Rescan initiated');
        // Immediate UI feedback
        setupView.classList.remove('hidden');
        selectionView.classList.add('hidden');
        winnerView.classList.add('hidden');
        progressBar.style.width = '0%';
        exitRandomView();
        // Perform storage cleanup
        await chrome.storage.local.remove(['allEmployees', 'removedIds', 'rt_scan_state']);
        allEmployees = [];
        excludedIds = new Set();
        selectedWinners = [];
        randomizedList = [];
        // Start fresh scan immediately
        startDataExtraction();
    };
    rescanBtn.addEventListener('click', handleRescan);
    if (rescanBtnFooter) rescanBtnFooter.addEventListener('click', handleRescan);
    // --- MESSAGE HANDLING ---
    chrome.runtime.onMessage.addListener((message) => {
        if (message.type === 'extraction_progress') {
            if (progressBar) progressBar.style.width = `${message.progress}%`;
            if (statusText) statusText.innerText = `Scanned ${message.count} employees...`;
            if (buildBtn) buildBtn.innerHTML = `<span class="icon">⌛</span> Scanning... (${message.count})`;
            if (message.metadata) showInfoBanner(message.metadata);
        } else if (message.type === 'extraction_complete') {
            allEmployees = message.data;
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
        const statuses = [...new Set(allEmployees.map(e => (e.status || 'Active').trim()))].sort();
        const types = [...new Set(allEmployees.map(e => (e.type || 'Not Specified').trim()))].sort();
        if (selectedTypes.size === 0) {
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
            const isChecked = activeSet.has(opt);
            label.innerHTML = `
                <input type="checkbox" ${isChecked ? 'checked' : ''} data-val="${opt}">
                <span class="check-label">${opt}</span>
            `;
            container.appendChild(label);
        });
    }
    [statusFilterOptions, typeFilterOptions, inclusionFilterOptions].forEach(container => {
        if (!container) return;
        container.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox') {
                const val = e.target.getAttribute('data-val');
                const isStatus = container.id.includes('status');
                const isInclusion = container.id.includes('inclusion');
                let targetSet;
                if (isStatus) targetSet = selectedStatuses;
                else if (isInclusion) targetSet = selectedInclusion;
                else targetSet = selectedTypes;
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
                inclusion: [...selectedInclusion],
                search: searchQuery
            }
        });
    }
    function updateFilterCountBadge() {
        const totalFilters = selectedStatuses.size + selectedTypes.size + (selectedInclusion.size < 2 ? 1 : 0);
        if (activeFilterCount) activeFilterCount.innerText = totalFilters;
    }
    resetFiltersBtn.addEventListener('click', () => {
        selectedStatuses = new Set(['Active']);
        selectedTypes = new Set();
        selectedInclusion = new Set(['Selected', 'Unselected']);
        searchQuery = '';
        searchInput.value = '';
        const selCheck = document.getElementById('filter-selected');
        const unselCheck = document.getElementById('filter-unselected');
        if (selCheck) selCheck.checked = true;
        if (unselCheck) unselCheck.checked = true;
        filtersLoaded = false;
        setupFilters();
        saveFilters();
        renderUI();
    });
    filterDropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        filterMenu.classList.toggle('hidden');
    });
    document.addEventListener('click', (e) => {
        if (filterMenu && !filterMenu.contains(e.target) && e.target !== filterDropdownBtn) {
            filterMenu.classList.add('hidden');
        }
        if (e.target === randomizeModal) {
            closeModal();
        }
        if (panelDropdownMenu && !panelDropdownMenu.contains(e.target) && e.target !== panelDropdownBtn) {
            panelDropdownMenu.classList.add('hidden');
        }
    });
    panelDropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        panelDropdownMenu.classList.toggle('hidden');
    });
    function renderPanelDropdown() {
        if (!panelOptionsContainer) return;
        panelOptionsContainer.innerHTML = '';
        if (panels.length === 0) {
            panelOptionsContainer.innerHTML = '<div style="padding:10px; font-size:0.7rem; color:var(--text-muted);">No panels found.</div>';
            return;
        }
        panels.forEach(panel => {
            const item = document.createElement('div');
            item.className = 'check-item';
            const isActive = selectedPanel === panel;
            item.innerHTML = `
                <span class="check-label ${isActive ? 'active' : ''}">${panel}</span>
            `;
            item.addEventListener('click', () => {
                selectedPanel = panel;
                if (selectedPanelLabel) selectedPanelLabel.innerText = panel;
                chrome.storage.local.set({ selectedPanel });
                panelDropdownMenu.classList.add('hidden');
                // Re-render to show active state
                renderPanelDropdown();
            });
            panelOptionsContainer.appendChild(item);
        });
    }
    // --- GLOBAL KEYBOARD SHORTCUTS ---
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
            filterMenu.classList.add('hidden');
        }
        const isTyping = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName);
        if (e.key === '/' && !isTyping) {
            e.preventDefault();
            searchInput.focus();
            if (searchInput.value.length > 0) searchInput.select();
        }
    });
    // --- VIEW LOGIC ---
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase();
        saveFilters();
        renderUI();
    });
    function getFilteredList() {
        const normStatuses = new Set([...selectedStatuses].map(s => s.toLowerCase().trim()));
        const normTypes = new Set([...selectedTypes].map(t => t.toLowerCase().trim()));
        return allEmployees.filter(emp => {
            const name = `${emp.firstName} ${emp.lastName}`.toLowerCase();
            if (searchQuery && !name.includes(searchQuery)) return false;
            const eStatus = (emp.status || 'Active').toLowerCase().trim();
            if (!normStatuses.has(eStatus)) return false;
            const eType = (emp.type || 'Not Specified').toLowerCase().trim();
            if (!normTypes.has(eType)) return false;
            const isExcluded = excludedIds.has(emp.uniqueKey);
            if (isExcluded && !selectedInclusion.has('Unselected')) return false;
            if (!isExcluded && !selectedInclusion.has('Selected')) return false;
            return true;
        });
    }
    function renderUI() {
        const filtered = getFilteredList();
        const availableCount = allEmployees.filter(emp => !excludedIds.has(emp.uniqueKey)).length;
        if (visibleCountLabel) visibleCountLabel.innerText = filtered.length;
        if (selectedCountLabel) selectedCountLabel.innerText = availableCount;
        if (footerSelectedCount) footerSelectedCount.innerText = availableCount;
        if (totalCountLabel) totalCountLabel.innerText = allEmployees.length;
        const footerAllCount = document.getElementById('footer-all-count');
        if (footerAllCount) footerAllCount.innerText = allEmployees.length;
        if (mainEmployeeList) {
            renderEmployees(filtered);
        }
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
    // ================================================================
    // RANDOMIZE MODAL LOGIC
    // ================================================================
    // Open modal on Randomize click
    selectRandomBtn.addEventListener('click', () => {
        const pool = allEmployees.filter(emp => !excludedIds.has(emp.uniqueKey));
        if (pool.length === 0) {
            alert('No employees in pool. Please include at least one employee before randomizing.');
            return;
        }
        openModal(pool.length);
    });
    function openModal(poolSize) {
        randomizeModal.classList.remove('hidden');
        document.documentElement.style.overflow = 'hidden';
        document.documentElement.style.touchAction = 'none';
        document.body.style.overflow = 'hidden';
        document.body.style.touchAction = 'none';
        renderPanelDropdown();
        updateModalCalculations(poolSize);
    }
    function closeModal() {
        randomizeModal.classList.add('hidden');
        document.documentElement.style.overflow = '';
        document.documentElement.style.touchAction = '';
        document.body.style.overflow = '';
        document.body.style.touchAction = '';
    }
    modalCloseBtn.addEventListener('click', closeModal);
    modalCancelBtn.addEventListener('click', closeModal);
    // ---- Percent Preset Buttons ----
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const pct = parseInt(btn.dataset.pct);
            configPct = pct;
            annualPctSlider.value = pct;
            if (annualPctBadge) annualPctBadge.innerText = pct + '%';
            syncSliderBackground(pct);
            document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateModalCalculations();
        });
    });
    // ---- Slider ----
    annualPctSlider.addEventListener('input', () => {
        const val = parseInt(annualPctSlider.value);
        configPct = val;
        if (annualPctBadge) annualPctBadge.innerText = val + '%';
        syncSliderBackground(val);
        // Update preset active state
        document.querySelectorAll('.preset-btn').forEach(b => {
            b.classList.toggle('active', parseInt(b.dataset.pct) === val);
        });
        updateModalCalculations();
    });
    // ---- Input Event Deleted (Badge Replace) ----

    function syncSliderBackground(pct) {
        annualPctSlider.style.setProperty('--slider-pct', `${pct}%`);
        // Use border-color for the empty track to remain visible in light mode
        annualPctSlider.style.background = `linear-gradient(to right, var(--primary) 0%, var(--primary) ${pct}%, var(--border-color) ${pct}%, var(--border-color) 100%)`;
    }
    // ---- Frequency Buttons ----
    document.querySelectorAll('.freq-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.freq-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            configFrequency = {
                label: btn.querySelector('.freq-name').textContent,
                freq: btn.dataset.freq,
                cycles: parseInt(btn.dataset.cycles)
            };
            updateModalCalculations();
        });
    });
    function updateModalCalculations(poolSize) {
        if (poolSize === undefined) {
            poolSize = allEmployees.filter(emp => !excludedIds.has(emp.uniqueKey)).length;
        }
        const selectedCount = poolSize; // selected = non-excluded employees in pool
        const annualTarget = Math.ceil((poolSize * configPct) / 100);
        const cycleCount = Math.ceil(annualTarget / configFrequency.cycles);
        // Update stat cards
        if (modalPoolCount) modalPoolCount.innerText = allEmployees.length;
        if (modalSelectedCount) modalSelectedCount.innerText = selectedCount;
        if (modalAnnualTarget) modalAnnualTarget.innerText = annualTarget;
        if (modalCycleCount) modalCycleCount.innerText = cycleCount;
    }
    // ---- Confirm -> Generate Random List ----
    modalConfirmBtn.addEventListener('click', () => {
        const pool = allEmployees.filter(emp => !excludedIds.has(emp.uniqueKey));
        const annualTarget = Math.ceil((pool.length * configPct) / 100);
        const cycleCount = Math.max(1, Math.ceil(annualTarget / configFrequency.cycles));
        if (!selectedPanel) {
            alert('Please select a Panel Configuration before randomizing.');
            return;
        }
        // Fisher-Yates shuffle
        const shuffled = [...pool].sort(() => 0.5 - Math.random());
        randomizedList = shuffled.slice(0, Math.min(cycleCount, pool.length));
        closeModal();
        showRandomResults(randomizedList, pool.length, annualTarget, cycleCount);
    });
    // ================================================================
    // RANDOM RESULTS VIEW
    // ================================================================
    function showRandomResults(list, poolSize, annualTarget, cycleCount) {
        isRandomView = true;
        // Hide pool toolbar & employee list
        if (poolToolbar) poolToolbar.classList.add('hidden');
        if (mainEmployeeList) mainEmployeeList.classList.add('hidden');
        // Show random results panel
        if (randomResultsPanel) randomResultsPanel.classList.remove('hidden');
        // Update header text
        if (randomResultsTitle) {
            randomResultsTitle.innerHTML = `RandomizePro: <span style="color:var(--primary)">Selected Employees</span>`;
        }
        if (randomResultsSubtitle) {
            randomResultsSubtitle.innerHTML = `
                <div style="display:flex; flex-direction:column; gap:4px;">
                    <div>${configFrequency.label} • ${configPct}% Annual Rate</div>
                    <div style="font-weight:800; color:var(--text-primary); background:var(--bg-hover); padding:4px 8px; border-radius:6px; display:inline-block; border:1px solid var(--border-color);">
                        Panel: ${selectedPanel}
                    </div>
                </div>
            `;
        }
        // Update selection summary badge
        if (randomCountVal) randomCountVal.innerText = cycleCount;
        if (randomTotalVal) randomTotalVal.innerText = poolSize;
        // Populate config strip
        if (randomConfigStrip) {
            randomConfigStrip.innerHTML = `
                <span class="config-chip"><span class="chip-label">Pool</span><span class="chip-value">${poolSize}</span></span>
                <span class="config-chip"><span class="chip-label">Annual Rate</span><span class="chip-value">${configPct}%</span></span>
                <span class="config-chip"><span class="chip-label">Annual Target</span><span class="chip-value">${annualTarget}</span></span>
                <span class="config-chip"><span class="chip-label">Frequency</span><span class="chip-value">${configFrequency.label}</span></span>
                <span class="config-chip"><span class="chip-label">This Cycle</span><span class="chip-value">${cycleCount}</span></span>
            `;
        }
        // Render passport cards
        renderPassportCards(list);
        // Show Random export button + update count
        if (downloadRandomCsvBtn) downloadRandomCsvBtn.classList.remove('hidden');
        if (randomExportSep) randomExportSep.classList.remove('hidden');
        if (footerRandomCount) footerRandomCount.innerText = list.length;
        // Update Randomize button to say "Re-Randomize"
        if (selectRandomBtn) {
            selectRandomBtn.innerHTML = `
                <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/>
                    <polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/>
                    <line x1="4" y1="4" x2="9" y2="9"/>
                </svg>
                Re-Randomize
            `;
        }
        if (backToPoolBtn) backToPoolBtn.classList.remove('hidden');
        if (rescanBtnFooter) rescanBtnFooter.classList.add('hidden');
    }
    function renderPassportCards(list) {
        if (!randomEmployeeList) return;
        randomEmployeeList.innerHTML = '';
        list.forEach((emp, index) => {
            const statusClass = (emp.status || '').toLowerCase().includes('active') ? 'status-active' : 'status-terminated';
            const orgId = currentMetadata?.orgId || '---';
            const empId = emp.empId || '';
            const passportUrl = `https://labbreport.com/screener/labbPassport/create?organizationEmployee=${empId}&organization_id=${orgId}&autoreason=random&autopanel=${encodeURIComponent(selectedPanel)}`;
            const card = document.createElement('div');
            card.className = 'passport-card';
            card.innerHTML = `
                <div class="passport-card-header">
                    <div class="passport-card-name">${emp.firstName} ${emp.lastName}</div>
                    <span class="passport-card-index">#${index + 1}</span>
                </div>
                <div class="passport-card-tags">
                    <span class="tag">${emp.position || 'Standard'}</span>
                    <div class="tag-dot"></div>
                    <span class="tag">${emp.type || 'General'}</span>
                    <div class="tag-dot"></div>
                    <span class="status-badge ${statusClass}">${emp.status}</span>
                </div>
                ${emp.email ? `<div class="tag" style="font-size:0.58rem; color:var(--text-muted);">${emp.email}</div>` : ''}
                <div class="passport-card-actions">
                    <a href="${passportUrl}" target="_blank" rel="noopener noreferrer" class="passport-btn btn-passport" title="Create Lab Passport for ${emp.firstName} ${emp.lastName}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                            <line x1="12" y1="18" x2="12" y2="12"/>
                            <line x1="9" y1="15" x2="15" y2="15"/>
                        </svg>
                        Create Lab Passport
                    </a>
                </div>
            `;
            randomEmployeeList.appendChild(card);
        });
    }
    function exitRandomView() {
        isRandomView = false;
        // Show pool toolbar & employee list
        if (poolToolbar) poolToolbar.classList.remove('hidden');
        if (mainEmployeeList) mainEmployeeList.classList.remove('hidden');
        // Hide random results panel
        if (randomResultsPanel) randomResultsPanel.classList.add('hidden');
        // Hide random export button
        if (downloadRandomCsvBtn) downloadRandomCsvBtn.classList.add('hidden');
        if (randomExportSep) randomExportSep.classList.add('hidden');
        if (backToPoolBtn) backToPoolBtn.classList.add('hidden');
        // Restore Randomize button label
        if (selectRandomBtn) {
            selectRandomBtn.innerHTML = `
                <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/>
                    <polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/>
                    <line x1="4" y1="4" x2="9" y2="9"/>
                </svg>
                Randomize
            `;
        }
        if (randomResultsSubtitle) randomResultsSubtitle.innerText = 'Lab Passport Generation List';
        if (rescanBtnFooter) rescanBtnFooter.classList.remove('hidden');
    }
    // Back to pool button
    if (backToPoolBtn) {
        backToPoolBtn.addEventListener('click', () => {
            exitRandomView();
        });
    }
    // Legacy reset button (winner view)
    resetBtn.addEventListener('click', () => {
        winnerView.classList.add('hidden');
        selectionView.classList.remove('hidden');
    });
    // --- CSV ENGINE ---
    async function downloadCSV(data, filename) {
        if (!data.length) return;
        const BOM = '\uFEFF';
        const headers = ['First Name', 'Last Name', 'Organization', 'Type', 'DOB', 'Phone', 'Email', 'Status', 'Position', 'Passport Link'];
        let csvContent = BOM + headers.map(v => `"${(v || '').replace(/"/g, '""')}"`).join(',') + '\n';
        const isRandomMode = filename.includes('Random');
        if (isRandomMode) {
            // Add Panel header
            csvContent = BOM + [...headers.slice(0, 9), 'Panel', 'Passport Link'].map(v => `"${(v || '').replace(/"/g, '""')}"`).join(',') + '\n';
        }
        const rows = data.map(e => {
            const orgId = currentMetadata?.orgId || '---';
            let passportUrl = e.empId ? `https://labbreport.com/screener/labbPassport/create?organizationEmployee=${e.empId}&organization_id=${orgId}&autoreason=random` : '';
            if (isRandomMode) {
                passportUrl += `&autopanel=${encodeURIComponent(selectedPanel)}`;
                return [
                    e.firstName, e.lastName, e.organization, e.type, e.dob, e.phone, e.email, e.status, e.position, selectedPanel, passportUrl
                ].map(v => `"${(v || '').replace(/"/g, '""')}"`).join(',');
            }
            return [
                e.firstName, e.lastName, e.organization, e.type, e.dob, e.phone, e.email, e.status, e.position, passportUrl
            ].map(v => `"${(v || '').replace(/"/g, '""')}"`).join(',');
        }).join('\n');
        csvContent += rows;
        let filenameWithDate = `${filename} - ${new Date().toISOString().split('T')[0]}.csv`;
        if (isRandomMode) {
            const orgName = (currentMetadata?.orgName || 'Organization').trim();
            const panelSuffix = selectedPanel.replace(/[^a-z0-9]/gi, '_');
            filenameWithDate = `RandomizePro_Selection_${orgName}_Random_${configPct}_${panelSuffix}_${new Date().toISOString().split('T')[0]}.csv`;
        }
        console.log(`RandomizePro: Preparing to download CSV as: ${filenameWithDate}`);
        try {
            // BEST METHOD: File System Access API
            // Bypasses Chrome download manager UUID renaming bugs entirely by writing directly to disk
            if (window.showSaveFilePicker) {
                const handle = await window.showSaveFilePicker({
                    suggestedName: filenameWithDate,
                    types: [{
                        description: 'CSV Data File',
                        accept: { 'text/csv': ['.csv'] }
                    }]
                });
                const writable = await handle.createWritable();
                // Send the raw text data into the file stream
                await writable.write(csvContent);
                await writable.close();
                console.log('RandomizePro: Saved successfully via File System Stream.');
                return;
            }
        } catch (err) {
            // If the user simply clicked "Cancel" on the native Save dialogue, ignore.
            if (err.name === 'AbortError') return;
            console.warn("RandomizePro: FilePicker failed, trying fallback systems:", err);
        }
        // Encode the string to Base64 to bypass Chrome's Blob UUID file naming issues
        const base64data = btoa(unescape(encodeURIComponent(csvContent)));
        const dataUrl = `data:text/csv;charset=utf-8;base64,${base64data}`;
        if (chrome && chrome.downloads && chrome.downloads.download) {
            console.log('RandomizePro: Triggering chrome.downloads API...');
            chrome.downloads.download({
                url: dataUrl,
                filename: filenameWithDate,
                saveAs: true // FORCES the save dialog so you can verify it is a .csv
            }, (downloadId) => {
                if (chrome.runtime.lastError) {
                    console.error("RandomizePro: Download error:", chrome.runtime.lastError);
                    fallbackDownload(dataUrl, filenameWithDate);
                } else {
                    console.log("RandomizePro: Download successful with ID:", downloadId);
                }
            });
        } else {
            console.warn("RandomizePro: Downloads API unavailable, using fallback.");
            fallbackDownload(dataUrl, filenameWithDate);
        }
        function fallbackDownload(url, fname) {
            const link = document.createElement("a");
            link.href = url;
            link.download = fname;
            document.body.appendChild(link);
            link.click();
            setTimeout(() => document.body.removeChild(link), 100);
        }
    }
    function getBaseFilename() {
        return (currentMetadata?.orgName || 'Organization').trim();
    }
    downloadAllCsvBtn.addEventListener('click', () => downloadCSV(allEmployees, `${getBaseFilename()} - All`));
    downloadPoolCsvBtn.addEventListener('click', () => {
        const pool = allEmployees.filter(emp => !excludedIds.has(emp.uniqueKey));
        downloadCSV(pool, `${getBaseFilename()} - Selected`);
    });
    if (downloadWinnersCsvBtn) {
        downloadWinnersCsvBtn.addEventListener('click', () => downloadCSV(selectedWinners, `${getBaseFilename()} - Random ${configPct}% - ${configFrequency.label.trim()}`));
    }
    if (downloadRandomCsvBtn) {
        downloadRandomCsvBtn.addEventListener('click', () => {
            downloadCSV(randomizedList, `${getBaseFilename()} - Random ${configPct}% - ${configFrequency.label.trim()}`);
        });
    }
    // --- UTILS ---
    async function showInfoBanner(meta) {
        if (!meta) return;
        currentMetadata = meta;
        const orgNameEl = document.getElementById('display-org-name');
        const orgIdEl = document.getElementById('display-org-id');
        const userEl = document.getElementById('display-user');
        const modalOrgNameEl = document.getElementById('modal-org-name');
        if (orgNameEl) orgNameEl.innerText = meta.orgName || '---';
        if (modalOrgNameEl) modalOrgNameEl.innerText = meta.orgName || 'Organization';
        if (orgIdEl) orgIdEl.innerText = meta.orgId || '---';
        if (userEl) userEl.innerText = meta.userName || '---';

        // Auto-scrape panels whenever we get metadata
        if (meta.orgId && meta.orgId !== '---') {
            const tab = await getLabbTab();
            if (tab) {
                safeSendMessage(tab.id, { action: 'SCRAPE_PANELS', orgId: meta.orgId }, (response) => {
                    if (response && response.panels) {
                        panels = response.panels;
                        chrome.storage.local.set({ panels });
                        renderPanelDropdown();
                    }
                });
            }
        }
    }
    // Initialize slider background on load
    syncSliderBackground(configPct);
    init();
});
