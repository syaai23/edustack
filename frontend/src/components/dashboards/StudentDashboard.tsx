import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpenIcon,
  ClockIcon,
  TrophyIcon,
  ChartBarIcon,
  PlayIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore, useCourseStore } from '../../stores';

interface Enrollment {
  id: string;
  course: {
    id: string;
    title: string;
    image: string;
    tutor: {
      firstName: string;
      lastName: string;
    };
  };
  progress: number;
  completedLessons: number;
  totalLessons: number;
  lastAccessedAt: string;
  enrolledAt: string;
}

const StudentDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const { courses, fetchCourses } = useCourseStore();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [stats, setStats] = useState({
    totalCourses: 0,
    completedCourses: 0,
    totalHours: 0,
    streak: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch enrollments
        const enrollmentResponse = await fetch('http://localhost:3000/api/enrollments/my', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });
        
        if (enrollmentResponse.ok) {
          const enrollmentData = await enrollmentResponse.json();
          setEnrollments(enrollmentData);
          
          // Calculate stats
          const completed = enrollmentData.filter((e: Enrollment) => e.progress === 100).length;
          setStats({
            totalCourses: enrollmentData.length,
            completedCourses: completed,
            totalHours: enrollmentData.reduce((acc: number, e: Enrollment) => acc + (e.completedLessons * 0.5), 0),
            streak: 7, // This would come from backend
          });
        }
        
        // Fetch recommended courses
        await fetchCourses({ limit: 6 });
        
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [fetchCourses]);

  const recentEnrollments = enrollments
    .sort((a, b) => new Date(b.lastAccessedAt).getTime() - new Date(a.lastAccessedAt).getTime())
    .slice(0, 4);

  const recommendedCourses = courses.slice(0, 4);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.firstName}! 👋
          </h1>
          <p className="text-gray-600 mt-2">
            Continue your learning journey and achieve your goals
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Enrolled Courses</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalCourses}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <BookOpenIcon className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.completedCourses}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrophyIcon className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Learning Hours</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{Math.round(stats.totalHours)}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <ClockIcon className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Streak</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.streak} days</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <ChartBarIcon className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Recent Courses */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Continue Learning</h2>
                <Link
                  to="/my-courses"
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                >
                  View all
                </Link>
              </div>
              
              {recentEnrollments.length > 0 ? (
                <div className="space-y-4">
                  {recentEnrollments.map((enrollment) => (
                    <div
                      key={enrollment.id}
                      className="flex items-center p-4 border border-gray-100 rounded-lg hover:border-blue-200 transition-colors"
                    >
                      <img
                        src={enrollment.course.image}
                        alt={enrollment.course.title}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                      <div className="ml-4 flex-1">
                        <h3 className="font-medium text-gray-900 mb-1">
                          {enrollment.course.title}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">
                          by {enrollment.course.tutor.firstName} {enrollment.course.tutor.lastName}
                        </p>
                        <div className="flex items-center">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 mr-3">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${enrollment.progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 font-medium">
                            {enrollment.progress}%
                          </span>
                        </div>
                      </div>
                      <Link
                        to={`/course/${enrollment.course.id}/learn`}
                        className="ml-4 p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                      >
                        <PlayIcon className="w-5 h-5" />
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <BookOpenIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No courses yet</h3>
                  <p className="text-gray-600 mb-6">Start your learning journey by enrolling in a course</p>
                  <Link
                    to="/courses"
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Browse Courses
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Recommended Courses */}
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Recommended for You</h2>
                <Link
                  to="/courses"
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                >
                  View all
                </Link>
              </div>
              
              <div className="space-y-4">
                {recommendedCourses.map((course) => (
                  <div key={course.id} className="border border-gray-100 rounded-lg p-4 hover:border-blue-200 transition-colors">
                    <img
                      src={course.image}
                      alt={course.title}
                      className="w-full h-32 object-cover rounded-lg mb-3"
                    />
                    <h3 className="font-medium text-gray-900 mb-1 line-clamp-2">
                      {course.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      by {course.tutor?.firstName} {course.tutor?.lastName}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex items-center mr-2">
                          <StarIcon className="w-4 h-4 text-yellow-400 fill-current" />
                          <span className="text-sm text-gray-600 ml-1">{course.rating}</span>
                        </div>
                        <span className="text-sm text-gray-500">
                          ({course.studentsCount})
                        </span>
                      </div>
                      <span className="font-bold text-blue-600">
                        ${course.price}
                      </span>
                    </div>
                    <Link
                      to={`/course/${course.id}`}
                      className="block mt-3 w-full bg-blue-600 text-white text-center py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      Enroll Now
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
