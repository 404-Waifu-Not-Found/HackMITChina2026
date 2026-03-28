const DEBUG_KEY = 'debug';
const LOGS_KEY = 'debugLogs';
const MAX_LOG_ENTRIES = 1000;

function hasStorageApi() {
  return typeof chrome !== 'undefined' && Boolean(chrome.storage?.local);
}

function getLocalStorage(keys) {
  return new Promise((resolve) => {
    if (!hasStorageApi()) {
      resolve({});
      return;
    }

    chrome.storage.local.get(keys, (items) => {
      resolve(items ?? {});
    });
  });
}

function setLocalStorage(items) {
  return new Promise((resolve) => {
    if (!hasStorageApi()) {
      resolve();
      return;
    }

    chrome.storage.local.set(items, () => {
      resolve();
    });
  });
}

function formatTimestamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

async function log(message) {
  if (!hasStorageApi()) {
    return;
  }

  const safeMessage = typeof message === 'string' ? message : String(message);
  const { [LOGS_KEY]: existingLogs = [] } = await getLocalStorage([LOGS_KEY]);
  const nextLogs = [...existingLogs, `[${formatTimestamp()}] ${safeMessage}`].slice(-MAX_LOG_ENTRIES);
  await setLocalStorage({ [DEBUG_KEY]: true, [LOGS_KEY]: nextLogs });
  console.debug(`[Lingo Stream] ${safeMessage}`);
}

window.log = log;
