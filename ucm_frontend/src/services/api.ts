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

// ========== 用户管理 API ==========

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_staff: boolean;
  is_superuser: boolean;
  is_active: boolean;
  date_joined: string | null;
  last_login: string | null;
}

export interface SetUserAdminResponse {
  success: boolean;
  message: string;
  user: {
    id: number;
    username: string;
    is_staff: boolean;
  };
}

/**
 * 获取用户列表（仅管理员）
 */
export const getUsers = async (): Promise<User[]> => {
  const response = await api.get('/auth/users/');
  return response.data;
};

/**
 * 设置/取消用户管理员状态（仅管理员）
 */
export const setUserAdmin = async (userId: number, isStaff: boolean): Promise<SetUserAdminResponse> => {
  const response = await api.post(`/auth/users/${userId}/set-admin/`, { is_staff: isStaff });
  return response.data;
};

export default api;
