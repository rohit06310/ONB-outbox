import prisma from '../config/database';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
  console.log('🌱  Seeding test data...');

  // Create test user
  const user = await prisma.user.upsert({
    where: { email: 'oliver.brown@domain.io' },
    create: {
      googleId: 'test-google-id-12345',
      email: 'oliver.brown@domain.io',
      name: 'Oliver Brown',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    },
    update: {},
  });

  console.log(`✅  Test user created/found: ${user.name} (${user.id})`);

  // Create sample scheduled email
  const scheduledJob = await prisma.emailJob.create({
    data: {
      id: uuidv4(),
      userId: user.id,
      fromEmail: 'oliver.brown@domain.io',
      toEmail: 'john.smith@company.com',
      subject: 'Meeting follow-up - Scheduled',
      body: 'Hi John, just wanted to follow up on our meeting...',
      scheduledAt: new Date(Date.now() + 3600000), // 1 hour in future
      status: 'SCHEDULED',
      delayBetweenMs: 2000,
      hourlyLimit: 50,
    },
  });

  console.log(`✅  Sample scheduled job created: ${scheduledJob.id}`);

  // Create sample sent email
  const sentJob = await prisma.emailJob.create({
    data: {
      id: uuidv4(),
      userId: user.id,
      fromEmail: 'oliver.brown@domain.io',
      toEmail: 'sarah.wilson@company.com',
      subject: 'Re: Project Update',
      body: 'Thanks for the update, Sarah. Looks good!',
      scheduledAt: new Date(Date.now() - 7200000),
      sentAt: new Date(Date.now() - 7195000),
      status: 'SENT',
      previewUrl: 'https://ethereal.email/message/sample-id',
      delayBetweenMs: 2000,
      hourlyLimit: 50,
    },
  });

  console.log(`✅  Sample sent job created: ${sentJob.id}`);

  console.log('🌱  Seed completed successfully!');
}

seed()
  .catch((err) => {
    console.error('❌  Seed error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
