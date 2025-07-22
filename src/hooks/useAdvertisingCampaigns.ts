import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { advertisingCampaignsApi } from '../api/advertisingCampaigns';
import { useNotification } from '../contexts/NotificationContext';

// Ключи для кеширования
export const campaignsKeys = {
  all: ['campaigns'] as const,
  lists: () => [...campaignsKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...campaignsKeys.lists(), filters] as const,
  details: () => [...campaignsKeys.all, 'detail'] as const,
  detail: (id: number) => [...campaignsKeys.details(), id] as const,
};

// Хук для получения списка рекламных кампаний
export const useAdvertisingCampaigns = () => {
  return useQuery({
    queryKey: campaignsKeys.lists(),
    queryFn: () => advertisingCampaignsApi.getAdvertisingCampaigns(),
    // staleTime: 5 * 60 * 1000, // 5 минут
    // gcTime: 10 * 60 * 1000, // 10 минут
    refetchOnWindowFocus: false,
  });
};

// Хук для получения одной рекламной кампании (из списка)
export const useAdvertisingCampaign = (id: number) => {
  const { data: campaigns } = useAdvertisingCampaigns();
  
  return useQuery({
    queryKey: campaignsKeys.detail(id),
    queryFn: () => {
      const campaign = campaigns?.find(c => c.id === id);
      if (!campaign) throw new Error('Campaign not found');
      return Promise.resolve(campaign);
    },
    enabled: !!id && !!campaigns,
    // staleTime: 2 * 60 * 1000, // 2 минуты
  });
};

// Хук для создания рекламной кампании
export const useCreateAdvertisingCampaign = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();

  return useMutation({
    mutationFn: (data: any) => advertisingCampaignsApi.createAdvertisingCampaign(data),
    onSuccess: (newCampaign: any) => {
      // Инвалидируем кеш списка кампаний
      queryClient.invalidateQueries({ queryKey: campaignsKeys.lists() });
      
      // Оптимистично обновляем кеш
      queryClient.setQueryData(campaignsKeys.detail(newCampaign.id), newCampaign);
      
      showSuccess('Рекламная кампания успешно создана');
    },
    onError: (error: any) => {
      showError(error.response?.data?.detail || 'Ошибка создания рекламной кампании');
    },
  });
};

// Хук для обновления рекламной кампании
export const useUpdateAdvertisingCampaign = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      advertisingCampaignsApi.updateAdvertisingCampaign(id, data),
    onSuccess: (updatedCampaign: any) => {
      // Обновляем кеш конкретной кампании
      queryClient.setQueryData(
        campaignsKeys.detail(updatedCampaign.id),
        updatedCampaign
      );
      
      // Инвалидируем кеш списка кампаний
      queryClient.invalidateQueries({ queryKey: campaignsKeys.lists() });
      
      showSuccess('Рекламная кампания успешно обновлена');
    },
    onError: (error: any) => {
      showError(error.response?.data?.detail || 'Ошибка обновления рекламной кампании');
    },
  });
};

// Хук для удаления рекламной кампании
export const useDeleteAdvertisingCampaign = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();

  return useMutation({
    mutationFn: (id: number) => advertisingCampaignsApi.deleteAdvertisingCampaign(id),
    onSuccess: (_, deletedId) => {
      // Удаляем из кеша
      queryClient.removeQueries({ queryKey: campaignsKeys.detail(deletedId) });
      
      // Инвалидируем кеш списка
      queryClient.invalidateQueries({ queryKey: campaignsKeys.lists() });
      
      showSuccess('Рекламная кампания успешно удалена');
    },
    onError: (error: any) => {
      showError(error.response?.data?.detail || 'Ошибка удаления рекламной кампании');
    },
  });
}; 