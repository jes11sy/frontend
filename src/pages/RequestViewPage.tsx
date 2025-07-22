import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftIcon, DocumentTextIcon, UserIcon, BanknotesIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { Card, Input, Button, Badge, Divider, Select, SelectItem, Textarea, Tabs, Tab, DatePicker } from '@heroui/react';
import { requestsApi, type Master } from '../api/requests';
import { useAppData } from '../contexts/AppDataContext';
import { useRequest, useUpdateRequest, useRequestReferences } from '../hooks/useRequests';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { CalendarDateTime, parseDateTime, now, getLocalTimeZone } from '@internationalized/date';

dayjs.extend(customParseFormat);

const RequestViewPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const requestId = parseInt(id || '0');
  const { showSuccess, showError } = useNotification();
  const { user } = useAuth();
  
  const { cities, requestTypes, directions } = useAppData();

  // Проверяем, имеет ли пользователь полный доступ к редактированию всех полей (только callcentr и admin)
  const hasFullEditAccess = useMemo(() => {
    return user?.role === 'callcentr' || user?.role === 'admin';
  }, [user?.role]);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('main');

  // Редактируемые поля
  const [editForm, setEditForm] = useState({
    status: '',
    master_id: 0,
    net_amount: 0,
    expense: 0,
    result: 0,
    client_name: '',
    client_phone: '',
    address: '',
    problem: '',
    advertising_campaign_id: 0,
    request_type_id: 0,
    direction_id: 0,
    meeting_date: '',
    meeting_date_value: null as CalendarDateTime | null,
    city_id: 0
  });

  // --- Загрузка файлов ---
  const [bsoFile, setBsoFile] = useState<File | null>(null);
  const [expenseFile, setExpenseFile] = useState<File | null>(null);
  const [recordingFile, setRecordingFile] = useState<File | null>(null);

  // Функция для правильного формирования пути к файлу для API
  const getApiFilePath = (filePath: string): string => {
    if (!filePath) return '';
    // Убираем префикс 'media\' или 'media/' если он есть
    let cleanPath = filePath.replace(/^media[\\\/]/, '');
    // Заменяем обратные слэши на прямые
    return cleanPath.replaceAll('\\', '/');
  };

  // ✅ React Query хуки - автоматическое кеширование и синхронизация
  const { data: request, isLoading: loading, error } = useRequest(requestId);
  const { 
    masters, 
    advertisingCampaigns,
    isLoading: multiLoading, 
    error: multiError 
  } = useRequestReferences();
  const updateMutation = useUpdateRequest();

  // ✅ Инициализация editForm из данных React Query
  useEffect(() => {
    if (request) {
      setEditForm({
        status: request.status || 'Ожидает',
        master_id: Number(request.master_id) || 0,
        net_amount: Number(request.net_amount) || 0,
        expense: Number(request.expenses) || 0,
        result: Number(request.result) || 0,
        client_name: request.client_name || '',
        client_phone: request.client_phone || '',
        address: request.address || '',
        problem: request.problem || '',
        advertising_campaign_id: Number(request.advertising_campaign_id) || 0,
        request_type_id: Number(request.request_type_id) || 0,
        direction_id: Number(request.direction_id) || 0,
        meeting_date: request.meeting_date ? dayjs(request.meeting_date).format('DD.MM.YYYY HH:mm') : '',
        meeting_date_value: request.meeting_date ? parseDateTime(request.meeting_date.slice(0, 19)) : null,
        city_id: Number(request.city_id) || 0
      });
    }
  }, [request]);

  // Финальные статусы, при которых директор не может редактировать
  const finalStatuses = ['Готово', 'Отказ', 'НеЗаказ'];

  // Проверяем, может ли пользователь редактировать статус и назначать мастера (callcentr, admin, director)
  const canEditStatus = useMemo(() => {
    const hasBasicPermission = user?.role === 'callcentr' || user?.role === 'admin' || user?.role === 'director';
    
    // Если это директор и заявка имеет финальный статус - запрещаем редактирование
    if (user?.role === 'director' && request && finalStatuses.includes(request.status)) {
      return false;
    }
    
    return hasBasicPermission;
  }, [user?.role, request?.status]);

  // Автоматический пересчёт
  const result = Number(editForm.result);
  const expenses = Number(editForm.expense);
  const netAmount = result - expenses;
  const masterHandover = netAmount / 2;

  const handleSave = useCallback(async () => {
    try {
      setSaving(true);
      
      // Подготовка даты для отправки
      let meetingDateISO = undefined;
      if (editForm.meeting_date_value) {
        try {
          meetingDateISO = editForm.meeting_date_value.toDate(getLocalTimeZone()).toISOString();
        } catch (error) {
          console.error('Error converting date:', error);
          showError('Ошибка конвертации даты');
          setSaving(false);
          return;
        }
      }
      
      const updateData = {
        status: editForm.status as any,
        master_id: editForm.master_id || undefined,
        net_amount: editForm.net_amount,
        expenses: editForm.expense,
        result: String(editForm.result),
        client_name: editForm.client_name,
        client_phone: editForm.client_phone,
        address: editForm.address,
        problem: editForm.problem,
        advertising_campaign_id: editForm.advertising_campaign_id || undefined,
        request_type_id: editForm.request_type_id || undefined,
        direction_id: editForm.direction_id || undefined,
        meeting_date: meetingDateISO,
        city_id: editForm.city_id || undefined,
      };
      
      // ✅ React Query автоматически обновит кеш и UI
      await updateMutation.mutateAsync({ id: requestId, data: updateData });
      
      // После успешного сохранения — загружаем файлы, если выбраны
      setUploading(true);
      if (bsoFile) await requestsApi.uploadBso(requestId, bsoFile);
      if (expenseFile) await requestsApi.uploadExpense(requestId, expenseFile);
      if (recordingFile) await requestsApi.uploadRecording(requestId, recordingFile);
      
      setBsoFile(null);
      setExpenseFile(null);
      setRecordingFile(null);
      
      // ✅ React Query уже обновил данные автоматически - не нужно ничего делать!
    } catch (error) {
      console.error('Error saving request:', error);
      showError('Ошибка сохранения данных');
    } finally {
      setSaving(false);
      setUploading(false);
    }
  }, [requestId, editForm, bsoFile, expenseFile, recordingFile, showSuccess, showError, updateMutation]);

  const handleInputChange = useCallback((field: keyof typeof editForm, value: any) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleDateChange = useCallback((value: string) => {
    // Простая проверка формата даты при вводе
    setEditForm(prev => ({ ...prev, meeting_date: value }));
  }, []);

  const getCityName = useCallback((cityId: number) => 
    cities.find(c => c.id === cityId)?.name || '-', [cities]);
  
  const getRequestTypeName = useCallback((typeId: number) => 
    requestTypes.find(t => t.id === typeId)?.name || '-', [requestTypes]);
  
  const getDirectionName = useCallback((directionId?: number) => 
    directionId ? (directions.find(d => d.id === directionId)?.name || '-') : '-', [directions]);
  
  const getAdvertisingCampaignName = useCallback((campaignId?: number) => {
    if (!campaignId) return '-';
    const campaign = advertisingCampaigns.find(c => c.id === campaignId);
    return campaign?.name || '-';
  }, [advertisingCampaigns]);

  const getStatusBadge = useCallback((status: string) => {
    const statusConfig: Record<string, { label: string, color: "default" | "warning" | "primary" | "secondary" | "success" | "danger" }> = {
      'waiting': { label: 'Ожидает', color: 'warning' },
      'waiting_acceptance': { label: 'Ожидает принятия', color: 'warning' },
      'accepted': { label: 'Принял', color: 'primary' },
      'in_way': { label: 'В пути', color: 'secondary' },
      'in_work': { label: 'В работе', color: 'secondary' },
      'done': { label: 'Готово', color: 'success' },
      'refused': { label: 'Отказ', color: 'danger' },
      'modern': { label: 'Модерн', color: 'secondary' },
      'no_order': { label: 'НеЗаказ', color: 'default' }
    };
    const config = statusConfig[status] || { label: status || 'Неизвестно', color: 'default' };
    return <Badge color={config.color}>{config.label}</Badge>;
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

  if (loading || multiLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if ((error || multiError) && !request) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl">
          {(error instanceof Error ? error.message : error) || (multiError instanceof Error ? multiError.message : multiError) || 'Заявка не найдена'}
        </Card>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-2 py-10">
      <Card className="rounded-3xl shadow-2xl border-0 bg-white/90 p-10">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="light"
            startContent={<ArrowLeftIcon className="h-5 w-5" />}
            onClick={() => navigate('/requests')}
            className="!px-4 !py-2"
          >
            Назад
          </Button>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center rounded-full bg-green-100 text-green-700 mr-2 p-2">
              <DocumentTextIcon className="h-7 w-7" />
            </span>
            <h2 className="text-2xl font-bold mb-0">Заявка #{request.id}</h2>
            {getStatusBadge(editForm.status)}
          </div>
        </div>
        <Divider className="mb-8" />
        
        <Tabs
          aria-label="Вкладки заявки"
          selectedKey={activeTab}
          onSelectionChange={(key) => setActiveTab(String(key))}
          className="w-full"
          color="primary"
          variant="underlined"
        >
          <Tab key="main" title="Основная информация">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mt-6">
          {/* Секция: Клиент и детали */}
          <div className="space-y-6">
            <h5 className="text-gray-500 mb-2 flex items-center gap-2 text-lg font-semibold">
              <UserIcon className="h-5 w-5" /> Клиент
            </h5>
            <Input 
              label="Имя клиента" 
              value={editForm.client_name} 
              readOnly={!hasFullEditAccess} 
              fullWidth 
              size="md"
              onChange={hasFullEditAccess ? (e) => handleInputChange('client_name', e.target.value) : undefined}
            />
            <Input 
              label="Телефон" 
              value={editForm.client_phone} 
              readOnly={!hasFullEditAccess} 
              fullWidth 
              size="md"
              startContent={
                <a href={`tel:${editForm.client_phone}`} className="text-blue-600">
                  📞
                </a>
              }
              onChange={hasFullEditAccess ? (e) => handleInputChange('client_phone', e.target.value) : undefined}
            />
            <Select
              label="Город"
              selectedKeys={editForm.city_id ? [String(editForm.city_id)] : []}
              onSelectionChange={(keys) => {
                const selectedKey = Array.from(keys)[0];
                handleInputChange('city_id', selectedKey ? Number(selectedKey) : 0);
              }}
              isDisabled={!hasFullEditAccess}
            >
              {cities.map((city) => (
                <SelectItem key={String(city.id)}>{city.name}</SelectItem>
              ))}
            </Select>
            <Input 
              label="Адрес" 
              value={editForm.address} 
              readOnly={!hasFullEditAccess} 
              fullWidth 
              size="md"
              onChange={hasFullEditAccess ? (e) => handleInputChange('address', e.target.value) : undefined}
            />
            <Textarea 
              label="Проблема" 
              value={editForm.problem} 
              readOnly={!hasFullEditAccess} 
              fullWidth 
              size="md" 
              minRows={2}
              onChange={hasFullEditAccess ? (e) => handleInputChange('problem', e.target.value) : undefined}
            />
          </div>
          
          {/* Секция: Детали заявки */}
          <div className="space-y-6">
            <h5 className="text-gray-500 mb-2 flex items-center gap-2 text-lg font-semibold">
              <CheckCircleIcon className="h-5 w-5" /> Детали
            </h5>
            <Select
              label="РК"
              selectedKeys={editForm.advertising_campaign_id ? [String(editForm.advertising_campaign_id)] : []}
              onSelectionChange={(keys) => {
                const selectedKey = Array.from(keys)[0];
                handleInputChange('advertising_campaign_id', selectedKey ? Number(selectedKey) : 0);
              }}
              isDisabled={!hasFullEditAccess}
            >
              <SelectItem key="0">Не выбрано</SelectItem>
              {advertisingCampaigns.map((campaign) => (
                <SelectItem key={String(campaign.id)}>{campaign.name}</SelectItem>
              ))}
            </Select>
            
            <Select
              label="Тип заявки"
              selectedKeys={editForm.request_type_id ? [String(editForm.request_type_id)] : []}
              onSelectionChange={(keys) => {
                const selectedKey = Array.from(keys)[0];
                handleInputChange('request_type_id', selectedKey ? Number(selectedKey) : 0);
              }}
              isDisabled={!hasFullEditAccess}
            >
              {requestTypes.map((type) => (
                <SelectItem key={String(type.id)}>{type.name}</SelectItem>
              ))}
            </Select>
            
            <DatePicker
              label="Дата встречи"
              value={editForm.meeting_date_value}
              onChange={hasFullEditAccess ? (value) => {
                setEditForm(prev => ({ 
                  ...prev, 
                  meeting_date_value: value,
                  meeting_date: value ? `${value.day.toString().padStart(2, '0')}.${value.month.toString().padStart(2, '0')}.${value.year} ${value.hour.toString().padStart(2, '0')}:${value.minute.toString().padStart(2, '0')}` : ''
                }));
              } : undefined}
              isDisabled={!hasFullEditAccess}
              granularity="minute"
              hourCycle={24}
              showMonthAndYearPickers
              size="md"
            />
            
            <Select
              label="Направление"
              selectedKeys={editForm.direction_id ? [String(editForm.direction_id)] : []}
              onSelectionChange={(keys) => {
                const selectedKey = Array.from(keys)[0];
                handleInputChange('direction_id', selectedKey ? Number(selectedKey) : 0);
              }}
              isDisabled={!hasFullEditAccess}
            >
              <SelectItem key="0">Не выбрано</SelectItem>
              {directions.map((direction) => (
                <SelectItem key={String(direction.id)}>{direction.name}</SelectItem>
              ))}
            </Select>
            
            <Select
              label="Статус"
              selectedKeys={editForm.status ? [editForm.status] : []}
              onSelectionChange={(keys) => {
                const selectedKey = Array.from(keys)[0];
                handleInputChange('status', selectedKey);
              }}
              isDisabled={!canEditStatus}
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
              label="Мастер"
              selectedKeys={editForm.master_id ? [String(editForm.master_id)] : []}
              onSelectionChange={(keys) => {
                const selectedKey = Array.from(keys)[0];
                handleInputChange('master_id', selectedKey ? Number(selectedKey) : 0);
              }}
              isDisabled={!canEditStatus}
            >
              <SelectItem key="0">Не назначен</SelectItem>
              {masters.map((master: Master) => (
                <SelectItem key={String(master.id)}>{master.full_name}</SelectItem>
              ))}
            </Select>
          </div>
        </div>
        
        <Divider className="my-10" />
        
        {/* Секция: Финансы */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-8">
          <div className="space-y-6">
            <h5 className="text-gray-500 mb-2 flex items-center gap-2 text-lg font-semibold">
              <BanknotesIcon className="h-5 w-5" /> Финансы
            </h5>
            <Input
              label="Итог"
              value={String(editForm.result)}
              onChange={canEditStatus ? e => handleInputChange('result', Number(e.target.value)) : undefined}
              readOnly={!canEditStatus}
              fullWidth
              size="md"
              type="number"
            />
            <Input
              label="Расход"
              value={String(editForm.expense)}
              onChange={canEditStatus ? e => handleInputChange('expense', Number(e.target.value)) : undefined}
              readOnly={!canEditStatus}
              fullWidth
              size="md"
              type="number"
            />
          </div>
          <div className="flex flex-col justify-center items-start gap-6">
            <div>
              <span className="text-gray-500 text-sm">Чистыми</span>
              <div className="text-2xl font-bold text-green-700 mt-1">{formatCurrency(netAmount)}</div>
            </div>
            <div>
              <span className="text-gray-500 text-sm">Сдача мастера</span>
              <div className="text-2xl font-bold text-blue-700 mt-1">{formatCurrency(masterHandover)}</div>
            </div>
          </div>
        </div>
        </Tab>
        
        <Tab key="attachments" title="Вложения">
          <div className="space-y-6 mt-6">
            <h5 className="text-gray-500 mb-2 flex items-center gap-2 text-lg font-semibold">
              <DocumentTextIcon className="h-5 w-5" /> Файлы по заявке
            </h5>
            
            {/* БСО */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-3">БСО</label>
              {request.bso_file_path ? (
                <div className="flex flex-col gap-2">
                  {/\.(jpg|jpeg|png)$/i.test(request.bso_file_path) ? (
                    <a href={`/api/secure-files/view/${getApiFilePath(request.bso_file_path)}`} target="_blank" rel="noopener noreferrer">
                      <img src={`/api/secure-files/view/${getApiFilePath(request.bso_file_path)}`} alt="БСО" className="max-h-60 rounded border shadow-sm" />
                    </a>
                  ) :
                  /\.pdf$/i.test(request.bso_file_path) ? (
                    <iframe src={`/api/secure-files/view/${getApiFilePath(request.bso_file_path)}`} title="БСО PDF" className="w-full h-60 border rounded" />
                  ) : (
                    <a href={`/api/secure-files/download/${getApiFilePath(request.bso_file_path)}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">
                      📄 Скачать БСО
                    </a>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <input 
                    type="file" 
                    accept=".jpg,.jpeg,.png,.pdf,.doc,.docx" 
                    disabled={uploading || saving} 
                    onChange={e => e.target.files && setBsoFile(e.target.files[0])}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {bsoFile && <span className="text-xs text-gray-500">Выбран: {bsoFile.name}</span>}
                </div>
              )}
            </div>
            
            {/* Чек расхода */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-3">Чек расхода</label>
              {request.expense_file_path ? (
                <div className="flex flex-col gap-2">
                  {/\.(jpg|jpeg|png)$/i.test(request.expense_file_path) ? (
                    <a href={`/api/secure-files/view/${getApiFilePath(request.expense_file_path)}`} target="_blank" rel="noopener noreferrer">
                      <img src={`/api/secure-files/view/${getApiFilePath(request.expense_file_path)}`} alt="Чек расхода" className="max-h-60 rounded border shadow-sm" />
                    </a>
                  ) :
                  /\.pdf$/i.test(request.expense_file_path) ? (
                    <iframe src={`/api/secure-files/view/${getApiFilePath(request.expense_file_path)}`} title="Чек PDF" className="w-full h-60 border rounded" />
                  ) : (
                    <a href={`/api/secure-files/download/${getApiFilePath(request.expense_file_path)}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">
                      🧾 Скачать чек расхода
                    </a>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <input 
                    type="file" 
                    accept=".jpg,.jpeg,.png,.pdf,.doc,.docx" 
                    disabled={uploading || saving} 
                    onChange={e => e.target.files && setExpenseFile(e.target.files[0])}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {expenseFile && <span className="text-xs text-gray-500">Выбран: {expenseFile.name}</span>}
                </div>
              )}
            </div>
            
            {/* Аудиозапись */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-3">Аудиозапись</label>
              {request.recording_file_path ? (
                <div className="flex flex-col gap-2">
                  {/\.(mp3|wav|ogg|m4a|amr)$/i.test(request.recording_file_path) ? (
                    <div className="bg-white p-3 rounded border">
                      <audio controls src={`/api/secure-files/view/${getApiFilePath(request.recording_file_path)}`} className="w-full">
                        Ваш браузер не поддерживает аудио.
                      </audio>
                    </div>
                  ) : (
                    <a href={`/api/secure-files/download/${getApiFilePath(request.recording_file_path)}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">
                      🎵 Скачать аудиозапись
                    </a>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <input 
                    type="file" 
                    accept=".mp3,.wav,.ogg,.m4a,.amr" 
                    disabled={uploading || saving} 
                    onChange={e => e.target.files && setRecordingFile(e.target.files[0])}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {recordingFile && <span className="text-xs text-gray-500">Выбран: {recordingFile.name}</span>}
                </div>
              )}
            </div>
          </div>
        </Tab>
      </Tabs>
      
      <div className="flex justify-end gap-4 mt-8">
          <Button variant="light" size="lg" startContent={<ArrowLeftIcon className="h-5 w-5" />} onClick={() => navigate(-1)}>
            Назад
          </Button>
          {canEditStatus && (
            <Button color="primary" size="lg" isLoading={saving || uploading} onClick={handleSave} startContent={<CheckCircleIcon className="h-5 w-5" />}>
              Сохранить
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

export default RequestViewPage; 