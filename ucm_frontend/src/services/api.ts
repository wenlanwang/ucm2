import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // 从cookie中获取CSRF token
    const csrfToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('csrftoken='))
      ?.split('=')[1];
    
    if (csrfToken) {
      config.headers['X-CSRFToken'] = csrfToken;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ========== SSO 相关 API ==========

export interface SSOStatus {
  use_mock: boolean;
  mode: 'mock' | 'production';
  login_url: string;
}

export interface ToolPortalConfig {
  portal_url: string;
  redirect_url: string;
  has_sso_session: boolean;
}

/**
 * 获取 SSO 认证状态配置
 */
export const getSSOStatus = async (): Promise<SSOStatus> => {
  const response = await api.get('/auth/sso/status/');
  return response.data;
};

/**
 * 获取工具集门户配置
 */
export const getToolPortalConfig = async (): Promise<ToolPortalConfig> => {
  const response = await api.get('/tool-portal-config/');
  return response.data;
};

/**
 * SSO 登出
 */
export const ssoLogout = async (): Promise<{ success: boolean }> => {
  const response = await api.post('/auth/sso/logout/');
  return response.data;
};

export default api;
