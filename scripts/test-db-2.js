const { Client } = require('pg');

async function testConnection() {
  const client = new Client({
    host: 'aws-0-ap-south-1.pooler.supabase.com',
    port: 6543,
    user: 'postgres',
    password: 'SERENITY@SRM2026',
    database: 'postgres',
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('Successfully connected with username "postgres"!');
    await client.end();
  } catch (err) {
    console.error('Connection failed with "postgres":', err.message);
  }
}

testConnection();
