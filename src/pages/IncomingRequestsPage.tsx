import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { requestsApi, type Request, type CreateRequest } from '../api/requests';


import { useAppData } from '../contexts/AppDataContext';
import { useApiData } from '../hooks/useApiData';


import {
  FunnelIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  PhoneIcon,
  UserIcon,
  MapPinIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import {
  Card,
  Input,
  Button,
  Chip,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Spinner,
  Select,
  SelectItem,
  Textarea
} from '@heroui/react';

const IncomingRequestsPage: React.FC = () => {
  const navigate = useNavigate();

  const { cities, requestTypes, directions, loading: appDataLoading } = useAppData();

  // Загрузка заявок
  const fetchRequests = useCallback(() => requestsApi.getRequests(), []);
  const { 
    data: requestsData, 
    loading: requestsLoading,
    refetch: refetchRequests
  } = useApiData(fetchRequests, {
    errorMessage: 'Ошибка загрузки заявок'
  });

  // Мемоизированные данные
  const requests = useMemo(() => requestsData || [], [requestsData]);

  // Состояние фильтров
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [callCenterFilter, setCallCenterFilter] = useState<string>('all');

  // Общий индикатор загрузки
  const isLoading = requestsLoading || appDataLoading.cities || appDataLoading.requestTypes;

  // Фильтрация входящих заявок
  const allowedStatuses = ['Новая', 'Перезвонить', 'ТНО', 'Отказ'];
  
  // Получение уникальных имен КЦ
  const uniqueCallCenters = useMemo(() => {
    const centers = new Set<string>();
    requests.forEach(request => {
      if (request.call_center_name && request.call_center_name.trim()) {
        centers.add(request.call_center_name);
      }
    });
    return Array.from(centers).sort();
  }, [requests]);

  const filteredRequests = useMemo(() => {
    return requests.filter(request => {
      // Базовая фильтрация по разрешенным статусам
      if (!allowedStatuses.includes(request.status)) {
        return false;
      }

      // Поиск по телефону или адресу
      if (searchText.trim()) {
        const searchLower = searchText.toLowerCase();
        const phoneMatch = request.client_phone?.toLowerCase().includes(searchLower);
        const addressMatch = request.address?.toLowerCase().includes(searchLower);
        if (!phoneMatch && !addressMatch) {
          return false;
        }
      }

      // Фильтр по статусу
      if (statusFilter !== 'all' && request.status !== statusFilter) {
        return false;
      }

      // Фильтр по имени КЦ
      if (callCenterFilter !== 'all' && request.call_center_name !== callCenterFilter) {
        return false;
      }

      return true;
    });
  }, [requests, searchText, statusFilter, callCenterFilter, allowedStatuses]);



  // Обработчики действий
  const handleRowClick = useCallback((requestId: number) => {
    navigate(`/incoming-requests/${requestId}/edit`);
  }, [navigate]);

  const handleOpenCreateModal = useCallback(() => {
    navigate('/incoming-requests/create');
  }, [navigate]);

  // Вспомогательные функции
  const getStatusColor = useCallback((status: string) => {
    const statusColors: Record<string, 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'> = {
      'Новая': 'primary',
      'Перезвонить': 'warning',
      'ТНО': 'secondary',
      'Отказ': 'danger'
    };
    return statusColors[status] || 'default';
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

  // Отображение загрузки
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" color="primary" />
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col">
      {/* Заголовок */}
      <div className="flex-shrink-0 px-4 py-6 border-b bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Входящие заявки</h1>
            <p className="mt-2 text-gray-600">Новые заявки для обработки</p>
          </div>
          <Button
            color="primary"
            startContent={<PlusIcon className="w-5 h-5" />}
            onPress={handleOpenCreateModal}
          >
            Новая заявка
          </Button>
        </div>

        {/* Фильтры */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            placeholder="Поиск по телефону или адресу..."
            value={searchText}
            onValueChange={setSearchText}
            startContent={<MagnifyingGlassIcon className="w-4 h-4 text-gray-400" />}
            isClearable
            onClear={() => setSearchText('')}
            className="w-full"
          />
          
          <Select
            placeholder="Все статусы"
            selectedKeys={statusFilter !== 'all' ? [statusFilter] : []}
            onSelectionChange={(keys) => {
              const value = Array.from(keys)[0] as string;
              setStatusFilter(value || 'all');
            }}
            startContent={<FunnelIcon className="w-4 h-4" />}
          >
            <SelectItem key="all">Все статусы</SelectItem>
            <SelectItem key="Новая">Новая</SelectItem>
            <SelectItem key="Перезвонить">Перезвонить</SelectItem>
            <SelectItem key="ТНО">ТНО</SelectItem>
            <SelectItem key="Отказ">Отказ</SelectItem>
          </Select>

          <Select
            placeholder="Все КЦ"
            selectedKeys={callCenterFilter !== 'all' ? [callCenterFilter] : []}
            onSelectionChange={(keys) => {
              const value = Array.from(keys)[0] as string;
              setCallCenterFilter(value || 'all');
            }}
            startContent={<UserIcon className="w-4 h-4" />}
            items={[{ key: 'all', name: 'Все КЦ' }, ...uniqueCallCenters.map(center => ({ key: center, name: center }))]}
          >
            {(item) => <SelectItem key={item.key}>{item.name}</SelectItem>}
          </Select>
        </div>

        {/* Счетчик результатов */}
        <div className="mt-4 text-sm text-gray-600">
          Показано: {filteredRequests.length} из {requests.filter(r => allowedStatuses.includes(r.status)).length} заявок
        </div>
      </div>

      {/* Таблица заявок на весь экран */}
      <div className="flex-1 overflow-hidden">
        <Table 
          aria-label="Таблица входящих заявок"
          isHeaderSticky
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
            <TableColumn className="min-w-[120px] max-w-[150px]">ИМЯ КЦ</TableColumn>
            <TableColumn className="min-w-[200px] flex-1">ЗАМЕТКА КЦ</TableColumn>
            <TableColumn className="min-w-[120px] max-w-[140px]">ДАТА СОЗДАНИЯ</TableColumn>
          </TableHeader>
          <TableBody
            emptyContent={
              <div className="flex flex-col items-center justify-center py-8">
                <DocumentTextIcon className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500 text-lg">Входящие заявки не найдены</p>
                <p className="text-gray-400 text-sm">Создайте новую заявку или проверьте фильтры</p>
              </div>
            }
          >
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
                    {request.status}
                  </Chip>
                </TableCell>
                <TableCell>
                  <div className="text-sm">{request.call_center_name || '-'}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm max-w-xs truncate" title={request.call_center_notes || '-'}>
                    {request.call_center_notes || '-'}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">{formatDate(request.created_at)}</div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>


    </div>
  );
};

export default IncomingRequestsPage; 