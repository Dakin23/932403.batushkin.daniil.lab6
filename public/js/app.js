const netEl = document.getElementById('net');
const offlineTag = document.getElementById('offlineTag');
const setNet = () => { netEl.textContent = navigator.onLine ? 'online' : 'offline'; };
window.addEventListener('online', setNet);
window.addEventListener('offline', setNet);
setNet();

const list = document.getElementById('list');
const errEl = document.getElementById('error');
const countEl = document.getElementById('count');
const input = document.getElementById('minRating');

async function load(value) {
  errEl.hidden = true;
  offlineTag.hidden = true;

  const url = value
    ? `/api/movies?minRating=${encodeURIComponent(value)}`
    : '/api/movies';

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok) {
      list.innerHTML = '';
      countEl.textContent = '';
      errEl.textContent = `Ошибка ${res.status}: ${data.error || 'неизвестная ошибка'}`;
      errEl.hidden = false;
      return;
    }

    if (res.headers.get('X-Offline') === '1') offlineTag.hidden = false;
    render(data);
  } catch (e) {
    errEl.textContent = 'Сервер недоступен: ' + e.message;
    errEl.hidden = false;
  }
}

function render(movies) {
  countEl.textContent = `Найдено фильмов: ${movies.length}`;
  list.innerHTML = movies.length
    ? movies
        .map((m) => `<li><b>${m.title}</b> (${m.year}) — ⭐ ${m.rating.toFixed(1)}</li>`)
        .join('')
    : '<li>По такому рейтингу ничего не найдено</li>';
}

document.getElementById('filter').addEventListener('submit', (e) => {
  e.preventDefault();
  load(input.value.trim());
});

document.getElementById('reset').addEventListener('click', () => {
  input.value = '';
  load('');
});

load('');
