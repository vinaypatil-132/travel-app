import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const start = Date.now();
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith('/dashboard')) {
    const v5Token = request.cookies.get('authjs.session-token');
    const v5SecureToken = request.cookies.get('__Secure-authjs.session-token');
    const v4Token = request.cookies.get('next-auth.session-token');
    const v4SecureToken = request.cookies.get('__Secure-next-auth.session-token');
    
    const token = v5Token || v5SecureToken || v4Token || v4SecureToken;
    
    console.log(`[PROXY] Accessing protected route: ${pathname}`);
    console.log(`[PROXY] AuthJS Token: ${!!v5Token} | AuthJS Secure: ${!!v5SecureToken} | Legacy: ${!!v4Token}`);
    
    if (!token) {
      console.log(`[PROXY] ❌ No auth token found. Redirecting ${pathname} -> /login`);
      return NextResponse.redirect(new URL('/login', request.url));
    } else {
      console.log(`[PROXY] ✅ Token validated. Allowing access to ${pathname}`);
    }
  }

  const response = NextResponse.next();

  const method = request.method;
  const duration = Date.now() - start;

  const log = {
    timestamp: new Date().toISOString(),
    method,
    pathname,
    duration_ms: duration,
  };

  console.log(JSON.stringify(log));

  return response;
}

export const config = {
  matcher: ['/api/:path*', '/dashboard/:path*'],
};
