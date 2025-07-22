import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Input,
  Select,
  SelectItem,
  Card,
  Chip,
  Spinner,
  Button
} from '@heroui/react';
import { 
  MagnifyingGlassIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  EyeIcon,
  PencilIcon
} from '@heroicons/react/24/outline';
import { transactionsApi } from '../api/transactions';
import { useTransactions } from '../hooks/useTransactions';
import { useAppData } from '../contexts/AppDataContext';
import { useAuth } from '../contexts/AuthContext';
import type { Transaction } from '../types/api';
import dayjs from 'dayjs';

// Интерфейс для фильтров
interface TransactionFilters {
  search: string;
  city: string;
  type: string;
}

const TransactionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { cities, transactionTypes } = useAppData();
  const { user } = useAuth();
  
  const [filters, setFilters] = useState<TransactionFilters>({
    search: '',
    city: '',
    type: ''
  });

  // Загрузка транзакций
  const getTransactions = useCallback(() => transactionsApi.getTransactions(), []);
  
  const { 
    data: transactionsData = [], 
    isLoading: transactionsLoading 
  } = useTransactions();

  // Мемоизированная фильтрация транзакций
  const filteredTransactions = useMemo(() => {
    if (!transactionsData) return [];
    
    let filtered = [...transactionsData];
    
    // Фильтр по поиску
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(transaction => 
        transaction.id.toString().includes(filters.search) ||
        transaction.notes?.toLowerCase().includes(searchTerm) ||
        transaction.amount.toString().includes(filters.search)
      );
    }
    
    // Фильтр по городу
    if (filters.city) {
      filtered = filtered.filter(transaction => 
        transaction.city?.id === Number(filters.city)
      );
    }
    
    // Фильтр по типу
    if (filters.type) {
      filtered = filtered.filter(transaction => 
        transaction.transaction_type?.id === Number(filters.type)
      );
    }
    
    return filtered;
  }, [transactionsData, filters]);

  // Статистика транзакций
  const transactionStats = useMemo(() => {
    if (!filteredTransactions) {
      return { 
        total: 0, 
        income: 0, 
        expense: 0, 
        balance: 0,
        incomeCount: 0,
        expenseCount: 0
      };
    }
    
    const income = filteredTransactions
      .filter(t => t.amount && Number(t.amount) > 0)
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    
    const expense = filteredTransactions
      .filter(t => t.amount && Number(t.amount) < 0)
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    
    const incomeCount = filteredTransactions.filter(t => t.amount && Number(t.amount) > 0).length;
    const expenseCount = filteredTransactions.filter(t => t.amount && Number(t.amount) < 0).length;
    
    return {
      total: filteredTransactions.length,
      income,
      expense: Math.abs(expense),
      balance: income + expense,
      incomeCount,
      expenseCount
    };
  }, [filteredTransactions]);

  // Мемоизированные обработчики
  const handleFilterChange = useCallback((key: keyof TransactionFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  // Вспомогательные функции
  const getAmountColor = useCallback((amount: string) => {
    const numAmount = Number(amount);
    return numAmount >= 0 ? 'success' : 'danger';
  }, []);

  const formatAmount = useCallback((amount: string) => {
    const numAmount = Number(amount);
    return `${numAmount >= 0 ? '+' : ''}${numAmount.toLocaleString('ru-RU')} ₽`;
  }, []);

  const formatCurrency = useCallback((amount: number) => {
    return amount.toLocaleString('ru-RU') + ' ₽';
  }, []);

  // Мемоизированный рендер строки транзакции
  const renderTransactionRow = useCallback((transaction: Transaction) => {
    return (
      <TableRow key={transaction.id}>
        <TableCell>{transaction.id}</TableCell>
        <TableCell>{transaction.city?.name || '—'}</TableCell>
        <TableCell>{transaction.transaction_type?.name || '—'}</TableCell>
        <TableCell>
          <Chip color={getAmountColor(transaction.amount.toString())} size="sm">
            {formatAmount(transaction.amount.toString())}
          </Chip>
        </TableCell>
        <TableCell>{dayjs(transaction.created_at).format('DD.MM.YYYY')}</TableCell>
        <TableCell>{transaction.notes || '—'}</TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <Button
              isIconOnly
              size="sm"
              variant="ghost"
              onClick={() => navigate(`/transactions/${transaction.id}`)}
            >
              <EyeIcon className="h-4 w-4" />
            </Button>
            {user?.role !== 'director' && (
              <Button
                isIconOnly
                size="sm"
                variant="ghost"
                onClick={() => navigate(`/transactions/${transaction.id}/edit`)}
              >
                <PencilIcon className="h-4 w-4" />
              </Button>
            )}
          </div>
        </TableCell>
      </TableRow>
    );
  }, [navigate, getAmountColor, formatAmount, user]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">Транзакции</h1>
        
        {/* Статистика */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CurrencyDollarIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Всего</p>
                <p className="text-2xl font-bold">{transactionStats.total}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <ArrowTrendingUpIcon className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Доходы ({transactionStats.incomeCount})</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(transactionStats.income)}
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <ArrowTrendingDownIcon className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Расходы ({transactionStats.expenseCount})</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(transactionStats.expense)}
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                transactionStats.balance >= 0 ? 'bg-green-100' : 'bg-red-100'
              }`}>
                <CurrencyDollarIcon className={`h-6 w-6 ${
                  transactionStats.balance >= 0 ? 'text-green-600' : 'text-red-600'
                }`} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Баланс</p>
                <p className={`text-2xl font-bold ${
                  transactionStats.balance >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(transactionStats.balance)}
                </p>
              </div>
            </div>
          </Card>
        </div>
        
        {/* Фильтры */}
        <Card className="mb-4">
          <div className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <Input
                placeholder="Поиск по ID, сумме или заметкам"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="max-w-xs"
                startContent={<MagnifyingGlassIcon className="h-4 w-4" />}
              />
              
              <Select
                placeholder="Все города"
                selectedKeys={filters.city ? [filters.city] : []}
                onSelectionChange={(keys) => 
                  handleFilterChange('city', Array.from(keys)[0] as string || '')
                }
                className="max-w-xs"
                isLoading={!cities.length}
              >
                {cities.map(city => (
                  <SelectItem key={city.id}>
                    {city.name}
                  </SelectItem>
                ))}
              </Select>
              
              <Select
                placeholder="Все типы"
                selectedKeys={filters.type ? [filters.type] : []}
                onSelectionChange={(keys) => 
                  handleFilterChange('type', Array.from(keys)[0] as string || '')
                }
                className="max-w-xs"
                isLoading={!transactionTypes.length}
              >
                {transactionTypes.map(type => (
                  <SelectItem key={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </Select>
            </div>
          </div>
        </Card>
      </div>

      {/* Основная таблица */}
      <Card>
        <div className="p-4">
          <Table aria-label="Таблица транзакций">
            <TableHeader>
              <TableColumn>ID</TableColumn>
              <TableColumn>Город</TableColumn>
              <TableColumn>Тип</TableColumn>
              <TableColumn>Сумма</TableColumn>
              <TableColumn>Дата</TableColumn>
              <TableColumn>Примечание</TableColumn>
              <TableColumn>Действия</TableColumn>
            </TableHeader>
            <TableBody
              isLoading={transactionsLoading}
              loadingContent={<Spinner />}
              emptyContent="Нет данных"
            >
              {filteredTransactions.map(renderTransactionRow)}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};

export default TransactionsPage; 