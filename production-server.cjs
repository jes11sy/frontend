const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;

// Прокси для API
app.use('/api', createProxyMiddleware({
  target: 'https://api.lead-schem.ru',
  changeOrigin: true,
  secure: true,
  headers: {
    'Host': 'api.lead-schem.ru'
  }
}));

// Статические файлы
app.use(express.static(path.join(__dirname, 'dist')));

// Обработка всех маршрутов (для SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Production server running on http://localhost:${PORT}`);
}); 