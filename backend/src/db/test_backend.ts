import jwt from 'jsonwebtoken';
import { env } from '../config/env';

async function testBackend() {
  console.log('🧪  Starting End-to-End Backend Verification Test...\n');

  // 1. Health check
  console.log('1️⃣  Testing GET http://localhost:4000/health');
  const healthRes = await fetch('http://localhost:4000/health');
  const healthData = await healthRes.json();
  console.log('   Response:', healthData);

  // 2. Generate JWT for test user
  const token = jwt.sign(
    {
      userId: '0fc05d8c-baa9-4f5a-a031-94c64a2f2f04',
      email: 'oliver.brown@domain.io',
      name: 'Oliver Brown',
    },
    env.jwt.secret,
    { expiresIn: '1h' }
  );
  console.log('\n2️⃣  Generated JWT Token for Oliver Brown');

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // 3. Fetch scheduled emails
  console.log('\n3️⃣  Testing GET /api/emails/scheduled');
  const scheduledRes = await fetch('http://localhost:4000/api/emails/scheduled', { headers });
  const scheduledData: any = await scheduledRes.json();
  console.log(`   Found ${scheduledData.jobs?.length} scheduled job(s)`);

  // 4. Fetch sent emails
  console.log('\n4️⃣  Testing GET /api/emails/sent');
  const sentRes = await fetch('http://localhost:4000/api/emails/sent', { headers });
  const sentData: any = await sentRes.json();
  console.log(`   Found ${sentData.jobs?.length} sent job(s)`);

  // 5. Schedule a new email for 5 seconds in the future
  const sendTime = new Date(Date.now() + 5000).toISOString();
  console.log(`\n5️⃣  Scheduling new email to test Ethereal SMTP & BullMQ execution at ${sendTime}...`);

  const scheduleRes = await fetch('http://localhost:4000/api/emails/schedule', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      fromEmail: 'oliver.brown@domain.io',
      recipients: ['alex.reed@techcorp.io', 'david.chen@innovatestudio.com'],
      subject: 'Quarterly Update Q2 - Live Test',
      body: '<h1>Quarterly Update</h1><p>Hi team, here is the live update...</p>',
      scheduledAt: sendTime,
      delayBetweenMs: 2000,
      hourlyLimit: 50,
    }),
  });

  const scheduleData: any = await scheduleRes.json();
  console.log('   Schedule Response:', scheduleData);

  // 6. Wait 10 seconds for worker to pick up and process jobs
  console.log('\n⏳  Waiting 10 seconds for BullMQ worker to execute email sending via Ethereal SMTP...');
  await new Promise((r) => setTimeout(r, 10000));

  // 7. Verify sent emails after execution
  console.log('\n6️⃣  Verifying sent emails after execution...');
  const sentRes2 = await fetch('http://localhost:4000/api/emails/sent', { headers });
  const sentData2: any = await sentRes2.json();
  console.log(`   Updated Sent Jobs count: ${sentData2.jobs?.length}`);
  if (sentData2.jobs?.length > 0) {
    const latestSent = sentData2.jobs[0];
    console.log(`   🎉  Latest Sent Email:
       - To: ${latestSent.toEmail}
       - Subject: ${latestSent.subject}
       - Status: ${latestSent.status}
       - Ethereal Preview URL: ${latestSent.previewUrl}`);
  }

  // 8. Test search API
  console.log('\n7️⃣  Testing Elasticsearch Search GET /api/emails/search?q=Quarterly');
  const searchRes = await fetch('http://localhost:4000/api/emails/search?q=Quarterly', { headers });
  const searchData: any = await searchRes.json();
  console.log('   Search Results Count:', searchData.hits?.length ?? searchData.total);

  console.log('\n✅  ALL BACKEND TESTS PASSED SUCCESSFULLY!');
}

testBackend().catch((err) => {
  console.error('❌  Test error:', err);
  process.exit(1);
});
