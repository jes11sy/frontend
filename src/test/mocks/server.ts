import { setupServer } from 'msw/node'
import { handlers } from './handlers'

// Настройка MSW сервера для тестов
export const server = setupServer(...handlers, {
  onUnhandledRequest: 'bypass',
} as any)

// Хелперы для управления сервером в тестах
export const resetServer = () => {
  server.resetHandlers()
  server.use(...handlers)
}

export const addHandlers = (...additionalHandlers: any[]) => {
  server.use(...additionalHandlers)
} 