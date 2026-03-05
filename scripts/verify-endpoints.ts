import 'dotenv/config';
import { encode } from 'next-auth/jwt';
import { prisma } from '../lib/prisma';
// 

async function run() {
  const secret = process.env.NEXTAUTH_SECRET || 'test';
  const baseUrl = 'http://localhost:3001';
  
  // Create or get a real user from the DB
  let user = await prisma.user.findFirst({ where: { email: 'curl-tester@example.com' } });
  if (!user) {
    user = await prisma.user.create({
      data: { name: 'Curl Tester', email: 'curl-tester@example.com', role: 'USER' }
    });
  }
  
  const token = await encode({
    token: { id: user.id, role: user.role, name: user.name, email: user.email },
    secret,
    salt: 'authjs.session-token',
  });
  
  const headers = { 'Cookie': `authjs.session-token=${token}`, 'Content-Type': 'application/json' };
  
  console.log('--- VERIFICATION REPORT ---');
  
  const tripRes = await fetch(`${baseUrl}/api/trips?limit=10`);
  const data = await tripRes.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const targetTrip = data.trips?.find((t: any) => t.user?.id !== user?.id) || data.trips?.[0];
  const slug = targetTrip?.slug || 'goa-trip-test';
  console.log(`Target Trip: ${slug}`);
  
  await fetch(`${baseUrl}/api/trips/${slug}/save`, { method: 'DELETE', headers });

  let res = await fetch(`${baseUrl}/api/trips/${slug}/save`, { method: 'POST', headers });
  console.log(`[POST   /api/trips/${slug}/save] Expected: 201 | Actual: HTTP ${res.status}`);

  res = await fetch(`${baseUrl}/api/trips/${slug}/save`, { method: 'POST', headers });
  console.log(`[POST   /api/trips/${slug}/save] Expected: 409 | Actual: HTTP ${res.status} (Duplicate)`);

  res = await fetch(`${baseUrl}/api/user/saved`, { headers });
  const savedData = await res.json();
  const count = savedData.trips?.length || 0;
  console.log(`[GET    /api/user/saved] Expected 200 | Actual: HTTP ${res.status} | Saved count: ${count}`);

  res = await fetch(`${baseUrl}/api/trips/${slug}/save`, { method: 'DELETE', headers });
  console.log(`[DELETE /api/trips/${slug}/save] Expected: 200 | Actual: HTTP ${res.status}`);

  res = await fetch(`${baseUrl}/api/trips/${slug}/save`, { method: 'DELETE', headers });
  console.log(`[DELETE /api/trips/${slug}/save] Expected: 404 | Actual: HTTP ${res.status} (Not Found)`);

  console.log('\n--- SITEMAP VERIFICATION ---');
  res = await fetch(`${baseUrl}/sitemap.xml`);
  const xml = await res.text();
  console.log(`[GET /sitemap.xml] Generated valid XML: ${xml.startsWith('<?xml')}`);
  console.log(`Has trips? ${xml.includes('/trip/')}`);
  console.log(`Has locations? ${xml.includes('/locations/')}`);
  
  process.exit(0);
}

run().catch(console.error);
