import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function run() {
  const ts = Date.now();
  const email = `test${ts}@example.com`;
  
  // Create user
  const user = await prisma.user.create({
    data: {
      name: 'Test Setup User',
      email,
      role: 'USER',
    }
  });

  // Since next-auth with JWT strategy usually uses JWE/JWS cookies (authjs.session-token),
  // inserting a Session record won't work easily if strategy is 'jwt' (which it is in lib/auth.ts).
  // Wait, strategy is 'jwt' in lib/auth.ts:
  // session: { strategy: 'jwt' }
  // So a DB session is ignored. We need a valid JWT.
  // Instead of mocking the token, we can just temporarily add a test-only route,
  // or use the auth() mock if we write a simple Next.js API route that does it?
  
  console.log('User created:', user.id);
}
run();
