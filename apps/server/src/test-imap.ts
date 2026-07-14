import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { ImapFlow } from 'imapflow';

const testImap = async () => {
  if (!process.env.IMAP_EMAIL || !process.env.IMAP_PASSWORD) {
    console.log("No IMAP_EMAIL or IMAP_PASSWORD found in .env");
    return;
  }
  
  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: {
      user: process.env.IMAP_EMAIL,
      pass: process.env.IMAP_PASSWORD
    },
    logger: false,
  });
  
  try {
    await client.connect();
    console.log('[IMAP TEST] SUCCESSFULLY CONNECTED to IMAP server as ' + process.env.IMAP_EMAIL);
    await client.logout();
  } catch(e) {
    console.error('[IMAP TEST] Failed to connect:', e.message || e);
  }
};

testImap();
