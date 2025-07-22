import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { requestsApi, type CreateRequest, type Request } from '../api/requests';
import { usersApi } from '../api/users';
import { advertisingCampaignsApi } from '../api/advertisingCampaigns';
import { useNotification } from '../contexts/NotificationContext';

// Ключи для кеширования
export const requestsKeys = {
  all: ['requests'] as const,
  lists: () => [...requestsKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...requestsKeys.lists(), filters] as const,
  details: () => [...requestsKeys.all, 'detail'] as const,
  detail: (id: number) => [...requestsKeys.details(), id] as const,
  references: () => [...requestsKeys.all, 'references'] as const,
};

// Хук для получения списка заявок
export const useRequestsList = (params?: {
  page?: number;
  size?: number;
  status?: string;
  city_id?: number;
  master_id?: number;
} & Record<string, unknown>) => {
  return useQuery({
    queryKey: requestsKeys.list(params || {}),
    queryFn: () => requestsApi.getRequests(params),
    staleTime: 5 * 60 * 1000, // 5 минут
    gcTime: 10 * 60 * 1000, // 10 минут
    refetchOnWindowFocus: false,
  });
};

// Хук для получения одной заявки
export const useRequest = (id: number) => {
  return useQuery({
    queryKey: requestsKeys.detail(id),
    queryFn: () => requestsApi.getRequest(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2 минуты
  });
};

// Хук для создания заявки
export const useCreateRequest = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();

  return useMutation({
    mutationFn: (data: CreateRequest) => requestsApi.createRequest(data),
    onSuccess: (newRequest) => {
      // Инвалидируем кеш списка заявок
      queryClient.invalidateQueries({ queryKey: requestsKeys.lists() });
      
      // Оптимистично обновляем кеш
      queryClient.setQueryData(requestsKeys.detail(newRequest.id), newRequest);
      
      showSuccess('Заявка успешно создана');
    },
    onError: (error: { response?: { data?: { detail?: string } } }) => {
      showError(error.response?.data?.detail || 'Ошибка создания заявки');
    },
  });
};

// Хук для обновления заявки
export const useUpdateRequest = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateRequest> }) =>
      requestsApi.updateRequest(id, data),
    onSuccess: (updatedRequest, variables) => {
      const { id } = variables;
      
      console.log('🔄 Update request success:', { id, updatedRequest });
      
      // Получаем старые данные из кеша
      const oldData = queryClient.getQueryData<Request>(requestsKeys.detail(id));
      console.log('📦 Old cache data:', oldData);
      
      // ✅ ИСПРАВЛЕНИЕ 1: мерджим новые данные с существующими для детальной страницы
      queryClient.setQueryData(
        requestsKeys.detail(id),
        (oldData: Request | undefined) => {
          if (!oldData) {
            console.log('⚠️ No old data, using server response');
            return updatedRequest;
          }
          const mergedData = {
            ...oldData,
            ...updatedRequest,
            // Принудительно сохраняем важные поля, если они не пришли с сервера
            net_amount: updatedRequest.net_amount ?? oldData.net_amount,
            expenses: updatedRequest.expenses ?? oldData.expenses,
            master_handover: updatedRequest.master_handover ?? oldData.master_handover,
            result: updatedRequest.result ?? oldData.result,
          };
          console.log('🔀 Merged data:', mergedData);
          return mergedData;
        }
      );
      
      // ✅ ИСПРАВЛЕНИЕ 2: инвалидируем ВСЕ списки заявок (с любыми фильтрами), но НЕ детали  
      console.log('🗑️ Invalidating request lists...');
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const shouldInvalidate = query.queryKey.length >= 2 && 
                 query.queryKey[0] === 'requests' && 
                 query.queryKey[1] === 'list';
          if (shouldInvalidate) {
            console.log('🎯 Invalidating query:', query.queryKey);
          }
          return shouldInvalidate;
        }
      });
      
      // ✅ FALLBACK: Если сервер вернул неполные данные, перезагружаем детальную страницу
      setTimeout(() => {
        console.log('🔄 Fallback: Invalidating detail page to ensure fresh data');
        queryClient.invalidateQueries({ 
          queryKey: requestsKeys.detail(id)
        });
      }, 100);
      
      showSuccess('Заявка успешно обновлена');
    },
    onError: (error) => {
      console.error('❌ Ошибка при обновлении заявки:', error);
      showError('Ошибка при обновлении заявки');
    },
  });
};

// Хук для удаления заявки
export const useDeleteRequest = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();

  return useMutation({
    mutationFn: (id: number) => requestsApi.deleteRequest(id),
    onSuccess: (_, deletedId) => {
      // Удаляем из кеша
      queryClient.removeQueries({ queryKey: requestsKeys.detail(deletedId) });
      
      // Инвалидируем кеш списка
      queryClient.invalidateQueries({ queryKey: requestsKeys.lists() });
      
      showSuccess('Заявка успешно удалена');
    },
    onError: (error: { response?: { data?: { detail?: string } } }) => {
      showError(error.response?.data?.detail || 'Ошибка удаления заявки');
    },
  });
};

// Хук для получения справочных данных
export const useRequestReferences = () => {
  const citiesQuery = useQuery({
    queryKey: [...requestsKeys.references(), 'cities'],
    queryFn: () => usersApi.getCities(),
    staleTime: 30 * 60 * 1000, // 30 минут
  });

  const requestTypesQuery = useQuery({
    queryKey: [...requestsKeys.references(), 'requestTypes'],
    queryFn: () => requestsApi.getRequestTypes(),
    staleTime: 30 * 60 * 1000,
  });

  const directionsQuery = useQuery({
    queryKey: [...requestsKeys.references(), 'directions'],
    queryFn: () => requestsApi.getDirections(),
    staleTime: 30 * 60 * 1000,
  });

  const mastersQuery = useQuery({
    queryKey: [...requestsKeys.references(), 'masters'],
    queryFn: () => requestsApi.getMasters(),
    staleTime: 10 * 60 * 1000, // 10 минут
  });

  const advertisingCampaignsQuery = useQuery({
    queryKey: [...requestsKeys.references(), 'advertisingCampaigns'],
    queryFn: () => advertisingCampaignsApi.getAdvertisingCampaigns(),
    staleTime: 15 * 60 * 1000, // 15 минут
  });

  return {
    cities: citiesQuery.data || [],
    requestTypes: requestTypesQuery.data || [],
    directions: directionsQuery.data || [],
    masters: mastersQuery.data || [],
    advertisingCampaigns: advertisingCampaignsQuery.data || [],
    isLoading: citiesQuery.isLoading || requestTypesQuery.isLoading || 
               directionsQuery.isLoading || mastersQuery.isLoading || 
               advertisingCampaignsQuery.isLoading,
    error: citiesQuery.error || requestTypesQuery.error || 
           directionsQuery.error || mastersQuery.error || 
           advertisingCampaignsQuery.error,
  };
};

// Хук для prefetch данных
export const usePrefetchRequest = () => {
  const queryClient = useQueryClient();

  return (id: number) => {
    queryClient.prefetchQuery({
      queryKey: requestsKeys.detail(id),
      queryFn: () => requestsApi.getRequest(id),
      staleTime: 2 * 60 * 1000,
    });
  };
}; 