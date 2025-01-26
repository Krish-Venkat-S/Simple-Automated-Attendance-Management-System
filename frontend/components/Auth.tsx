'use client';
import React, { useState, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import axiosInstance from '@/lib/axiosInstance';
import { Eye, EyeOff, Mail, Lock, User, Image, Camera } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import Cookies from 'js-cookie';
import CameraCapture from '@/components/CameraCapture';

interface AuthPageProps {
  mode?: 'login' | 'signup';
}

interface FormData {
  username: string;
  email: string;
  password: string;
  image: File | null;
}

const AuthPage: React.FC<AuthPageProps> = ({ mode = 'login' }) => {
  const isLogin = mode === 'login';
  const [formData, setFormData] = useState<FormData>({
    username: '',
    email: '',
    password: '',
    image: null,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const router = useRouter();
  const [loginAttempts, setLoginAttempts] = useState(0);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setFormData((prev) => ({ ...prev, image: file }));
  };

  const handleCameraCapture = (file: File) => {
    setFormData((prev) => ({ ...prev, image: file }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      if (isLogin) {
        const response = await axiosInstance.post('/api/auth', {
          email: formData.email,
          password: formData.password,
        });
        const { access_token, user } = response.data;
        localStorage.setItem('user', JSON.stringify(user));
        Cookies.set('token', `Bearer ${access_token}`, { expires: 30 });
        setSuccess('Login successful!');
        setLoginAttempts(0); // Reset login attempts on successful login
        setTimeout(() => router.push('/'), 2000);
      } else {
        const data = new FormData();
        Object.keys(formData).forEach((key) => {
          if (formData[key as keyof FormData] !== null) {
            data.append(key, formData[key as keyof FormData]);
          }
        });
        await axiosInstance.post('/api/users', data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setSuccess('Signup successful!');
        setTimeout(() => router.push('/login'), 2000);
      }
    } catch (err) {
      if (isLogin) {
        setLoginAttempts((prev) => prev + 1);
        if (loginAttempts >= 2) {
          await axiosInstance.post('/api/alert', { email: formData.email });
        }
        setError('Invalid email or password');
      } else {
        setError('Signup failed. Please try again.');
      }
      console.error('Error during authentication:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isLogin ? 'Sign in to your account' : 'Create your account'}
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4">
            {!isLogin && (
              <div>
                <Label htmlFor="username" className="block text-sm font-medium text-gray-700">
                  Username
                </Label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    required
                    className="pl-10 block w-full sm:text-sm"
                    placeholder="johndoe"
                    value={formData.username}
                    onChange={handleChange}
                  />
                </div>
              </div>
            )}
            <div>
              <Label htmlFor="email-address" className="block text-sm font-medium text-gray-700">
                Email address
              </Label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="pl-10 block w-full sm:text-sm"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </Label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  required
                  className="pl-10 pr-10 block w-full sm:text-sm"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-500 focus:outline-none focus:text-gray-500"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </div>
            {!isLogin && (
              <div>
                <Label htmlFor="profile-picture" className="block text-sm font-medium text-gray-700">
                  Profile Picture
                </Label>
                <div className="mt-1 space-y-2">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Image className="h-5 w-5 text-gray-400" />
                      </div>
                      <Input
                        id="profile-picture"
                        name="image"
                        type="file"
                        accept="image/*"
                        className="pl-10 block w-full sm:text-sm"
                        onChange={handleImageChange}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowCamera(true)}
                      className="flex items-center gap-2"
                    >
                      <Camera className="h-4 w-4" />
                      Take Photo
                    </Button>
                  </div>
                  {formData.image && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Selected: {formData.image.name}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {showCamera && (
              <CameraCapture
                onCapture={handleCameraCapture}
                onClose={() => setShowCamera(false)}
              />
            )}
            <div className="text-sm">
              {isLogin ? (
                <>
                  Don&apos;t have an account?{' '}
                  <a href="/signup.html" className="text-sm text-blue-600 hover:underline">
                    Sign up
                  </a>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <a href="/login.html" className="text-sm text-blue-600 hover:underline">
                    Login here
                  </a>
                </>
              )}
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert variant="default">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (isLogin ? 'Signing in...' : 'Signing up...') : isLogin ? 'Sign in' : 'Sign up'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthPage;