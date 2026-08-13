export default async function middleware(request) {
  const { pathname } = request.nextUrl;
  if (pathname !== '/invitation') return;
  return new Response('MIDDLEWARE-OK', { headers: { 'Content-Type': 'text/plain' } });
}

export const config = {
  matcher: ['/invitation']
};