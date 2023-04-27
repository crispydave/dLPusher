
if (!document.getElementById('dlPushScript')) {
  const script = document.createElement('script')
  script.id = 'dlPushScript'
  // eslint-disable-next-line no-undef
  script.src = chrome.runtime.getURL('injected-script.js');
  (document.head || document.documentElement).appendChild(script)
}

if (typeof listenCheck === 'undefined') {
  // eslint-disable-next-line no-undef
  listenCheck = true
  // eslint-disable-next-line no-undef
  chrome.runtime.onMessage.addListener((msg) => {
    const event = new CustomEvent('cEventPush', { detail: msg })
    window.dispatchEvent(event)
  })
};
