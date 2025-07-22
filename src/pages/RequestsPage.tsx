import React, { useState, useMemo, useCallback } from 'react';
import {
  FunnelIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  UserIcon,
  PhoneIcon,
  MapPinIcon,
  CalendarIcon,
  BanknotesIcon,
  WrenchScrewdriverIcon
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Input,
  Button,
  Badge,
  Chip,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Spinner,
  Select,
  SelectItem
} from '@heroui/react';
import { requestsApi, type Request, type Master } from '../api/requests';
import { usersApi } from '../api/users';
import { advertisingCampaignsApi } from '../api/advertisingCampaigns';
import { useAuth } from '../contexts/AuthContext';
import { useAppData } from '../contexts/AppDataContext';
import { useRequestsList, useRequestReferences } from '../hooks/useRequests';
import type { RequestStatus } from '../types/api';

interface RequestFilters {
  status?: RequestStatus | undefined;
  city_id?: number;
  request_type_id?: number;
  direction_id?: number;
  master_id?: number;
  advertising_campaign_id?: number;
  search?: string;
}

export const RequestsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cities, requestTypes, directions, loading: appDataLoading } = useAppData();
  
  // Фильтры
  const [filters, setFilters] = useState<RequestFilters>({
    status: undefined,
    city_id: undefined,
    request_type_id: undefined,
    direction_id: undefined,
    master_id: undefined,
    advertising_campaign_id: undefined,
    search: ''
  });

  // ✅ React Query хуки - автоматическое кеширование и синхронизация
  const { 
    data: requests = [], 
    isLoading: requestsLoading,
    error: requestsError
  } = useRequestsList(filters as Record<string, unknown>);

  const { 
    masters, 
    advertisingCampaigns,
    isLoading: additionalLoading
  } = useRequestReferences();

  // Общий индикатор загрузки
  const isLoading = requestsLoading || additionalLoading || appDataLoading.cities || appDataLoading.requestTypes || appDataLoading.directions;

  // Обработчики фильтров
  const handleFilterChange = useCallback((key: keyof RequestFilters, value: string | number | RequestStatus | undefined) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === '' ? undefined : value
    }));
  }, []);

  const handleSearch = useCallback((value: string) => {
    handleFilterChange('search', value);
  }, [handleFilterChange]);

  // Фильтрация заявок
  const filteredRequests = useMemo(() => {
    // Сначала фильтруем только разрешенные статусы для страницы /requests
    const allowedStatuses = [
      'Ожидает', 
      'Ожидает принятия', 
      'Принял', 
      'В пути', 
      'В работе', 
      'Готово', 
      'Отказ', 
      'Модерн', 
      'НеЗаказ'
    ];
    
    let result = requests.filter(request => allowedStatuses.includes(request.status));

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      result = result.filter(request => 
        request.client_name.toLowerCase().includes(searchTerm) ||
        request.client_phone.includes(searchTerm) ||
        request.address?.toLowerCase().includes(searchTerm)
      );
    }

    if (filters.status) {
      result = result.filter(request => request.status === filters.status);
    }

    if (filters.city_id) {
      result = result.filter(request => request.city_id === filters.city_id);
    }

    if (filters.master_id) {
      result = result.filter(request => request.master_id === filters.master_id);
    }

    // Сортировка заявок по специальной логике
    const sortedResult = result.sort((a, b) => {
      // Группировка по приоритету статусов
      const getStatusPriority = (status: string) => {
        if (status === 'Ожидает') return 1;
        if (status === 'Ожидает принятия') return 2;
        if (status === 'Принял') return 3;
        if (status === 'В пути') return 4;
        if (status === 'В работе') return 5;
        if (status === 'Модерн') return 6;
        if (status === 'НеЗаказ') return 7;
        if (status === 'Готово') return 8;
        if (status === 'Отказ') return 9;
        return 10;
      };

      const priorityA = getStatusPriority(a.status);
      const priorityB = getStatusPriority(b.status);

      // Если разные приоритеты статусов, сортируем по приоритету
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // Внутри одного статуса применяем специальную логику
      if (a.status === 'Ожидает') {
        // Для "Ожидает" - по ближайшей дате встречи
        if (!a.meeting_date && !b.meeting_date) return 0;
        if (!a.meeting_date) return 1; // без даты в конец
        if (!b.meeting_date) return -1; // без даты в конец
        
        const dateA = new Date(a.meeting_date).getTime();
        const dateB = new Date(b.meeting_date).getTime();
        return dateA - dateB; // от ближайшей к дальней
      }

      if (a.status === 'Готово' || a.status === 'Отказ') {
        // Для завершенных заявок - по дате обновления (самые свежие сверху в своей группе)
        const dateA = new Date(a.updated_at || a.created_at).getTime();
        const dateB = new Date(b.updated_at || b.created_at).getTime();
        return dateB - dateA; // от новых к старым
      }

      // Для остальных статусов - по дате создания (новые сверху)
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA;
    });

    return sortedResult;
  }, [requests, filters]);

  // Обработчики действий
  const handleRowClick = useCallback((requestId: number) => {
    navigate(`/requests/${requestId}`);
  }, [navigate]);

  // Вспомогательные функции
  const getStatusColor = useCallback((status: string) => {
    const statusColors: Record<string, 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'> = {
      'Новая': 'primary',
      'Ожидает': 'warning', 
      'Ожидает принятия': 'warning',
      'Принял': 'secondary',
      'В пути': 'secondary',
      'В работе': 'secondary',
      'Готово': 'success',
      'Отказ': 'danger',
      'Модерн': 'warning',
      'НеЗаказ': 'danger',
      'Перезвонить': 'warning',
      'ТНО': 'default'
    };
    return statusColors[status] || 'default';
  }, []);

  const getStatusText = useCallback((status: string) => {
    // Статусы уже на русском языке, возвращаем как есть
    return status;
  }, []);

  const formatDate = useCallback((dateString: string) => {
    if (!dateString) return '-';
    
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  }, []);

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB'
    }).format(amount);
  }, []);

  // Подсчет статистики
  const stats = useMemo(() => {
    return {
      total: filteredRequests.length,
      new: filteredRequests.filter(r => r.status === 'Новая').length,
      inProgress: filteredRequests.filter(r => ['В работе', 'В пути', 'Принял'].includes(r.status)).length,
      completed: filteredRequests.filter(r => r.status === 'Готово').length,
      cancelled: filteredRequests.filter(r => ['Отказ', 'НеЗаказ'].includes(r.status)).length
    };
  }, [filteredRequests]);

  // Отображение загрузки
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" color="primary" />
      </div>
    );
  }

  // Отображение ошибки
  if (requestsError) {
    return (
      <div className="h-screen w-full px-4">
        <Card className="bg-red-50 border border-red-200">
          <div className="p-4 text-red-700">{requestsError instanceof Error ? requestsError.message : String(requestsError)}</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col">
      {/* Заголовок */}
      <div className="flex-shrink-0 px-4 py-6 border-b bg-white">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Заявки</h1>
          <p className="mt-2 text-gray-600">Управление заявками клиентов</p>
        </div>
      </div>

      {/* Фильтры */}
      <div className="flex-shrink-0 p-4 bg-gray-50 border-b">
        <div className="flex items-center gap-4 mb-4">
          <FunnelIcon className="w-5 h-5 text-gray-500" />
          <h3 className="text-lg font-medium">Фильтры</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Input
            placeholder="Поиск по имени, телефону, адресу..."
            startContent={<MagnifyingGlassIcon className="w-4 h-4 text-gray-500" />}
            value={filters.search || ''}
            onValueChange={handleSearch}
            isClearable
          />
          
          <Select
            placeholder="Статус"
            selectedKeys={filters.status ? [filters.status] : []}
            onSelectionChange={(keys) => {
              const value = Array.from(keys)[0] as RequestStatus;
              handleFilterChange('status', value || undefined);
            }}
          >
            <SelectItem key="Ожидает">Ожидает</SelectItem>
            <SelectItem key="Ожидает принятия">Ожидает принятия</SelectItem>
            <SelectItem key="Принял">Принял</SelectItem>
            <SelectItem key="В пути">В пути</SelectItem>
            <SelectItem key="В работе">В работе</SelectItem>
            <SelectItem key="Готово">Готово</SelectItem>
            <SelectItem key="Отказ">Отказ</SelectItem>
            <SelectItem key="Модерн">Модерн</SelectItem>
            <SelectItem key="НеЗаказ">НеЗаказ</SelectItem>
          </Select>
          
          <Select
            placeholder="Город"
            selectedKeys={filters.city_id ? [filters.city_id.toString()] : []}
            onSelectionChange={(keys) => {
              const value = Array.from(keys)[0] as string;
              handleFilterChange('city_id', value ? parseInt(value) : undefined);
            }}
          >
            {cities.map((city) => (
              <SelectItem key={city.id.toString()}>
                {city.name}
              </SelectItem>
            ))}
          </Select>
          
          <Select
            placeholder="Мастер"
            selectedKeys={filters.master_id ? [filters.master_id.toString()] : []}
            onSelectionChange={(keys) => {
              const value = Array.from(keys)[0] as string;
              handleFilterChange('master_id', value ? parseInt(value) : undefined);
            }}
          >
            {masters.map((master) => (
              <SelectItem key={master.id.toString()}>
                {master.full_name}
              </SelectItem>
            ))}
          </Select>
        </div>
      </div>

      {/* Таблица заявок - на весь экран - ОБНОВЛЕНО */}
      <div className="flex-1 overflow-auto">
        <Table 
          aria-label="Таблица заявок"
          className="h-full"
          classNames={{
            wrapper: "h-full rounded-none shadow-none",
            table: "min-h-full w-full",
            thead: "[&>tr]:first:rounded-none",
            th: "bg-gray-50 text-gray-900 font-semibold text-xs border-b-2 border-gray-200 px-2 py-1 h-8",
            td: "border-b border-gray-100 text-xs px-2 py-1 whitespace-nowrap h-10",
            tr: "hover:bg-gray-50 cursor-pointer"
          }}
          removeWrapper
        >
          <TableHeader>
            <TableColumn className="min-w-[80px] max-w-[100px]">ID</TableColumn>
            <TableColumn className="min-w-[120px] max-w-[150px]">РК</TableColumn>
            <TableColumn className="min-w-[100px] max-w-[120px]">ГОРОД</TableColumn>
            <TableColumn className="min-w-[140px] max-w-[180px]">ТИП ЗАЯВКИ</TableColumn>
            <TableColumn className="min-w-[130px] max-w-[160px]">ТЕЛЕФОН</TableColumn>
            <TableColumn className="min-w-[150px] max-w-[200px]">ИМЯ КЛИЕНТА</TableColumn>
            <TableColumn className="min-w-[200px] flex-1">АДРЕС</TableColumn>
            <TableColumn className="min-w-[120px] max-w-[140px]">ДАТА ВСТРЕЧИ</TableColumn>
            <TableColumn className="min-w-[120px] max-w-[150px]">НАПРАВЛЕНИЕ</TableColumn>
            <TableColumn className="min-w-[200px] flex-1">ПРОБЛЕМА</TableColumn>
            <TableColumn className="min-w-[100px] max-w-[120px]">СТАТУС</TableColumn>
            <TableColumn className="min-w-[150px] max-w-[200px]">МАСТЕР</TableColumn>
            <TableColumn className="min-w-[150px] flex-1">ИТОГ</TableColumn>
          </TableHeader>
          <TableBody>
            {filteredRequests.map((request) => (
              <TableRow 
                key={request.id}
                onClick={() => handleRowClick(request.id)}
              >
                <TableCell>
                  <div className="font-semibold text-blue-600">#{request.id}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {request.advertising_campaign?.name || '-'}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">{request.city.name}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">{request.request_type.name}</div>
                </TableCell>
                <TableCell>
                  <div className="font-mono text-sm">{request.client_phone}</div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{request.client_name}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm max-w-xs truncate" title={request.address || '-'}>
                    {request.address || '-'}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {request.meeting_date ? formatDate(request.meeting_date) : '-'}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">{request.direction?.name || '-'}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm max-w-xs truncate" title={request.problem || '-'}>
                    {request.problem || '-'}
                  </div>
                </TableCell>
                <TableCell>
                  <Chip
                    color={getStatusColor(request.status)}
                    size="sm"
                    variant="flat"
                  >
                    {getStatusText(request.status)}
                  </Chip>
                </TableCell>
                <TableCell>
                  {request.master ? (
                    <div>
                      <div className="font-medium text-sm">{request.master.full_name}</div>
                      <div className="text-xs text-gray-500">{request.master.phone_number}</div>
                    </div>
                  ) : (
                    <Badge color="warning" variant="flat">Не назначен</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="text-sm max-w-xs truncate" title={request.result || '-'}>
                    {request.result || '-'}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}; 