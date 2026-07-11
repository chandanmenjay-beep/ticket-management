import { Client } from 'pg';

async function test() {
  const client = new Client({
    connectionString: 'postgres://postgres:postgres@[::1]:51214/template1?sslmode=disable'
  });
  await client.connect();
  console.log('Connected to PG directly!');
  await client.end();
}

test().catch(console.error);
