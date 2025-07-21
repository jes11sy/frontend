import axios from 'axios';

// Базовый URL API - продакшн домен
const API_BASE_URL = 'https://api.lead-schem.ru/api';

// Создание экземпляра axios с базовыми настройками
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Включаем отправку cookies
});

// Интерцептор для обработки ошибок
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Убираем автоматическое перенаправление - пусть компоненты сами решают что делать
    return Promise.reject(error);
  }
);

// Типы экспортируются из '../types/api'
export type { ApiResponse, PaginatedResponse } from '../types/api'; 