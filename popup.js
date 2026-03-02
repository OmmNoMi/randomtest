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
    const statusCard = setupView.querySelector('.status-card');

    // Hide expand button if we're already in a full tab
    if (window.innerWidth > 500) {
        expandBtn.style.display = 'none';
        document.body.style.width = '100%';
        document.body.style.maxWidth = '600px';
        document.body.style.margin = '0 auto';
    }

    expandBtn.addEventListener('click', () => {
        chrome.tabs.create({ url: 'popup.html' });
    });

    const infoBanner = document.getElementById('info-banner');
    const displayOrgName = document.getElementById('display-org-name');
    const displayTotalRecords = document.getElementById('display-total-records');
    const displayOrgId = document.getElementById('display-org-id');
    const displayUser = document.getElementById('display-user');

    const statusText = document.getElementById('status-text');
    const progressBar = document.getElementById('progress-bar');
    const extractionSummary = document.getElementById('extraction-summary');
    const winnerList = document.getElementById('winner-list');
    const mainEmployeeList = document.getElementById('main-employee-list');
    const poolCountText = document.getElementById('pool-count');
    const countInput = document.getElementById('random-count');

    let allEmployees = [];
    let selectedTypes = new Set();
    let removedIds = new Set();
    let selectedWinners = [];

    // Multi-select elements
    const multiSelect = document.getElementById('type-multi-select');
    const typeOptions = document.getElementById('type-options');
    // Safely get selectBox with null check
    const selectBox = multiSelect ? multiSelect.querySelector('.select-box') : null;

    function showInfoBanner(meta) {
        if (!meta) return;
        displayOrgName.innerText = meta.orgName || '---';
        displayTotalRecords.innerText = meta.totalRecords || '---';
        displayOrgId.innerText = meta.orgId || '---';
        displayUser.innerText = meta.userName || '---';
        infoBanner.classList.remove('hidden');
    }

    // group all initial storage gets at the end of definitions
    function init() {
        chrome.storage.local.get(['lastScan'], (result) => {
            if (result.lastScan) {
                showInfoBanner(result.lastScan);
            }
        });
    }

    init();

    // In popup context, we need to find the correct Labb tab
    async function getLabbTab() {
        // First try the current active tab
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (activeTab && activeTab.url?.includes('labbreport.com/screener/organizationEmployee')) return activeTab;

        // Otherwise find any Labb tab
        const allTabs = await chrome.tabs.query({ url: "*://labbreport.com/screener/organizationEmployee*" });
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
                    setTimeout(() => startScan(tab.id), 200);
                });
            } else {
                startScan(tab.id);
            }
        });
    });

    function startScan(tabId) {
        statusText.innerText = 'Scanner active. Processing...';
        chrome.tabs.sendMessage(tabId, {
            action: 'START_EXTRACTION',
            itemsPerPage: 50 // Automatically set to 50
        }, (response) => {
            if (chrome.runtime.lastError) {
                statusText.innerText = 'Error: Could not start scanner.';
                buildBtn.disabled = false;
                statusCard.classList.remove('processing');
            }
        });
    }

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
                chrome.storage.local.set({ lastScan: message.metadata });
            }

            populateTypeFilters();
            renderIntegratedPool();
            updatePoolCounts();
            setupView.classList.add('hidden');
            selectionView.classList.remove('hidden');
        }
    });

    function populateTypeFilters() {
        const types = [...new Set(allEmployees.map(emp => emp.type))].sort();
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
        const currentList = allEmployees.filter(emp => selectedTypes.size === 0 || selectedTypes.has(emp.type));

        currentList.forEach(emp => {
            const item = document.createElement('div');
            item.className = 'list-item';
            if (removedIds.has(emp.id)) item.style.opacity = '0.35';

            item.innerHTML = `
                <div class="item-info">
                    <h5>${emp.firstName} ${emp.lastName}</h5>
                    <p>${emp.type} | ${emp.organization}</p>
                </div>
                <button class="remove-btn" title="${removedIds.has(emp.id) ? 'Restore' : 'Exclude'}">
                    ${removedIds.has(emp.id) ? '↺' : '×'}
                </button>
            `;

            const btn = item.querySelector('.remove-btn');
            btn.addEventListener('click', () => {
                if (removedIds.has(emp.id)) {
                    removedIds.delete(emp.id);
                    item.style.opacity = '1';
                    btn.innerHTML = '×';
                } else {
                    removedIds.add(emp.id);
                    item.style.opacity = '0.35';
                    btn.innerHTML = '↺';
                }
                updatePoolCounts();
            });

            mainEmployeeList.appendChild(item);
        });
    }

    function getFilteredPool() {
        return allEmployees.filter(emp => {
            const matchesType = selectedTypes.size === 0 || selectedTypes.has(emp.type);
            const isAvailable = !removedIds.has(emp.id);
            return matchesType && isAvailable;
        });
    }

    function updatePoolCounts() {
        const pool = getFilteredPool();
        poolCountText.innerText = `Showing ${pool.length} available`;
        extractionSummary.innerText = `Ready to select from ${pool.length} employees.`;
    }

    // Selection Logic
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

    resetBtn.addEventListener('click', () => {
        winnerView.classList.add('hidden');
        selectionView.classList.remove('hidden');
    });

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

    downloadAllCsvBtn.addEventListener('click', () => {
        const pool = getFilteredPool();
        downloadCSV(pool, 'Labb_Employee_Master_Pool');
    });

    downloadWinnersCsvBtn.addEventListener('click', () => {
        downloadCSV(selectedWinners, 'Random_Testing_Selected_Employees');
    });
});
