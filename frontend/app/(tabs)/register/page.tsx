'use client';

import React, { useState, useEffect } from 'react';
import { Table, TableCell, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader2 } from 'lucide-react';
import axiosInstance from '@/lib/axiosInstance';
import Cookies from 'js-cookie';


interface Course {
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
  registered: boolean;
}

interface CourseReport {
  totalCourses: number;
  registeredCourses: number;
  availableCourses: number;
}

interface User {
  id: number;
  username: string;
}

interface ChartData {
  name: string;
  value: number;
}


  const CourseRegistration: React.FC = () => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [courseReport, setCourseReport] = useState<CourseReport | null>(null);
    const [user, setUser] = useState<User | null>(null);
  
    useEffect(() => {
      const token = Cookies.get('token');
      if (token) {
        axiosInstance.defaults.headers.common['Authorization'] = token;
      } else {
        window.location.href = '/login.html';
      }
  
      const getUserFromStorage = (): User | null => {
        const userStr = localStorage.getItem('user');
        console.log(userStr);
        if (!userStr) return null;
        try {
          return JSON.parse(userStr) as User;
        } catch (error) {
          console.error('Error parsing user from localStorage:', error);
          return null;
        }
      };
      

      setUser(getUserFromStorage());
  
      const fetchData = async () => {
        try {
          const coursesResponse = await axiosInstance.get<Course[]>('/api/courses');
          const courseArray = coursesResponse.data;
  
          setCourses(courseArray);
  
          // Generate course report data
          const totalCourses = courseArray.length;
          const registeredCourses = courseArray.filter(course => course.registered).length;
          const availableCourses = totalCourses - registeredCourses;
  
          setCourseReport({
            totalCourses,
            registeredCourses,
            availableCourses,
          });
  
          setLoading(false);
        } catch (err) {
          console.error('Error fetching data:', err);
          setError('Error fetching data');
          setLoading(false);
        }
      };
  
      fetchData();
    }, [setUser]);
    const formatTimeSlots = (timeSlots: string[]) => {
      return timeSlots.sort().join('+');
    }
  const handleRegister = async (courseId: string) => {
    if (!user) {
      setError('Please log in to register for courses.');
      return;
    }

    try {
     const data = {
      user_id: user.id,
      course_id: courseId,
    };
    
    await axiosInstance.post('/api/registrations', data);

      setCourses(courses.map(course =>
        course.id === courseId ? { ...course, registered: true } : course
      ));

      setCourseReport(prev => {
        if (!prev) return null;
        return {
          ...prev,
          registeredCourses: prev.registeredCourses + 1,
          availableCourses: prev.availableCourses - 1,
        };
      });

    } catch (err) {
      console.error('Error registering for course:', err);
      setError('Failed to register for the course. Please try again later.');
    }
  };

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

  const reportData: ChartData[] = courseReport ? [
    { name: 'Total Courses', value: courseReport.totalCourses },
    { name: 'Registered', value: courseReport.registeredCourses },
    { name: 'Available', value: courseReport.availableCourses },
  ] : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6 text-gray-900">FFCS</h1>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Total Courses</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">
                {courseReport?.totalCourses || 0}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Registered Courses</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">
                {courseReport?.registeredCourses || 0}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Available Courses</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">
                {courseReport?.availableCourses || 0}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Course Statistics</CardTitle>
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
            <CardTitle>Available Courses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course Code</TableHead>
                    <TableHead>Course Name</TableHead>
                    <TableHead>Faculty</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courses.map((course) => (
                    <TableRow key={course.id}>
                      <TableCell className="font-medium">{course.course_code}</TableCell>
                      <TableCell>{course.course_name}</TableCell>
                      <TableCell>{course.faculty_name}</TableCell>
                      <TableCell>{course.classroom}</TableCell>
                      <TableCell>{formatTimeSlots(course.time_slots)}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-sm ${
                          course.registered 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {course.registered ? 'Registered' : 'Available'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          onClick={() => handleRegister(course.id)}
                          disabled={course.registered}
                          variant={course.registered ? "outline" : "default"}
                          className={course.registered ? "cursor-not-allowed" : ""}
                        >
                          {course.registered ? 'Enrolled' : 'Register'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CourseRegistration;