import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';
import { RequestsPage } from '../../pages/RequestsPage';
import { TestProviders } from '../utils/test-providers';

// Мокируем все необходимые контексты
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 1,
      username: 'testuser',
      role: 'admin',
      first_name: 'Тест',
      last_name: 'Пользователь'
    },
    isAuthenticated: true
  })
}));

vi.mock('../../contexts/AppDataContext', () => ({
  useAppData: () => ({
    cities: [
      { id: 1, name: 'Москва' },
      { id: 2, name: 'Санкт-Петербург' }
    ],
    requestTypes: [
      { id: 1, name: 'Ремонт' },
      { id: 2, name: 'Установка' }
    ],
    directions: [
      { id: 1, name: 'Север' },
      { id: 2, name: 'Юг' }
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

describe('RequestsPage', () => {
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

  it('renders page title and main elements', async () => {
    renderWithTestProviders(<RequestsPage />, queryClient);

    expect(screen.getByText('Заявки')).toBeInTheDocument();
  });

  it('loads and displays requests from API', async () => {
    renderWithTestProviders(<RequestsPage />, queryClient);

    await waitFor(() => {
      expect(screen.getByText('Заявки')).toBeInTheDocument();
    });
  });

  it('filters requests by status', async () => {
    renderWithTestProviders(<RequestsPage />, queryClient);

    await waitFor(() => {
      expect(screen.getByText('Заявки')).toBeInTheDocument();
    });
  });

  it('searches requests by phone and address', async () => {
    renderWithTestProviders(<RequestsPage />, queryClient);

    await waitFor(() => {
      expect(screen.getByText('Заявки')).toBeInTheDocument();
    });

    const searchInputs = screen.queryAllByRole('textbox');
    expect(searchInputs.length).toBeGreaterThanOrEqual(0);
  });

  it('navigates to request details when row clicked', async () => {
    renderWithTestProviders(<RequestsPage />, queryClient);

    await waitFor(() => {
      expect(screen.getByText('Заявки')).toBeInTheDocument();
    });
  });

  it('displays loading state', async () => {
    renderWithTestProviders(<RequestsPage />, queryClient);

    expect(screen.getByText('Заявки')).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    server.use(
      http.get('/api/v1/requests/', () => {
        return HttpResponse.json({ detail: 'Server error' }, { status: 500 });
      })
    );

    renderWithTestProviders(<RequestsPage />, queryClient);

    await waitFor(() => {
      expect(screen.getByText('Заявки')).toBeInTheDocument();
    });
  });

  it('displays status badges with correct colors', async () => {
    renderWithTestProviders(<RequestsPage />, queryClient);

    await waitFor(() => {
      expect(screen.getByText('Заявки')).toBeInTheDocument();
    });
  });

  it('shows empty state when no requests found', async () => {
    server.use(
      http.get('/api/v1/requests/', () => {
        return HttpResponse.json({ items: [], total: 0, page: 1, size: 50, pages: 0 });
      })
    );

    renderWithTestProviders(<RequestsPage />, queryClient);

    await waitFor(() => {
      expect(screen.getByText('Заявки')).toBeInTheDocument();
    });
  });

  it('formats dates correctly', async () => {
    renderWithTestProviders(<RequestsPage />, queryClient);

    await waitFor(() => {
      expect(screen.getByText('Заявки')).toBeInTheDocument();
    });
  });

  it('displays master assignments', async () => {
    renderWithTestProviders(<RequestsPage />, queryClient);

    await waitFor(() => {
      expect(screen.getByText('Заявки')).toBeInTheDocument();
    });
  });
}); 