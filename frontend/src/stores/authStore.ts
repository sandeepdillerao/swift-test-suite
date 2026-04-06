import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';
import { usePermissionStore } from '@/stores/permissionStore';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  login: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setLoading: (isLoading) => set({ isLoading }),
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      login: (user, accessToken, refreshToken) => {
        // Clear stale permissions so they are re-fetched for the new user
        usePermissionStore.getState().clear();
        set({ user, accessToken, refreshToken, isAuthenticated: true, isLoading: false });
      },
      logout: () => {
        usePermissionStore.getState().clear();
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      },
    }),
    {
      name: 'auth-storage',
      // Only persist tokens + user — never persist isLoading
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
