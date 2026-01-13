const LOG_STORAGE_KEY = 'alltrack.logs';

const readLogs = () => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }
  try {
    return JSON.parse(window.localStorage.getItem(LOG_STORAGE_KEY)) || [];
  } catch (error) {
    return [];
  }
};

const formatTimestamp = (value) => {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'medium'
  }).format(date);
};

const buildPayload = (payload) => {
  if (!payload) {
    return '';
  }
  if (typeof payload === 'string') {
    return payload;
  }
  try {
    return JSON.stringify(payload, null, 2);
  } catch (error) {
    return String(payload);
  }
};

const renderLogs = () => {
  const list = document.getElementById('logsList');
  const count = document.getElementById('logsCount');
  if (!list || !count) {
    return;
  }
  const logs = readLogs();
  count.textContent = logs.length;
  if (!logs.length) {
    list.innerHTML = `
      <div class="logs-panel__empty">
        <h3>Логи пусты</h3>
        <p>Откройте приложение, чтобы начать собирать события.</p>
      </div>
    `;
    return;
  }
  list.innerHTML = logs
    .slice()
    .reverse()
    .map((entry) => {
      const payload = buildPayload(entry.payload);
      return `
        <article class="logs-card glass">
          <div class="logs-card__head">
            <span class="logs-card__level logs-card__level--${entry.level || 'info'}">
              ${entry.level || 'info'}
            </span>
            <span class="logs-card__time">${formatTimestamp(entry.timestamp)}</span>
          </div>
          <h3>${entry.message || 'Событие'}</h3>
          ${payload ? `<pre>${payload}</pre>` : ''}
        </article>
      `;
    })
    .join('');
};

const downloadLogs = () => {
  const logs = readLogs();
  const blob = new Blob([JSON.stringify(logs, null, 2)], {
    type: 'application/json'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `alltrack-logs-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const clearLogs = () => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  window.localStorage.removeItem(LOG_STORAGE_KEY);
  renderLogs();
};

const bindActions = () => {
  const downloadButton = document.getElementById('downloadLogs');
  const clearButton = document.getElementById('clearLogs');
  if (downloadButton) {
    downloadButton.addEventListener('click', downloadLogs);
  }
  if (clearButton) {
    clearButton.addEventListener('click', clearLogs);
  }
};

bindActions();
renderLogs();
