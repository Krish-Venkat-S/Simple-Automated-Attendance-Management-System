import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/login.html', request.url));
  }

  if (token) {
    if (request.nextUrl.pathname === '/biometrics') {
      return NextResponse.redirect(new URL('/', request.url));
    }
    if (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // Optionally, you can add token validation logic here

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|login|signup|biometrics|models|public|sns).*)'],
};