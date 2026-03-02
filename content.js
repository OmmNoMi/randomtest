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
            const orgId = urlParams.get('organization_id');

            // Refined Org Name Selector
            let orgName = 'Unknown Org';
            const h3 = document.querySelector('h3')?.innerText || '';
            const breadcrumb = document.querySelector('ul.breadcrumb li.active, .breadcrumb li:last-child')?.innerText || '';

            if (h3.includes('Employees of')) {
                orgName = h3.replace('Employees of', '').trim();
            } else if (breadcrumb && !breadcrumb.includes('of') && !breadcrumb.includes('Records')) {
                orgName = breadcrumb.trim();
            } else if (h3) {
                orgName = h3.split('|')[0].trim();
            }

            const userName = document.querySelector('.navbar-right .dropdown-toggle, #user-name, .user-profile-link')?.innerText.trim() || 'Portal User';
            const totalRecords = document.querySelector('.pagination-summary, .pull-right strong')?.innerText.trim() || '---';

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
