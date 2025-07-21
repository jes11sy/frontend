import React, { createContext, useContext } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { HeroUIProvider } from '@heroui/react';
import { render } from '@testing-library/react';
import { vi } from 'vitest';
import { NotificationProvider } from '../../contexts/NotificationContext';

// Типы для мок-данных
interface MockAppDataContextType {
  cities: Array<{ id: number; name: string }>;
  roles: Array<{ id: number; name: string }>;
  requestTypes: Array<{ id: number; name: string }>;
  directions: Array<{ id: number; name: string }>;
  transactionTypes: Array<{ id: number; name: string; display_name: string }>;
  loading: {
    cities: boolean;
    roles: boolean;
    requestTypes: boolean;
    directions: boolean;
    transactionTypes: boolean;
  };
  refetchCities: () => Promise<void>;
  refetchRoles: () => Promise<void>;
  refetchRequestTypes: () => Promise<void>;
  refetchDirections: () => Promise<void>;
  refetchTransactionTypes: () => Promise<void>;
  refetchAll: () => Promise<void>;
}

// Мок-данные для AppDataProvider
const mockAppData: MockAppDataContextType = {
  cities: [
    { id: 1, name: 'Москва' },
    { id: 2, name: 'Санкт-Петербург' },
    { id: 3, name: 'Новосибирск' }
  ],
  roles: [
    { id: 1, name: 'admin' },
    { id: 2, name: 'director' },
    { id: 3, name: 'callcenter' }
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
  transactionTypes: [
    { id: 1, name: 'income', display_name: 'Доход' },
    { id: 2, name: 'expense', display_name: 'Расход' }
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
};

// Создаем мок-контекст
const MockAppDataContext = createContext<MockAppDataContextType | undefined>(undefined);

// Мок-провайдер
const MockAppDataProvider: React.FC<{ children: React.ReactNode; value?: Partial<MockAppDataContextType> }> = ({ 
  children, 
  value = {} 
}) => {
  const contextValue = { ...mockAppData, ...value };
  return (
    <MockAppDataContext.Provider value={contextValue}>
      {children}
    </MockAppDataContext.Provider>
  );
};

// Мок хук
export const mockUseAppData = () => {
  const context = useContext(MockAppDataContext);
  if (!context) {
    throw new Error('mockUseAppData must be used within a MockAppDataProvider');
  }
  return context;
};

interface TestProvidersProps {
  children: React.ReactNode;
  queryClient?: QueryClient;
  mockAppDataOverride?: Partial<MockAppDataContextType>;
}

export const TestProviders: React.FC<TestProvidersProps> = ({ 
  children, 
  queryClient,
  mockAppDataOverride = {}
}) => {
  const client = queryClient || new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
      },
    },
  });

  return (
    <QueryClientProvider client={client}>
      <BrowserRouter>
        <HeroUIProvider>
          <NotificationProvider>
            <MockAppDataProvider value={mockAppDataOverride}>
              {children}
            </MockAppDataProvider>
          </NotificationProvider>
        </HeroUIProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

// Утилита для рендеринга с провайдерами
export const renderWithProviders = (
  ui: React.ReactElement,
  options: {
    queryClient?: QueryClient;
    mockAppDataOverride?: Partial<MockAppDataContextType>;
  } = {}
) => {
  return {
    ...render(ui, {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <TestProviders 
          queryClient={options.queryClient}
          mockAppDataOverride={options.mockAppDataOverride}
        >
          {children}
        </TestProviders>
      ),
    }),
  };
};

// Экспорт мок-данных для использования в тестах
export { mockAppData }; 