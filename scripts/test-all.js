const http = require('http');

async function testApis() {
  const loginData = JSON.stringify({
    email: 'john.doe@example.com',
    password: 'secret'
  });

  console.log('--- Testing Login ---');
  const loginRes = await post('http://localhost:3000/api/v1/auth/email/login', loginData);
  console.log('Status:', loginRes.statusCode);
  const loginBody = JSON.parse(loginRes.body);
  const token = loginBody.token;
  
  if (token) {
    console.log('Login Success! Token received.');
    
    console.log('\n--- Testing /auth/me ---');
    const meRes = await get('http://localhost:3000/api/v1/auth/me', token);
    console.log('Status:', meRes.statusCode);
    console.log('Body:', meRes.body);

    console.log('\n--- Testing /users (Admin Only) ---');
    // Assuming John Doe is a User role (2), this might fail with 403 if it's admin only
    const usersRes = await get('http://localhost:3000/api/v1/users', token);
    console.log('Status:', usersRes.statusCode);
    console.log('Body:', usersRes.body);

    console.log('\n--- Testing Admin Login ---');
    const adminLoginData = JSON.stringify({
      email: 'admin@example.com',
      password: 'secret'
    });
    const adminLoginRes = await post('http://localhost:3000/api/v1/auth/email/login', adminLoginData);
    console.log('Status:', adminLoginRes.statusCode);
    const adminLoginBody = JSON.parse(adminLoginRes.body);
    const adminToken = adminLoginBody.token;

    if (adminToken) {
      console.log('Admin Login Success!');
      console.log('\n--- Testing /users (As Admin) ---');
      const adminUsersRes = await get('http://localhost:3000/api/v1/users', adminToken);
      console.log('Status:', adminUsersRes.statusCode);
      console.log('Body:', adminUsersRes.body);
    }
  } else {
    console.log('Login Failed:', loginRes.body);
  }
}

function post(urlStr, data) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body }));
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(urlStr, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body }));
    });

    req.on('error', reject);
    req.end();
  });
}

testApis().catch(console.error);
