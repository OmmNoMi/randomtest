(function () {
    // This script runs in the MAIN world to bypass isolation and access jQuery/site state.
    // It specifically targets the Passport 'Testing reason' dropdown.

    if (window.__RT_INJECTED__) return;
    window.__RT_INJECTED__ = true;

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('autoreason') !== 'random') return;

    console.log('RandomTesting: Passport MAIN-WORLD Bridge Active.');

    const tryFill = () => {
        const select = document.getElementById('testing_reason') || document.querySelector('select[name="testing_reason"]');
        if (!select) return;

        const randomOption = Array.from(select.options).find(opt =>
            opt.text.toLowerCase().includes('random')
        );

        if (randomOption && select.value !== randomOption.value) {
            // Trigger framework Native Setters
            const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value").set;
            if (setter) setter.call(select, randomOption.value);
            else select.value = randomOption.value;

            // Trigger state change events
            select.dispatchEvent(new Event('input', { bubbles: true }));
            select.dispatchEvent(new Event('change', { bubbles: true }));

            // Native jQuery support (since we are in the main world)
            if (typeof window.jQuery !== 'undefined') {
                window.jQuery(select).val(randomOption.value).trigger('change');
            } else if (typeof window.$ !== 'undefined') {
                window.$(select).val(randomOption.value).trigger('change');
            }

            console.log('RandomTesting: Main-world auto-fill success.');
        }
    };

    // React/Frameworks re-render often, we need to be aggressive.
    const observer = new MutationObserver(tryFill);
    observer.observe(document.body, { childList: true, subtree: true });

    // Initial and periodic checks
    tryFill();
    setInterval(tryFill, 1000);
})();
