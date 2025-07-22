import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../api/users';
import { useNotification } from '../contexts/NotificationContext';

// Ключи для кеширования
export const usersKeys = {
  all: ['users'] as const,
  lists: () => [...usersKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...usersKeys.lists(), filters] as const,
  details: () => [...usersKeys.all, 'detail'] as const,
  detail: (id: number) => [...usersKeys.details(), id] as const,
  masters: () => [...usersKeys.all, 'masters'] as const,
  cities: () => [...usersKeys.all, 'cities'] as const,
};

// Хук для получения списка пользователей (используем мастеров как основных пользователей)
export const useUsers = () => {
  return useQuery({
    queryKey: usersKeys.lists(),
    queryFn: () => usersApi.getMasters(),
    // staleTime: 5 * 60 * 1000, // 5 минут
    // gcTime: 10 * 60 * 1000, // 10 минут
    refetchOnWindowFocus: false,
  });
};

// Хук для получения списка мастеров
export const useMasters = () => {
  return useQuery({
    queryKey: usersKeys.masters(),
    queryFn: () => usersApi.getMasters(),
    // staleTime: 10 * 60 * 1000, // 10 минут
    // gcTime: 15 * 60 * 1000, // 15 минут
    refetchOnWindowFocus: false,
  });
};

// Хук для получения одного мастера
export const useMaster = (id: number) => {
  return useQuery({
    queryKey: usersKeys.detail(id),
    queryFn: () => usersApi.getMaster(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2 минуты
  });
};

// Хук для получения городов
export const useCities = () => {
  return useQuery({
    queryKey: usersKeys.cities(),
    queryFn: () => usersApi.getCities(),
    // staleTime: 30 * 60 * 1000, // 30 минут - справочник
    // gcTime: 60 * 60 * 1000, // 1 час
    refetchOnWindowFocus: false,
  });
};

// Хук для создания мастера
export const useCreateMaster = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();

  return useMutation({
    mutationFn: (data: any) => usersApi.createMaster(data),
    onSuccess: (newMaster: any) => {
      // Инвалидируем кеш списка мастеров
      queryClient.invalidateQueries({ queryKey: usersKeys.lists() });
      queryClient.invalidateQueries({ queryKey: usersKeys.masters() });
      
      // Оптимистично обновляем кеш
      queryClient.setQueryData(usersKeys.detail(newMaster.id), newMaster);
      
      showSuccess('Мастер успешно создан');
    },
    onError: (error: any) => {
      showError(error.response?.data?.detail || 'Ошибка создания мастера');
    },
  });
};

// Хук для обновления мастера
export const useUpdateMaster = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      usersApi.updateMaster(id, data),
    onSuccess: (updatedMaster) => {
      // Обновляем кеш конкретного мастера
      queryClient.setQueryData(
        usersKeys.detail(updatedMaster.id),
        updatedMaster
      );
      
      // Инвалидируем кеш списка мастеров
      queryClient.invalidateQueries({ queryKey: usersKeys.masters() });
      
      showSuccess('Мастер успешно обновлен');
    },
    onError: (error: any) => {
      showError(error.response?.data?.detail || 'Ошибка обновления мастера');
    },
  });
};

// Хук для удаления мастера
export const useDeleteMaster = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();

  return useMutation({
    mutationFn: (id: number) => usersApi.deleteMaster(id),
    onSuccess: (_, deletedId) => {
      // Удаляем из кеша
      queryClient.removeQueries({ queryKey: usersKeys.detail(deletedId) });
      
      // Инвалидируем кеш списка
      queryClient.invalidateQueries({ queryKey: usersKeys.lists() });
      queryClient.invalidateQueries({ queryKey: usersKeys.masters() });
      
      showSuccess('Пользователь успешно удален');
    },
    onError: (error: any) => {
      showError(error.response?.data?.detail || 'Ошибка удаления пользователя');
    },
  });
}; 