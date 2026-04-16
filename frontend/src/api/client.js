import axios from 'axios'
import { useAuthStore } from '../store/authStore.js'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  withCredentials: false,
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let isRefreshing = false
let refreshQueue = []

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject, config: original })
        })
      }
      isRefreshing = true
      try {
        const refreshToken = useAuthStore.getState().refreshToken
        const { data } = await axios.post(`${import.meta.env.VITE_API_URL || ''}/api/auth/refresh`, { refreshToken })
        useAuthStore.getState().setTokens(data.accessToken, data.refreshToken)
        refreshQueue.forEach(({ resolve, config }) => {
          config.headers.Authorization = `Bearer ${data.accessToken}`
          resolve(api(config))
        })
        refreshQueue = []
        original.headers.Authorization = `Bearer ${data.accessToken}`
        return api(original)
      } catch {
        useAuthStore.getState().logout()
        refreshQueue.forEach(({ reject }) => reject(error))
        refreshQueue = []
        window.location.href = '/login'
      } finally {
        isRefreshing = false
      }
    }
    return Promise.reject(error)
  }
)

export default api
