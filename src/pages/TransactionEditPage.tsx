import React, { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Button,
  Input,
  Select,
  SelectItem,
  Textarea,
  Spinner
} from '@heroui/react';
import { 
  ArrowLeftIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { transactionsApi } from '../api/transactions';
import { useTransaction, useUpdateTransaction } from '../hooks/useTransactions';
import { useAppData } from '../contexts/AppDataContext';
import { useNotification } from '../contexts/NotificationContext';
import type { Transaction } from '../types/api';


interface TransactionFormData {
  amount: string;
  notes: string;
  specified_date: string;
  payment_reason: string;
}

const TransactionEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { cities, transactionTypes } = useAppData();
  const { showSuccess, showError } = useNotification();

  const [formData, setFormData] = useState<TransactionFormData>({
    amount: '',
    notes: '',
    specified_date: '',
    payment_reason: ''
  });
  const [selectedCityId, setSelectedCityId] = useState<string>('');
  const [selectedTypeId, setSelectedTypeId] = useState<string>('');
  const [saving, setSaving] = useState(false);

  // Загрузка транзакции
  const getTransaction = useCallback(() => 
    transactionsApi.getTransaction(Number(id)), [id]
  );
  
    const { 
    data: transaction,
    isLoading: loading,
    error 
  } = useTransaction(Number(id));

  // Заполнение формы данными транзакции
  useEffect(() => {
    if (transaction) {
      setFormData({
        amount: Math.abs(transaction.amount).toString(),
        notes: transaction.notes || '',
        specified_date: transaction.specified_date || '',
        payment_reason: transaction.payment_reason || ''
      });
      setSelectedCityId(transaction.city?.id?.toString() || '');
      setSelectedTypeId(transaction.transaction_type?.id?.toString() || '');
    }
  }, [transaction]);

  const handleInputChange = useCallback((field: keyof TransactionFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!transaction) return;

    setSaving(true);
    try {
      const updateData = {
        city_id: Number(selectedCityId),
        transaction_type_id: Number(selectedTypeId),
        amount: transaction.amount < 0 ? -Math.abs(Number(formData.amount)) : Math.abs(Number(formData.amount)),
        notes: formData.notes,
        specified_date: formData.specified_date || undefined,
        payment_reason: formData.payment_reason || undefined
      };

      await transactionsApi.updateTransaction(transaction.id, updateData);
      showSuccess('Транзакция обновлена');
      navigate(`/transactions/${transaction.id}`);
    } catch (error: any) {
      console.error('Error updating transaction:', error);
      
      // Детальная информация об ошибке
      if (error.response?.status === 403) {
        showError('Недостаточно прав для редактирования транзакции');
        console.error('403 Forbidden - проверьте права доступа');
      } else if (error.response?.status === 401) {
        showError('Ошибка аутентификации');
        console.error('401 Unauthorized');
      } else {
        showError(`Ошибка при обновлении транзакции: ${error.response?.data?.detail || error.message}`);
      }
    } finally {
      setSaving(false);
    }
  }, [transaction, selectedCityId, selectedTypeId, formData, showSuccess, showError, navigate]);

  const handleCancel = useCallback(() => {
    navigate(`/transactions/${id}`);
  }, [navigate, id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="p-6">
        <Card className="p-6 text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">Ошибка</h2>
          <p className="text-gray-600 mb-4">Транзакция не найдена</p>
          <Button onClick={() => navigate('/transactions')}>
            Вернуться к списку
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Button
            isIconOnly
            variant="light"
            onClick={handleCancel}
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Редактирование транзакции #{transaction.id}</h1>
            <p className="text-gray-600">Изменение данных транзакции</p>
          </div>
        </div>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Select
              label="Город"
              placeholder="Выберите город"
              selectedKeys={selectedCityId ? [selectedCityId] : []}
              onSelectionChange={(keys) => setSelectedCityId(Array.from(keys)[0] as string)}
              isRequired
              isLoading={!cities.length}
            >
              {cities.map(city => (
                <SelectItem key={city.id}>
                  {city.name}
                </SelectItem>
              ))}
            </Select>

            <Select
              label="Тип транзакции"
              placeholder="Выберите тип"
              selectedKeys={selectedTypeId ? [selectedTypeId] : []}
              onSelectionChange={(keys) => setSelectedTypeId(Array.from(keys)[0] as string)}
              isRequired
              isLoading={!transactionTypes.length}
            >
              {transactionTypes.map(type => (
                <SelectItem key={type.id}>
                  {type.name}
                </SelectItem>
              ))}
            </Select>

            <Input
              type="number"
              step="0.01"
              label="Сумма (без знака)"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => handleInputChange('amount', e.target.value)}
              isRequired
              description={`Исходная сумма: ${transaction.amount >= 0 ? '+' : ''}${transaction.amount.toLocaleString('ru-RU')} ₽`}
            />

            <Input
              type="date"
              label="Указанная дата"
              value={formData.specified_date}
              onChange={(e) => handleInputChange('specified_date', e.target.value)}
            />
          </div>

          <Textarea
            label="Примечание"
            placeholder="Введите примечание..."
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            minRows={3}
          />

          <Textarea
            label="Причина платежа"
            placeholder="Введите причину платежа..."
            value={formData.payment_reason}
            onChange={(e) => handleInputChange('payment_reason', e.target.value)}
            minRows={2}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="light"
              onClick={handleCancel}
              startContent={<XMarkIcon className="h-4 w-4" />}
            >
              Отмена
            </Button>
            <Button
              type="submit"
              color="primary"
              isLoading={saving}
              startContent={<CheckIcon className="h-4 w-4" />}
            >
              Сохранить
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default TransactionEditPage; 