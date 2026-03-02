(function () {
    console.log('RandomTesting: Engine Initialized.');

    class LabbScanner {
        constructor() {
            this.data = [];
            this.isScanning = false;
            this.metadata = {};
        }

        async start(itemsPerPage = 50) {
            if (this.isScanning) return;
            this.isScanning = true;
            this.data = [];

            try {
                // Step 0: Extract Metadata
                this.metadata = this.extractMetadata();

                // Step 1: Maximize page size (default to 50)
                await this.setPageSize(50);
                await this.waitForStability();

                // Step 2: Recursive scan through pages
                await this.scanAllPages();

                // Step 3: Complete
                this.finish();
            } catch (err) {
                console.error('RandomTesting: Scan failed:', err);
                this.isScanning = false;
            }
        }

        extractMetadata() {
            const urlParams = new URLSearchParams(window.location.search);
            const orgId = urlParams.get('organization_id') || '---';

            // Regex to check if a string contains pagination like "10 of 24"
            const paginationRegex = /\d+\s+of\s+\d+/i;
            const isPagination = (str) => paginationRegex.test(str);

            // Fetch candidate elements
            const h3Text = document.querySelector('h3')?.innerText.trim() || '';
            const paginationSummary = document.querySelector('.pull-right strong, .pagination-summary')?.innerText.trim() || '';

            // Find "Managing Advanced Trucking LLC" in the sub-nav or brand logo
            const subNavBrand = document.querySelector('.nav-tabs li:first-child')?.parentElement?.previousElementSibling?.innerText.trim() ||
                document.querySelector('.nav-tabs li.active a, .sub-navbar li.active a')?.innerText.trim() ||
                document.querySelector('.breadcrumb li:last-child')?.innerText.trim() || '';

            const tableFirstOrgCell = document.querySelector('table tbody tr td:first-child')?.innerText.trim() || '';

            // 1. Extract Total Records (Targeting "X of Y")
            let totalRecords = '---';
            const countMatch = h3Text.match(paginationRegex) || paginationSummary.match(paginationRegex);
            if (countMatch) {
                totalRecords = countMatch[0];
            } else if (paginationSummary) {
                totalRecords = paginationSummary;
            }

            // 2. Extract Organization Name
            let orgName = 'Unknown Org';

            // Look for specific business name patterns in headers or sub-nav
            const headers = [...document.querySelectorAll('h1, h2, h3, h4, .navbar-brand')].map(h => h.innerText.trim());
            const navLinks = [...document.querySelectorAll('.nav-tabs li a, .sub-navbar li a, .breadcrumb li')].map(l => l.innerText.trim());

            const candidates = [subNavBrand, ...navLinks, ...headers, tableFirstRowOrgCell];

            // Priority: Find something that isn't pagination and isn't a common label
            const genericLabels = ['Employees', 'Results', 'Contacts', 'Donors', 'Labb Passports', 'Panels', 'Reporting', 'Dashboard', 'Home'];

            orgName = candidates.find(c =>
                c &&
                !isPagination(c) &&
                !genericLabels.includes(c) &&
                c.length > 3 &&
                !c.includes('Portal User')
            ) || 'Unknown Org';

            // If we found something like "Employees of [Org]", clean it
            if (orgName.includes('Employees of')) {
                orgName = orgName.replace('Employees of', '').trim();
            }

            // Final Polish: Clean up any remaining artifacts
            orgName = orgName.split('|')[0].replace(/^\|\s*/, '').trim();

            const userName = document.querySelector('.navbar-right .dropdown-toggle, #user-name, .user-profile-link')?.innerText.trim() || 'Portal User';

            console.log('RandomTesting: Metadata Extracted:', { orgId, orgName, userName, totalRecords });
            return { orgId, orgName, userName, totalRecords, scanDate: new Date().toLocaleString() };
        }

        async setPageSize(size) {
            const selector = document.querySelector('select[name="items_per_page"]') ||
                [...document.querySelectorAll('select')].find(s => s.innerText.includes('10\n25\n50'));

            if (selector && selector.value !== size.toString()) {
                selector.value = size.toString();
                selector.dispatchEvent(new Event('change', { bubbles: true }));
                console.log('RandomTesting: Changed page size to', size);
                await this.waitForStability(3000);
            }
        }

        async scanAllPages() {
            let pageNum = 1;
            let hasMore = true;
            while (hasMore) {
                // Refresh metadata if it was incomplete
                if (this.metadata.orgName === 'Unknown Org' || this.metadata.totalRecords === '---') {
                    this.metadata = this.extractMetadata();
                }

                this.sendProgress(`Scanning Page ${pageNum}...`,
                    Math.min(95, (this.data.length / (this.data.length + 20)) * 100));

                const pageResults = this.parseTable();
                this.data = [...this.data, ...pageResults];

                this.sendProgress(`Read ${this.data.length} records. Moving to next page...`);

                const nextBtn = document.querySelector('ul.pagination li.next:not(.disabled) a') ||
                    [...document.querySelectorAll('.pagination a')].find(a => a.innerText.includes('›'));

                if (nextBtn) {
                    pageNum++;
                    nextBtn.click();
                    await this.waitForStability(2500);
                } else {
                    hasMore = false;
                }
            }
        }

        parseTable() {
            const rows = document.querySelectorAll('table tbody tr');
            const results = [];
            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 6) {
                    results.push({
                        organization: cells[0]?.innerText.trim(),
                        firstName: cells[1]?.innerText.trim(),
                        lastName: cells[2]?.innerText.trim(),
                        dob: cells[3]?.innerText.trim(),
                        phone: cells[4]?.innerText.trim(),
                        email: cells[5]?.innerText.trim(),
                        status: cells[6]?.innerText.trim(),
                        type: cells[7]?.innerText.trim() || 'Standard',
                        position: cells[8]?.innerText.trim() || 'N/A'
                    });
                    row.classList.add('rt-scanned');
                }
            });
            return results;
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

        finish() {
            chrome.runtime.sendMessage({
                type: 'extraction_complete',
                data: this.data,
                metadata: this.metadata
            });
            this.isScanning = false;
        }

        waitForStability(ms = 2000) {
            return new Promise(r => setTimeout(r, ms));
        }
    }

    const scanner = new LabbScanner();

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'START_EXTRACTION') {
            scanner.start(request.itemsPerPage || 50);
            sendResponse({ status: 'ACK' });
        }
        return true;
    });
})();
