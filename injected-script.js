window.addEventListener('cEventPush', (e) => {
    if (e.detail.event !== 'undefined') {
        dataLayer.push(e.detail);
    }
});