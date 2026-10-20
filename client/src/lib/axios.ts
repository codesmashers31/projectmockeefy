import axios from 'axios';
import { API_BASE_URL } from '../config';

const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
});

// Request interceptor to attach token and manage Content-Type for FormData
axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        // If data is FormData, remove ANY preset Content-Type so Axios & browser
        // automatically generate 'multipart/form-data; boundary=----...'
        if (config.data instanceof FormData) {
            if (config.headers?.delete) {
                config.headers.delete('content-type');
                config.headers.delete('Content-Type');
            }
            if (config.headers) {
                delete (config.headers as any)['content-type'];
                delete (config.headers as any)['Content-Type'];
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor to handle 401 errors and refresh token
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If error is 401/403 and hasn't been retried yet
        if ((error.response?.status === 401 || error.response?.status === 403) && !originalRequest._retry) {
            if (isRefreshing) {
                // If already refreshing, wait for it to complete
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then((token) => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        return axiosInstance(originalRequest);
                    })
                    .catch((err) => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Call refresh endpoint
                const { data } = await axios.get(`${API_BASE_URL}/api/auth/refresh`, { withCredentials: true });
                const { accessToken } = data;

                if (accessToken) {
                    localStorage.setItem('token', accessToken);
                    axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
                    originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                    
                    processQueue(null, accessToken);
                    return axiosInstance(originalRequest);
                }
            } catch (refreshError) {
                processQueue(refreshError, null);
                // If refresh fails, clear auth state and redirect
                localStorage.removeItem('token');
                if (window.location.pathname !== '/signin' && window.location.pathname !== '/') {
                    window.location.href = '/signin?expired=true';
                }
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default axiosInstance;
