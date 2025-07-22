import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionsApi } from '../api/transactions';
import { useNotification } from '../contexts/NotificationContext';

// Ключи для кеширования
export const transactionsKeys = {
  all: ['transactions'] as const,
  lists: () => [...transactionsKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...transactionsKeys.lists(), filters] as const,
  details: () => [...transactionsKeys.all, 'detail'] as const,
  detail: (id: number) => [...transactionsKeys.details(), id] as const,
  types: () => [...transactionsKeys.all, 'types'] as const,
  stats: () => [...transactionsKeys.all, 'stats'] as const,
};

// Хук для получения списка транзакций
export const useTransactions = () => {
  return useQuery({
    queryKey: transactionsKeys.lists(),
    queryFn: () => transactionsApi.getTransactions(),
    staleTime: 2 * 60 * 1000, // 2 минуты
    gcTime: 5 * 60 * 1000, // 5 минут
    refetchOnWindowFocus: false,
  });
};

// Хук для получения одной транзакции
export const useTransaction = (id: number) => {
  return useQuery({
    queryKey: transactionsKeys.detail(id),
    queryFn: () => transactionsApi.getTransaction(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2 минуты
  });
};

// Хук для получения типов транзакций
export const useTransactionTypes = () => {
  return useQuery({
    queryKey: transactionsKeys.types(),
    queryFn: () => transactionsApi.getTransactionTypes(),
    staleTime: 30 * 60 * 1000, // 30 минут - справочник
    gcTime: 60 * 60 * 1000, // 1 час
    refetchOnWindowFocus: false,
  });
};

// Хук для создания транзакции
export const useCreateTransaction = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();

  return useMutation({
    mutationFn: (data: any) => transactionsApi.createTransaction(data),
    onSuccess: (newTransaction: any) => {
      // ✅ ПРОСТОЕ РЕШЕНИЕ: Инвалидируем ВСЕ кеши транзакций
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      
      showSuccess('Транзакция успешно создана');
    },
    onError: (error: any) => {
      showError(error.response?.data?.detail || 'Ошибка создания транзакции');
    },
  });
};

// Хук для обновления транзакции
export const useUpdateTransaction = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      transactionsApi.updateTransaction(id, data),
    onSuccess: (updatedTransaction: any) => {
      // ✅ ПРОСТОЕ РЕШЕНИЕ: Инвалидируем ВСЕ кеши транзакций
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      
      showSuccess('Транзакция успешно обновлена');
    },
    onError: (error: any) => {
      showError(error.response?.data?.detail || 'Ошибка обновления транзакции');
    },
  });
};

// Хук для удаления транзакции
export const useDeleteTransaction = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();

  return useMutation({
    mutationFn: (id: number) => transactionsApi.deleteTransaction(id),
    onSuccess: (_, deletedId) => {
      // ✅ ПРОСТОЕ РЕШЕНИЕ: Инвалидируем ВСЕ кеши транзакций
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      
      showSuccess('Транзакция успешно удалена');
    },
    onError: (error: any) => {
      showError(error.response?.data?.detail || 'Ошибка удаления транзакции');
    },
  });
}; 