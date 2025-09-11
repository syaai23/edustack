import React, { useEffect, useState } from 'react'
import { 
  UsersIcon, 
  BookOpenIcon, 
  ChartBarIcon, 
  CurrencyDollarIcon,
  AcademicCapIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  PencilIcon,
  EyeIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import { useAuthStore } from '../../stores'
import api from '../../services/api'

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  role: 'STUDENT' | 'TUTOR' | 'ADMIN'
  isActive: boolean
  createdAt: string
}

interface DashboardStats {
  totalUsers: number
  totalCourses: number
  totalRevenue: number
  activeEnrollments: number
}

const AdminDashboard: React.FC = () => {
  const { user } = useAuthStore()
  const [users, setUsers] = useState<User[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalCourses: 0,
    totalRevenue: 0,
    activeEnrollments: 0
  })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'courses' | 'reports'>('overview')

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        setLoading(true)
        // Fetch admin analytics
        const analyticsResponse = await api.get('/analytics/admin')
        setStats(analyticsResponse.data)

        // Fetch all users
        const usersResponse = await api.get('/admin/users')
        setUsers(usersResponse.data)
      } catch (error) {
        console.error('Error fetching admin data:', error)
        // Set mock data for demo
        setUsers([
          {
            id: '1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            role: 'STUDENT',
            isActive: true,
            createdAt: '2024-01-15'
          },
          {
            id: '2',
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane.smith@example.com',
            role: 'TUTOR',
            isActive: true,
            createdAt: '2024-02-20'
          },
          {
            id: '3',
            firstName: 'Bob',
            lastName: 'Johnson',
            email: 'bob.johnson@example.com',
            role: 'STUDENT',
            isActive: false,
            createdAt: '2024-03-10'
          }
        ])
        setStats({
          totalUsers: 50234,
          totalCourses: 1847,
          totalRevenue: 892456.78,
          activeEnrollments: 15789
        })
      } finally {
        setLoading(false)
      }
    }

    fetchAdminData()
  }, [])

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await api.put(`/admin/users/${userId}/toggle-status`)
      setUsers(users.map(user => 
        user.id === userId ? { ...user, isActive: !currentStatus } : user
      ))
    } catch (error) {
      console.error('Error toggling user status:', error)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await api.delete(`/admin/users/${userId}`)
        setUsers(users.filter(user => user.id !== userId))
      } catch (error) {
        console.error('Error deleting user:', error)
      }
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-100 text-red-800'
      case 'TUTOR':
        return 'bg-blue-100 text-blue-800'
      case 'STUDENT':
        return 'bg-green-100 text-green-800'
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
            Admin Dashboard
          </h1>
          <p className="text-gray-600 mt-2">
            Manage platform users, courses, and system settings
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', name: 'Overview', icon: ChartBarIcon },
              { id: 'users', name: 'Users', icon: UsersIcon },
              { id: 'courses', name: 'Courses', icon: BookOpenIcon },
              { id: 'reports', name: 'Reports', icon: ExclamationTriangleIcon }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <UsersIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-gray-900">{stats.totalUsers.toLocaleString()}</p>
                    <p className="text-gray-600 text-sm">Total Users</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <BookOpenIcon className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-gray-900">{stats.totalCourses.toLocaleString()}</p>
                    <p className="text-gray-600 text-sm">Total Courses</p>
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
                    <AcademicCapIcon className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-gray-900">{stats.activeEnrollments.toLocaleString()}</p>
                    <p className="text-gray-600 text-sm">Active Enrollments</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center gap-3">
                    <PlusIcon className="w-5 h-5 text-blue-600" />
                    <span>Add New User</span>
                  </button>
                  <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center gap-3">
                    <BookOpenIcon className="w-5 h-5 text-green-600" />
                    <span>Review Pending Courses</span>
                  </button>
                  <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center gap-3">
                    <ChartBarIcon className="w-5 h-5 text-purple-600" />
                    <span>Generate Reports</span>
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">New user registration</p>
                      <p className="text-xs text-gray-600">2 minutes ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Course published</p>
                      <p className="text-xs text-gray-600">15 minutes ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                    <div className="w-2 h-2 bg-yellow-600 rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Payment processed</p>
                      <p className="text-xs text-gray-600">1 hour ago</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">User Management</h2>
                  <p className="text-gray-600 text-sm">Manage platform users and their permissions</p>
                </div>
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transform hover:-translate-y-0.5 transition-all duration-200">
                  <PlusIcon className="w-4 h-4" />
                  Add User
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">User</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Role</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Created</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-4 px-4">
                          <div>
                            <h3 className="font-medium text-gray-900">{user.firstName} {user.lastName}</h3>
                            <p className="text-sm text-gray-600">{user.email}</p>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-gray-900">
                          {new Date(user.createdAt).toLocaleDateString()}
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
                              onClick={() => handleToggleUserStatus(user.id, user.isActive)}
                              className={`p-2 rounded-lg ${
                                user.isActive 
                                  ? 'text-red-600 hover:bg-red-50' 
                                  : 'text-green-600 hover:bg-green-50'
                              }`}
                              title={user.isActive ? 'Deactivate user' : 'Activate user'}
                            >
                              {user.isActive ? '🚫' : '✅'}
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id)}
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
            </div>
          </div>
        )}

        {/* Placeholder tabs */}
        {(activeTab === 'courses' || activeTab === 'reports') && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="text-6xl mb-4">🚧</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {activeTab === 'courses' ? 'Course Management' : 'Reports & Analytics'}
            </h3>
            <p className="text-gray-600">
              This section is under development and will be available soon.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminDashboard
