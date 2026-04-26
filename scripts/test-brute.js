const { Client } = require('pg');

async function test(host, port, user) {
  const client = new Client({
    host,
    port,
    user,
    password: 'SERENITY@SRM2026',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });
  try {
    await client.connect();
    console.log(`SUCCESS: ${host}:${port} as ${user}`);
    await client.end();
  } catch (err) {
    console.log(`FAILED: ${host}:${port} as ${user} - ${err.message}`);
  }
}

async function run() {
  const project = 'hcouuakjmetkdridinje';
  const regions = ['ap-south-1', 'us-east-1', 'ap-southeast-1'];
  for (const r of regions) {
    await test(`aws-0-${r}.pooler.supabase.com`, 6543, `postgres.${project}`);
    await test(`aws-0-${r}.pooler.supabase.com`, 5432, `postgres.${project}`);
  }
  await test(`db.${project}.supabase.co`, 5432, 'postgres');
}

run();
