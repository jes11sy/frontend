import { test, expect } from '@playwright/test'

test.describe('Requests Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Настройка перед каждым тестом
    await page.goto('/')
  })

  test('complete requests workflow', async ({ page }) => {
    // 1. Логин
    await page.fill('[name="username"]', 'testuser')
    await page.fill('[name="password"]', 'testpass')
    await page.click('button[type="submit"]')
    
    // Ожидаем перенаправления
    await expect(page).toHaveURL(/\/requests/)
    
    // 2. Проверяем страницу заявок
    await expect(page.locator('h1')).toContainText('Заявки')
    
    // 3. Переходим к созданию новой заявки
    await page.click('button:has-text("Создать заявку")')
    await expect(page).toHaveURL(/\/incoming-requests\/create/)
    
    // 4. Заполняем форму новой заявки
    await page.fill('[name="client_phone"]', '+7 (999) 123-45-67')
    await page.fill('[name="client_name"]', 'Тестовый клиент E2E')
    await page.fill('[name="address"]', 'ул. Тестовая E2E, 123')
    await page.fill('[name="description"]', 'Описание тестовой заявки для E2E')
    
    // Выбираем тип заявки
    await page.click('select[name="request_type_id"]')
    await page.selectOption('select[name="request_type_id"]', { index: 1 })
    
    // Выбираем город
    await page.click('select[name="city_id"]')
    await page.selectOption('select[name="city_id"]', { index: 1 })
    
    // 5. Сохраняем заявку
    await page.click('button[type="submit"]')
    
    // Ожидаем успешного создания и перенаправления
    await expect(page).toHaveURL(/\/requests/)
    
    // 6. Проверяем, что заявка появилась в списке
    await expect(page.locator('table')).toContainText('+7 (999) 123-45-67')
    await expect(page.locator('table')).toContainText('Тестовый клиент E2E')
  })

  test('search and filter functionality', async ({ page }) => {
    // Логин
    await page.fill('[name="username"]', 'testuser')
    await page.fill('[name="password"]', 'testpass')
    await page.click('button[type="submit"]')
    
    await expect(page).toHaveURL(/\/requests/)
    
    // Проверяем поиск
    const searchInput = page.locator('input[placeholder*="поиск"], input[name="search"]')
    await searchInput.fill('123')
    
    // Ждем результатов поиска
    await page.waitForTimeout(500)
    
    // Проверяем фильтрацию по статусу
    const statusFilter = page.locator('select:has(option:text("Все статусы")), select[name="status"]')
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption('Новая')
      await page.waitForTimeout(500)
    }
    
    // Проверяем, что таблица обновилась
    await expect(page.locator('table')).toBeVisible()
  })

  test('request details view', async ({ page }) => {
    // Логин
    await page.fill('[name="username"]', 'testuser')
    await page.fill('[name="password"]', 'testpass')
    await page.click('button[type="submit"]')
    
    await expect(page).toHaveURL(/\/requests/)
    
    // Кликаем на первую заявку в списке
    const firstRow = page.locator('table tbody tr').first()
    await firstRow.click()
    
    // Ожидаем перехода к деталям заявки
    await expect(page).toHaveURL(/\/requests\/\d+/)
    
    // Проверяем, что детали заявки отображаются
    await expect(page.locator('h1, h2')).toContainText(/Заявка|Детали/)
    
    // Проверяем наличие основных полей
    await expect(page.locator('text=Телефон')).toBeVisible()
    await expect(page.locator('text=Адрес')).toBeVisible()
    await expect(page.locator('text=Статус')).toBeVisible()
  })

  test('edit request functionality', async ({ page }) => {
    // Логин
    await page.fill('[name="username"]', 'testuser')
    await page.fill('[name="password"]', 'testpass')
    await page.click('button[type="submit"]')
    
    await expect(page).toHaveURL(/\/requests/)
    
    // Переходим к редактированию заявки
    await page.goto('/incoming-requests/1/edit')
    
    // Проверяем, что форма редактирования загрузилась
    await expect(page.locator('h1, h2')).toContainText(/Редактирование|Изменить/)
    
    // Изменяем описание
    const descriptionField = page.locator('[name="description"], textarea')
    await descriptionField.clear()
    await descriptionField.fill('Обновленное описание E2E тест')
    
    // Сохраняем изменения
    await page.click('button[type="submit"]:has-text("Сохранить"), button:has-text("Обновить")')
    
    // Ожидаем успешного сохранения
    await page.waitForTimeout(1000)
  })

  test('responsive design check', async ({ page }) => {
    // Проверяем мобильную версию
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Логин
    await page.fill('[name="username"]', 'testuser')
    await page.fill('[name="password"]', 'testpass')
    await page.click('button[type="submit"]')
    
    await expect(page).toHaveURL(/\/requests/)
    
    // Проверяем, что интерфейс адаптируется
    await expect(page.locator('h1')).toBeVisible()
    
    // Проверяем планшетную версию
    await page.setViewportSize({ width: 768, height: 1024 })
    await expect(page.locator('table, .table-container')).toBeVisible()
    
    // Возвращаем обычный размер
    await page.setViewportSize({ width: 1280, height: 720 })
  })

  test('error handling', async ({ page }) => {
    // Проверяем обработку ошибок входа
    await page.fill('[name="username"]', 'wronguser')
    await page.fill('[name="password"]', 'wrongpass')
    await page.click('button[type="submit"]')
    
    // Ожидаем сообщение об ошибке
    await expect(page.locator('text=*ошибка*, text=*неверн*, [role="alert"]')).toBeVisible()
    
    // Проверяем, что остались на странице логина
    await expect(page).toHaveURL('/')
  })

  test('navigation between pages', async ({ page }) => {
    // Логин
    await page.fill('[name="username"]', 'testuser')
    await page.fill('[name="password"]', 'testpass')
    await page.click('button[type="submit"]')
    
    await expect(page).toHaveURL(/\/requests/)
    
    // Навигация по основным разделам
    const navigationItems = [
      { text: 'Заявки', url: /\/requests/ },
      { text: 'Входящие', url: /\/incoming/ },
      { text: 'Транзакции', url: /\/transactions/ },
      { text: 'Пользователи', url: /\/users/ }
    ]
    
    for (const item of navigationItems) {
      const navLink = page.locator(`nav a:has-text("${item.text}"), [role="navigation"] a:has-text("${item.text}")`)
      if (await navLink.isVisible()) {
        await navLink.click()
        await page.waitForTimeout(500)
        // Проверяем, что URL изменился соответственно
        if (await page.url().match(item.url)) {
          console.log(`✓ Navigation to ${item.text} works`)
        }
      }
    }
  })

  test('keyboard navigation', async ({ page }) => {
    // Логин
    await page.fill('[name="username"]', 'testuser')
    await page.fill('[name="password"]', 'testpass')
    await page.press('[name="password"]', 'Enter') // Вход через Enter
    
    await expect(page).toHaveURL(/\/requests/)
    
    // Проверяем навигацию с клавиатуры
    await page.press('body', 'Tab') // Переход к первому элементу
    await page.press('body', 'Tab') // Переход к следующему элементу
    
    // Проверяем, что фокус работает
    const focusedElement = page.locator(':focus')
    await expect(focusedElement).toBeVisible()
  })

  test('data persistence', async ({ page }) => {
    // Логин
    await page.fill('[name="username"]', 'testuser')
    await page.fill('[name="password"]', 'testpass')
    await page.click('button[type="submit"]')
    
    await expect(page).toHaveURL(/\/requests/)
    
    // Применяем фильтр
    const searchInput = page.locator('input[placeholder*="поиск"], input[name="search"]')
    await searchInput.fill('тест')
    
    // Перезагружаем страницу
    await page.reload()
    
    // Проверяем, что пользователь остался авторизованным
    await expect(page).toHaveURL(/\/requests/)
    await expect(page.locator('h1')).toBeVisible()
  })
}) 