import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getSSOStatus, ssoLogout } from '../services/api';
import type { SSOStatus } from '../services/api';

interface User {
  id: number;
  username: string;
  email: string;
  is_staff: boolean;
  date_joined?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  ssoStatus: SSOStatus | null;
  // 本地登录（保留原有功能，用于备份登录方式）
  login: (username: string, password: string) => Promise<boolean>;
  // SSO 登录
  ssoLogin: () => void;
  // 登出（自动判断 SSO/本地）
  logout: () => Promise<void>;
  // 检查认证状态
  checkAuth: () => Promise<void>;
  // 获取 SSO 状态
  fetchSSOStatus: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      ssoStatus: null,

      login: async (username: string, password: string) => {
        try {
          const response = await fetch('/api/auth/login/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
            credentials: 'include',
          });

          const data = await response.json();

          if (response.ok && data.success) {
            set({ user: data.user, isAuthenticated: true });
            return true;
          }
          return false;
        } catch (error) {
          console.error('登录失败:', error);
          return false;
        }
      },

      ssoLogin: () => {
        // 重定向到后端 SSO 登录入口
        // 后端会根据配置重定向到 Mock 或生产 SSO
        window.location.href = '/api/auth/sso/login/';
      },

      logout: async () => {
        try {
          const { ssoStatus } = get();
          
          // 如果是 SSO 模式，调用 SSO 登出
          if (ssoStatus && !ssoStatus.use_mock) {
            await ssoLogout();
          } else {
            // 本地模式或 Mock 模式，调用本地登出
            await fetch('/api/auth/logout/', {
              method: 'POST',
              credentials: 'include',
            });
          }
          
          set({ user: null, isAuthenticated: false });
        } catch (error) {
          console.error('退出登录失败:', error);
          // 即使失败也清除本地状态
          set({ user: null, isAuthenticated: false });
        }
      },

      checkAuth: async () => {
        try {
          const response = await fetch('/api/auth/current-user/', {
            credentials: 'include',
          });

          if (response.ok) {
            const user = await response.json();
            set({ user, isAuthenticated: true });
          } else {
            set({ user: null, isAuthenticated: false });
          }
        } catch (error) {
          set({ user: null, isAuthenticated: false });
        }
      },

      fetchSSOStatus: async () => {
        try {
          const status = await getSSOStatus();
          set({ ssoStatus: status });
        } catch (error) {
          console.error('获取 SSO 状态失败:', error);
        }
      },

      setUser: (user: User | null) => {
        set({ user, isAuthenticated: !!user });
      },
    }),
    {
      name: 'auth-storage',
      // 不持久化 ssoStatus，每次应用启动时重新获取
      partialize: (state) => ({ 
        user: state.user, 
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);
