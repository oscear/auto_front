import axios from 'axios';
import router from '../router';

const service = axios.create({
  // 可用环境变量 VITE_API_BASE 覆盖，未配置时保持原地址
  baseURL: import.meta.env?.VITE_API_BASE || 'http://172.19.5.123:8000',
  timeout: 100000,
});

service.interceptors.request.use(
  (config) => {
    let token = '';
    try {
      token = JSON.parse(localStorage.getItem('authData') || 'null')?.data || '';
    } catch {
      token = '';
    }
    if (token) {
      config.headers.Authorization = 'Token ' + token;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 添加响应拦截器
service.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('authData');
      router.push({ name: 'Login' });
    }
    return Promise.reject(error);
  }
);

export default service;
