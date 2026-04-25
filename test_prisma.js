const { PrismaClient } = require('@prisma/client');

async function test() {
  const prisma = new PrismaClient();
  
  // Create a parent
  const parent = await prisma.user.create({
    data: {
      email: 'test_parent_' + Date.now() + '@test.com',
      role: 'PARENT',
      isActive: true,
    }
  });

  // Query bookings with empty in
  const profileIds = [];
  const bookings = await prisma.booking.findMany({
    where: { studentId: { in: profileIds } }
  });

  console.log('Bookings returned for empty string array:', bookings.length);
  process.exit(0);
}

test();
