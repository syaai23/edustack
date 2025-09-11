import axios from 'axios';
import type { AxiosInstance, AxiosResponse } from 'axios';

// Create axios instance with base configuration
const api: AxiosInstance = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials: { email: string; password: string }) =>
    api.post('/auth/login', credentials),
  
  register: (userData: {
    username: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    userType: string;
  }) => api.post('/auth/register', userData),
  
  logout: () => api.post('/auth/logout'),
  
  refreshToken: () => api.post('/auth/refresh'),
  
  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),
  
  resetPassword: (data: { token: string; password: string }) =>
    api.post('/auth/reset-password', data),
  
  verifyEmail: (token: string) =>
    api.post('/auth/verify-email', { token }),
};

// User API
export const userAPI = {
  getProfile: () => api.get('/users/profile'),
  
  updateProfile: (data: any) => api.put('/users/profile', data),
  
  uploadAvatar: (file: FormData) =>
    api.post('/users/upload-avatar', file, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  
  getUsers: (params?: any) => api.get('/users', { params }),
  
  getUserById: (id: string) => api.get(`/users/${id}`),
  
  updateUser: (id: string, data: any) => api.put(`/users/${id}`, data),
  
  deleteUser: (id: string) => api.delete(`/users/${id}`),
};

// Course API
export const courseAPI = {
  getCourses: (params?: any) => api.get('/courses', { params }),
  
  getCourseById: (id: string) => api.get(`/courses/${id}`),
  
  createCourse: (data: any) => api.post('/courses', data),
  
  updateCourse: (id: string, data: any) => api.put(`/courses/${id}`, data),
  
  deleteCourse: (id: string) => api.delete(`/courses/${id}`),
  
  getCourseSections: (courseId: string) =>
    api.get(`/courses/${courseId}/sections`),
  
  createSection: (courseId: string, data: any) =>
    api.post(`/courses/${courseId}/sections`, data),
  
  updateSection: (courseId: string, sectionId: string, data: any) =>
    api.put(`/courses/${courseId}/sections/${sectionId}`, data),
  
  deleteSection: (courseId: string, sectionId: string) =>
    api.delete(`/courses/${courseId}/sections/${sectionId}`),
  
  getLessons: (courseId: string, sectionId: string) =>
    api.get(`/courses/${courseId}/sections/${sectionId}/lessons`),
  
  createLesson: (courseId: string, sectionId: string, data: any) =>
    api.post(`/courses/${courseId}/sections/${sectionId}/lessons`, data),
  
  updateLesson: (courseId: string, sectionId: string, lessonId: string, data: any) =>
    api.put(`/courses/${courseId}/sections/${sectionId}/lessons/${lessonId}`, data),
  
  deleteLesson: (courseId: string, sectionId: string, lessonId: string) =>
    api.delete(`/courses/${courseId}/sections/${sectionId}/lessons/${lessonId}`),
  
  uploadCourseImage: (file: FormData) =>
    api.post('/upload/course-image', file, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

// Enrollment API
export const enrollmentAPI = {
  enrollInCourse: (courseId: string) =>
    api.post('/enrollments', { courseId }),
  
  getMyEnrollments: () => api.get('/enrollments/my'),
  
  getEnrollmentsByCourse: (courseId: string) =>
    api.get(`/enrollments/course/${courseId}`),
  
  updateProgress: (enrollmentId: string, lessonId: string) =>
    api.post(`/enrollments/${enrollmentId}/progress`, { lessonId }),
  
  getProgress: (enrollmentId: string) =>
    api.get(`/enrollments/${enrollmentId}/progress`),
  
  unenroll: (enrollmentId: string) =>
    api.delete(`/enrollments/${enrollmentId}`),
};

// Review API
export const reviewAPI = {
  getCourseReviews: (courseId: string) =>
    api.get(`/reviews/course/${courseId}`),
  
  createReview: (data: {
    courseId: string;
    rating: number;
    comment: string;
  }) => api.post('/reviews', data),
  
  updateReview: (id: string, data: any) => api.put(`/reviews/${id}`, data),
  
  deleteReview: (id: string) => api.delete(`/reviews/${id}`),
  
  getMyReviews: () => api.get('/reviews/my'),
};

// Payment API
export const paymentAPI = {
  createPaymentIntent: (data: {
    courseId: string;
    amount: number;
  }) => api.post('/payments/create-intent', data),
  
  confirmPayment: (data: {
    paymentIntentId: string;
    courseId: string;
  }) => api.post('/payments/confirm', data),
  
  getPaymentHistory: () => api.get('/payments/history'),
  
  getPaymentById: (id: string) => api.get(`/payments/${id}`),
  
  // Tutor payout endpoints
  getTutorEarnings: () => api.get('/payments/tutor/earnings'),
  
  requestPayout: (amount: number) =>
    api.post('/payments/tutor/payout', { amount }),
  
  getPayoutHistory: () => api.get('/payments/tutor/payouts'),
};

// Categories API
export const categoryAPI = {
  getCategories: () => api.get('/categories'),
  
  getCategoryById: (id: string) => api.get(`/categories/${id}`),
  
  createCategory: (data: { name: string; description?: string }) =>
    api.post('/categories', data),
  
  updateCategory: (id: string, data: any) =>
    api.put(`/categories/${id}`, data),
  
  deleteCategory: (id: string) => api.delete(`/categories/${id}`),
};

// Analytics API (for admin/tutor dashboards)
export const analyticsAPI = {
  getDashboardStats: () => api.get('/analytics/dashboard'),
  
  getCourseAnalytics: (courseId: string) =>
    api.get(`/analytics/course/${courseId}`),
  
  getUserAnalytics: () => api.get('/analytics/user'),
  
  getRevenueAnalytics: (params?: any) =>
    api.get('/analytics/revenue', { params }),
  
  getEnrollmentAnalytics: (params?: any) =>
    api.get('/analytics/enrollments', { params }),
};

export default api;
