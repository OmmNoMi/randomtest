(function () {
    // This script runs in the MAIN world to bypass isolation and access jQuery/site state.
    // It specifically targets the Passport 'Testing reason' dropdown.

    if (window.__RT_INJECTED__) return;
    window.__RT_INJECTED__ = true;

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('autoreason') !== 'random') return;

    console.log('RandomizePro: Passport MAIN-WORLD Bridge Active.');

    const tryFill = () => {
        const selects = Array.from(document.querySelectorAll('select'));
        const select = document.getElementById('testing_reason') ||
            document.querySelector('select[name="testing_reason"]') ||
            selects.find(s => s.previousElementSibling?.innerText.includes('Testing reason'));

        if (!select) return;

        const options = Array.from(select.options);
        const randomOption = options.find(opt =>
            opt.text.toLowerCase().includes('random') ||
            opt.value.toLowerCase().includes('random')
        );

        if (randomOption && select.value !== randomOption.value) {
            console.log('RandomizePro: Found dropdown and option. Setting value to: ' + randomOption.value);

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
        }
    };

    // React/Frameworks re-render often, we need to be aggressive.
    const observer = new MutationObserver(tryFill);
    observer.observe(document.body, { childList: true, subtree: true });

    // Initial and periodic checks
    tryFill();
    setInterval(tryFill, 1000);
})();
