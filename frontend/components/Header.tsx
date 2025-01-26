'use client';
import React, { useState, useEffect } from 'react';
import { Bell, LogOut } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import Cookies from 'js-cookie';
import Link from 'next/link';

const Header = () => {
    const [notifications] = useState([
      { id: 1, message: "New message from John", time: "5m ago" },
      { id: 2, message: "Your post was liked", time: "1h ago" },
      { id: 3, message: "Welcome to our platform!", time: "2h ago" },
    ]);
  
    const [user, setUser] = useState({});
  
    useEffect(() => {
      if (typeof window !== 'undefined') {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      }
    }, []);
  
    const handleLogout = () => {
      if (typeof window !== 'undefined') {
        localStorage.clear();
        Cookies.remove('token');
        window.location.href = '/login.html';
      }
    };

  return (
    <header className="border-b border-gray-200 bg-white shadow-sm">
      <div className="h-16 px-4 flex items-center justify-between">
        {/* Logo and Register Button */}
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center">
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
              Swift
            </span>
          </Link>
          <Button variant="outline" asChild className="hover:bg-blue-50 hover:text-blue-600">
            <a href="/register.html">Enroll course</a>
          </Button>
        </div>

        {/* Notifications and Profile */}
        <div className="flex items-center gap-4">
          {/* Notifications Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative hover:bg-blue-50">
                <Bell className="h-5 w-5 text-gray-600" />
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0"
                >
                  {notifications.length}
                </Badge>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="p-2">
                <h3 className="font-semibold mb-2 text-gray-900">Notifications</h3>
                <div className="space-y-1">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="p-2 hover:bg-gray-50 rounded-md transition-colors"
                    >
                      <p className="text-sm text-gray-700">{notification.message}</p>
                      <span className="text-xs text-gray-400">{notification.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative hover:bg-blue-50 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={process.env.NEXT_PUBLIC_API_URL+'/dp/'+user.avatar} alt={user.name} />
                  <AvatarFallback className="bg-blue-100 text-blue-600">
                    {user.username?.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="p-2 border-b border-gray-200">
                <p className="font-medium text-gray-900">{user.name}</p>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
              <DropdownMenuItem 
                className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer mt-1"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Header;