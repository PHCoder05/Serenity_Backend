const { Client } = require('pg');

async function testConnection() {
  const client = new Client({
    host: 'aws-1-ap-south-1.pooler.supabase.com',
    port: 6543,
    user: 'postgres.hcouuakjmetkdridinje',
    password: 'SERENITY@SRM2026',
    database: 'postgres',
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('Successfully connected to Supabase Pooler (Transaction Mode) at aws-1!');
    await client.end();
  } catch (err) {
    console.error('Connection failed (Transaction Mode):', err.message);
  }
}

testConnection();
