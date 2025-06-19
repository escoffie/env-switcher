const urlInput = document.getElementById('urlInput');
const urlError = document.getElementById('urlError');
const ticketInput = document.getElementById('ticketInput');
const envSelect = document.getElementById('envSelect');
const ticketError = document.getElementById('ticketError');
const openPageBtn = document.getElementById('openPageBtn');

const priorityParams = document.getElementById('priorityParams');
const otherParams = document.getElementById('otherParams');
const queryParamsSection = document.getElementById('queryParamsSection');

let currentURL = '';
let currentParams = new URLSearchParams();

const ALLOWED_DOMAINS = ['cardcritics.com', 'gobankingrates.com'];
const PRIORITY_KEYS = ['subid', 'preview_nonce'];

function isValidDomain(url) {
  try {
    const domain = new URL(url).hostname;
    return ALLOWED_DOMAINS.some(allowed => domain.endsWith(allowed));
  } catch {
    return false;
  }
}

function parseAndRenderURL(url) {
  if (!isValidDomain(url)) {
    urlError.classList.remove('hidden');
    return;
  }

  urlError.classList.add('hidden');
  const parsed = new URL(url);
  currentURL = parsed;
  currentParams = parsed.searchParams;

  queryParamsSection.classList.remove('hidden');
  renderParams();
  updateOpenButtonState();
  saveToStorage();
}

function renderParams() {
  priorityParams.innerHTML = '';
  otherParams.innerHTML = '';

  const shown = new Set();

  // Always show preview_nonce
  const previewValue = currentParams.get('preview_nonce') || '';
  renderParamField('preview_nonce', previewValue, priorityParams, true);
  shown.add('preview_nonce');

  for (const [key, value] of currentParams.entries()) {
    if (shown.has(key)) continue;

    const container = PRIORITY_KEYS.includes(key) ? priorityParams : otherParams;
    renderParamField(key, value, container);
    shown.add(key);
  }
}

function renderParamField(key, value, container, isPreviewNonce = false) {
  const div = document.createElement('div');
  div.className = 'flex items-center space-x-2';

  const label = document.createElement('label');
  label.textContent = key;
  label.className = 'w-32 font-medium';

  const input = document.createElement('input');
  input.value = value;
  input.placeholder = isPreviewNonce ? 'Optional' : '';
  input.className = 'flex-1 p-1 border rounded';
  input.addEventListener('input', () => {
    if (input.value) {
      currentParams.set(key, input.value);
    } else {
      currentParams.delete(key);
    }
    updateFinalURL();
    saveToStorage();
  });

  div.appendChild(label);
  div.appendChild(input);

  if (isPreviewNonce) {
    const generateBtn = document.createElement('button');
    generateBtn.textContent = 'Generate';
    generateBtn.className = 'text-xs bg-gray-200 px-2 py-1 rounded';
    generateBtn.addEventListener('click', () => {
      const random = Math.random().toString(36).substring(2, 10);
      input.value = random;
      currentParams.set(key, random);
      updateFinalURL();
      saveToStorage();
    });
    div.appendChild(generateBtn);
  }

  container.appendChild(div);
}

function updateFinalURL() {
  currentURL.search = currentParams.toString();
  updateOpenButtonState();
}

function updateOpenButtonState() {
  const env = envSelect.value;
  const isValid = currentURL && env && (env !== 'ticket' || ticketInput.value.trim());
  openPageBtn.disabled = !isValid;
}

function saveToStorage() {
  chrome.storage.local.set({
    url: urlInput.value,
    ticketId: ticketInput.value,
    env: envSelect.value
  });
}

function loadFromStorage() {
  chrome.storage.local.get(['url', 'ticketId', 'env'], (data) => {
    if (data.url) {
      urlInput.value = data.url;
      parseAndRenderURL(data.url);
    }
    if (data.ticketId) ticketInput.value = data.ticketId;
    if (data.env) envSelect.value = data.env;
  });
}

urlInput.addEventListener('change', () => {
  parseAndRenderURL(urlInput.value);
});

envSelect.addEventListener('change', () => {
  const env = envSelect.value;
  if (env === 'ticket' && !ticketInput.value.trim()) {
    ticketError.classList.remove('hidden');
  } else {
    ticketError.classList.add('hidden');
    updateFinalURL();
    updateOpenButtonState();
    saveToStorage();
  }
});

ticketInput.addEventListener('input', () => {
  if (envSelect.value === 'ticket') updateOpenButtonState();
  saveToStorage();
});

openPageBtn.addEventListener('click', () => {
  const env = envSelect.value;
  const ticket = ticketInput.value.trim();
  const url = new URL(currentURL.toString());

  const parts = url.hostname.split('.');
  if (env === 'production') parts[0] = 'www';
  else if (env === 'stage') parts[0] = 'stage';
  else if (env === 'local') parts[0] = 'l-www';
  else if (env === 'ticket' && ticket) parts[0] = `${ticket}-www`;

  url.hostname = parts.join('.');
  chrome.tabs.create({ url: url.toString() });
});

document.addEventListener('DOMContentLoaded', loadFromStorage);
