import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,

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

      logout: async () => {
        try {
          await fetch('/api/auth/logout/', {
            method: 'POST',
            credentials: 'include',
          });
          set({ user: null, isAuthenticated: false });
        } catch (error) {
          console.error('退出登录失败:', error);
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

      setUser: (user: User | null) => {
        set({ user, isAuthenticated: !!user });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
