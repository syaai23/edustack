import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../stores'
import StudentDashboard from './dashboards/StudentDashboard'
import TutorDashboard from './dashboards/TutorDashboard'
import AdminDashboard from './dashboards/AdminDashboard'

export const DashboardRouter: React.FC = () => {
  const { user } = useAuthStore()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  switch (user.role) {
    case 'STUDENT':
      return <StudentDashboard />
    case 'TUTOR':
      return <TutorDashboard />
    case 'ADMIN':
      return <AdminDashboard />
    default:
      return <Navigate to="/" replace />
  }
}
