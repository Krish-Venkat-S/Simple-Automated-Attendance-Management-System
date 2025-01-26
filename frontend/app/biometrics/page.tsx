'use client';
import React, { useRef, useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import axiosInstance from '@/lib/axiosInstance';

export default function SimpleAttendance() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [courseName, setCourseName] = useState('');
  const [courses, setCourses] = useState([]);
  const [message, setMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch courses list
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await axiosInstance.get('/api/courselist');
        setCourses(response.data);
      } catch (err) {
        setMessage('Failed to load courses');
      }
    };
    fetchCourses();
  }, []);

  // Initialize video dimensions
  useEffect(() => {
    if (containerRef.current) {
      const width = containerRef.current.offsetWidth;
      const height = width * (4 / 3); // 4:3 aspect ratio
      
      if (videoRef.current) {
        videoRef.current.width = width;
        videoRef.current.height = height;
      }
      if (canvasRef.current) {
        canvasRef.current.width = width;
        canvasRef.current.height = height;
      }
    }
  }, []);

  // Start video stream
  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', frameRate: { ideal: 30 }, aspectRatio: 4/3 } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => videoRef.current?.play();
      }
    } catch (err) {
      setMessage('Failed to access camera. Ensure permissions are granted.');
    }
  };

  useEffect(() => {
    startVideo();
  }, []);

  // Handle attendance submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!courseName) return;

    try {
      setIsProcessing(true);
      const context = canvasRef.current.getContext('2d');
      context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);

      const blob = await new Promise(resolve => canvasRef.current.toBlob(resolve, 'image/jpeg', 0.95));
      const formData = new FormData();
      formData.append('image', blob);
      formData.append('course_name', courseName);

      const response = await axiosInstance.post('/api/attendance', formData);
      if (response.data.status === 'success')
        setMessage(`Attendance marked: ${response.data.user}`);
      else
        setMessage(`Attendance not marked: ${response.data.message}`);
    } catch (err) {
      setMessage('Attendance processing failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <Card className="max-w-xl mx-auto">
        <CardHeader>
          <CardTitle>Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          {message && <Alert><AlertDescription>{message}</AlertDescription></Alert>}
          <form onSubmit={handleSubmit}>
            <Select value={courseName} onValueChange={setCourseName}>
              <SelectTrigger><SelectValue placeholder="Select a course" /></SelectTrigger>
              <SelectContent>
                {courses.map(course => <SelectItem key={course} value={course}>{course}</SelectItem>)}
              </SelectContent>
            </Select>
            <div ref={containerRef} className="relative bg-black mx-auto max-w-sm" style={{ aspectRatio: '4/3' }}>
              <video ref={videoRef} autoPlay muted className="absolute w-full h-full object-cover" />
              <canvas ref={canvasRef} className="absolute w-full h-full" />
            </div>
            <Button type="submit" disabled={isProcessing}>
              {isProcessing ? 'Processing...' : 'Mark Attendance'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}