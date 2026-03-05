/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */
const http = require('http');

async function test() {
  const baseUrl = 'http://localhost:3001';
  
  // 1. Get CSRF Token
  let res = await fetch(`${baseUrl}/api/auth/csrf`);
  const csrfData = await res.json();
  const csrfToken = csrfData.csrfToken;
  let cookies = res.headers.get('set-cookie');
  let csrfCookie = cookies ? cookies.split(';').find(c => c.includes('authjs.csrf-token')) : '';
  
  // 2. Register a new user
  const ts = Date.now();
  const email = `test${ts}@example.com`;
  await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Curl Tester', email, password: 'password123' })
  });

  // 3. Login
  res = await fetch(`${baseUrl}/api/auth/callback/credentials?json=true`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': csrfCookie || ''
    },
    body: `email=${encodeURIComponent(email)}&password=password123&csrfToken=${encodeURIComponent(csrfToken)}`
  });
  
  cookies = res.headers.get('set-cookie') || '';
  const sessionCookieMatch = cookies.match(/authjs\.session-token=([^;]+)/);
  if (!sessionCookieMatch) {
    console.error('Failed to get session cookie');
    return;
  }
  const sessionCookieStr = `authjs.session-token=${sessionCookieMatch[1]}`;
  
  // Now we have the session cookie, we can run curl commands
  console.log('\n--- VERIFICATION START ---');
  
  const execSync = require('child_process').execSync;
  const execCurl = (cmd) => {
    try {
      const output = execSync(cmd).toString().trim();
      return output;
    } catch (e) {
      return e.stdout?.toString().trim() || e.message;
    }
  };

  const getTripSlug = async () => {
    const listRes = await fetch(`${baseUrl}/api/trips?limit=1`);
    const data = await listRes.json();
    return data.trips[0]?.slug || 'goa-trip-test';
  };
  
  const targetSlug = await getTripSlug();
  console.log(`Using target trip: ${targetSlug}`);

  console.log('\n1. Bookmark API (POST)');
  const postCmd = `curl -s -X POST ${baseUrl}/api/trips/${targetSlug}/save -H "Cookie: ${sessionCookieStr}" -w "\\n%{http_code}"`;
  console.log(`Command: ${postCmd.replace(sessionCookieStr, 'authjs.session-token=***')}`);
  const postOut = execCurl(postCmd);
  console.log(`Output:\n${postOut}`);

  console.log('\n2. Bookmark API (POST Duplicate 409)');
  const postDupOut = execCurl(postCmd);
  console.log(`Output:\n${postDupOut}`);

  console.log('\n3. Saved trips endpoint (GET)');
  const getSavedCmd = `curl -s -X GET ${baseUrl}/api/user/saved -H "Cookie: ${sessionCookieStr}"`;
  console.log(`Command: ${getSavedCmd.replace(sessionCookieStr, 'authjs.session-token=***')}`);
  const getSavedOut = execCurl(getSavedCmd);
  console.log(`Output:\n${getSavedOut.substring(0, 150)}...`);

  console.log('\n4. Bookmark API (DELETE)');
  const delCmd = `curl -s -X DELETE ${baseUrl}/api/trips/${targetSlug}/save -H "Cookie: ${sessionCookieStr}" -w "\\n%{http_code}"`;
  console.log(`Command: ${delCmd.replace(sessionCookieStr, 'authjs.session-token=***')}`);
  const delOut = execCurl(delCmd);
  console.log(`Output:\n${delOut}`);

  console.log('\n5. Sitemap XML');
  const getSitemapCmd = `curl -s ${baseUrl}/sitemap.xml | grep "<url>" | wc -l`;
  console.log(`Command: ${getSitemapCmd}`);
  const sitemapOut = execCurl(getSitemapCmd);
  console.log(`Output mapping to valid XML URL nodes:\n${sitemapOut} URLs found`);
}

test();
