# 🚀 Деплой фронтенда на lead-schem.ru

## 🎯 Что настроено

- ✅ **HTTPS** с автоматическим редиректом 
- ✅ **Домен**: `lead-schem.ru`
- ✅ **API**: `https://api.lead-schem.ru`
- ✅ **Security headers** 
- ✅ **Gzip сжатие**
- ✅ **Кеширование статики**

## 🌐 Вариант 1: Nginx (рекомендуется)

### 1. Установка Nginx
```bash
sudo apt update
sudo apt install nginx
```

### 2. SSL сертификат
```bash
# Let's Encrypt (бесплатный)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d lead-schem.ru -d www.lead-schem.ru

# Или загрузить готовый сертификат:
sudo cp lead-schem.ru.crt /etc/ssl/certs/
sudo cp lead-schem.ru.key /etc/ssl/private/
sudo chmod 600 /etc/ssl/private/lead-schem.ru.key
```

### 3. Конфигурация Nginx
```bash
# Копировать конфигурацию
sudo cp nginx.conf /etc/nginx/sites-available/lead-schem.ru
sudo ln -s /etc/nginx/sites-available/lead-schem.ru /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Проверить конфигурацию
sudo nginx -t
sudo systemctl reload nginx
```

### 4. Деплой фронтенда
```bash
# Сборка
npm run build

# Деплой файлов
sudo mkdir -p /var/www/lead-schem.ru
sudo cp -r dist/* /var/www/lead-schem.ru/
sudo chown -R www-data:www-data /var/www/lead-schem.ru
```

## 🖥️ Вариант 2: Node.js HTTPS сервер

### 1. SSL сертификат
```bash
# Размещение сертификатов
sudo mkdir -p /etc/ssl/certs /etc/ssl/private
sudo cp lead-schem.ru.crt /etc/ssl/certs/
sudo cp lead-schem.ru.key /etc/ssl/private/
sudo chmod 600 /etc/ssl/private/lead-schem.ru.key
```

### 2. Запуск HTTPS сервера
```bash
# Сборка
npm run build

# Запуск с HTTPS
npm run start:https
```

### 3. PM2 для продакшена
```bash
npm install -g pm2

# Создать ecosystem.config.js
pm2 start ecosystem.config.js
pm2 startup
pm2 save
```

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'frontend-https',
    script: 'production-server-https.cjs',
    env: {
      NODE_ENV: 'production',
      SSL_CERT_PATH: '/etc/ssl/certs/lead-schem.ru.crt',
      SSL_KEY_PATH: '/etc/ssl/private/lead-schem.ru.key'
    }
  }]
};
```

## 🔧 CI/CD деплой (GitHub Actions)

Обнови `.github/workflows/frontend-ci-cd.yml`:

```yaml
- name: 🌟 Deploy to production
  run: |
    # SSH деплой на сервер
    rsync -avz --delete ./dist/ user@lead-schem.ru:/var/www/lead-schem.ru/
    
    # Или перезапуск Node.js сервера
    ssh user@lead-schem.ru "cd /path/to/frontend && pm2 restart frontend-https"
```

## 🔍 Проверка

### Проверить HTTPS:
- ✅ https://lead-schem.ru
- ✅ Автоматический редирект с HTTP
- ✅ API работает: https://lead-schem.ru/api/health

### Проверить SSL:
```bash
# SSL Grade
https://www.ssllabs.com/ssltest/analyze.html?d=lead-schem.ru

# CURL test
curl -I https://lead-schem.ru
```

### Проверить заголовки:
```bash
curl -I https://lead-schem.ru
# Должны быть:
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# X-XSS-Protection: 1; mode=block
```

## 🚨 Troubleshooting

### SSL ошибки:
```bash
# Проверка сертификата
openssl x509 -in /etc/ssl/certs/lead-schem.ru.crt -text -noout

# Проверка приватного ключа
openssl rsa -in /etc/ssl/private/lead-schem.ru.key -check
```

### Nginx ошибки:
```bash
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/lead-schem.ru.error.log
```

### API не работает:
```bash
# Проверка доступности API
curl https://api.lead-schem.ru/api/health

# Логи прокси
sudo tail -f /var/log/nginx/lead-schem.ru.access.log
``` 