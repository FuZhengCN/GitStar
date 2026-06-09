const STORAGE_KEY = 'gitstar-open-mode';
const POPUP_PATH = 'popup.html';
const TAB_PATH = 'tabs/tab.html';

async function syncActionBehavior() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    const mode = result[STORAGE_KEY] || 'popup';
    await chrome.action.setPopup({ popup: mode === 'popup' ? POPUP_PATH : '' });
  } catch {
    // SW terminated prematurely — will re-sync on next wake
  }
}

chrome.storage.onChanged.addListener((changes) => {
  if (changes[STORAGE_KEY]) syncActionBehavior();
});

chrome.runtime.onInstalled.addListener(syncActionBehavior);
syncActionBehavior();

chrome.action.onClicked.addListener(async () => {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  if (result[STORAGE_KEY] !== 'tab') return;

  const url = chrome.runtime.getURL(TAB_PATH);
  const tabs = await chrome.tabs.query({ url: url + '*' });
  if (tabs.length > 0) {
    const tab = tabs[0];
    await chrome.windows.update(tab.windowId, { focused: true });
    await chrome.tabs.update(tab.id!, { active: true });
  } else {
    await chrome.tabs.create({ url: TAB_PATH });
  }
});
