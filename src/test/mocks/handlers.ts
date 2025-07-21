import { http, HttpResponse } from 'msw'

// Mock данные для тестов
export const mockRequests = [
  {
    id: 1,
    client_phone: '+7 (123) 456-78-90',
    address: 'ул. Тестовая, 1',
    status: 'Новая',
    call_center_name: 'КЦ Центральный',
    created_at: '2025-01-16T10:00:00Z',
    client_name: 'Тестовый клиент',
    request_type: 'Замена замка',
    direction: 'Входящая',
    priority: 'Средний',
    description: 'Описание тестовой заявки'
  },
  {
    id: 2,
    client_phone: '+7 (987) 654-32-10',
    address: 'пр. Проспект, 5',
    status: 'Перезвонить',
    call_center_name: 'КЦ Северный',
    created_at: '2025-01-16T11:00:00Z',
    client_name: 'Другой клиент',
    request_type: 'Вскрытие замка',
    direction: 'Входящая',
    priority: 'Высокий',
    description: 'Срочная заявка'
  },
  {
    id: 3,
    client_phone: '+7 (555) 123-45-67',
    address: 'ул. Закрытая, 10',
    status: 'Выполнена',
    call_center_name: 'КЦ Южный',
    created_at: '2025-01-16T12:00:00Z',
    client_name: 'Выполненный клиент',
    request_type: 'Замена ручки',
    direction: 'Входящая',
    priority: 'Низкий',
    description: 'Завершенная заявка'
  }
]

export const mockTransactions = [
  {
    id: 1,
    type: 'income',
    amount: 5000,
    description: 'Оплата за замену замка',
    category: 'Услуги',
    date: '2025-01-16T10:00:00Z',
    request_id: 1
  },
  {
    id: 2,
    type: 'expense',
    amount: 1500,
    description: 'Покупка инструментов',
    category: 'Расходные материалы',
    date: '2025-01-16T11:00:00Z'
  }
]

export const mockUser = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  role: 'admin',
  first_name: 'Тест',
  last_name: 'Пользователь'
}

export const mockAuthResponse = {
  access_token: 'mock-jwt-token',
  token_type: 'bearer',
  user: mockUser
}

// API handlers
export const handlers = [
  // Auth endpoints
  http.post('/api/auth/login', async ({ request }) => {
    const { username, password } = await request.json() as any
    
    if (username === 'testuser' && password === 'testpass') {
      return HttpResponse.json(mockAuthResponse)
    }
    
    return HttpResponse.json(
      { detail: 'Неверные учетные данные' },
      { status: 401 }
    )
  }),

  http.get('/api/auth/me', () => {
    return HttpResponse.json(mockUser)
  }),

  http.post('/api/auth/logout', () => {
    return HttpResponse.json({ message: 'Logged out successfully' })
  }),

  // Requests endpoints
  http.get('/api/requests', ({ request }) => {
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    
    let filteredRequests = mockRequests
    if (status && status !== 'all') {
      filteredRequests = mockRequests.filter(req => req.status === status)
    }
    
    return HttpResponse.json(filteredRequests)
  }),

  http.get('/api/requests/:id', ({ params }) => {
    const id = parseInt(params.id as string)
    const request = mockRequests.find(req => req.id === id)
    
    if (!request) {
      return HttpResponse.json(
        { detail: 'Заявка не найдена' },
        { status: 404 }
      )
    }
    
    return HttpResponse.json(request)
  }),

  http.post('/api/requests', async ({ request }) => {
    const newRequest = await request.json() as any
    const id = mockRequests.length + 1
    
    const createdRequest = {
      id,
      ...newRequest,
      created_at: new Date().toISOString(),
      status: 'Новая'
    }
    
    return HttpResponse.json(createdRequest, { status: 201 })
  }),

  http.put('/api/requests/:id', async ({ params, request }) => {
    const id = parseInt(params.id as string)
    const updates = await request.json() as any
    const existingRequest = mockRequests.find(req => req.id === id)
    
    if (!existingRequest) {
      return HttpResponse.json(
        { detail: 'Заявка не найдена' },
        { status: 404 }
      )
    }
    
    const updatedRequest = { ...existingRequest, ...updates }
    return HttpResponse.json(updatedRequest)
  }),

  // Transactions endpoints
  http.get('/api/transactions', () => {
    return HttpResponse.json(mockTransactions)
  }),

  http.post('/api/transactions', async ({ request }) => {
    const newTransaction = await request.json() as any
    const id = mockTransactions.length + 1
    
    const createdTransaction = {
      id,
      ...newTransaction,
      date: new Date().toISOString()
    }
    
    return HttpResponse.json(createdTransaction, { status: 201 })
  }),

  // Master data endpoints
  http.get('/api/cities', () => {
    return HttpResponse.json([
      { id: 1, name: 'Москва' },
      { id: 2, name: 'Санкт-Петербург' },
      { id: 3, name: 'Новосибирск' }
    ])
  }),

  http.get('/api/request-types', () => {
    return HttpResponse.json([
      { id: 1, name: 'Замена замка' },
      { id: 2, name: 'Вскрытие замка' },
      { id: 3, name: 'Замена ручки' },
      { id: 4, name: 'Установка замка' }
    ])
  }),

  http.get('/api/directions', () => {
    return HttpResponse.json([
      { id: 1, name: 'Входящая' },
      { id: 2, name: 'Исходящая' }
    ])
  }),

  // Health check
  http.get('/api/health', () => {
    return HttpResponse.json({
      status: 'healthy',
      service: 'Request Management System',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    })
  }),

  // Error simulation endpoints для тестирования
  http.get('/api/requests/error', () => {
    return HttpResponse.json(
      { detail: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }),

  http.get('/api/requests/network-error', () => {
    return HttpResponse.error()
  })
] 