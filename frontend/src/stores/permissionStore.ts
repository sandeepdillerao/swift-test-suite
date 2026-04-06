import { create } from 'zustand';

interface PermissionState {
  /** Current user's resolved permission codes */
  permissions: Set<string>;
  /** Whether permissions have been loaded */
  loaded: boolean;
  setPermissions: (perms: string[]) => void;
  clear: () => void;
  has: (code: string) => boolean;
  hasAny: (...codes: string[]) => boolean;
  hasAll: (...codes: string[]) => boolean;
}

export const usePermissionStore = create<PermissionState>((set, get) => ({
  permissions: new Set(),
  loaded: false,
  setPermissions: (perms) => set({ permissions: new Set(perms), loaded: true }),
  clear: () => set({ permissions: new Set(), loaded: false }),
  has: (code) => get().permissions.has(code),
  hasAny: (...codes) => codes.some((c) => get().permissions.has(c)),
  hasAll: (...codes) => codes.every((c) => get().permissions.has(c)),
}));
