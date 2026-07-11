import * as dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

async function testAutoResolve() {
  try {
    const form = new FormData();
    form.append('from', '"Customer Support" <customer@example.com>');
    form.append('subject', 'Question about refunds');
    form.append('text', 'Hi, can I get a refund for my course? I bought it 10 days ago and have only watched a few videos.');
    form.append('html', '<p>Hi, can I get a refund for my course? I bought it 10 days ago and have only watched a few videos.</p>');
    form.append('headers', 'Message-ID: <test-refunds-' + Date.now() + '@example.com>\nDate: ' + new Date().toUTCString());

    console.log('Sending email webhook to create a ticket...');
    const res1 = await fetch('http://localhost:3000/api/webhooks/inbound-email?token=default-secret-key', {
      method: 'POST',
      body: form
    });
    console.log('Response:', res1.status, await res1.text());
    process.exit(0);
  } catch (err: any) {
    console.error('Error testing webhook:', err.message);
    process.exit(1);
  }
}

testAutoResolve();
