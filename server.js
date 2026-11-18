const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');

const movies = [
  { title: 'Матрица',            year: 1999, rating: 8.7 },
  { title: 'Побег из Шоушенка',  year: 1994, rating: 9.3 },
  { title: 'Дюна',               year: 2021, rating: 8.0 },
  { title: 'Крёстный отец',      year: 1972, rating: 9.2 },
  { title: 'Форрест Гамп',       year: 1994, rating: 8.8 },
  { title: 'Паразиты',           year: 2019, rating: 8.5 },
  { title: 'Тёмный рыцарь',      year: 2008, rating: 9.0 },
  { title: 'Начало',             year: 2010, rating: 8.8 },
  { title: 'Джокер',             year: 2019, rating: 8.4 },
  { title: 'Криминальное чтиво', year: 1994, rating: 8.9 },
  { title: 'Гладиатор',          year: 2000, rating: 8.5 },
  { title: 'Интерстеллар',       year: 2014, rating: 8.6 }
];

app.use(express.json());

app.use((req, res, next) => {
  console.log(`${new Date().toLocaleTimeString()} ${req.method} ${req.originalUrl}`);
  next();
});

app.get('/', (req, res) => res.sendFile(path.join(PUBLIC, 'index.html')));
app.get('/about', (req, res) => res.sendFile(path.join(PUBLIC, 'about.html')));

app.get('/api/movies', (req, res) => {
  const sorted = [...movies].sort(
    (a, b) => b.rating - a.rating || a.title.localeCompare(b.title, 'ru')
  );

  const raw = req.query.minRating;

  if (raw === undefined) return res.json(sorted);

  if (Array.isArray(raw)) {
    return res.status(400).json({ error: 'minRating должен быть указан один раз' });
  }

  const str = String(raw).trim().replace(',', '.');

  if (str === '') {
    return res.status(400).json({ error: 'minRating не может быть пустым' });
  }

  const min = Number(str);

  if (!Number.isFinite(min)) {
    return res.status(400).json({ error: 'minRating должен быть числом', received: raw });
  }

  if (min < 0 || min > 10) {
    return res.status(400).json({
      error: 'minRating должен быть в диапазоне 0..10',
      received: raw
    });
  }

  return res.json(sorted.filter((m) => m.rating >= min));
});

app.use(express.static(PUBLIC));

app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.originalUrl });
});

app.listen(PORT, () => {
  console.log(`КиноРейтинг запущен: http://localhost:${PORT}`);
});
