(function () {
    // This script runs in the MAIN world to bypass isolation and access jQuery/site state.
    // It specifically targets the Passport 'Testing reason' dropdown.

    if (window.__RT_INJECTED__) return;
    window.__RT_INJECTED__ = true;

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('autoreason') !== 'random') return;

    console.log('RandomizePro: Passport MAIN-WORLD Bridge Active.');

    const tryFill = () => {
        const params = new URLSearchParams(window.location.search);
        const autoPanel = params.get('autopanel');
        const selects = Array.from(document.querySelectorAll('select'));

        // 1. Auto-fill Testing Reason
        const reasonSelect = document.getElementById('testing_reason') ||
            document.querySelector('select[name="testing_reason"]') ||
            selects.find(s => s.previousElementSibling?.innerText.includes('Testing reason'));

        if (reasonSelect) {
            const options = Array.from(reasonSelect.options);
            const randomOption = options.find(opt =>
                opt.text.toLowerCase().trim() === 'random' ||
                opt.value.toLowerCase().includes('random')
            );

            if (randomOption && reasonSelect.value !== randomOption.value) {
                console.log('RandomizePro: Setting Reason to:', randomOption.text);
                fillSelect(reasonSelect, randomOption.value);
            }
        }

        // 2. Auto-fill Panel Configuration
        if (autoPanel) {
            // Robust select finder: search by label text using multiple strategies
            const panelSelect = findSelectByLabel('Panel configuration');

            if (panelSelect) {
                const targetPanel = decodeURIComponent(autoPanel).toLowerCase().trim();
                const options = Array.from(panelSelect.options);

                // Try exact match first, then partial match
                let matchingOption = options.find(opt => opt.text.toLowerCase().trim() === targetPanel);
                if (!matchingOption) {
                    matchingOption = options.find(opt => opt.text.toLowerCase().includes(targetPanel));
                }

                if (matchingOption && panelSelect.value !== matchingOption.value) {
                    console.log('RandomizePro: Setting Panel to:', matchingOption.text);
                    fillSelect(panelSelect, matchingOption.value);
                } else if (!matchingOption) {
                    console.log('RandomizePro: No matching panel option for:', targetPanel, '| Available:', options.map(o => o.text));
                }
            } else {
                console.log('RandomizePro: Panel select not found yet, will retry...');
            }
        }
    };

    // Find a <select> element by looking for a nearby <label> containing the given text
    function findSelectByLabel(labelText) {
        const lower = labelText.toLowerCase();

        // Strategy 1: ID-based known selectors
        const byId = document.getElementById('testing_panel_id_hash') ||
            document.getElementById('panel_config_id');
        if (byId) return byId;

        // Strategy 2: Find all labels, match text, use 'for' attribute to find the select
        const labels = Array.from(document.querySelectorAll('label'));
        const matchedLabel = labels.find(l => l.innerText.toLowerCase().includes(lower));
        if (matchedLabel) {
            if (matchedLabel.htmlFor) {
                const el = document.getElementById(matchedLabel.htmlFor);
                if (el && el.tagName === 'SELECT') return el;
            }
            // Strategy 3: Look for a sibling or nearby select
            const parent = matchedLabel.parentElement;
            if (parent) {
                const nearbySelect = parent.querySelector('select');
                if (nearbySelect) return nearbySelect;
                // Go one level up
                const grandparent = parent.parentElement;
                if (grandparent) {
                    const nearbySelect2 = grandparent.querySelector('select');
                    if (nearbySelect2) return nearbySelect2;
                }
            }
        }

        // Strategy 4: name attribute fallback
        return document.querySelector('select[name="panel_config_id"]') || null;
    }

    function fillSelect(el, val) {
        if (!el || !val) return;

        // Trigger framework Native Setters
        const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value").set;
        if (setter) setter.call(el, val);
        else el.value = val;

        // Trigger state change events
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));

        // Native jQuery support (common on LabbReport)
        if (typeof window.jQuery !== 'undefined') {
            window.jQuery(el).val(val).trigger('change');
        } else if (typeof window.$ !== 'undefined') {
            window.$(el).val(val).trigger('change');
        }
    }

    // React/Frameworks re-render often, we need to be aggressive.
    const observer = new MutationObserver(tryFill);
    observer.observe(document.body, { childList: true, subtree: true });

    // Initial and periodic checks
    tryFill();
    setInterval(tryFill, 1000);
})();
