import React, { useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Button,
  Chip,
  Spinner
} from '@heroui/react';
import { 
  ArrowLeftIcon,
  PencilIcon,
  CurrencyDollarIcon,
  MapPinIcon,
  TagIcon,
  ClockIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { transactionsApi } from '../api/transactions';
import { useApiData } from '../hooks/useApiData';
import type { Transaction } from '../types/api';
import dayjs from 'dayjs';

const TransactionViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Загрузка транзакции
  const getTransaction = useCallback(() => 
    transactionsApi.getTransaction(Number(id)), [id]
  );
  
  const { 
    data: transaction, 
    loading,
    error 
  } = useApiData(getTransaction, {
    errorMessage: 'Ошибка загрузки транзакции'
  });

  const getAmountColor = useCallback((amount: number) => {
    return amount >= 0 ? 'success' : 'danger';
  }, []);

  const formatAmount = useCallback((amount: number) => {
    return `${amount >= 0 ? '+' : ''}${amount.toLocaleString('ru-RU')} ₽`;
  }, []);

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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Button
              isIconOnly
              variant="light"
              onClick={() => navigate('/transactions')}
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Транзакция #{transaction.id}</h1>
              <p className="text-gray-600">
                Создана {dayjs(transaction.created_at).format('DD.MM.YYYY в HH:mm')}
              </p>
            </div>
          </div>
          
          <Button
            color="primary"
            onClick={() => navigate(`/transactions/${transaction.id}/edit`)}
            startContent={<PencilIcon className="h-4 w-4" />}
          >
            Редактировать
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Основная информация */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Основная информация</h2>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <CurrencyDollarIcon className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Сумма</p>
                <Chip 
                  color={getAmountColor(transaction.amount)} 
                  size="lg"
                  className="font-semibold"
                >
                  {formatAmount(transaction.amount)}
                </Chip>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <MapPinIcon className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Город</p>
                <p className="font-medium">{transaction.city?.name || '—'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <TagIcon className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Тип транзакции</p>
                <p className="font-medium">{transaction.transaction_type?.name || '—'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <ClockIcon className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Дата создания</p>
                <p className="font-medium">
                  {dayjs(transaction.created_at).format('DD.MM.YYYY в HH:mm')}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Дополнительная информация */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Дополнительная информация</h2>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <DocumentTextIcon className="h-5 w-5 text-gray-400 mt-1" />
              <div className="flex-1">
                <p className="text-sm text-gray-600">Примечание</p>
                <p className="font-medium">
                  {transaction.notes || 'Нет примечаний'}
                </p>
              </div>
            </div>

            {transaction.specified_date && (
              <div className="flex items-center gap-3">
                <ClockIcon className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Указанная дата</p>
                  <p className="font-medium">
                    {dayjs(transaction.specified_date).format('DD.MM.YYYY')}
                  </p>
                </div>
              </div>
            )}

            {transaction.payment_reason && (
              <div className="flex items-start gap-3">
                <DocumentTextIcon className="h-5 w-5 text-gray-400 mt-1" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600">Причина платежа</p>
                  <p className="font-medium">{transaction.payment_reason}</p>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Файлы */}
      {(transaction.file_path || transaction.expense_receipt_path) && (
        <Card className="p-6 mt-6">
          <h2 className="text-lg font-semibold mb-4">Прикрепленные файлы</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {transaction.file_path && (
              <div className="border rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-2">Основной документ</p>
                <p className="font-medium">{transaction.file_path}</p>
              </div>
            )}
            {transaction.expense_receipt_path && (
              <div className="border rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-2">Чек расхода</p>
                <p className="font-medium">{transaction.expense_receipt_path}</p>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default TransactionViewPage; 