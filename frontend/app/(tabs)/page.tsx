'use client';

import React, { useState, useEffect } from 'react';
import { Table, TableCell, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader2, AlertTriangle, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import axiosInstance from '@/lib/axiosInstance';
import Cookies from 'js-cookie';

// Types and Interfaces
interface User {
  id: number;
  username: string;
  email: string;
  avatar: string;
}

interface Course {
  id: string;
  semester: string;
  semester_type: { value: string };
  course_code: string;
  course_name: string;
  course_type: { value: string };
  faculty_name: string;
  class_no: string;
  classroom: string;
  time_slots: string[];
  registered: boolean;
  present: number;
  total: number;
  percentage: number;
}

interface AttendanceData {
  id: string;
  classGroup: string;
  courseDetail: string;
  classDetail: string;
  facultyDetail: string;
  attendedClasses: number;
  totalClasses: number;
  attendancePercentage: number;
}

interface AttendanceReport {
  totalCourses: number;
  present: number;
  absent: number;
  averageAttendance: number;
}

interface ChartData {
  name: string;
  value: number;
  fill?: string;
}

// Type definitions for the API response
interface AttendanceRecord {
  slNo: number;
  date: string;
  slot: string;
  dayTime: string;
  status: 'Present' | 'Absent';
}

interface CourseInfo {
  id: string;
  semester: string;
  semester_type: string;
  course_code: string;
  course_name: string;
  course_type: string;
  faculty_name: string;
  class_no: string;
  classroom: string;
  time_slots: string[];
  present: number;
  total: number;
  percentage: number;
}

interface AttendanceDetailResponse {
  courseInfo: CourseInfo;
  records: AttendanceRecord[];
}

interface AttendanceOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  data: AttendanceDetailResponse | null;
}

const AttendanceOverlay: React.FC<AttendanceOverlayProps> = ({ isOpen, onClose, data }) => {
  if (!data) return null; // Ensure data is not null before rendering

  console.log(data);
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Attendance Detail</DialogTitle>
        </DialogHeader>

        {/* Course Information */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="space-y-2">
            <p className="text-sm font-medium">Course: {data.courseInfo.course_name}</p>
            <p className="text-sm font-medium">Class: {data.courseInfo.class_no}</p>
            <p className="text-sm font-medium">Faculty: {data.courseInfo.faculty_name}</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm">Semester: {data.courseInfo.semester}</p>
            <p className="text-sm">Type: {data.courseInfo.course_type}</p>
            <p className="text-sm">Classroom: {data.courseInfo.classroom}</p>
          </div>
        </div>

        {/* Statistics */}
        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium">Present: {data.courseInfo.present}</p>
              <p className="text-sm font-medium">Total: {data.courseInfo.total}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-green-600">
                Percentage: {data.courseInfo.percentage}%
              </p>
            </div>
          </div>
        </div>

        {/* Attendance Records Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sl.No.</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Slot</TableHead>
              <TableHead>Day / Time</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.records.map((record) => (
              <TableRow key={record.slNo}>
                <TableCell>{record.slNo}</TableCell>
                <TableCell>{record.date}</TableCell>
                <TableCell>{record.slot}</TableCell>
                <TableCell>{record.dayTime}</TableCell>
                <TableCell className={record.status === 'Absent' ? 'text-red-500' : 'text-green-500'}>
                  {record.status}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
};

const Home: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [courses, setCourses] = useState<AttendanceData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [attendanceReport, setAttendanceReport] = useState<AttendanceReport | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [attendanceData, setAttendanceData] = useState<AttendanceDetailResponse | null>(null);

  const handleOpenOverlay = async (course_id: string) => {

    setIsOpen(true);
    try {
      const response = await axiosInstance.get<AttendanceDetailResponse>(`/api/attendance/course/${course_id}/user/${user?.id}`);
      setAttendanceData(response.data);
    } catch (error) {
      console.error('Failed to fetch attendance data:', error);
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser) as User;
      setUser(parsedUser);
    }
    const token = Cookies.get('token');
    if (token) {
      axiosInstance.defaults.headers.common['Authorization'] = token;
    } else {
      window.location.href = '/login.html';
    }
  }, []);

  useEffect(() => {
    if (!user) return; // Add this check to ensure user is not null

    console.log('Updated user:', user);
    const fetchData = async () => {
      try {
        // Fetch registered courses
        const coursesResponse = await axiosInstance.get<Course[]>(`/api/attendance/user/${user.id}`);

        const courseArray = coursesResponse.data;
        console.log(courseArray);

        const coursesMap: AttendanceData[] = courseArray.map((course) => ({
          id: course.id,
          classGroup: course.semester,
          courseDetail: `${course.course_code} - ${course.course_name}`,
          classDetail: `${course.class_no} - ${course.classroom} - ${course.time_slots.join(', ')}`,
          facultyDetail: `${course.faculty_name}`,
          attendedClasses: course.present,
          totalClasses: course.total,
          attendancePercentage: course.percentage,
        }));


        setCourses(coursesMap);

        // Generate attendance report
        const totalCourses = coursesMap.length;
        const totalClasses = coursesMap.reduce((sum, course) => sum + course.totalClasses, 0);
        const totalAttended = coursesMap.reduce((sum, course) => sum + course.attendedClasses, 0);
        const averageAttendance = Math.round((totalAttended / totalClasses) * 100);

        setAttendanceReport({
          totalCourses,
          present: totalAttended,
          absent: totalClasses - totalAttended,
          averageAttendance,
        });

        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data. Please try again later.');
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const reportData: ChartData[] = attendanceReport ? [
    { name: 'Present', value: attendanceReport.present, fill: '#22C55E' },
    { name: 'Absent', value: attendanceReport.absent, fill: '#EF4444' },
  ] : [];

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            {user && (
              <div className="text-sm text-gray-600">
                Welcome, {user.username}
              </div>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Total Courses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{attendanceReport?.totalCourses || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Classes Attended</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{attendanceReport?.present || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Classes Missed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{attendanceReport?.absent || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Average Attendance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {attendanceReport?.averageAttendance || 0}%
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Attendance Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Course-wise Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course</TableHead>
                      <TableHead>Class Details</TableHead>
                      <TableHead>Faculty</TableHead>
                      <TableHead>Attendance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {courses.map((course) => {
                      return (
                        <TableRow key={course.id}>
                          <TableCell className="font-medium">{course.courseDetail}</TableCell>
                          <TableCell>{course.classDetail}</TableCell>
                          <TableCell>{course.facultyDetail}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div
                                  className={`h-2.5 rounded-full ${course.attendancePercentage >= 75 ? 'bg-green-600' : 'bg-red-600'
                                    }`}
                                  style={{ width: `${course.attendancePercentage}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium">
                                {course.attendancePercentage}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {course.attendancePercentage < 75 && (
                              <div className="flex items-center gap-2 text-red-600">
                                <AlertTriangle className="h-4 w-4" />
                                <span className="text-sm">Low Attendance</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="flex items-center gap-2"
                              onClick={() => handleOpenOverlay(course.id)}
                            >
                              <Eye className="h-4 w-4" />
                              View Details
                            </Button>

                            <div>
                              {attendanceData && (
                                <AttendanceOverlay isOpen={isOpen} onClose={() => setIsOpen(false)} data={attendanceData} />
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Home;