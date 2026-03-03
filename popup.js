document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const buildBtn = document.getElementById('build-btn');
    const selectRandomBtn = document.getElementById('select-random-btn');
    const resetBtn = document.getElementById('reset-btn');
    const downloadAllCsvBtn = document.getElementById('download-all-csv');
    const downloadWinnersCsvBtn = document.getElementById('download-winners-csv');

    const expandBtn = document.getElementById('expand-btn');
    const setupView = document.getElementById('setup-view');
    const selectionView = document.getElementById('selection-view');
    const winnerView = document.getElementById('winner-view');
    const rescanBtn = document.getElementById('rescan-btn');
    const statusCard = setupView.querySelector('.status-card');

    if (rescanBtn) {
        rescanBtn.addEventListener('click', async () => {
            // Clear selection results but NOT metadata
            await chrome.storage.local.remove(['allEmployees', 'removedIds', 'rt_scan_state']);
            allEmployees = [];
            removedIds = new Set();
            selectedWinners = [];

            // Visual reset
            setupView.classList.remove('hidden');
            selectionView.classList.add('hidden');
            winnerView.classList.add('hidden');

            statusText.innerText = 'Ready to scan and extract list.';
            progressBar.style.width = '0%';
            statusCard.classList.remove('processing');
            buildBtn.disabled = false;
            buildBtn.innerHTML = '<span class="icon">🔍</span> Build Master List';

            // Trigger scan automatically
            buildBtn.click();
        });
    }

    // Hide expand button if we're already in a full tab
    if (window.innerWidth > 500) {
        expandBtn.style.display = 'none';
        document.body.style.width = '100vw';
        document.body.style.margin = '0';
    }

    expandBtn.addEventListener('click', () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
    });

    const infoBanner = document.getElementById('info-banner');
    const statusText = document.getElementById('status-text');
    const progressBar = document.getElementById('progress-bar');
    const displayOrgName = document.getElementById('display-org-name');
    const displayTotalRecords = document.getElementById('display-total-records');
    const displayOrgId = document.getElementById('display-org-id');
    const displayUser = document.getElementById('display-user');

    const extractionSummary = document.getElementById('extraction-summary');
    const mainEmployeeList = document.getElementById('main-employee-list');
    const poolCountText = document.getElementById('pool-count');
    const countInput = document.getElementById('random-count');
    const winnerList = document.getElementById('winner-list');

    // State
    let allEmployees = [];
    let selectedWinners = [];
    let removedIds = new Set();
    const selectedTypes = new Set();

    // Multi-select logic
    const multiSelect = document.getElementById('type-multi-select');
    const typeOptions = document.getElementById('type-options');
    const selectBox = multiSelect ? multiSelect.querySelector('.select-box') : null;

    function showInfoBanner(meta) {
        if (!meta) return;

        const updateField = (id, val) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.innerText = val || '---';
            if (!val || val === '---' || val.includes('Detecting') || val.includes('Searching')) {
                el.classList.add('detecting');
            } else {
                el.classList.remove('detecting');
            }
        };

        updateField('display-org-name', meta.orgName);
        updateField('display-total-records', meta.totalRecords);
        updateField('display-org-id', meta.orgId);
        updateField('display-user', meta.userName);
    }

    async function init() {
        // 1. Check for active scan state or completed results in storage
        const storage = await chrome.storage.local.get(['rt_scan_state', 'lastScan', 'allEmployees', 'removedIds']);

        if (storage.allEmployees && storage.allEmployees.length > 0) {
            console.log('Popup: Loading completed scan results from storage.');
            allEmployees = storage.allEmployees;
            removedIds = new Set(storage.removedIds || []);
            if (storage.lastScan) showInfoBanner(storage.lastScan);

            populateTypeFilters();
            renderIntegratedPool();
            updatePoolCounts();
            setupView.classList.add('hidden');
            selectionView.classList.remove('hidden');
        } else if (storage.rt_scan_state && storage.rt_scan_state.isScanning) {
            console.log('Popup: Resuming view from active scan state.');
            showInfoBanner(storage.rt_scan_state.metadata);
            statusCard.classList.add('processing');
            buildBtn.disabled = true;
            buildBtn.innerHTML = '<span class="icon">⌛</span> Scanning...';
            statusText.innerText = 'Extraction in progress...';
        } else if (storage.lastScan) {
            showInfoBanner(storage.lastScan);
        }

        // 2. Start heartbeat for metadata detection
        autoDetectMetadata();
    }

    async function autoDetectMetadata() {
        const tab = await getLabbTab();
        if (tab) {
            chrome.tabs.sendMessage(tab.id, { action: 'GET_METADATA' }, async (response) => {
                if (chrome.runtime.lastError || !response) {
                    // Try to inject if script is missing
                    await injectScript(tab.id);
                    // Use a slightly longer timeout after injection attempt
                    setTimeout(autoDetectMetadata, 2000);
                } else if (response.metadata) {
                    showInfoBanner(response.metadata);
                }
            });
        } else {
            // Provide feedback that we're still looking
            showInfoBanner({
                orgName: 'Searching for Labb Page...',
                totalRecords: '---',
                orgId: '---',
                userName: '---'
            });
            setTimeout(autoDetectMetadata, 3000);
        }
    }

    async function injectScript(tabId) {
        try {
            await chrome.scripting.executeScript({
                target: { tabId },
                files: ['content.js']
            });
            console.log('Popup: Successfully injected content script.');
        } catch (e) {
            console.error('Popup: Injections failed:', e);
        }
    }

    init();

    // In popup context, we need to find the correct Labb tab
    async function getLabbTab() {
        // First try the current active tab
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (activeTab && (activeTab.url?.includes('labbreport.com') || activeTab.url?.includes('labb.com'))) return activeTab;

        // Otherwise find any Labb tab
        const allTabs = await chrome.tabs.query({ url: ["*://labbreport.com/*", "*://labb.com/*"] });
        return allTabs[0] || null;
    }

    // Toggle multi-select options
    if (selectBox && typeOptions) {
        selectBox.addEventListener('click', (e) => {
            e.stopPropagation();
            typeOptions.classList.toggle('hidden');
        });

        typeOptions.addEventListener('click', (e) => e.stopPropagation());
    }

    document.addEventListener('click', () => {
        if (typeOptions) typeOptions.classList.add('hidden');
    });

    // Phase 1: Build Master List
    buildBtn.addEventListener('click', async () => {
        buildBtn.disabled = true;
        buildBtn.innerHTML = '<span class="icon">⌛</span> Initializing...';
        statusText.innerText = 'Connecting to page...';
        progressBar.style.width = '10%';
        statusCard.classList.add('processing');

        const tab = await getLabbTab();

        if (!tab) {
            statusText.innerText = 'Error: LabbReport Employee script not found or wrong page open.';
            buildBtn.disabled = false;
            buildBtn.innerHTML = '<span class="icon">🔍</span> Build Master List';
            statusCard.classList.remove('processing');
            return;
        }

        chrome.tabs.sendMessage(tab.id, { action: 'PING' }, (response) => {
            if (chrome.runtime.lastError || !response) {
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['content.js']
                }, () => {
                    if (chrome.runtime.lastError) {
                        statusText.innerText = 'Error: Script injection failed.';
                        buildBtn.disabled = false;
                        statusCard.classList.remove('processing');
                    } else {
                        // Retry start
                        chrome.tabs.sendMessage(tab.id, { action: 'START_EXTRACTION', itemsPerPage: 50 });
                    }
                });
            } else {
                chrome.tabs.sendMessage(tab.id, { action: 'START_EXTRACTION', itemsPerPage: 50 });
            }
        });
    });

    // Handle Progress & Results
    chrome.runtime.onMessage.addListener((message) => {
        if (message.type === 'extraction_progress') {
            progressBar.style.width = `${message.progress}%`;
            statusText.innerText = message.message || `Scanned ${message.count} employees...`;
            buildBtn.innerHTML = `<span class="icon">⌛</span> Scanning... (${message.count})`;

            if (message.metadata) {
                showInfoBanner(message.metadata);
            }
        } else if (message.type === 'extraction_error') {
            statusCard.classList.remove('processing');
            statusText.innerText = `Error: ${message.message}`;
            buildBtn.disabled = false;
            buildBtn.innerHTML = '<span class="icon">🔍</span> Build Master List';
        } else if (message.type === 'extraction_complete') {
            statusCard.classList.remove('processing');
            allEmployees = message.data.map((emp, index) => ({ ...emp, id: index }));

            if (message.metadata) {
                showInfoBanner(message.metadata);
                chrome.storage.local.set({
                    lastScan: message.metadata,
                    allEmployees: allEmployees
                });
            }

            populateTypeFilters();
            renderIntegratedPool();
            updatePoolCounts();
            setupView.classList.add('hidden');
            selectionView.classList.remove('hidden');
        }
    });

    const excludeTerminatedToggle = document.getElementById('exclude-terminated-toggle');
    const downloadPoolCsvBtn = document.getElementById('download-pool-csv');

    if (excludeTerminatedToggle) {
        excludeTerminatedToggle.addEventListener('change', () => {
            renderIntegratedPool();
            updatePoolCounts();
        });
    }

    function populateTypeFilters() {
        const types = [...new Set(allEmployees.map(emp => emp.type || 'Standard'))].sort();
        typeOptions.innerHTML = '';
        selectedTypes.clear();

        types.forEach(type => {
            const div = document.createElement('div');
            div.className = 'option';
            div.innerHTML = `
                <input type="checkbox" value="${type}" id="type-${type}">
                <label for="type-${type}">${type}</label>
            `;
            const checkbox = div.querySelector('input');
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) selectedTypes.add(type);
                else selectedTypes.delete(type);
                updateSelectBoxText();
                renderIntegratedPool();
                updatePoolCounts();
            });
            typeOptions.appendChild(div);
        });
        updateSelectBoxText();
    }

    function updateSelectBoxText() {
        if (!selectBox) return;
        if (selectedTypes.size === 0) {
            selectBox.innerText = 'All Types (Default)';
        } else if (selectedTypes.size === 1) {
            selectBox.innerText = [...selectedTypes][0];
        } else {
            selectBox.innerText = `${selectedTypes.size} Types Selected`;
        }
    }

    function renderIntegratedPool() {
        mainEmployeeList.innerHTML = '';
        const currentList = getFilteredPool(true); // Get list ignoring manual removals for display

        currentList.forEach(emp => {
            const item = document.createElement('div');
            item.className = 'list-item';
            const isRemoved = removedIds.has(emp.uniqueKey);
            if (isRemoved) item.style.opacity = '0.35';

            item.innerHTML = `
                <div class="item-info">
                    <h5>${emp.firstName} ${emp.lastName}</h5>
                    <p>${emp.position || 'Standard'} | ${emp.type || 'Full-time'} | ${emp.status}</p>
                    <p class="org-name-hint">${emp.organization}</p>
                </div>
                <button class="remove-btn" title="${isRemoved ? 'Restore' : 'Exclude'}">
                    ${isRemoved ? '↺' : '×'}
                </button>
            `;

            const btn = item.querySelector('.remove-btn');
            btn.addEventListener('click', () => {
                if (removedIds.has(emp.uniqueKey)) {
                    removedIds.delete(emp.uniqueKey);
                    item.style.opacity = '1';
                    btn.innerHTML = '×';
                } else {
                    removedIds.add(emp.uniqueKey);
                    item.style.opacity = '0.35';
                    btn.innerHTML = '↺';
                }
                updatePoolCounts();
                chrome.storage.local.set({ removedIds: [...removedIds] });
            });

            mainEmployeeList.appendChild(item);
        });
    }

    function getFilteredPool(ignoreManualRemovals = false) {
        return allEmployees.filter(emp => {
            const matchesType = selectedTypes.size === 0 || selectedTypes.has(emp.type || 'Full-time');
            const isTerminated = (emp.status || '').toLowerCase().includes('terminated');
            const statusMatch = !excludeTerminatedToggle.checked || !isTerminated;

            const isManualRemoved = !ignoreManualRemovals && removedIds.has(emp.uniqueKey);
            return matchesType && statusMatch && !isManualRemoved;
        });
    }

    function updatePoolCounts() {
        const pool = getFilteredPool();
        const total = allEmployees.length;

        if (poolCountText) poolCountText.innerText = `${pool.length} available`;

        if (extractionSummary) {
            extractionSummary.innerText = `Ready to select from ${pool.length} employees.`;
            if (pool.length < total) {
                const filteredOut = total - pool.length;
                extractionSummary.innerText += ` (${filteredOut} filtered out)`;
            }
        }
    }

    // Selection Logic
    if (selectRandomBtn) {
        selectRandomBtn.addEventListener('click', () => {
            const pool = getFilteredPool();
            const count = parseInt(countInput.value) || 1;

            if (pool.length === 0) {
                alert('No available employees in the current filtered pool.');
                return;
            }

            const shuffled = [...pool].sort(() => 0.5 - Math.random());
            selectedWinners = shuffled.slice(0, Math.min(count, pool.length));

            showWinners(selectedWinners);
        });
    }

    function showWinners(selected) {
        winnerList.innerHTML = '';
        selected.forEach((emp, index) => {
            const card = document.createElement('div');
            card.className = 'winner-card';
            card.innerHTML = `
                <h4><span style="color:var(--accent)">#${index + 1}</span> ${emp.firstName} ${emp.lastName}</h4>
                <p>${emp.organization} | ${emp.type}</p>
                <p>DOB: ${emp.dob} | Status: ${emp.status}</p>
            `;
            winnerList.appendChild(card);
        });

        selectionView.classList.add('hidden');
        winnerView.classList.remove('hidden');
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            winnerView.classList.add('hidden');
            selectionView.classList.remove('hidden');
        });
    }

    // CSV Exports
    function downloadCSV(data, filename) {
        if (!data.length) return;
        const headers = ['firstName', 'lastName', 'organization', 'type', 'dob', 'phone', 'email', 'status', 'position'];
        const csv = [
            headers.join(','),
            ...data.map(row => headers.map(h => JSON.stringify(row[h] || '')).join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    }

    if (downloadAllCsvBtn) {
        downloadAllCsvBtn.addEventListener('click', () => {
            downloadCSV(allEmployees, 'Labb_Full_Employee_Export');
        });
    }

    if (downloadPoolCsvBtn) {
        downloadPoolCsvBtn.addEventListener('click', () => {
            const pool = getFilteredPool();
            downloadCSV(pool, 'Labb_Filtered_Pool_Selection');
        });
    }

    if (downloadWinnersCsvBtn) {
        downloadWinnersCsvBtn.addEventListener('click', () => {
            downloadCSV(selectedWinners, 'Random_Testing_Selected_Employees');
        });
    }

    const clearScanBtn = document.getElementById('clear-scan-btn');
    if (clearScanBtn) {
        clearScanBtn.addEventListener('click', async () => {
            if (confirm('This will delete all current scan results and reset the app. Are you sure?')) {
                await chrome.storage.local.clear();
                window.location.reload();
            }
        });
    }
});
