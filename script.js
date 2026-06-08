/**
 * LAUGEED STORE — Главный скрипт
 * Загружает apps.json, строит карточки, определяет регион/валюту
 */

// ═══════════════════════════════════════════════
// ВАЛЮТЫ — определение по языку браузера
// ═══════════════════════════════════════════════
const CURRENCY_MAP = {
  'ru': { code: 'RUB', symbol: '₽',  flag: '🇷🇺' },
  'uk': { code: 'UAH', symbol: '₴',  flag: '🇺🇦' },
  'be': { code: 'BYN', symbol: 'Br', flag: '🇧🇾' },
  'kk': { code: 'KZT', symbol: '₸',  flag: '🇰🇿' },
  'ka': { code: 'GEL', symbol: '₾',  flag: '🇬🇪' },
  'pl': { code: 'PLN', symbol: 'zł', flag: '🇵🇱' },
  'de': { code: 'EUR', symbol: '€',  flag: '🇩🇪' },
  'fr': { code: 'EUR', symbol: '€',  flag: '🇫🇷' },
  'default': { code: 'USD', symbol: '$', flag: '🌍' },
};

function detectCurrency() {
  const lang = (navigator.language || 'en').toLowerCase().split('-')[0];
  return CURRENCY_MAP[lang] || CURRENCY_MAP['default'];
}

function formatPrice(app, currency) {
  if (!app.price) return null;
  const price = app.price[currency.code] || app.price['USD'];
  if (!price) return null;
  return `${currency.symbol}${price}`;
}

// ═══════════════════════════════════════════════
// ЗАГРУЗКА ДАННЫХ
// ═══════════════════════════════════════════════
let APPS_DATA = [];
const currency = detectCurrency();

// Обновляем отображение валюты в навбаре
document.addEventListener('DOMContentLoaded', () => {
  const regionEl = document.getElementById('regionDisplay');
  if (regionEl) regionEl.textContent = `${currency.flag} ${currency.code}`;

  loadApps();
});

async function loadApps() {
  try {
    const resp = await fetch('apps.json');
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    APPS_DATA = data.apps || [];
    onAppsLoaded();
  } catch (e) {
    console.error('Не удалось загрузить apps.json:', e);
    showError();
  }
}

function showError() {
  const targets = ['appsGrid', 'updatesList', 'appPage'];
  targets.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = `
      <div class="loading-state" style="grid-column:1/-1">
        <p style="color:var(--text2)">⚠️ Не удалось загрузить данные.<br/>
        Убедись что файл <code>apps.json</code> доступен.</p>
      </div>`;
  });
}

// ═══════════════════════════════════════════════
// РОУТИНГ — определяем что рендерить
// ═══════════════════════════════════════════════
function onAppsLoaded() {
  const path = window.location.pathname;
  const page = path.split('/').pop();

  if (page === '' || page === 'index.html') {
    renderHomePage();
  } else if (page === 'app.html') {
    renderAppPage();
  } else if (page === 'updates.html') {
    renderUpdatesPage();
  }
}

// ═══════════════════════════════════════════════
// ГЛАВНАЯ СТРАНИЦА — сетка карточек
// ═══════════════════════════════════════════════
function renderHomePage() {
  const grid = document.getElementById('appsGrid');
  const countEl = document.getElementById('appCount');
  if (!grid) return;

  if (APPS_DATA.length === 0) {
    grid.innerHTML = '<div class="loading-state" style="grid-column:1/-1"><p>Приложений пока нет</p></div>';
    return;
  }

  if (countEl) countEl.textContent = `${APPS_DATA.length} ${plural(APPS_DATA.length, 'приложение','приложения','приложений')}`;

  grid.innerHTML = '';
  APPS_DATA.forEach((app, i) => {
    const card = createAppCard(app, i);
    grid.appendChild(card);
  });
}

function createAppCard(app, index) {
  const priceStr = formatPrice(app, currency);
  const card = document.createElement('div');
  card.className = 'app-card';
  card.style.animationDelay = `${index * 0.07}s`;

  card.innerHTML = `
    <div class="card-header">
      <div class="card-icon">
        ${app.icon
          ? `<img src="${app.icon}" alt="${app.name}" onerror="this.parentElement.innerHTML='<span class=\\'card-icon-placeholder\\'>⬡</span>'">`
          : `<span class="card-icon-placeholder">⬡</span>`}
      </div>
      <div class="card-meta">
        <div class="card-name">${app.name}</div>
        <div class="card-tagline">${app.tagline || ''}</div>
        <div class="card-badges">
          <span class="badge badge-version">v${app.version}</span>
          ${app.platform ? `<span class="badge badge-platform">${app.platform}</span>` : ''}
        </div>
      </div>
    </div>
    <p class="card-desc">${app.description}</p>
    <div class="card-footer">
      <div class="card-price ${priceStr ? '' : 'free'}">${priceStr || 'Бесплатно'}</div>
      <div class="card-actions">
        <button class="btn btn-secondary" onclick="goToApp('${app.id}')">Подробнее</button>
        <button class="btn btn-primary" onclick="downloadApp(event,'${app.id}')">
          ↓ Скачать
        </button>
      </div>
    </div>
  `;

  // Клик по карточке → страница приложения
  card.addEventListener('click', (e) => {
    if (e.target.closest('.btn')) return;
    goToApp(app.id);
  });

  return card;
}

// ═══════════════════════════════════════════════
// СТРАНИЦА ПРИЛОЖЕНИЯ
// ═══════════════════════════════════════════════
function renderAppPage() {
  const container = document.getElementById('appPage');
  if (!container) return;

  // Получаем id из URL: app.html?id=forest
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const app = APPS_DATA.find(a => a.id === id);

  if (!app) {
    container.innerHTML = `
      <div class="container">
        <div class="loading-state full-page">
          <p>Приложение не найдено</p>
          <a href="index.html" class="btn btn-secondary" style="margin-top:16px">← Назад</a>
        </div>
      </div>`;
    return;
  }

  document.title = `${app.name} — Laugeed Store`;
  const priceStr = formatPrice(app, currency);

  // Changelog HTML
  const changelogHTML = (app.changelog || []).map(entry => {
    // Поддержка как старого формата (массив строк) так и нового (объект с version/date/changes)
    if (typeof entry === 'string') {
      return `<div class="changelog-entry">
        <ul class="changelog-list"><li>${entry}</li></ul>
      </div>`;
    }
    return `
      <div class="changelog-entry">
        <div class="changelog-version">
          <span class="changelog-ver-badge">v${entry.version}</span>
          <span class="changelog-date">${entry.date || ''}</span>
        </div>
        <ul class="changelog-list">
          ${(entry.changes || []).map(c => `<li>${c}</li>`).join('')}
        </ul>
      </div>`;
  }).join('');

  // Features HTML
  const featuresHTML = app.features
    ? `<div class="app-block">
        <div class="app-block-title">Возможности</div>
        <ul class="features-list">
          ${app.features.map(f => `<li>${f}</li>`).join('')}
        </ul>
       </div>`
    : '';

  container.innerHTML = `
    <div class="container">
      <!-- Хлебные крошки -->
      <div class="breadcrumb">
        <a href="index.html">Laugeed Store</a>
        <span>›</span>
        <span>${app.name}</span>
      </div>

      <!-- Герой -->
      <div class="app-hero">
        <div class="app-hero-icon">
          ${app.icon
            ? `<img src="${app.icon}" alt="${app.name}" onerror="this.parentElement.innerHTML='<span style=\\'font-size:3rem\\'>⬡</span>'">`
            : '<span style="font-size:3rem">⬡</span>'}
        </div>
        <div class="app-hero-info">
          <div class="app-hero-name">${app.name}</div>
          <div class="app-hero-tagline">${app.tagline || app.description.slice(0, 80)}</div>
          <div class="app-hero-badges">
            <span class="badge badge-version">v${app.version}</span>
            ${app.platform ? `<span class="badge badge-platform">${app.platform}</span>` : ''}
            ${app.category ? `<span class="badge" style="background:rgba(168,85,247,0.1);color:#a855f7;border:1px solid rgba(168,85,247,0.2)">${app.category}</span>` : ''}
          </div>
          <div class="app-hero-actions">
            ${priceStr ? `<div class="app-hero-price">${priceStr}</div>` : ''}
            <button class="btn btn-primary" onclick="downloadApp(event,'${app.id}')" style="padding:12px 28px;font-size:1rem">
              ↓ Скачать
            </button>
            <a href="index.html" class="btn btn-ghost">← Назад</a>
          </div>
        </div>
      </div>

      <!-- Описание -->
      <div class="app-block">
        <div class="app-block-title">Описание</div>
        <p class="app-desc">${app.description}</p>
      </div>

      <!-- Возможности -->
      ${featuresHTML}

      <!-- Мета -->
      <div class="app-block">
        <div class="app-block-title">Информация</div>
        <div class="app-meta-grid">
          <div class="meta-item">
            <div class="meta-label">Версия</div>
            <div class="meta-value">${app.version}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Платформа</div>
            <div class="meta-value">${app.platform || '—'}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Размер</div>
            <div class="meta-value">${app.size || '—'}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Категория</div>
            <div class="meta-value">${app.category || '—'}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Дата релиза</div>
            <div class="meta-value">${app.releaseDate || '—'}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Цена</div>
            <div class="meta-value" style="color:var(--accent)">${priceStr || 'Бесплатно'}</div>
          </div>
        </div>
      </div>

      <!-- Changelog -->
      ${changelogHTML ? `
      <div class="app-block">
        <div class="app-block-title">История изменений</div>
        ${changelogHTML}
      </div>` : ''}
    </div>
  `;
}

// ═══════════════════════════════════════════════
// СТРАНИЦА ОБНОВЛЕНИЙ
// ═══════════════════════════════════════════════
function renderUpdatesPage() {
  const list = document.getElementById('updatesList');
  if (!list) return;

  // Собираем все changelog записи со всех приложений
  const allUpdates = [];
  APPS_DATA.forEach(app => {
    (app.changelog || []).forEach(entry => {
      if (typeof entry === 'object') {
        allUpdates.push({ app, entry });
      } else {
        // Старый формат — оборачиваем
        allUpdates.push({ app, entry: { version: app.version, date: app.releaseDate, changes: [entry] } });
      }
    });
  });

  if (allUpdates.length === 0) {
    list.innerHTML = '<div class="loading-state"><p>Обновлений пока нет</p></div>';
    return;
  }

  list.innerHTML = '';
  allUpdates.forEach(({ app, entry }, i) => {
    const card = document.createElement('div');
    card.className = 'update-card';
    card.style.animationDelay = `${i * 0.06}s`;
    card.innerHTML = `
      <div class="update-icon">
        ${app.icon
          ? `<img src="${app.icon}" alt="${app.name}" onerror="this.parentElement.innerHTML='<span style=\\'font-size:1.5rem\\'>⬡</span>'">`
          : '<span style="font-size:1.5rem">⬡</span>'}
      </div>
      <div class="update-info">
        <div class="update-header">
          <span class="update-name">${app.name}</span>
          <span class="changelog-ver-badge">v${entry.version}</span>
          <span class="update-date">${entry.date || ''}</span>
        </div>
        <ul class="update-changes">
          ${(entry.changes || []).map(c => `<li>${c}</li>`).join('')}
        </ul>
      </div>
    `;
    list.appendChild(card);
  });
}

// ═══════════════════════════════════════════════
// ДЕЙСТВИЯ
// ═══════════════════════════════════════════════

/** Переход на страницу приложения */
function goToApp(id) {
  window.location.href = `app.html?id=${id}`;
}

/** Скачивание приложения */
function downloadApp(event, id) {
  event.stopPropagation();
  const app = APPS_DATA.find(a => a.id === id);
  if (!app) return;

  if (!app.download) {
    alert('Файл для скачивания ещё не добавлен.');
    return;
  }

  // Создаём временную ссылку для скачивания
  const a = document.createElement('a');
  a.href = app.download;
  a.download = app.download.split('/').pop();
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ═══════════════════════════════════════════════
// УТИЛИТЫ
// ═══════════════════════════════════════════════

/** Русское склонение числительных */
function plural(n, one, few, many) {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} ${one}`;
  if ([2,3,4].includes(mod10) && ![12,13,14].includes(mod100)) return `${n} ${few}`;
  return `${n} ${many}`;
}
