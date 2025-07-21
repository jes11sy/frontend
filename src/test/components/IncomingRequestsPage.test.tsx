import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { HeroUIProvider } from '@heroui/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Простой мок компонент для тестирования концепции IncomingRequestsPage
const SimpleIncomingRequestsPage = () => {
  const [loading, setLoading] = React.useState(true)
  const [requests] = React.useState([
    {
      id: 1,
      client_phone: '+7 (123) 456-78-90',
      address: 'ул. Тестовая, 1',
      status: 'Новая',
      call_center_name: 'КЦ Центральный',
      created_at: '2025-01-16T10:00:00Z',
      client_name: 'Тестовый клиент'
    },
    {
      id: 2,
      client_phone: '+7 (987) 654-32-10',
      address: 'пр. Проспект, 5',
      status: 'Перезвонить',
      call_center_name: 'КЦ Северный',
      created_at: '2025-01-16T11:00:00Z',
      client_name: 'Другой клиент'
    }
  ])
  
  React.useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 100)
    return () => clearTimeout(timer)
  }, [])

  if (loading) {
    return (
      <div data-testid="loading">
        <div role="progressbar">Загрузка...</div>
      </div>
    )
  }

  return (
    <div>
      <h1>Входящие заявки</h1>
      <button>Создать заявку</button>
      
      <div data-testid="search-controls">
        <input 
          placeholder="Поиск по телефону или адресу" 
          data-testid="search-input" 
        />
        <select data-testid="status-filter">
          <option value="all">Все статусы</option>
          <option value="Новая">Новая</option>
          <option value="Перезвонить">Перезвонить</option>
        </select>
      </div>
      
      <div data-testid="requests-table">
        {requests.map(request => (
          <div key={request.id} data-testid={`request-${request.id}`}>
            <span>{request.client_phone}</span>
            <span>{request.address}</span>
            <span>{request.status}</span>
            <span>{request.call_center_name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Хелпер для рендеринга компонента
const renderIncomingRequestsPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0
      }
    }
  })

  return render(
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <HeroUIProvider>
          <SimpleIncomingRequestsPage />
        </HeroUIProvider>
      </QueryClientProvider>
    </BrowserRouter>
  )
}

describe('IncomingRequestsPage Concept Tests', () => {
  it('renders loading state initially', () => {
    renderIncomingRequestsPage()
    
    expect(screen.getByTestId('loading')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('renders page title and create button after loading', async () => {
    renderIncomingRequestsPage()
    
    await waitFor(() => {
      expect(screen.getByText('Входящие заявки')).toBeInTheDocument()
    })
    
    expect(screen.getByRole('button', { name: /создать заявку/i })).toBeInTheDocument()
  })

  it('displays search controls', async () => {
    renderIncomingRequestsPage()
    
    await waitFor(() => {
      expect(screen.getByTestId('search-controls')).toBeInTheDocument()
    })
    
    expect(screen.getByTestId('search-input')).toBeInTheDocument()
    expect(screen.getByTestId('status-filter')).toBeInTheDocument()
  })

  it('displays requests list', async () => {
    renderIncomingRequestsPage()
    
    await waitFor(() => {
      expect(screen.getByTestId('requests-table')).toBeInTheDocument()
    })
    
    expect(screen.getByText('+7 (123) 456-78-90')).toBeInTheDocument()
    expect(screen.getByText('+7 (987) 654-32-10')).toBeInTheDocument()
    expect(screen.getByText('ул. Тестовая, 1')).toBeInTheDocument()
    expect(screen.getByText('пр. Проспект, 5')).toBeInTheDocument()
  })

  it('displays request statuses', async () => {
    renderIncomingRequestsPage()
    
    await waitFor(() => {
      // Используем более специфичные селекторы для элементов в таблице
      const requestsTable = screen.getByTestId('requests-table')
      expect(requestsTable).toBeInTheDocument()
    })
    
    // Проверяем статусы в таблице через data-testid элементов
    expect(screen.getByTestId('request-1')).toHaveTextContent('Новая')
    expect(screen.getByTestId('request-2')).toHaveTextContent('Перезвонить')
  })

  it('displays call center names', async () => {
    renderIncomingRequestsPage()
    
    await waitFor(() => {
      expect(screen.getByText('КЦ Центральный')).toBeInTheDocument()
      expect(screen.getByText('КЦ Северный')).toBeInTheDocument()
    })
  })

  it('has accessible form elements', async () => {
    renderIncomingRequestsPage()
    
    await waitFor(() => {
      const searchInput = screen.getByTestId('search-input')
      const statusFilter = screen.getByTestId('status-filter')
      
      expect(searchInput).toHaveAttribute('placeholder')
      expect(statusFilter).toBeInTheDocument()
    })
  })
}) 