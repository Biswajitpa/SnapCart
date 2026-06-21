import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/auth'

export default async function middleware(request: NextRequest) {
  const session = await auth()
  const { pathname } = request.nextUrl

  // 🎯 If someone lands on the root '/' page and isn't logged in, send them straight to login
  if (!session && pathname === '/') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

// 🚀 Matcher array to make sure static images and Next.js internal folders are left alone
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
