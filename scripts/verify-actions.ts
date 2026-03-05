 
import 'dotenv/config';
import { encode } from 'next-auth/jwt';
import { prisma } from '../lib/prisma';

async function run() {
  const secret = process.env.NEXTAUTH_SECRET || 'test';
  const baseUrl = 'http://localhost:3001';
  
  // 1. Setup a test user
  let user = await prisma.user.findFirst({ where: { email: 'action-tester@example.com' } });
  if (!user) {
    user = await prisma.user.create({
      data: { name: 'Action Tester', email: 'action-tester@example.com', role: 'USER' }
    });
  }
  
  const token = await encode({
    token: { id: user.id, role: user.role, name: user.name, email: user.email },
    secret,
    salt: 'authjs.session-token',
  });
  
  const headers = { 'Cookie': `authjs.session-token=${token}`, 'Content-Type': 'application/json' };
  
  console.log('--- ACTION BUTTONS VERIFICATION REPORT ---');
  
  // Find a target trip not owned by this test user
  const otherTrips = await prisma.trip.findMany({
    where: { 
      userId: { not: user.id },
      isPublic: true,
      deletedAt: null
    },
    take: 1
  });
  
  if (otherTrips.length === 0) {
    console.error('No public trips from other users found to test against. Make sure standard seed data exists.');
    process.exit(1);
  }
  
  const targetTrip = otherTrips[0];
  const slug = targetTrip.slug;
  console.log(`Target Trip: ${slug} (Owned by ${targetTrip.userId}, Tester is ${user.id})`);
  
  // Reset any existing saved state
  await fetch(`${baseUrl}/api/trips/${slug}/save`, { method: 'DELETE', headers });

  // TEST: POST Bookmark
  let res = await fetch(`${baseUrl}/api/trips/${slug}/save`, { method: 'POST', headers });
  console.log(`[Bookmark POST   /api/trips/${slug}/save] Expected: 201 | Actual: HTTP ${res.status}`);

  // TEST: DELETE Bookmark
  res = await fetch(`${baseUrl}/api/trips/${slug}/save`, { method: 'DELETE', headers });
  console.log(`[Bookmark DELETE /api/trips/${slug}/save] Expected: 200 | Actual: HTTP ${res.status}`);

  // TEST: POST Duplicate
  res = await fetch(`${baseUrl}/api/trips/${slug}/duplicate`, { method: 'POST', headers });
  const dupData = await res.json();
  console.log(`[Duplicate POST  /api/trips/${slug}/duplicate] Expected: 201 | Actual: HTTP ${res.status}`);
  if (res.status === 201 && dupData.slug) {
    console.log(` -> Successfully duplicated to new slug: ${dupData.slug}`);
    
    // Clean up duplicated trip so tests remain idempotent
    await prisma.trip.delete({ where: { slug: dupData.slug } });
    console.log(' -> Cleaned up duplicate trip from database.');
  }

  process.exit(0);
}

run().catch(console.error);
