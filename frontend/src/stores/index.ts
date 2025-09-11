import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authAPI, userAPI } from '../services/api';

// Types
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'STUDENT' | 'TUTOR' | 'ADMIN';
  avatar?: string;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  register: (userData: {
    username: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    userType: string;
  }) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  refreshToken: () => Promise<void>;
  updateProfile: (data: any) => Promise<void>;
  checkAuth: () => Promise<void>;
}

// Auth Store
export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authAPI.login({ email, password });
          const { user, token } = response.data;
          
          localStorage.setItem('token', token);
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.response?.data?.message || 'Login failed',
          });
          throw error;
        }
      },

      register: async (userData) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authAPI.register(userData);
          const { user, token } = response.data;
          
          localStorage.setItem('token', token);
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.response?.data?.message || 'Registration failed',
          });
          throw error;
        }
      },

      logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        });
      },

      clearError: () => {
        set({ error: null });
      },

      refreshToken: async () => {
        try {
          const response = await authAPI.refreshToken();
          const { token } = response.data;
          localStorage.setItem('token', token);
          set({ token });
        } catch (error) {
          get().logout();
        }
      },

      updateProfile: async (data) => {
        set({ isLoading: true });
        try {
          const response = await userAPI.updateProfile(data);
          set({
            user: response.data,
            isLoading: false,
          });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.response?.data?.message || 'Profile update failed',
          });
        }
      },

      checkAuth: async () => {
        const token = localStorage.getItem('token');
        if (!token) {
          set({ isAuthenticated: false });
          return;
        }

        try {
          const response = await userAPI.getProfile();
          set({
            user: response.data,
            token,
            isAuthenticated: true,
          });
        } catch (error) {
          get().logout();
        }
      },
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Course Store
interface Course {
  id: string;
  title: string;
  description: string;
  price: number;
  level: string;
  category: string;
  image: string;
  tutorId: string;
  tutor: {
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  rating: number;
  studentsCount: number;
  createdAt: string;
  updatedAt: string;
}

interface CourseState {
  courses: Course[];
  currentCourse: Course | null;
  isLoading: boolean;
  error: string | null;
  filters: {
    category: string;
    level: string;
    priceRange: [number, number];
    search: string;
  };
}

interface CourseActions {
  fetchCourses: (params?: any) => Promise<void>;
  fetchCourseById: (id: string) => Promise<void>;
  setFilters: (filters: Partial<CourseState['filters']>) => void;
  clearFilters: () => void;
  clearError: () => void;
}

export const useCourseStore = create<CourseState & CourseActions>((set) => ({
  // State
  courses: [],
  currentCourse: null,
  isLoading: false,
  error: null,
  filters: {
    category: '',
    level: '',
    priceRange: [0, 1000],
    search: '',
  },

  // Actions
  fetchCourses: async (params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('http://localhost:3000/api/courses?' + new URLSearchParams(params));
      const data = await response.json();
      set({
        courses: data.courses || data,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error: 'Failed to fetch courses',
      });
    }
  },

  fetchCourseById: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`http://localhost:3000/api/courses/${id}`);
      const data = await response.json();
      set({
        currentCourse: data,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error: 'Failed to fetch course',
      });
    }
  },

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }));
  },

  clearFilters: () => {
    set({
      filters: {
        category: '',
        level: '',
        priceRange: [0, 1000],
        search: '',
      },
    });
  },

  clearError: () => {
    set({ error: null });
  },
}));

// UI Store
interface UIState {
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  mobileMenuOpen: boolean;
  loading: boolean;
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
    duration?: number;
  }>;
}

interface UIActions {
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;
  setMobileMenuOpen: (open: boolean) => void;
  setLoading: (loading: boolean) => void;
  addNotification: (notification: Omit<UIState['notifications'][0], 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

export const useUIStore = create<UIState & UIActions>()(
  persist(
    (set, get) => ({
      // State
      theme: 'light',
      sidebarOpen: true,
      mobileMenuOpen: false,
      loading: false,
      notifications: [],

      // Actions
      toggleTheme: () => {
        const newTheme = get().theme === 'light' ? 'dark' : 'light';
        set({ theme: newTheme });
        document.documentElement.classList.toggle('dark', newTheme === 'dark');
      },

      setTheme: (theme) => {
        set({ theme });
        document.documentElement.classList.toggle('dark', theme === 'dark');
      },

      toggleSidebar: () => {
        set((state) => ({ sidebarOpen: !state.sidebarOpen }));
      },

      setSidebarOpen: (open) => {
        set({ sidebarOpen: open });
      },

      toggleMobileMenu: () => {
        set((state) => ({ mobileMenuOpen: !state.mobileMenuOpen }));
      },

      setMobileMenuOpen: (open) => {
        set({ mobileMenuOpen: open });
      },

      setLoading: (loading) => {
        set({ loading });
      },

      addNotification: (notification) => {
        const id = Date.now().toString();
        const newNotification = { ...notification, id };
        set((state) => ({
          notifications: [...state.notifications, newNotification],
        }));

        // Auto-remove after duration
        if (notification.duration !== 0) {
          setTimeout(() => {
            get().removeNotification(id);
          }, notification.duration || 5000);
        }
      },

      removeNotification: (id) => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      },

      clearNotifications: () => {
        set({ notifications: [] });
      },
    }),
    {
      name: 'ui-store',
      partialize: (state) => ({
        theme: state.theme,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
);
