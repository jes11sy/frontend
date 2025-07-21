import { test, expect } from '@playwright/test'

test.describe('Performance Tests', () => {
  test('page load performance', async ({ page }) => {
    // Измеряем время загрузки главной страницы
    const startTime = Date.now()
    
    await page.goto('/')
    
    // Ждем полной загрузки
    await page.waitForLoadState('networkidle')
    
    const loadTime = Date.now() - startTime
    
    // Проверяем, что страница загружается быстро (< 3 секунд)
    expect(loadTime).toBeLessThan(3000)
    
    // Проверяем базовые элементы
    await expect(page.locator('form')).toBeVisible()
    await expect(page.locator('input[name="username"]')).toBeVisible()
    
    console.log(`Page load time: ${loadTime}ms`)
  })

  test('requests page performance', async ({ page }) => {
    // Логин
    await page.goto('/')
    await page.fill('[name="username"]', 'testuser')
    await page.fill('[name="password"]', 'testpass')
    await page.click('button[type="submit"]')
    
    // Измеряем время загрузки страницы заявок
    const startTime = Date.now()
    
    await page.waitForURL(/\/requests/)
    await page.waitForLoadState('networkidle')
    
    const loadTime = Date.now() - startTime
    
    // Проверяем производительность загрузки списка
    expect(loadTime).toBeLessThan(2000)
    
    // Проверяем, что таблица загрузилась
    await expect(page.locator('table')).toBeVisible()
    
    console.log(`Requests page load time: ${loadTime}ms`)
  })

  test('search performance', async ({ page }) => {
    // Логин и переход к заявкам
    await page.goto('/')
    await page.fill('[name="username"]', 'testuser')
    await page.fill('[name="password"]', 'testpass')
    await page.click('button[type="submit"]')
    
    await page.waitForURL(/\/requests/)
    
    // Измеряем время поиска
    const searchInput = page.locator('input[placeholder*="поиск"], input[name="search"]')
    
    const startTime = Date.now()
    
    await searchInput.fill('тест')
    
    // Ждем обновления результатов (дебаунс)
    await page.waitForTimeout(300)
    
    const searchTime = Date.now() - startTime
    
    // Поиск должен быть быстрым
    expect(searchTime).toBeLessThan(1000)
    
    console.log(`Search time: ${searchTime}ms`)
  })

  test('memory usage check', async ({ page }) => {
    // Логин
    await page.goto('/')
    await page.fill('[name="username"]', 'testuser')
    await page.fill('[name="password"]', 'testpass')
    await page.click('button[type="submit"]')
    
    await page.waitForURL(/\/requests/)
    
    // Проверяем использование памяти через метрики браузера
    const metrics = await page.evaluate(() => {
      if ('memory' in performance) {
        return {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
          jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
        }
      }
      return null
    })

    if (metrics) {
      console.log('Memory metrics:', metrics)
      
      // Проверяем, что используемая память не превышает разумные пределы
      const usedMB = metrics.usedJSHeapSize / (1024 * 1024)
      expect(usedMB).toBeLessThan(50) // Менее 50MB
    }
  })

  test('network requests optimization', async ({ page }) => {
    // Перехватываем сетевые запросы
    const requests: string[] = []
    
    page.on('request', (request) => {
      requests.push(request.url())
    })
    
    // Логин и навигация
    await page.goto('/')
    await page.fill('[name="username"]', 'testuser')
    await page.fill('[name="password"]', 'testpass')
    await page.click('button[type="submit"]')
    
    await page.waitForURL(/\/requests/)
    await page.waitForLoadState('networkidle')
    
    // Анализируем количество запросов
    const apiRequests = requests.filter(url => url.includes('/api/'))
    
    console.log(`Total network requests: ${requests.length}`)
    console.log(`API requests: ${apiRequests.length}`)
    
    // Проверяем, что количество API запросов разумное
    expect(apiRequests.length).toBeLessThan(20)
  })

  test('large dataset handling', async ({ page }) => {
    // Логин
    await page.goto('/')
    await page.fill('[name="username"]', 'testuser')
    await page.fill('[name="password"]', 'testpass')
    await page.click('button[type="submit"]')
    
    await page.waitForURL(/\/requests/)
    
    // Имитируем загрузку большого количества данных
    // Проверяем, что интерфейс остается отзывчивым
    
    const startTime = Date.now()
    
    // Быстро прокручиваем таблицу
    for (let i = 0; i < 5; i++) {
      await page.mouse.wheel(0, 300)
      await page.waitForTimeout(100)
    }
    
    const scrollTime = Date.now() - startTime
    
    // Проверяем, что прокрутка выполняется плавно
    expect(scrollTime).toBeLessThan(1000)
    
    // Проверяем, что таблица все еще отзывчива
    await expect(page.locator('table')).toBeVisible()
    
    console.log(`Scroll performance: ${scrollTime}ms`)
  })

  test('form performance', async ({ page }) => {
    // Логин
    await page.goto('/')
    await page.fill('[name="username"]', 'testuser')
    await page.fill('[name="password"]', 'testpass')
    await page.click('button[type="submit"]')
    
    await page.waitForURL(/\/requests/)
    
    // Переходим к созданию заявки
    await page.click('button:has-text("Создать")')
    await page.waitForLoadState('networkidle')
    
    // Измеряем время отклика формы
    const inputs = [
      '[name="client_phone"]',
      '[name="client_name"]',
      '[name="address"]',
      '[name="description"]'
    ]
    
    const startTime = Date.now()
    
    // Быстро заполняем все поля
    for (const input of inputs) {
      await page.fill(input, 'Тестовые данные')
    }
    
    const fillTime = Date.now() - startTime
    
    // Форма должна отвечать быстро
    expect(fillTime).toBeLessThan(500)
    
    console.log(`Form fill time: ${fillTime}ms`)
  })

  test('concurrent users simulation', async ({ browser }) => {
    // Создаем несколько параллельных сессий
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext()
    ])
    
    const pages = await Promise.all(
      contexts.map(context => context.newPage())
    )
    
    // Все пользователи логинятся одновременно
    const loginPromises = pages.map(async (page, index) => {
      await page.goto('/')
      await page.fill('[name="username"]', `testuser${index}`)
      await page.fill('[name="password"]', 'testpass')
      await page.click('button[type="submit"]')
      return page.waitForURL(/\/requests/)
    })
    
    const startTime = Date.now()
    
    // Ждем завершения всех логинов
    await Promise.all(loginPromises)
    
    const concurrentTime = Date.now() - startTime
    
    console.log(`Concurrent login time: ${concurrentTime}ms`)
    
    // Проверяем, что все сессии работают
    for (const page of pages) {
      await expect(page.locator('h1')).toBeVisible()
    }
    
    // Закрываем контексты
    await Promise.all(contexts.map(context => context.close()))
  })

  test('bundle size check', async ({ page }) => {
    // Перехватываем загрузку JavaScript файлов
    const jsFiles: { url: string, size: number }[] = []
    
    page.on('response', async (response) => {
      if (response.url().endsWith('.js') && response.status() === 200) {
        const buffer = await response.body()
        jsFiles.push({
          url: response.url(),
          size: buffer.length
        })
      }
    })
    
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Анализируем размеры файлов
    const totalSize = jsFiles.reduce((sum, file) => sum + file.size, 0)
    const totalSizeMB = totalSize / (1024 * 1024)
    
    console.log(`Total JS bundle size: ${totalSizeMB.toFixed(2)}MB`)
    console.log(`JS files count: ${jsFiles.length}`)
    
    // Проверяем, что общий размер не слишком большой
    expect(totalSizeMB).toBeLessThan(5) // Менее 5MB
    
    // Проверяем количество файлов (code splitting)
    expect(jsFiles.length).toBeGreaterThan(1) // Код должен быть разделен
  })
}) 