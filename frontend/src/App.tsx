import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AcademicCapIcon, StarIcon, PlayIcon, BellIcon, Bars3Icon, XMarkIcon, SunIcon, MoonIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { useAuthStore, useUIStore } from './stores'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import StudentDashboard from './components/dashboards/StudentDashboard'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (replaces cacheTime in v5)
    },
  },
})

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, checkAuth } = useAuthStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      await checkAuth()
      setLoading(false)
    }
    init()
  }, [checkAuth])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />
}

// Public Route Component (redirects to dashboard if authenticated)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore()
  return !isAuthenticated ? <>{children}</> : <Navigate to="/dashboard" />
}

// Dashboard Router based on user role
const DashboardRouter: React.FC = () => {
  const { user } = useAuthStore()

  if (!user) return <Navigate to="/login" />

  switch (user.role) {
    case 'STUDENT':
      return <StudentDashboard />
    case 'TUTOR':
      // return <TutorDashboard />
      return <div className="p-8 text-center">Tutor Dashboard Coming Soon</div>
    case 'ADMIN':
      // return <AdminDashboard />
      return <div className="p-8 text-center">Admin Dashboard Coming Soon</div>
    default:
      return <Navigate to="/login" />
  }
}

// Mock data for demo (keeping the original data)
const featuredCourses = [
  {
    id: 1,
    title: "Complete React Development Bootcamp",
    instructor: "Sarah Johnson",
    rating: 4.8,
    students: 15420,
    price: 89.99,
    originalPrice: 199.99,
    image: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
    category: "Web Development",
    level: "Beginner to Advanced",
    duration: "40 hours",
    lessons: 156
  },
  {
    id: 2,
    title: "Machine Learning with Python",
    instructor: "Dr. Michael Chen",
    rating: 4.9,
    students: 12850,
    price: 94.99,
    originalPrice: 179.99,
    image: "https://images.unsplash.com/photo-1555949963-aa79dcee981c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
    category: "Data Science",
    level: "Intermediate",
    duration: "35 hours",
    lessons: 127
  },
  {
    id: 3,
    title: "UX/UI Design Masterclass",
    instructor: "Emily Rodriguez",
    rating: 4.7,
    students: 18200,
    price: 79.99,
    originalPrice: 149.99,
    image: "https://images.unsplash.com/photo-1561070791-2526d30994b5?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
    category: "Design",
    level: "All Levels",
    duration: "28 hours",
    lessons: 98
  },
  {
    id: 4,
    title: "Digital Marketing Strategy",
    instructor: "Alex Thompson",
    rating: 4.6,
    students: 9500,
    price: 69.99,
    originalPrice: 129.99,
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
    category: "Marketing",
    level: "Beginner",
    duration: "22 hours",
    lessons: 84
  }
]

const categories = [
  { name: "Web Development", icon: "💻", count: 245 },
  { name: "Data Science", icon: "📊", count: 128 },
  { name: "Design", icon: "🎨", count: 186 },
  { name: "Marketing", icon: "📈", count: 92 },
  { name: "Business", icon: "💼", count: 156 },
  { name: "Photography", icon: "📸", count: 78 },
  { name: "Music", icon: "🎵", count: 64 },
  { name: "Language", icon: "🗣️", count: 52 }
]

// Header Component (updated to work with auth)
const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { theme, toggleTheme } = useUIStore()
  const { isAuthenticated, user, logout } = useAuthStore()
  const location = useLocation()

  // Don't show header on auth pages
  if (['/login', '/register'].includes(location.pathname)) {
    return null
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                <AcademicCapIcon className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-900">EduStack</span>
            </Link>
          </div>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-lg mx-8">
            <div className="relative w-full">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search courses, instructors, topics..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
              />
            </div>
          </div>

          {/* Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            <Link to="/courses" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
              Courses
            </Link>
            
            {!isAuthenticated ? (
              <>
                <Link to="/teach" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
                  Teach
                </Link>
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
                >
                  {theme === 'dark' ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
                </button>
                <div className="flex items-center space-x-3">
                  <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                    Sign In
                  </Link>
                  <Link to="/register" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium">
                    Sign Up
                  </Link>
                </div>
              </>
            ) : (
              <>
                <Link to="/dashboard" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
                  Dashboard
                </Link>
                <BellIcon className="w-6 h-6 text-gray-500 cursor-pointer hover:text-gray-700" />
                <div className="relative group">
                  <button className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      {user?.firstName}
                    </span>
                  </button>
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    <div className="py-2">
                      <Link to="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                        Profile
                      </Link>
                      <Link to="/settings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                        Settings
                      </Link>
                      <button
                        onClick={logout}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Sign out
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-500 hover:text-gray-700"
            >
              {isMenuOpen ? <XMarkIcon className="w-6 h-6" /> : <Bars3Icon className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <div className="flex flex-col space-y-2">
              <Link to="/courses" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-base font-medium">
                Courses
              </Link>
              {isAuthenticated && (
                <Link to="/dashboard" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-base font-medium">
                  Dashboard
                </Link>
              )}
              {!isAuthenticated && (
                <>
                  <Link to="/teach" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-base font-medium">
                    Teach
                  </Link>
                  <div className="flex items-center space-x-3 px-3 py-2">
                    <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                      Sign In
                    </Link>
                    <Link to="/register" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium">
                      Sign Up
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}

// Hero Section Component
const HeroSection: React.FC = () => {
  return (
    <section className="bg-gradient-to-br from-blue-50 via-white to-purple-50 py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight">
              Learn Without
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                Limits
              </span>
            </h1>
            <p className="mt-6 text-xl text-gray-600 max-w-2xl">
              Join millions of learners from around the world already learning on EduStack. Find courses from industry experts and advance your career.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link to="/courses" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-semibold shadow-lg transform hover:-translate-y-1 transition-all duration-200">
                Explore Courses
              </Link>
              <Link to="/register" className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50 px-8 py-4 rounded-lg text-lg font-semibold transform hover:-translate-y-1 transition-all duration-200">
                Start Learning
              </Link>
            </div>
            <div className="mt-12 grid grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-3xl font-bold text-gray-900">50K+</div>
                <div className="text-gray-600">Students</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900">1,200+</div>
                <div className="text-gray-600">Courses</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900">250+</div>
                <div className="text-gray-600">Instructors</div>
              </div>
            </div>
          </div>
          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
              alt="Students learning"
              className="rounded-2xl shadow-2xl"
            />
            <div className="absolute -top-6 -left-6 w-32 h-32 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full opacity-20 blur-xl"></div>
            <div className="absolute -bottom-6 -right-6 w-40 h-40 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full opacity-20 blur-xl"></div>
          </div>
        </div>
      </div>
    </section>
  )
}

// Course Card Component
const CourseCard: React.FC<{ course: any }> = ({ course }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-shadow duration-300 overflow-hidden border border-gray-100">
      <div className="relative overflow-hidden group">
        <img
          src={course.image}
          alt={course.title}
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-4 left-4">
          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
            {course.category}
          </span>
        </div>
        <div className="absolute top-4 right-4">
          <button className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-50">
            <PlayIcon className="w-4 h-4 text-gray-700" />
          </button>
        </div>
      </div>
      <div className="p-6">
        <h3 className="font-semibold text-lg text-gray-900 mb-2 line-clamp-2">
          {course.title}
        </h3>
        <p className="text-gray-600 text-sm mb-3">{course.instructor}</p>
        
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center">
            {[...Array(5)].map((_, i) => (
              <StarIcon
                key={i}
                className={`w-4 h-4 ${i < Math.floor(course.rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-gray-700">{course.rating}</span>
          <span className="text-sm text-gray-500">({course.students.toLocaleString()})</span>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          <span>{course.duration}</span>
          <span>{course.lessons} lessons</span>
          <span>{course.level}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-gray-900">${course.price}</span>
            <span className="text-sm text-gray-500 line-through">${course.originalPrice}</span>
          </div>
          <Link 
            to="/register" 
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transform hover:-translate-y-0.5 transition-all duration-200"
          >
            Enroll Now
          </Link>
        </div>
      </div>
    </div>
  )
}

// Categories Section
const CategoriesSection: React.FC = () => {
  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Explore Categories
          </h2>
          <p className="text-xl text-gray-600">
            Choose from hundreds of courses in trending categories
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {categories.map((category) => (
            <div
              key={category.name}
              className="bg-white rounded-lg p-6 text-center hover:shadow-lg transition-shadow cursor-pointer transform hover:-translate-y-1 hover:scale-105 transition-all duration-300"
            >
              <div className="text-4xl mb-4">{category.icon}</div>
              <h3 className="font-semibold text-gray-900 mb-2">{category.name}</h3>
              <p className="text-gray-600 text-sm">{category.count} courses</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// Featured Courses Section
const FeaturedCourses: React.FC = () => {
  return (
    <section className="py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Featured Courses
          </h2>
          <p className="text-xl text-gray-600">
            Handpicked courses by our expert instructors
          </p>
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-8">
          {featuredCourses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>

        <div className="text-center mt-12">
          <Link to="/courses" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transform hover:-translate-y-1 transition-all duration-200">
            View All Courses
          </Link>
        </div>
      </div>
    </section>
  )
}

// Stats Section
const StatsSection: React.FC = () => {
  return (
    <section className="py-16 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-4xl font-bold mb-2">50,000+</div>
            <div className="text-blue-100">Active Students</div>
          </div>
          <div>
            <div className="text-4xl font-bold mb-2">1,200+</div>
            <div className="text-blue-100">Video Courses</div>
          </div>
          <div>
            <div className="text-4xl font-bold mb-2">250+</div>
            <div className="text-blue-100">Expert Instructors</div>
          </div>
          <div>
            <div className="text-4xl font-bold mb-2">98%</div>
            <div className="text-blue-100">Satisfaction Rate</div>
          </div>
        </div>
      </div>
    </section>
  )
}

// Footer Component
const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 text-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center space-x-2 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                <AcademicCapIcon className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold">EduStack</span>
            </div>
            <p className="text-gray-400 mb-6">
              Empowering learners worldwide with high-quality online education.
            </p>
            <div className="flex space-x-4">
              <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-700">
                📘
              </div>
              <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-700">
                🐦
              </div>
              <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-700">
                📷
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold mb-6">Categories</h3>
            <ul className="space-y-3 text-gray-400">
              <li><a href="#" className="hover:text-white">Web Development</a></li>
              <li><a href="#" className="hover:text-white">Data Science</a></li>
              <li><a href="#" className="hover:text-white">Design</a></li>
              <li><a href="#" className="hover:text-white">Marketing</a></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-6">Support</h3>
            <ul className="space-y-3 text-gray-400">
              <li><a href="#" className="hover:text-white">Help Center</a></li>
              <li><a href="#" className="hover:text-white">Terms of Service</a></li>
              <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white">Contact Us</a></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-6">Newsletter</h3>
            <p className="text-gray-400 mb-4">
              Subscribe to get updates on new courses and features.
            </p>
            <div className="flex">
              <input
                type="email"
                placeholder="Your email"
                className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-r-lg transition-colors">
                Subscribe
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
          <p>&copy; 2024 EduStack. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

// Main Home Page Component
const HomePage: React.FC = () => {
  return (
    <div>
      <HeroSection />
      <CategoriesSection />
      <FeaturedCourses />
      <StatsSection />
    </div>
  )
}

// Simple placeholder pages
const CoursesPage: React.FC = () => (
  <div className="min-h-screen bg-gray-50 py-16">
    <div className="max-w-7xl mx-auto px-4">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">All Courses</h1>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-8">
        {[...featuredCourses, ...featuredCourses].map((course, index) => (
          <CourseCard key={`${course.id}-${index}`} course={course} />
        ))}
      </div>
    </div>
  </div>
)

const TeachPage: React.FC = () => (
  <div className="min-h-screen bg-gray-50 py-16">
    <div className="max-w-4xl mx-auto px-4 text-center">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">Teach on EduStack</h1>
      <p className="text-xl text-gray-600 mb-12">
        Share your knowledge with millions of students around the world
      </p>
      <div className="bg-white rounded-2xl p-8 shadow-lg">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Ready to get started?</h2>
        <Link
          to="/register"
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transform hover:-translate-y-1 transition-all duration-200"
        >
          Create Your Course
        </Link>
      </div>
    </div>
  </div>
)

// Updated App Component with proper routing
function App() {
  const { theme } = useUIStore()

  useEffect(() => {
    // Initialize theme
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-white">
          <Header />
          
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/courses" element={<CoursesPage />} />
            <Route path="/teach" element={<TeachPage />} />
            
            {/* Public Routes */}
            <Route path="/login" element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            } />
            <Route path="/register" element={
              <PublicRoute>
                <RegisterPage />
              </PublicRoute>
            } />
            
            {/* Protected Routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <DashboardRouter />
              </ProtectedRoute>
            } />
            
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
          
          <Footer />
        </div>
      </Router>
    </QueryClientProvider>
  )
}

export default App
