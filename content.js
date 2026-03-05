(function () {
    console.log('RandomTesting: Engine Initialized.');

    class LabbScanner {
        constructor() {
            this.data = [];
            this.isScanning = false;
            this.metadata = {};
        }

        async init() {
            // Check if we need to resume a scan
            const result = await chrome.storage.local.get(['rt_scan_state']);
            if (result.rt_scan_state && result.rt_scan_state.isScanning) {
                console.log('RandomTesting: Resuming scan from storage...');
                this.isScanning = true;
                this.data = result.rt_scan_state.data || [];
                this.metadata = result.rt_scan_state.metadata || {};

                // Process current page
                await this.processCurrentPage();
            }
        }

        async start(itemsPerPage = 50) {
            console.log('RandomTesting: Scanner.start() called with itemsPerPage:', itemsPerPage);
            if (this.isScanning) {
                console.warn('RandomTesting: Scanner already running, skipping start');
                return;
            }
            this.isScanning = true;
            this.data = [];

            try {
                // Step 0: Extract Metadata
                this.metadata = this.extractMetadata();
                this.sendProgress('Initializing engine...', 5);

                // Step 1: Maximize page size
                // This might trigger a reload. We save state first.
                await this.saveState();
                await this.setPageSize(itemsPerPage);

                // If no reload happened, continue
                await this.processCurrentPage();
            } catch (err) {
                console.error('RandomTesting: Scan failed:', err);
                this.handleError(err);
            }
        }

        async processCurrentPage() {
            console.log('RandomTesting: Processing current page...');
            try {
                // Step 1: Scan current page
                const pageResults = this.parseTable();

                pageResults.forEach((emp, pageIndex) => {
                    // We generate a unique ID based on values + position to allow "duplicates" if they exist on the page
                    const uniqueKey = `${emp.firstName}-${emp.lastName}-${emp.dob}-${this.data.length + pageIndex}`;
                    emp.uniqueKey = uniqueKey;
                    this.data.push(emp);
                });

                this.sendProgress(`Read ${this.data.length} records. Checking for next page...`);

                // Step 2: Look for Next Button
                const nextBtn = document.querySelector('ul.pagination li.next:not(.disabled) a') ||
                    [...document.querySelectorAll('.pagination a')].find(a => a.innerText.includes('›'));

                if (nextBtn) {
                    await this.saveState();
                    console.log('RandomTesting: Moving to next page...');
                    nextBtn.click();
                } else {
                    this.finish();
                }
            } catch (err) {
                this.handleError(err);
            }
        }

        extractMetadata() {
            const urlParams = new URLSearchParams(window.location.search);
            const orgId = urlParams.get('organization_id') || '---';

            const orgNameElement = document.querySelector('a.text-info > b');
            const h3 = document.querySelector('h3');
            const userElement = document.querySelector('a.dropdown-toggle');
            const paginationSummary = document.querySelector('.pull-right strong, .pagination-summary');

            let totalRecords = '---';
            const h3Text = h3?.innerText.trim() || '';
            const paginationRegex = /\d+\s+of\s+\d+/i;

            if (paginationRegex.test(h3Text)) {
                totalRecords = h3Text.match(paginationRegex)[0];
            } else if (paginationSummary && paginationRegex.test(paginationSummary.innerText)) {
                totalRecords = paginationSummary.innerText.match(paginationRegex)[0];
            }

            let orgName = orgNameElement?.innerText.trim() || 'Unknown Org';
            if (orgName === 'Unknown Org') {
                const tableOrg = document.querySelector('table tbody tr td:first-child')?.innerText.trim();
                if (tableOrg && !paginationRegex.test(tableOrg)) orgName = tableOrg;
            }

            orgName = orgName.replace('Employees of', '').split('|')[0].replace(/^\|\s*/, '').trim();
            const userName = userElement?.innerText.trim() || 'Portal User';

            return { orgId, orgName, userName, totalRecords, scanDate: new Date().toLocaleString() };
        }

        async setPageSize(size) {
            const selector = document.querySelector('select[name="items_per_page"]') ||
                [...document.querySelectorAll('select')].find(s => s.innerText.includes('10\n25\n50'));

            if (selector && selector.value !== size.toString()) {
                selector.value = size.toString();
                selector.dispatchEvent(new Event('change', { bubbles: true }));
                await this.waitForStability(3000);
            }
        }

        parseTable() {
            const rows = document.querySelectorAll('table tbody tr');
            console.log(`RandomTesting: parseTable starting for ${rows.length} rows`);
            const results = [];
            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                // Labb Columns: Org(0), First(1), Last(2), DOB(3), Phone(4), Position/Email(5), Type(6), Actions(7)
                if (cells.length >= 7) {
                    let rawType = cells[6]?.innerText.trim() || '';
                    let typeValue = 'Not Specified';

                    if (rawType) {
                        typeValue = rawType;
                        // Normalize common types
                        const lt = rawType.toLowerCase();
                        if (lt.includes('contract')) typeValue = 'Contract';
                        else if (lt.includes('full-time')) typeValue = 'Full-time';
                        else if (lt.includes('part-time')) typeValue = 'Part-time';
                        else if (lt.includes('pre-hire') || lt.includes('prehire')) typeValue = 'Pre-hire';
                    }

                    // Extract Employee ID - scan all interactive elements in the row
                    let empId = '';

                    // First check the row itself for data attributes
                    empId = row.getAttribute('data-id') || row.getAttribute('data-name') || '';

                    if (!empId) {
                        const interactiveEls = row.querySelectorAll('a, button');
                        for (const el of interactiveEls) {
                            // Check link data attributes first
                            empId = el.getAttribute('data-id') || el.getAttribute('data-name') || '';
                            if (empId) break;

                            const url = (el.href || '') + ' ' + (el.getAttribute('href') || '') + ' ' + (el.getAttribute('onclick') || '');

                            // Pattern 1: Query parameter (e.g., ?organizationEmployee=ID)
                            const queryMatch = url.match(/organizationEmployee=([^&'\"\s)]+)/);
                            if (queryMatch) {
                                empId = queryMatch[1];
                                break;
                            }

                            // Pattern 2: Path segment (e.g., /organizationEmployee/ID/edit)
                            const pathMatch = url.match(/\/organizationEmployee\/([^\/\?\&'\"\s]+)/);
                            if (pathMatch) {
                                empId = pathMatch[1];
                                break;
                            }
                        }
                    }

                    if (empId) {
                        console.log(`RandomTesting: Found ID ${empId} for ${cells[1]?.innerText} ${cells[2]?.innerText}`);
                    } else {
                        console.warn('RandomTesting: Could not find Employee ID for', cells[1]?.innerText, cells[2]?.innerText);
                    }

                    const cell5Text = cells[5]?.innerText.trim() || '';
                    let emailValue = '';
                    let positionValue = 'General';

                    if (cell5Text.includes('@')) {
                        emailValue = cell5Text;
                    } else if (cell5Text) {
                        positionValue = cell5Text;
                    }

                    const rowData = {
                        organization: cells[0]?.innerText.trim(),
                        firstName: cells[1]?.innerText.trim(),
                        lastName: cells[2]?.innerText.trim(),
                        dob: cells[3]?.innerText.trim(),
                        phone: cells[4]?.innerText.trim(),
                        email: emailValue,
                        position: positionValue,
                        type: typeValue,
                        status: 'Active',
                        empId: empId // Store the ID for direct linking
                    };

                    // Check for termination indicators
                    const isTerminated = rowData.type.toUpperCase().includes('TERMINATED') ||
                        row.classList.contains('terminated') ||
                        row.innerText.toUpperCase().includes('TERMINATED');

                    if (isTerminated) {
                        rowData.status = 'Terminated';
                        // Re-evaluate 'type' if it was carrying only the status
                        if (rowData.type.toUpperCase() === 'TERMINATED') rowData.type = 'Inactive';
                    }

                    results.push(rowData);
                    row.classList.add('rt-scanned');
                }
            });
            return results;
        }

        async saveState() {
            await chrome.storage.local.set({
                rt_scan_state: {
                    isScanning: true,
                    data: this.data,
                    metadata: this.metadata,
                    timestamp: Date.now()
                }
            });
        }

        async clearState() {
            await chrome.storage.local.remove('rt_scan_state');
        }

        sendProgress(statusMsg, forceProgress = null) {
            chrome.runtime.sendMessage({
                type: 'extraction_progress',
                count: this.data.length,
                message: statusMsg,
                metadata: this.metadata,
                progress: forceProgress ?? Math.min(98, (this.data.length / (this.data.length + 5)) * 100)
            });
        }

        async finish() {
            chrome.runtime.sendMessage({
                type: 'extraction_complete',
                data: this.data,
                metadata: this.metadata
            });
            await this.clearState();
            this.isScanning = false;
        }

        async handleError(err) {
            chrome.runtime.sendMessage({ type: 'extraction_error', message: err.message });
            await this.clearState();
            this.isScanning = false;
        }

        waitForStability(ms = 2000) {
            return new Promise(r => setTimeout(r, ms));
        }
    }

    const scanner = new LabbScanner();
    if (!window.location.pathname.includes('/labbPassport/create')) {
        scanner.init();
    }

    // --- Passport Auto-Fill Engine --- 
    function setupPassportAutoFill() {
        if (!window.location.pathname.includes('/labbPassport/create')) return;

        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('autoreason') === 'random') {
            console.log('RandomTesting: Auto-fill triggered for Passport Reason');

            // Injecting directly into the Main Page Context to bypass Extension Isolation.
            // This is required to communicate with the page's native jQuery/React instances directly.
            const script = document.createElement('script');
            script.textContent = `
                (function() {
                    let attempts = 0;
                    const tryFill = () => {
                        attempts++;
                        let found = false;
                        document.querySelectorAll('select').forEach(select => {
                            const options = Array.from(select.options);
                            const randomOption = options.find(opt => 
                                opt.text.toLowerCase().includes('random') || 
                                opt.value.toLowerCase().includes('random')
                            );

                            if (randomOption) {
                                // 1. Set the raw values natively
                                select.value = randomOption.value;
                                randomOption.selected = true;

                                // 2. Trigger React native setters if applicable
                                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value").set;
                                if (nativeInputValueSetter) {
                                    nativeInputValueSetter.call(select, randomOption.value);
                                }

                                // 3. Dispatch native browser events
                                select.dispatchEvent(new Event('input', { bubbles: true }));
                                select.dispatchEvent(new Event('change', { bubbles: true }));

                                // 4. Trigger jQuery events safely if it's a jQuery-based site
                                if (typeof window.$ !== 'undefined') {
                                    window.$(select).val(randomOption.value).trigger('change');
                                } else if (typeof window.jQuery !== 'undefined') {
                                    window.jQuery(select).val(randomOption.value).trigger('change');
                                }

                                found = true;
                                console.log('RandomTesting PageSync: Successfully auto-selected Testing Reason:', randomOption.text);
                            }
                        });

                        // Keep polling for up to 15 seconds (30 attempts * 500ms) to handle slow API loads
                        if (!found && attempts < 30) {
                            setTimeout(tryFill, 500);
                        }
                    };
                    
                    if (document.readyState === 'loading') {
                        document.addEventListener('DOMContentLoaded', tryFill);
                    } else {
                        tryFill(); // Wait 1 second initially to let frameworks spin up
                        setTimeout(tryFill, 1000);
                    }
                })();
            `;
            document.documentElement.appendChild(script);
            script.remove();
        }
    }

    setupPassportAutoFill();

    if (!window.rtListenerAdded) {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'PING') {
                sendResponse({ status: 'PONG' });
            } else if (request.action === 'START_EXTRACTION') {
                scanner.start(request.itemsPerPage || 50);
                sendResponse({ status: 'ACK' });
            } else if (request.action === 'GET_METADATA') {
                sendResponse({ metadata: scanner.extractMetadata() });
            }
            return true;
        });
        window.rtListenerAdded = true;
    }
})();
