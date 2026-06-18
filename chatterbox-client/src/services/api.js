import axios from 'axios';
import { socketService } from './socket.service';
import { clearStoredAuth, getStoredToken, getStoredUser } from '../utils/authStorage';

const API_URL = import.meta.env.MODE === 'production' ? '/api' : 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const user = getStoredUser();
        const token = getStoredToken() || user?.token;

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle 401s
api.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        if (error.response?.status === 401) {
            clearStoredAuth();
            socketService.clearAuthSession();
            // Only redirect if not already at login
            if (window.location.pathname !== '/' && !window.location.pathname.includes('/login')) {
                window.location.href = '/';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
