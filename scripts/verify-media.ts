/* eslint-disable @typescript-eslint/no-explicit-any */
import 'dotenv/config';
import { encode } from 'next-auth/jwt';
import { prisma } from '../lib/prisma';

async function run() {
  const secret = process.env.NEXTAUTH_SECRET || 'test';
  const baseUrl = 'http://localhost:3001';
  
  // Setup tester
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
  
  console.log('--- PHASE 2.5 MEDIA SYSTEM VERIFICATION ---');
  
  // 1. Setup a dummy trip for the tester
  let trip = await prisma.trip.findFirst({ where: { userId: user.id, title: 'Media Test Trip' } });
  const location = await prisma.location.findFirst();
  
  if (!trip && location) {
    trip = await prisma.trip.create({
      data: {
        title: 'Media Test Trip',
        slug: 'media-test-trip-' + Date.now(),
        userId: user.id,
        locationId: location.id,
        isPublic: true
      }
    });
  }

  if (!trip) {
     console.error("No trips available for media test setup.");
     process.exit(1);
  }

  const slug = trip.slug;
  console.log(`Target Trip: ${slug}`);

  // TEST 1: POST to Media Endpoint
  console.log(`\\n[POST /api/trips/${slug}/media] Creating mock media...`);
  let res = await fetch(`${baseUrl}/api/trips/${slug}/media`, { 
    method: 'POST', 
    headers,
    body: JSON.stringify({
      url: 'https://f005.backblazeb2.com/file/travel-blueprint/mock-image.jpg',
      mediaType: 'IMAGE',
      caption: 'Sunset at the beach'
    })
  });
  
  const contentType = res.headers.get('content-type');
  let responseData: any = {};
  
  if (contentType && contentType.includes('application/json')) {
    responseData = await res.json();
  } else {
    const text = await res.text();
    console.error('Received non-JSON response:', text.substring(0, 500));
    responseData = { error: 'Invalid response format' };
  }
  
  console.log(`Expected: 201 | Actual: HTTP ${res.status}`);
  
  if (res.status !== 201 || !responseData.media?.id) {
    console.error(`Failed to create trip media record. Server Error: ${responseData.error || JSON.stringify(responseData)}`);
    process.exit(1);
  }
  
  const mediaId = responseData.media.id;
  console.log(` -> Media ID Created: ${mediaId}`);

  // TEST 2: GET from Global Gallery Endpoint
  console.log(`\\n[GET /api/user/gallery] Fetching global user gallery...`);
  res = await fetch(`${baseUrl}/api/user/gallery`, { method: 'GET', headers });
  const galleryData = await res.json();
  console.log(`Expected: 200 | Actual: HTTP ${res.status}`);
  
  const foundInGallery = galleryData.items?.some((i: any) => i.id === mediaId);
  console.log(` -> Found media in gallery payload: ${foundInGallery}`);

  // TEST 3: DELETE Media Endpoint
  console.log(`\\n[DELETE /api/trips/${slug}/media/${mediaId}] Triggering Backblaze cleanup...`);
  res = await fetch(`${baseUrl}/api/trips/${slug}/media/${mediaId}`, { method: 'DELETE', headers });
  console.log(`Expected: 200 | Actual: HTTP ${res.status}`);

  console.log('\\n--- VERIFICATION COMPLETE ---');
  process.exit(0);
}

run().catch(console.error);
