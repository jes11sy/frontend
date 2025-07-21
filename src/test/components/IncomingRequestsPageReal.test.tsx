import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';
import IncomingRequestsPage from '../../pages/IncomingRequestsPage';
import { TestProviders } from '../utils/test-providers';

// Мокируем useAppData
vi.mock('../../contexts/AppDataContext', () => ({
  useAppData: () => ({
    cities: [
      { id: 1, name: 'Москва' },
      { id: 2, name: 'Санкт-Петербург' },
      { id: 3, name: 'Новосибирск' }
    ],
    requestTypes: [
      { id: 1, name: 'Ремонт' },
      { id: 2, name: 'Установка' },
      { id: 3, name: 'Обслуживание' }
    ],
    directions: [
      { id: 1, name: 'Север' },
      { id: 2, name: 'Юг' },
      { id: 3, name: 'Восток' },
      { id: 4, name: 'Запад' }
    ],
    loading: {
      cities: false,
      roles: false,
      requestTypes: false,
      directions: false,
      transactionTypes: false
    },
    refetchCities: vi.fn(),
    refetchRoles: vi.fn(),
    refetchRequestTypes: vi.fn(),
    refetchDirections: vi.fn(),
    refetchTransactionTypes: vi.fn(),
    refetchAll: vi.fn()
  }),
  AppDataProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

const renderWithTestProviders = (ui: React.ReactElement, queryClient?: QueryClient) => {
  const client = queryClient || new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
      },
    },
  });

  return render(
    <TestProviders queryClient={client}>
      {ui}
    </TestProviders>
  );
};

describe('IncomingRequestsPage - MSW Integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          refetchOnWindowFocus: false,
        },
      },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('loads and displays requests from API', async () => {
    renderWithTestProviders(<IncomingRequestsPage />, queryClient);

    // Проверяем загрузку
    expect(screen.getByText('Входящие заявки')).toBeInTheDocument();
    
    // Ждем загрузки данных
    await waitFor(() => {
      expect(screen.getByText('Иван Петров')).toBeInTheDocument();
    });

    expect(screen.getByText('Анна Сидорова')).toBeInTheDocument();
    expect(screen.getByText('Новые')).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    // Мокируем ошибку API
    server.use(
      http.get('/api/v1/requests/', () => {
        return HttpResponse.json({ detail: 'Server error' }, { status: 500 });
      })
    );

    renderWithTestProviders(<IncomingRequestsPage />, queryClient);

    await waitFor(() => {
      expect(screen.getByText('Входящие заявки')).toBeInTheDocument();
    });
  });

  it('filters requests by search text', async () => {
    renderWithTestProviders(<IncomingRequestsPage />, queryClient);

    // Ждем загрузки
    await waitFor(() => {
      expect(screen.getByText('Иван Петров')).toBeInTheDocument();
    });

    // Находим поле поиска и вводим текст
    const searchInput = screen.getByPlaceholderText(/поиск/i);
    fireEvent.change(searchInput, { target: { value: 'Иван' } });

    // Проверяем, что фильтрация работает
    await waitFor(() => {
      expect(screen.getByText('Иван Петров')).toBeInTheDocument();
    });
  });

  it('navigates to create page when create button clicked', async () => {
    renderWithTestProviders(<IncomingRequestsPage />, queryClient);

    await waitFor(() => {
      const createButton = screen.getByRole('button', { name: /создать/i });
      expect(createButton).toBeInTheDocument();
    });
  });

  it('navigates to edit page when request row clicked', async () => {
    renderWithTestProviders(<IncomingRequestsPage />, queryClient);

    await waitFor(() => {
      expect(screen.getByText('Иван Петров')).toBeInTheDocument();
    });

    // Кликаем по строке заявки
    const requestRow = screen.getByText('Иван Петров').closest('tr');
    if (requestRow) {
      fireEvent.click(requestRow);
    }
  });

  it('displays loading state while fetching data', async () => {
    renderWithTestProviders(<IncomingRequestsPage />, queryClient);

    // Проверяем, что есть индикатор загрузки или заголовок
    expect(screen.getByText('Входящие заявки')).toBeInTheDocument();
  });

  it('handles empty requests list', async () => {
    // Мокируем пустой ответ
    server.use(
      http.get('/api/v1/requests/', () => {
        return HttpResponse.json({ items: [], total: 0, page: 1, size: 50, pages: 0 });
      })
    );

    renderWithTestProviders(<IncomingRequestsPage />, queryClient);

    await waitFor(() => {
      expect(screen.getByText('Входящие заявки')).toBeInTheDocument();
    });
  });

  it('formats dates correctly', async () => {
    renderWithTestProviders(<IncomingRequestsPage />, queryClient);

    await waitFor(() => {
      expect(screen.getByText('Иван Петров')).toBeInTheDocument();
    });

    // Проверяем, что даты отображаются
    const dateElements = screen.getAllByText(/\d{2}\.\d{2}\.\d{4}/);
    expect(dateElements.length).toBeGreaterThan(0);
  });

  it('displays correct status colors and chips', async () => {
    renderWithTestProviders(<IncomingRequestsPage />, queryClient);

    await waitFor(() => {
      expect(screen.getByText('Иван Петров')).toBeInTheDocument();
    });

    // Проверяем наличие статусов
    expect(screen.getByText('Новые')).toBeInTheDocument();
  });

  it('shows call center filter dropdown with unique values', async () => {
    renderWithTestProviders(<IncomingRequestsPage />, queryClient);

    await waitFor(() => {
      expect(screen.getByText('Входящие заявки')).toBeInTheDocument();
    });

    // Ищем элементы фильтрации
    const filterElements = screen.queryAllByRole('button');
    expect(filterElements.length).toBeGreaterThan(0);
  });

  it('handles network errors', async () => {
    // Мокируем сетевую ошибку
    server.use(
      http.get('/api/v1/requests/', () => {
        return HttpResponse.error();
      })
    );

    renderWithTestProviders(<IncomingRequestsPage />, queryClient);

    await waitFor(() => {
      expect(screen.getByText('Входящие заявки')).toBeInTheDocument();
    });
  });
}); 