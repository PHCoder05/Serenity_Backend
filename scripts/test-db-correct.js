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
    console.log('Successfully connected to Supabase Pooler (Transaction Mode, aws-1)!');
    await client.end();
  } catch (err) {
    console.error('Connection failed (Transaction Mode, aws-1):', err.message);
  }

  const clientSession = new Client({
    host: 'aws-1-ap-south-1.pooler.supabase.com',
    port: 5432,
    user: 'postgres.hcouuakjmetkdridinje',
    password: 'SERENITY@SRM2026',
    database: 'postgres',
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await clientSession.connect();
    console.log('Successfully connected to Supabase Pooler (Session Mode, aws-1)!');
    await clientSession.end();
  } catch (err) {
    console.error('Connection failed (Session Mode, aws-1):', err.message);
  }
}

testConnection();
