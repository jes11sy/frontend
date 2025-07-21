const express = require('express');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const HTTP_PORT = process.env.HTTP_PORT || 80;
const HTTPS_PORT = process.env.HTTPS_PORT || 443;

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // HTTPS redirect
  if (req.header('x-forwarded-proto') !== 'https' && process.env.NODE_ENV === 'production') {
    res.redirect(`https://${req.header('host')}${req.url}`);
  } else {
    next();
  }
});

// Прокси для API
app.use('/api', createProxyMiddleware({
  target: 'https://api.lead-schem.ru',
  changeOrigin: true,
  secure: true,
  headers: {
    'Host': 'api.lead-schem.ru'
  },
  onProxyReq: (proxyReq, req, res) => {
    // Логирование запросов API
    console.log(`[API] ${req.method} ${req.url} -> ${proxyReq.path}`);
  },
  onError: (err, req, res) => {
    console.error('API Proxy Error:', err);
    res.status(502).json({ error: 'API недоступен' });
  }
}));

// Статические файлы с кешированием
app.use(express.static(path.join(__dirname, 'dist'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1y' : 0,
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    // HTML файлы не кешируем
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

// Обработка всех маршрутов (для SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// HTTP сервер (только для редиректа на HTTPS)
const httpServer = http.createServer((req, res) => {
  res.writeHead(301, { 
    'Location': `https://${req.headers.host}${req.url}` 
  });
  res.end();
});

// HTTPS сервер
function startHTTPSServer() {
  const certPath = process.env.SSL_CERT_PATH || '/etc/ssl/certs/lead-schem.ru.crt';
  const keyPath = process.env.SSL_KEY_PATH || '/etc/ssl/private/lead-schem.ru.key';
  
  try {
    const options = {
      cert: fs.readFileSync(certPath),
      key: fs.readFileSync(keyPath)
    };
    
    const httpsServer = https.createServer(options, app);
    
    httpsServer.listen(HTTPS_PORT, () => {
      console.log(`🔐 HTTPS Server running on https://lead-schem.ru:${HTTPS_PORT}`);
    });
    
    // HTTP редирект
    httpServer.listen(HTTP_PORT, () => {
      console.log(`🔄 HTTP Redirect server running on port ${HTTP_PORT}`);
    });
    
  } catch (error) {
    console.warn('⚠️  SSL certificates not found, falling back to HTTP only');
    console.warn('For production, place certificates at:');
    console.warn(`  - ${certPath}`);
    console.warn(`  - ${keyPath}`);
    
    // Fallback to HTTP only
    app.listen(HTTP_PORT, () => {
      console.log(`🌐 HTTP Server running on http://lead-schem.ru:${HTTP_PORT}`);
    });
  }
}

startHTTPSServer(); 