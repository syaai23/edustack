import React, { useEffect, useState } from 'react'
import { 
  BookOpenIcon, 
  UsersIcon, 
  ChartBarIcon, 
  CurrencyDollarIcon,
  PlusIcon,
  PencilIcon,
  EyeIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import { useAuthStore } from '../../stores'
import api from '../../services/api'

interface Course {
  id: string
  title: string
  description: string
  thumbnail: string
  price: number
  enrolledStudents: number
  rating: number
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  createdAt: string
}

interface DashboardStats {
  totalCourses: number
  totalStudents: number
  totalRevenue: number
  averageRating: number
}

const TutorDashboard: React.FC = () => {
  const { user } = useAuthStore()
  const [courses, setCourses] = useState<Course[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalCourses: 0,
    totalStudents: 0,
    totalRevenue: 0,
    averageRating: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTutorData = async () => {
      try {
        setLoading(true)
        // Fetch tutor courses
        const coursesResponse = await api.get('/courses/tutor/my-courses')
        setCourses(coursesResponse.data)

        // Fetch tutor analytics
        const analyticsResponse = await api.get('/analytics/tutor')
        setStats(analyticsResponse.data)
      } catch (error) {
        console.error('Error fetching tutor data:', error)
        // Set mock data for demo
        setCourses([
          {
            id: '1',
            title: 'Advanced React Development',
            description: 'Master React with hooks, context, and performance optimization',
            thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
            price: 99.99,
            enrolledStudents: 245,
            rating: 4.8,
            status: 'PUBLISHED',
            createdAt: '2024-01-15'
          },
          {
            id: '2',
            title: 'TypeScript Fundamentals',
            description: 'Learn TypeScript from basics to advanced concepts',
            thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
            price: 79.99,
            enrolledStudents: 189,
            rating: 4.7,
            status: 'PUBLISHED',
            createdAt: '2024-02-20'
          },
          {
            id: '3',
            title: 'Node.js Backend Development',
            description: 'Build scalable backend applications with Node.js',
            thumbnail: 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
            price: 129.99,
            enrolledStudents: 167,
            rating: 4.9,
            status: 'DRAFT',
            createdAt: '2024-03-10'
          }
        ])
        setStats({
          totalCourses: 3,
          totalStudents: 601,
          totalRevenue: 18247.67,
          averageRating: 4.8
        })
      } finally {
        setLoading(false)
      }
    }

    fetchTutorData()
  }, [])

  const handleDeleteCourse = async (courseId: string) => {
    if (window.confirm('Are you sure you want to delete this course?')) {
      try {
        await api.delete(`/courses/${courseId}`)
        setCourses(courses.filter(course => course.id !== courseId))
      } catch (error) {
        console.error('Error deleting course:', error)
      }
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
        return 'bg-green-100 text-green-800'
      case 'DRAFT':
        return 'bg-yellow-100 text-yellow-800'
      case 'ARCHIVED':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.firstName}!
          </h1>
          <p className="text-gray-600 mt-2">
            Manage your courses and track your teaching success
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BookOpenIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{stats.totalCourses}</p>
                <p className="text-gray-600 text-sm">Total Courses</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <UsersIcon className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{stats.totalStudents}</p>
                <p className="text-gray-600 text-sm">Total Students</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <CurrencyDollarIcon className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">${stats.totalRevenue.toLocaleString()}</p>
                <p className="text-gray-600 text-sm">Total Revenue</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <ChartBarIcon className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{stats.averageRating}</p>
                <p className="text-gray-600 text-sm">Avg Rating</p>
              </div>
            </div>
          </div>
        </div>

        {/* Course Management */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">My Courses</h2>
                <p className="text-gray-600 text-sm">Manage and track your course performance</p>
              </div>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transform hover:-translate-y-0.5 transition-all duration-200">
                <PlusIcon className="w-4 h-4" />
                Create Course
              </button>
            </div>
          </div>

          <div className="p-6">
            {courses.length === 0 ? (
              <div className="text-center py-12">
                <BookOpenIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No courses yet</h3>
                <p className="text-gray-600 mb-4">Create your first course to start teaching</p>
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg">
                  Create Your First Course
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Course</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Students</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Rating</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Revenue</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courses.map((course) => (
                      <tr key={course.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-4 px-4">
                          <div className="flex items-center">
                            <img
                              src={course.thumbnail}
                              alt={course.title}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                            <div className="ml-4">
                              <h3 className="font-medium text-gray-900">{course.title}</h3>
                              <p className="text-sm text-gray-600">${course.price}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(course.status)}`}>
                            {course.status}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-gray-900">{course.enrolledStudents}</td>
                        <td className="py-4 px-4">
                          <div className="flex items-center">
                            <span className="text-yellow-400">★</span>
                            <span className="ml-1 text-gray-900">{course.rating}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-gray-900">
                          ${(course.price * course.enrolledStudents).toLocaleString()}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                              <EyeIcon className="w-4 h-4" />
                            </button>
                            <button className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg">
                              <PencilIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteCourse(course.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default TutorDashboard
