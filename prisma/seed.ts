import { PrismaClient, Role, AuthProvider, MentorStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Helper date function
  const getFutureDate = (daysAhead: number, hourStr: string) => {
    const today = new Date();
    const date = new Date(today);
    date.setDate(today.getDate() + daysAhead);
    const [hours, minutes] = hourStr.split(':').map(Number);
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  // 1. А. Солонго - MIT (Computer Science)
  const user1 = await prisma.user.upsert({
    where: { email: 'solongo@example.com' },
    update: {},
    create: {
      email: 'solongo@example.com',
      displayName: 'А. Солонго',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop',
      role: Role.MENTOR,
      authProvider: AuthProvider.EMAIL,
      mentorProfile: {
        create: {
          university: 'Massachusetts Institute of Technology (MIT)',
          major: 'Computer Science',
          country: 'USA',
          bio: 'MIT-д бүрэн тэтгэлэгтэй тэнцсэн туршлагаасаа хуваалцаж, эссэ бичих болон ярилцлагад хэрхэн бэлдэх талаар зөвлөгөө өгнө.',
          hourlyRate: 45000,
          verificationStatus: MentorStatus.APPROVED,
        },
      },
    },
  });

  // 2. Б. Тэмүүлэн - University of Melbourne
  const user2 = await prisma.user.upsert({
    where: { email: 'temuulen@example.com' },
    update: {},
    create: {
      email: 'temuulen@example.com',
      displayName: 'Б. Тэмүүлэн',
      avatarUrl: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=200&auto=format&fit=crop',
      role: Role.MENTOR,
      authProvider: AuthProvider.EMAIL,
      mentorProfile: {
        create: {
          university: 'University of Melbourne',
          major: 'Finance & Economics',
          country: 'Australia',
          bio: 'Австралийн их сургуулиудын шалгуур болон сургалтын төлбөр, амьдрах өртгийн талаар нарийвчилсан мэдээлэл өгч зөвлөнө.',
          hourlyRate: 35000,
          verificationStatus: MentorStatus.APPROVED,
        },
      },
    },
  });

  // 3. Г. Наран - Tokyo University
  const user3 = await prisma.user.upsert({
    where: { email: 'naran@example.com' },
    update: {},
    create: {
      email: 'naran@example.com',
      displayName: 'Г. Наран',
      avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=200&auto=format&fit=crop',
      role: Role.MENTOR,
      authProvider: AuthProvider.EMAIL,
      mentorProfile: {
        create: {
          university: 'University of Tokyo',
          major: 'Robotics Engineering',
          country: 'Japan',
          bio: 'MEXT буюу Япон улсын засгийн газрын тэтгэлэг болон шалгалтын тестийн талаар бэлтгэлд тусална.',
          hourlyRate: 30000,
          verificationStatus: MentorStatus.APPROVED,
        },
      },
    },
  });

  // Create Availability Slots for Mentors
  const createDailySlots = async (userId: string, startDays: number, totalDays: number) => {
    const mentor = await prisma.mentorProfile.findUnique({ where: { userId } });
    if (!mentor) return;

    const slotsData: any[] = [];
    for (let day = startDays; day < startDays + totalDays; day++) {
      // Create 3 slots per day
      const times = ['10:00', '14:30', '18:00'];
      for (const time of times) {
        const start = getFutureDate(day, time);
        const end = new Date(start);
        end.setHours(end.getHours() + 1); // 1 hour duration

        slotsData.push({
          mentorId: mentor.id,
          startTime: start,
          endTime: end,
          isBooked: false, // Randomly maybe booked? let's keep it mostly open
        });
      }
    }

    await prisma.availabilitySlot.createMany({
      data: slotsData,
    });
  };

  await createDailySlots(user1.id, 0, 7); // Slots for next 7 days (including today)
  await createDailySlots(user2.id, 1, 5); // Slots starting from tomorrow
  await createDailySlots(user3.id, 0, 4); 

  console.log('Seeding completed! Realistic data added.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
