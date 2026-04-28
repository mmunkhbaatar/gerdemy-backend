import {
  PrismaClient, Role, AuthProvider, MentorStatus,
  BookingStatus, PaymentStatus, LinkStatus,
} from '@prisma/client';
import * as admin from 'firebase-admin';
import { join } from 'path';

const prisma = new PrismaClient();

// ── Firebase Admin ─────────────────────────────────────────────────────────────
function initFirebase() {
  if (admin.apps.length) return;
  let sa: any;
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    sa = require(join(process.cwd(), 'serviceAccountKey.json'));
  }
  admin.initializeApp({ credential: admin.credential.cert(sa) });
}

async function fbUser(email: string, password: string, name: string): Promise<string> {
  try {
    const u = await admin.auth().getUserByEmail(email);
    await admin.auth().updateUser(u.uid, { displayName: name }).catch(() => {});
    return u.uid;
  } catch {
    const u = await admin.auth().createUser({
      email, password, displayName: name, emailVerified: true,
    });
    return u.uid;
  }
}

// Date helper: month is 1-indexed for readability
function dt(year: number, month: number, day: number, hour: number, min = 0): Date {
  return new Date(year, month - 1, day, hour, min, 0, 0);
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🌱 Starting comprehensive test seed...');
  initFirebase();

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. ORIGINAL 3 MENTORS (keep existing, update rates)
  // ═══════════════════════════════════════════════════════════════════════════
  await prisma.user.upsert({
    where: { email: 'solongo@example.com' },
    update: { mentorProfile: { update: { hourlyRate: 80000, isFeatured: true } } },
    create: {
      email: 'solongo@example.com', displayName: 'А. Солонго',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop',
      role: Role.MENTOR, authProvider: AuthProvider.EMAIL,
      mentorProfile: { create: {
        university: 'Massachusetts Institute of Technology (MIT)', major: 'Computer Science',
        country: 'USA', bio: 'MIT-д бүрэн тэтгэлэгтэй тэнцсэн. CS болон STEM чиглэлийн сурагчдад эссэ бичих, ярилцлагад бэлдэхэд тусална. Тэтгэлэгийн талаар бодит туршлагаа хуваалцана.',
        hourlyRate: 80000, verificationStatus: MentorStatus.APPROVED, isFeatured: true,
      }},
    },
  });
  await prisma.user.upsert({
    where: { email: 'temuulen@example.com' },
    update: { mentorProfile: { update: { hourlyRate: 60000, isFeatured: true } } },
    create: {
      email: 'temuulen@example.com', displayName: 'Б. Тэмүүлэн',
      avatarUrl: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=200&auto=format&fit=crop',
      role: Role.MENTOR, authProvider: AuthProvider.EMAIL,
      mentorProfile: { create: {
        university: 'University of Melbourne', major: 'Finance & Economics',
        country: 'Australia', bio: 'Австралийн их сургуулиудын шалгуур, тэтгэлэгийн боломжуудын талаар нарийвчилсан мэдээлэл өгнө.',
        hourlyRate: 60000, verificationStatus: MentorStatus.APPROVED, isFeatured: true,
      }},
    },
  });
  await prisma.user.upsert({
    where: { email: 'naran@example.com' },
    update: { mentorProfile: { update: { hourlyRate: 50000 } } },
    create: {
      email: 'naran@example.com', displayName: 'Г. Наран',
      avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=200&auto=format&fit=crop',
      role: Role.MENTOR, authProvider: AuthProvider.EMAIL,
      mentorProfile: { create: {
        university: 'University of Tokyo', major: 'Robotics Engineering',
        country: 'Japan', bio: 'MEXT тэтгэлэг болон Японы инженерийн их сургуулиудад элсэхэд туслана.',
        hourlyRate: 50000, verificationStatus: MentorStatus.APPROVED, isFeatured: false,
      }},
    },
  });
  console.log('✅ Original 3 mentors ready');

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. TEST MENTORS (gerdemy.mentor1-9)
  // ═══════════════════════════════════════════════════════════════════════════
  const MENTORS = [
    {
      email: 'gerdemy.mentor1@gmail.com', displayName: 'Д. Мөнхбаяр',
      avatarUrl: 'https://randomuser.me/api/portraits/men/32.jpg',
      university: 'Harvard University', major: 'Economics & Finance', country: 'USA',
      bio: 'Harvard-ийн Economics чиглэлийн 3-р курс. Common App эссэ, зөвлөмжийн захидал болон ярилцлагад бэлдэхэд туслана. 18 сурагчийг АНУ болон Европын шилдэг сургуулиудад оруулсан туршлагатай. SAT болон IELTS бэлтгэлд нарийвчлан туслана. Тэтгэлэг болон Financial Aid-ийн мэдлэг сайн.',
      hourlyRate: 90000, isFeatured: true,
      viberId: '+97691001001', telegramId: '@munkh_harvard', whatsappId: null as null | string,
    },
    {
      email: 'gerdemy.mentor2@gmail.com', displayName: 'Э. Сарантуяа',
      avatarUrl: 'https://randomuser.me/api/portraits/women/44.jpg',
      university: 'Stanford University', major: 'Biology & Pre-Medicine', country: 'USA',
      bio: 'Stanford-д Biology Pre-Med чиглэлийн оюутан. Анагаах ухаан сонирхсон сурагчдад MCAT бэлтгэл, хувийн мэдэгдэл бичих, research experience олоход туслана. АНУ-ын эмнэлгийн сургуулиудын шалгуурыг нарийн мэдэх. Эссэ болон scholarship мэдлэгтэй.',
      hourlyRate: 85000, isFeatured: true,
      whatsappId: '+97699002002', telegramId: '@sara_stanford', viberId: null as null | string,
    },
    {
      email: 'gerdemy.mentor3@gmail.com', displayName: 'Б. Батбаяр',
      avatarUrl: 'https://randomuser.me/api/portraits/men/65.jpg',
      university: 'University of Oxford', major: 'Law & Political Science', country: 'UK',
      bio: 'Oxford-ийн Хуулийн факультет 2-р курс. UCAS системтэй ажиллах, Personal Statement бичих тал дээр нарийн мэдлэгтэй. Chevening тэтгэлэгт нэр дэвшихэд бодит туслалцаа үзүүлнэ. Мэтгэлцээний болон эссэ бичих туршлага маш сайн.',
      hourlyRate: 75000, isFeatured: true,
      viberId: '+97688003003', telegramId: '@batbayar_oxford', whatsappId: null as null | string,
    },
    {
      email: 'gerdemy.mentor4@gmail.com', displayName: 'Н. Энхтуяа',
      avatarUrl: 'https://randomuser.me/api/portraits/women/27.jpg',
      university: 'National University of Singapore', major: 'Business Administration', country: 'Singapore',
      bio: 'NUS-ийн Business Administration 4-р курс. Азийн шилдэг их сургуулиудад элсэх, ASEAN тэтгэлэг авах талаар зөвлөнө. IELTS бэлтгэл, CV болон эссэ бичихэд тусална. Сингапурт амьдрах бодит туршлагаа хуваалцана.',
      hourlyRate: 65000, isFeatured: false,
      telegramId: '@enkh_nus', viberId: null as null | string, whatsappId: null as null | string,
    },
    {
      email: 'gerdemy.mentor5@gmail.com', displayName: 'Т. Ганбаатар',
      avatarUrl: 'https://randomuser.me/api/portraits/men/18.jpg',
      university: 'ETH Zurich', major: 'Mechanical Engineering', country: 'Switzerland',
      bio: 'ETH Zurich-д Механик инженер суралцаж байна. Европын инженерийн шилдэг сургуулиудад элсэхэд Motivation Letter бичих, DAAD тэтгэлэгт нэр дэвшихэд туслана. Математик, физикийн мэдлэгийг гүнзгийрүүлэхэд тусална.',
      hourlyRate: 70000, isFeatured: false,
      viberId: '+41791234567', telegramId: '@ganbat_eth', whatsappId: null as null | string,
    },
    {
      email: 'gerdemy.mentor6@gmail.com', displayName: 'О. Дөлгөөн',
      avatarUrl: 'https://randomuser.me/api/portraits/women/12.jpg',
      university: 'University of Toronto', major: 'Computer Science', country: 'Canada',
      bio: 'Toronto хотод CS суралцаж, Google-д дадлага хийж байна. Python, алгоритм, системийн дизайн болон техникийн ярилцлагад (LeetCode) бэлтгэхэд туслана. Канадын их сургуулийн шалгуур болон оюутны visa талаар дэлгэрэнгүй зөвлөгөө өгнө.',
      hourlyRate: 68000, isFeatured: true,
      telegramId: '@dolgoon_toronto', whatsappId: '+97699006006', viberId: null as null | string,
    },
    {
      email: 'gerdemy.mentor7@gmail.com', displayName: 'С. Мөнхцэцэг',
      avatarUrl: 'https://randomuser.me/api/portraits/women/68.jpg',
      university: 'Seoul National University', major: 'Business & Korean Studies', country: 'South Korea',
      bio: 'SNU-д Business суралцаж байна. TOPIK шалгалт, KGSP засгийн газрын тэтгэлэгт нэр дэвших, Солонгос хэлний хичээл болон оршин суух виза бүрдүүлэхэд туслана. Солонгост амьдрах бодит туршлагаа хуваалцана.',
      hourlyRate: 45000, isFeatured: false,
      telegramId: '@munkh_snu', viberId: null as null | string, whatsappId: null as null | string,
    },
    {
      email: 'gerdemy.mentor8@gmail.com', displayName: 'Х. Батсүх',
      avatarUrl: 'https://randomuser.me/api/portraits/men/77.jpg',
      university: 'Peking University', major: 'International Relations', country: 'China',
      bio: 'Пекингийн их сургуульд Олон улсын харилцаа суралцаж байна. Хятадад суралцах, HSK шалгалт, CSC тэтгэлгийн материал бүрдүүлэхэд туслана. Хятад хэлний дунд болон дэвшилтэт түвшний хичээл зааж чаддаг.',
      hourlyRate: 42000, isFeatured: false,
      telegramId: '@batsukh_pku', viberId: null as null | string, whatsappId: null as null | string,
    },
    {
      email: 'gerdemy.mentor9@gmail.com', displayName: 'А. Энхбаяр',
      avatarUrl: 'https://randomuser.me/api/portraits/men/55.jpg',
      university: 'University of Edinburgh', major: 'Data Science & AI', country: 'UK',
      bio: 'Edinburgh-т Data Science & AI чиглэлд суралцаж байна. Python, машин сургалт болон өгөгдлийн дүн шинжилгээний хичээл зааж чаддаг. IELTS 8.0. Их Британийн их сургуулийн шалгуур болон тэтгэлгийн мэдлэгтэй.',
      hourlyRate: 55000, isFeatured: false,
      telegramId: '@enkh_edinburgh', viberId: null as null | string, whatsappId: null as null | string,
    },
  ];

  type MentorRef = { userId: string; mentorProfileId: string; displayName: string; hourlyRate: number };
  const mentorRefs: MentorRef[] = [];

  for (const md of MENTORS) {
    const fbUid = await fbUser(md.email, '123456+', md.displayName);
    const u = await prisma.user.upsert({
      where: { email: md.email },
      update: { firebaseUid: fbUid, displayName: md.displayName, avatarUrl: md.avatarUrl,
        viberId: md.viberId, whatsappId: md.whatsappId, telegramId: md.telegramId },
      create: { email: md.email, firebaseUid: fbUid, displayName: md.displayName,
        avatarUrl: md.avatarUrl, viberId: md.viberId, whatsappId: md.whatsappId,
        telegramId: md.telegramId, role: Role.MENTOR, authProvider: AuthProvider.EMAIL },
    });
    const mp = await prisma.mentorProfile.upsert({
      where: { userId: u.id },
      update: { hourlyRate: md.hourlyRate, isFeatured: md.isFeatured, bio: md.bio,
        university: md.university, major: md.major, country: md.country,
        verificationStatus: MentorStatus.APPROVED },
      create: { userId: u.id, university: md.university, major: md.major, country: md.country,
        bio: md.bio, hourlyRate: md.hourlyRate, verificationStatus: MentorStatus.APPROVED,
        isFeatured: md.isFeatured },
    });
    mentorRefs.push({ userId: u.id, mentorProfileId: mp.id, displayName: md.displayName, hourlyRate: md.hourlyRate });
    console.log(`  ✓ ${md.displayName} (${md.university})`);
  }
  console.log('✅ Test mentors (9) ready');

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. TEST STUDENTS (gerdemy.student1-5)
  // ═══════════════════════════════════════════════════════════════════════════
  const STUDENTS = [
    { email: 'gerdemy.student1@gmail.com', displayName: 'Б. Номин',
      avatarUrl: 'https://randomuser.me/api/portraits/women/23.jpg',
      highSchool: '1-р дунд сургууль', targetCountry: 'USA', targetMajor: 'Computer Science' },
    { email: 'gerdemy.student2@gmail.com', displayName: 'Г. Тэмүүлэн',
      avatarUrl: 'https://randomuser.me/api/portraits/men/34.jpg',
      highSchool: 'SOS Herman Gmeiner сургууль', targetCountry: 'Australia', targetMajor: 'Business Administration' },
    { email: 'gerdemy.student3@gmail.com', displayName: 'Н. Билгүүн',
      avatarUrl: 'https://randomuser.me/api/portraits/men/45.jpg',
      highSchool: 'Ши харгуйн дунд сургууль', targetCountry: 'Switzerland / Japan', targetMajor: 'Mechanical Engineering' },
    { email: 'gerdemy.student4@gmail.com', displayName: 'Д. Энхжин',
      avatarUrl: 'https://randomuser.me/api/portraits/women/56.jpg',
      highSchool: 'Орчлон олон улсын сургууль', targetCountry: 'UK', targetMajor: 'Law' },
    { email: 'gerdemy.student5@gmail.com', displayName: 'О. Гэрэлмаа',
      avatarUrl: 'https://randomuser.me/api/portraits/women/71.jpg',
      highSchool: 'Хүний хөгжлийн сургууль', targetCountry: 'Singapore / USA', targetMajor: 'Medicine' },
  ];

  type StudentRef = { userId: string; studentProfileId: string; displayName: string };
  const studentRefs: StudentRef[] = [];

  for (const sd of STUDENTS) {
    const fbUid = await fbUser(sd.email, '123456+', sd.displayName);
    const u = await prisma.user.upsert({
      where: { email: sd.email },
      update: { firebaseUid: fbUid, displayName: sd.displayName, avatarUrl: sd.avatarUrl },
      create: { email: sd.email, firebaseUid: fbUid, displayName: sd.displayName,
        avatarUrl: sd.avatarUrl, role: Role.STUDENT, authProvider: AuthProvider.EMAIL },
    });
    const sp = await prisma.studentProfile.upsert({
      where: { userId: u.id },
      update: { highSchool: sd.highSchool, targetCountry: sd.targetCountry, targetMajor: sd.targetMajor },
      create: { userId: u.id, highSchool: sd.highSchool, targetCountry: sd.targetCountry, targetMajor: sd.targetMajor },
    });
    studentRefs.push({ userId: u.id, studentProfileId: sp.id, displayName: sd.displayName });
    console.log(`  ✓ ${sd.displayName}`);
  }
  console.log('✅ Test students (5) ready');

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. TEST PARENTS (gerdemy.parent1-5)
  // ═══════════════════════════════════════════════════════════════════════════
  const PARENTS = [
    { email: 'gerdemy.parent1@gmail.com', displayName: 'Б. Дулмаа' },
    { email: 'gerdemy.parent2@gmail.com', displayName: 'Г. Баатар' },
    { email: 'gerdemy.parent3@gmail.com', displayName: 'Н. Оюун' },
    { email: 'gerdemy.parent4@gmail.com', displayName: 'Д. Мөнхбат' },
    { email: 'gerdemy.parent5@gmail.com', displayName: 'О. Сүхбаатар' },
  ];

  type ParentRef = { userId: string; displayName: string };
  const parentRefs: ParentRef[] = [];

  for (const pd of PARENTS) {
    const fbUid = await fbUser(pd.email, '123456+', pd.displayName);
    const u = await prisma.user.upsert({
      where: { email: pd.email },
      update: { firebaseUid: fbUid, displayName: pd.displayName },
      create: { email: pd.email, firebaseUid: fbUid, displayName: pd.displayName,
        role: Role.PARENT, authProvider: AuthProvider.EMAIL },
    });
    parentRefs.push({ userId: u.id, displayName: pd.displayName });
    console.log(`  ✓ ${pd.displayName}`);
  }
  console.log('✅ Test parents (5) ready');

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. PARENT → STUDENT LINKS
  // ═══════════════════════════════════════════════════════════════════════════
  for (let i = 0; i < parentRefs.length; i++) {
    await prisma.parentStudentLink.upsert({
      where: { parentId_studentId: { parentId: parentRefs[i].userId, studentId: studentRefs[i].userId } },
      update: { status: LinkStatus.ACCEPTED },
      create: { parentId: parentRefs[i].userId, studentId: studentRefs[i].userId, status: LinkStatus.ACCEPTED },
    });
  }
  console.log('✅ Parent-student links ready');

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. AVAILABILITY SLOTS  (April 2026 historical  +  May 2026 future)
  // ═══════════════════════════════════════════════════════════════════════════
  const testMentorProfileIds = mentorRefs.map(m => m.mentorProfileId);

  // Clean up old test slots and their cascading bookings / reviews / transactions
  async function cleanSlots(from: Date, to: Date) {
    const slots = await prisma.availabilitySlot.findMany({
      where: { mentorId: { in: testMentorProfileIds }, startTime: { gte: from, lt: to } },
      select: { id: true },
    });
    if (!slots.length) return;
    const slotIds = slots.map(s => s.id);
    const bookings = await prisma.booking.findMany({ where: { slotId: { in: slotIds } }, select: { id: true } });
    const bookingIds = bookings.map(b => b.id);
    if (bookingIds.length) {
      await prisma.review.deleteMany({ where: { bookingId: { in: bookingIds } } });
      await prisma.transaction.deleteMany({ where: { bookingId: { in: bookingIds } } });
      await prisma.booking.deleteMany({ where: { id: { in: bookingIds } } });
    }
    await prisma.availabilitySlot.deleteMany({ where: { id: { in: slotIds } } });
  }
  await cleanSlots(new Date(2026, 3, 1), new Date(2026, 4, 1));   // April 2026
  await cleanSlots(new Date(2026, 4, 1), new Date(2026, 5, 1));   // May   2026

  // Each mentor has a unique time pattern for variety
  // index: 0   1   2    3    4    5    6    7    8
  const SLOT_HOURS = [
    [9, 13, 17],   // mentor1 - Д. Мөнхбаяр
    [10, 15, 19],  // mentor2 - Э. Сарантуяа
    [8,  12, 16],  // mentor3 - Б. Батбаяр
    [11, 14, 18],  // mentor4 - Н. Энхтуяа
    [9,  14, 20],  // mentor5 - Т. Ганбаатар
    [10, 13, 17],  // mentor6 - О. Дөлгөөн
    [11, 15, 19],  // mentor7 - С. Мөнхцэцэг
    [9,  12, 16],  // mentor8 - Х. Батсүх
    [10, 14, 18],  // mentor9 - А. Энхбаяр
  ];

  // Weekdays in April 2026 (for historical data)
  const APR_DAYS  = [1,2,3,7,8,9,14,15,16,21,22,23,28,29,30];
  // Weekdays in May 2026 (for future booking)
  const MAY_DAYS  = [4,5,6,7,8, 11,12,13,14,15, 18,19,20,21,22, 25,26,27,28,29];

  type SlotEntry = { mentorIdx: number; day: number; hour: number; slotId: string };
  const aprSlots: SlotEntry[] = [];
  const maySlots: SlotEntry[] = [];

  for (let mi = 0; mi < mentorRefs.length; mi++) {
    const mpId = mentorRefs[mi].mentorProfileId;
    const hours = SLOT_HOURS[mi];
    for (const day of APR_DAYS) {
      for (const hour of hours) {
        const s = await prisma.availabilitySlot.create({ data: {
          mentorId: mpId, startTime: dt(2026, 4, day, hour), endTime: dt(2026, 4, day, hour + 1),
        }});
        aprSlots.push({ mentorIdx: mi, day, hour, slotId: s.id });
      }
    }
    for (const day of MAY_DAYS) {
      for (const hour of hours) {
        const s = await prisma.availabilitySlot.create({ data: {
          mentorId: mpId, startTime: dt(2026, 5, day, hour), endTime: dt(2026, 5, day, hour + 1),
        }});
        maySlots.push({ mentorIdx: mi, day, hour, slotId: s.id });
      }
    }
  }
  console.log(`✅ Slots created — April: ${aprSlots.length}, May: ${maySlots.length}`);

  // Helper: find slot or throw
  const findSlot = (pool: SlotEntry[], mi: number, day: number, hour: number): string => {
    const found = pool.find(s => s.mentorIdx === mi && s.day === day && s.hour === hour);
    if (!found) throw new Error(`Slot not found: mentorIdx=${mi} day=${day} hour=${hour}`);
    return found.slotId;
  };

  const s = (i: number) => studentRefs[i - 1];  // 1-indexed helpers
  const m = (i: number) => mentorRefs[i - 1];

  // ═══════════════════════════════════════════════════════════════════════════
  // 7.  HISTORICAL BOOKINGS (April 2026) — COMPLETED + review + transaction
  // ═══════════════════════════════════════════════════════════════════════════
  const PAYMENT_METHODS = ['QPay', 'SocialPay', 'Capitron Bank', 'Golomt Bank', 'Khan Bank'];
  const pm = () => PAYMENT_METHODS[Math.floor(Math.random() * PAYMENT_METHODS.length)];
  const meetUrl = () => `https://meet.google.com/grd-${Math.random().toString(36).substr(2, 9)}`;

  const HISTORICAL: Array<{
    student: StudentRef; mentorIdx: number; day: number; hour: number;
    review: { rating: number; comment: string };
  }> = [
    { student: s(1), mentorIdx: 0, day: 1,  hour: 9,
      review: { rating: 5, comment: 'Harvard-ийн Common App эссэнийхээ бүтцийг хэрхэн гаргах вэ гэдгийг нарийнаар ойлгуулж өгсөн. "Show, don\'t tell" зарчмыг бодитоор жишээгээр тайлбарласан. Маш туршлагатай, дахин захиална!' } },
    { student: s(1), mentorIdx: 1, day: 2,  hour: 10,
      review: { rating: 4, comment: 'Pre-med зам болон Stanford-ийн Biology чиглэлийн талаар маш их мэдлэг олж авлаа. MCAT-ийн бэлтгэлийн хуваарь гаргахад нарийн туслалцаа үзүүлсэн.' } },
    { student: s(2), mentorIdx: 3, day: 3,  hour: 11,
      review: { rating: 5, comment: 'NUS-ийн бодит туршлагаас хуваалцсан нь маш тустай байсан. CV болон cover letter хэрхэн бичих вэ гэдгийг нарийн зааж өгсөн. Дахин уулзана!' } },
    { student: s(2), mentorIdx: 6, day: 7,  hour: 11,
      review: { rating: 4, comment: 'KGSP тэтгэлэгт шаардлагатай материалуудыг нарийвчлан тайлбарласан. TOPIK шалгалтын стратегиудыг хуваалцсан нь гайхалтай байлаа.' } },
    { student: s(3), mentorIdx: 4, day: 8,  hour: 9,
      review: { rating: 5, comment: 'ETH Zurich-д элсэхэд Motivation Letter хэрхэн бичих вэ гэдгийг нарийвчлан тайлбарласан. Европын инженерийн их сургуулиудын ялгааг гүнзгий ойлгуулж өгсөн.' } },
    { student: s(4), mentorIdx: 2, day: 9,  hour: 8,
      review: { rating: 5, comment: 'Oxford Law-д Personal Statement бичихэд маш тусалсан. Академик нотолгоо ба хувийн урам зориг хоёрыг хэрхэн тэнцвэртэй болгох вэ гэдгийг нарийн заасан.' } },
    { student: s(5), mentorIdx: 7, day: 14, hour: 9,
      review: { rating: 4, comment: 'CSC тэтгэлэгт шаардлагатай бүх баримт бичгийг нарийвчлан тайлбарласан. Хятад хэлний бэлтгэлийн талаар бодит зөвлөгөө авлаа.' } },
    { student: s(5), mentorIdx: 1, day: 15, hour: 10,
      review: { rating: 5, comment: 'Stanford Pre-Med-д research experience яаж олох вэ гэдгийг конкрет жишээгээр тайлбарласан. Маш ухаалаг, туршлагатай ментор!' } },
    { student: s(3), mentorIdx: 8, day: 16, hour: 10,
      review: { rating: 4, comment: 'Data Science чиглэлийн талаар маш сайн ойлголт өгсөн. Edinburgh-ийн хэрэглэлтийн бүх нарийн ширийнийг тайлбарлаж өгсөн.' } },
    { student: s(4), mentorIdx: 5, day: 21, hour: 10,
      review: { rating: 5, comment: 'Канадад CS суралцахын тулд ямар portfolio хийх вэ гэдгийг нарийвчлан заасан. GitHub дээр бодит проект хэрхэн байршуулах вэ гэдгийг бодитоор харуулсан.' } },
  ];

  for (const hb of HISTORICAL) {
    const slotId = findSlot(aprSlots, hb.mentorIdx, hb.day, hb.hour);
    await prisma.availabilitySlot.update({ where: { id: slotId }, data: { isBooked: true } });
    const booking = await prisma.booking.create({ data: {
      studentId: hb.student.studentProfileId, slotId,
      status: BookingStatus.COMPLETED, paymentStatus: PaymentStatus.PAID,
      meetingLink: meetUrl(), isConfirmedByStudent: true, isAttended: true,
      createdAt: dt(2026, 4, Math.max(1, hb.day - 1), 14),
    }});
    await prisma.transaction.create({ data: {
      bookingId: booking.id, amount: mentorRefs[hb.mentorIdx].hourlyRate,
      currency: 'MNT', paymentMethod: pm(), status: PaymentStatus.PAID,
      transactionDate: dt(2026, 4, Math.max(1, hb.day - 1), 10),
    }});
    await prisma.review.create({ data: {
      bookingId: booking.id, reviewerId: hb.student.userId,
      revieweeId: mentorRefs[hb.mentorIdx].userId,
      rating: hb.review.rating, comment: hb.review.comment,
      createdAt: dt(2026, 4, hb.day, hb.hour + 2),
    }});
  }
  console.log('✅ Historical (April 2026) COMPLETED bookings + reviews ready');

  // ═══════════════════════════════════════════════════════════════════════════
  // 8.  FUTURE BOOKINGS (May 2026) — CONFIRMED (захиалгасан, цагтаа ирэх)
  // ═══════════════════════════════════════════════════════════════════════════
  const CONFIRMED_MAY: Array<{ student: StudentRef; mentorIdx: number; day: number; hour: number }> = [
    { student: s(1), mentorIdx: 0, day: 5,  hour: 9  },  // Номин → Мөнхбаяр
    { student: s(1), mentorIdx: 5, day: 6,  hour: 10 },  // Номин → Дөлгөөн
    { student: s(2), mentorIdx: 3, day: 5,  hour: 11 },  // Тэмүүлэн → Энхтуяа
    { student: s(2), mentorIdx: 6, day: 7,  hour: 11 },  // Тэмүүлэн → Мөнхцэцэг
    { student: s(3), mentorIdx: 4, day: 4,  hour: 9  },  // Билгүүн → Ганбаатар
    { student: s(3), mentorIdx: 8, day: 11, hour: 10 },  // Билгүүн → Энхбаяр
    { student: s(4), mentorIdx: 2, day: 5,  hour: 8  },  // Энхжин → Батбаяр
    { student: s(4), mentorIdx: 0, day: 12, hour: 9  },  // Энхжин → Мөнхбаяр
    { student: s(5), mentorIdx: 7, day: 4,  hour: 9  },  // Гэрэлмаа → Батсүх
    { student: s(5), mentorIdx: 1, day: 11, hour: 10 },  // Гэрэлмаа → Сарантуяа
  ];

  for (const fb of CONFIRMED_MAY) {
    const slotId = findSlot(maySlots, fb.mentorIdx, fb.day, fb.hour);
    await prisma.availabilitySlot.update({ where: { id: slotId }, data: { isBooked: true } });
    const booking = await prisma.booking.create({ data: {
      studentId: fb.student.studentProfileId, slotId,
      status: BookingStatus.CONFIRMED, paymentStatus: PaymentStatus.PAID,
      meetingLink: meetUrl(), isConfirmedByStudent: true,
      createdAt: dt(2026, 4, 27, 10),
    }});
    await prisma.transaction.create({ data: {
      bookingId: booking.id, amount: mentorRefs[fb.mentorIdx].hourlyRate,
      currency: 'MNT', paymentMethod: pm(), status: PaymentStatus.PAID,
      transactionDate: dt(2026, 4, 26, 15),
    }});
  }
  console.log('✅ May 2026 CONFIRMED future bookings ready');

  // ═══════════════════════════════════════════════════════════════════════════
  // 9.  PENDING BOOKINGS (May 2026) — төлбөр хийгдэх хүлээлттэй
  // ═══════════════════════════════════════════════════════════════════════════
  const PENDING_MAY: Array<{ student: StudentRef; mentorIdx: number; day: number; hour: number }> = [
    { student: s(2), mentorIdx: 0, day: 19, hour: 9  },  // Тэмүүлэн → Мөнхбаяр
    { student: s(5), mentorIdx: 3, day: 18, hour: 11 },  // Гэрэлмаа → Энхтуяа
    { student: s(1), mentorIdx: 2, day: 18, hour: 8  },  // Номин → Батбаяр
  ];

  for (const pb of PENDING_MAY) {
    const slotId = findSlot(maySlots, pb.mentorIdx, pb.day, pb.hour);
    await prisma.availabilitySlot.update({ where: { id: slotId }, data: { isBooked: true } });
    await prisma.booking.create({ data: {
      studentId: pb.student.studentProfileId, slotId,
      status: BookingStatus.PENDING, paymentStatus: PaymentStatus.PENDING,
      createdAt: dt(2026, 4, 28, 9),
    }});
  }
  console.log('✅ May 2026 PENDING bookings ready');

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. CHAT CHANNELS + MESSAGES
  // ═══════════════════════════════════════════════════════════════════════════
  // Idempotent: delete existing test chat data first
  await prisma.message.deleteMany({
    where: { channel: { OR: [
      { participantAId: { in: studentRefs.map(x => x.userId) } },
      { participantBId: { in: studentRefs.map(x => x.userId) } },
    ]}},
  });
  await prisma.chatChannel.deleteMany({
    where: { OR: [
      { participantAId: { in: studentRefs.map(x => x.userId) } },
      { participantBId: { in: studentRefs.map(x => x.userId) } },
    ]},
  });

  type MsgLine = { who: 'student' | 'mentor'; content: string; dayOff: number; hour: number; min: number };
  const BASE_APR = 20; // April 20, 2026

  const CHATS: Array<{ student: StudentRef; mentor: MentorRef; msgs: MsgLine[] }> = [
    // Номин ↔ Д. Мөнхбаяр
    { student: s(1), mentor: m(1), msgs: [
      { who: 'student', content: 'Сайн байна уу, Мөнхбаяр гуай! Harvard-д элсэхийг зорьж байна. Таны туршлагаас суралцах боломж авахыг хүсч байна.', dayOff: 0, hour: 15, min: 30 },
      { who: 'mentor', content: 'Сайн байна уу Номин! Маш сайн зорилго. Common App эссэнийхээ хандлагыг аль хэдийн бодсон уу? Яагаад Harvard гэдэг асуулт тогтмол гардаг.', dayOff: 0, hour: 15, min: 55 },
      { who: 'student', content: 'Тийм ч их бодоогүй байна. CS чиглэлийг сонирхдог. Монгол хүний CS-д хийж чадах ажлуудыг харуулмаар байна.', dayOff: 0, hour: 16, min: 10 },
      { who: 'mentor', content: '"Show, don\'t tell" зарчмыг хэрэглэ. Монголдоо хийсэн конкрет проект байгаа юу? Агаарын чанарыг хэмждэг IoT device гэх мэт.', dayOff: 0, hour: 16, min: 30 },
      { who: 'student', content: 'IoT device хийсэн байдаг! UB-ийн агаарын бохирдлыг хэмждэг. Тэрийгээ эссэнд бичиж болох уу?', dayOff: 1, hour: 9, min: 0 },
      { who: 'mentor', content: '"Утаатай Улаанбаатарт IoT шийдэл" — Admission хороондынхонд маш анхааралтай харагдана! Technical detail-с илүү "яагаад энэ чухал байсан" гэдгийг онцол.', dayOff: 1, hour: 9, min: 45 },
      { who: 'student', content: 'Баярлалаа! 5-р сарын 5-нд 9 цагт уулзаж нарийн ярилцъя 🙌', dayOff: 1, hour: 10, min: 0 },
      { who: 'mentor', content: 'Болж байна! Эссэний анхны draft-аа урьдчилж бичээд надад илгэ. Хамт ажиллацгаая.', dayOff: 1, hour: 10, min: 15 },
    ]},

    // Номин ↔ О. Дөлгөөн
    { student: s(1), mentor: m(6), msgs: [
      { who: 'student', content: 'Дөлгөөн гуай, CS portfolio хэрхэн хийх вэ гэдэг талаар зөвлөгөө авмаар байна.', dayOff: 5, hour: 11, min: 0 },
      { who: 'mentor', content: 'GitHub дээр 3-5 жижиг, бодит ашиглагдах боломжтой проект байршуул. README маш чухал — асуудал, шийдэл, технологиор бич.', dayOff: 5, hour: 11, min: 30 },
      { who: 'student', content: 'Монголтой холбоотой проект хийвэл илүү үнэтэй байх уу?', dayOff: 5, hour: 12, min: 0 },
      { who: 'mentor', content: 'Тийм! Бодит нийгмийн асуудлыг шийдсэн проект маш үнэтэй. Агаарын чанар, нийтийн тээвэр, эрүүл мэндийн мэдээлэл — Монголд хамааралтай topic-уудыг сонго.', dayOff: 5, hour: 12, min: 25 },
      { who: 'student', content: '5-р сарын 6-нд 10 цагт уулзаж нарийн ярилцъя!', dayOff: 5, hour: 12, min: 45 },
    ]},

    // Г. Тэмүүлэн ↔ Н. Энхтуяа
    { student: s(2), mentor: m(4), msgs: [
      { who: 'student', content: 'Энхтуяа гуай сайн байна уу! NUS-д Business суралцах хүслэй бий. Та NUS-д яаж орсон бэ?', dayOff: 0, hour: 9, min: 0 },
      { who: 'mentor', content: 'SAT 1480, IELTS 7.5 авсаны дараа application хийсэн. NUS Business-т leadership experience маш чухал. Дебат клуб, volunteer байгаа юу?', dayOff: 0, hour: 9, min: 30 },
      { who: 'student', content: 'Дебат клубын ерөнхийлөгч байсан, 3 жил хийсэн! SAT 1350 байна, нэмэгдүүлэх боломжтой юу?', dayOff: 0, hour: 9, min: 50 },
      { who: 'mentor', content: '1450+ болговол маш сайн. Khan Academy дээр жил дутум practice test хий. Дебат club нь Business admission-д хамгийн хүчтэй asset болно!', dayOff: 0, hour: 10, min: 15 },
      { who: 'student', content: 'Маш их баярлалаа! 5-р сарын 5-нд 11 цагт уулзана уу?', dayOff: 1, hour: 8, min: 0 },
      { who: 'mentor', content: 'Болж байна! CV болон эссэний анхны draft-аа урьдчилж бэлдээрэй.', dayOff: 1, hour: 8, min: 20 },
    ]},

    // Г. Тэмүүлэн ↔ С. Мөнхцэцэг
    { student: s(2), mentor: m(7), msgs: [
      { who: 'student', content: 'Мөнхцэцэг гуай, Солонгост суралцах сонирхолтой байна. KGSP тэтгэлэгт хэрхэн нэр дэвших вэ?', dayOff: 3, hour: 14, min: 0 },
      { who: 'mentor', content: 'KGSP бол Korean Government Scholarship. Жил бүр 3-р сард дансан хүлээн авдаг. TOPIK 3-р түвшин шаардлагатай. Одоо TOPIK хэдэн түвшин вэ?', dayOff: 3, hour: 14, min: 30 },
      { who: 'student', content: 'Хоёр дахь түвшин. Гурав дахь хүрэхэд хэр хугацаа шаардлагатай вэ?', dayOff: 3, hour: 14, min: 50 },
      { who: 'mentor', content: '6 сараас 1 жил хичнээн intensively суралцахаас хамаарна. 5-р сарын 7-нд уулзаж study plan гаргацгаая!', dayOff: 3, hour: 15, min: 10 },
    ]},

    // Н. Билгүүн ↔ Т. Ганбаатар
    { student: s(3), mentor: m(5), msgs: [
      { who: 'student', content: 'Ганбаатар гуай, ETH Zurich-д Mechanical Engineering сонирхож байна. IB Physics HL, Math HL 7/7 авсан.', dayOff: 0, hour: 10, min: 0 },
      { who: 'mentor', content: '7/7 бол маш сайн! ETH-ийн Mechanical Engineering маш өрсөлдөөнтэй. Motivation Letter дотор яагаад ETH-ийг сонгосон, ямар specific research хийхийг хүссэн гэдгийг тайлбарлах хэрэгтэй.', dayOff: 0, hour: 10, min: 30 },
      { who: 'student', content: 'Thermal energy болон нарны эрчим хүчний чиглэлд судалгаа хийхийг хүсэж байна. ETH-д ямар professor-тэй холбогдох вэ?', dayOff: 0, hour: 10, min: 50 },
      { who: 'mentor', content: 'ETH-ийн Energy Science & Technology department-ийн professor-уудыг хар. Email бичихдээ тэдний paper-ийг уншаад specific асуулт тавь — ерөнхий "admission хийнэ" гэж биш.', dayOff: 0, hour: 11, min: 10 },
      { who: 'student', content: '5-р сарын 4-нд 9 цагт уулзаж нарийн ярилцъя!', dayOff: 1, hour: 8, min: 0 },
    ]},

    // Д. Энхжин ↔ Б. Батбаяр
    { student: s(4), mentor: m(3), msgs: [
      { who: 'student', content: 'Батбаяр гуай! Oxford Law-д орох хүслэй маш хүчтэй. Personal Statement хэрхэн эхэлж бичих вэ?', dayOff: 0, hour: 13, min: 0 },
      { who: 'mentor', content: 'Oxford Law-ийн PS дотор: 1) ном болон кейсийн дүн шинжилгээ, 2) нийгмийн шударга ёсны хүсэл тэмүүлэл, 3) super-curricular activity онцолж бич. Ямар хуулийн ном уншсан бэ?', dayOff: 0, hour: 13, min: 30 },
      { who: 'student', content: '"Just Mercy" болон "The Rule of Law" уншсан. Монголын мэтгэлцээнд 2 жил оролцсон.', dayOff: 0, hour: 13, min: 50 },
      { who: 'mentor', content: 'Маш сайн! "Just Mercy"-г нийгмийн шударга ёсны тухай хэсэгт ашиглаарай. Мэтгэлцээний туршлага нь critical thinking-ийг харуулна. 5-р сарын 5-нд 8 цагт уулзаж PS-ийг хамт бичье.', dayOff: 0, hour: 14, min: 15 },
      { who: 'student', content: 'Тэсэн ядан хүлээж байна 📚', dayOff: 0, hour: 14, min: 20 },
      { who: 'mentor', content: 'Уулзалтаас өмнө UCAS personal statement-ийн guidelines-ийг уншаарай. 4000 character limit бий.', dayOff: 0, hour: 14, min: 35 },
    ]},

    // О. Гэрэлмаа ↔ Х. Батсүх
    { student: s(5), mentor: m(8), msgs: [
      { who: 'student', content: 'Батсүх гуай, Хятадад Medicine суралцахыг хүсч байна. CSC тэтгэлэгт хэрхэн нэр дэвших вэ?', dayOff: 0, hour: 9, min: 0 },
      { who: 'mentor', content: 'CSC-д: гадаад паспорт, дунд сургуулийн хуулга, 2 зөвлөмжийн захидал, эрүүл мэндийн гэрчилгээ, судалгааны төлөвлөгөө шаардлагатай. HSK-ийн түвшин хэд вэ?', dayOff: 0, hour: 9, min: 30 },
      { who: 'student', content: 'HSK 3 байна. Медицинд HSK хэдэн түвшин шаардлагатай вэ?', dayOff: 0, hour: 9, min: 45 },
      { who: 'mentor', content: 'Хятадаар суралцах Medicine-д HSK 5-6 шаардлагатай. Гэхдээ Англи хэлний програмд HSK 4 хангалттай. 5-р сарын 4-нд 9 цагт уулзаж нарийн ярилцъя!', dayOff: 0, hour: 10, min: 0 },
    ]},

    // О. Гэрэлмаа ↔ Э. Сарантуяа
    { student: s(5), mentor: m(2), msgs: [
      { who: 'student', content: 'Сарантуяа гуай! Stanford Pre-Med-д орохын тулд research experience яаж олох вэ?', dayOff: 7, hour: 16, min: 0 },
      { who: 'mentor', content: 'ШУТИС эсвэл АЧИС-д лаборатори байдаг. PubMed дээр судалгаа хийгч Монголын эмч судлаачид байдаг — тэдэнд email бич.', dayOff: 7, hour: 16, min: 30 },
      { who: 'student', content: 'Online clinical research program байдаг уу? Улаанбаатарт амьдардаг.', dayOff: 7, hour: 16, min: 50 },
      { who: 'mentor', content: 'Coursera дээр Johns Hopkins-ийн Clinical Research Specialization бий. 5-р сарын 11-нд 10 цагт уулзаж detail ярилцъя!', dayOff: 7, hour: 17, min: 10 },
      { who: 'student', content: 'Гайхалтай! Заавал уулзана 🙏', dayOff: 7, hour: 17, min: 20 },
    ]},

    // Н. Билгүүн ↔ А. Энхбаяр
    { student: s(3), mentor: m(9), msgs: [
      { who: 'student', content: 'Энхбаяр гуай, Data Science нь Mechanical Engineering-тэй хэрхэн нийцэх вэ?', dayOff: 4, hour: 14, min: 0 },
      { who: 'mentor', content: 'Simulation, CFD, smart manufacturing салбарт ML-г эрчимтэй ашигладаг болсон. Engineering + DS бол 2030-ийн хамгийн эрэлттэй мэргэжил!', dayOff: 4, hour: 14, min: 30 },
      { who: 'student', content: 'Python мэддэг. Edinburgh-д Data Science суралцах боломжтой юу?', dayOff: 4, hour: 14, min: 50 },
      { who: 'mentor', content: 'Edinburgh-д MSc Data Science & Engineering — Mechanical Engineering background-тайд тохирно. IELTS 6.5+ шаардлагатай. 5-р сарын 11-нд 10 цагт уулзаж нарийн ярилцъя!', dayOff: 4, hour: 15, min: 10 },
    ]},
  ];

  for (const chat of CHATS) {
    const channel = await prisma.chatChannel.create({ data: {
      participantAId: chat.student.userId, participantBId: chat.mentor.userId,
    }});
    for (const msg of chat.msgs) {
      const senderId = msg.who === 'student' ? chat.student.userId : chat.mentor.userId;
      const absDay = BASE_APR + msg.dayOff;
      const [yr, mo, d] = absDay > 30
        ? [2026, 5, absDay - 30]
        : [2026, 4, absDay];
      await prisma.message.create({ data: {
        channelId: channel.id, senderId, content: msg.content, isRead: true,
        createdAt: dt(yr, mo, d, msg.hour, msg.min),
      }});
    }
  }
  console.log('✅ Chat channels and messages ready');

  // ═══════════════════════════════════════════════════════════════════════════
  // 11. SAVED MENTORS
  // ═══════════════════════════════════════════════════════════════════════════
  const SAVED = [
    { student: s(1), mentor: m(1) }, { student: s(1), mentor: m(6) },
    { student: s(2), mentor: m(4) }, { student: s(2), mentor: m(7) },
    { student: s(3), mentor: m(5) }, { student: s(3), mentor: m(9) },
    { student: s(4), mentor: m(3) }, { student: s(4), mentor: m(1) },
    { student: s(5), mentor: m(8) }, { student: s(5), mentor: m(2) },
  ];
  for (const sv of SAVED) {
    await prisma.savedMentor.upsert({
      where: { studentId_mentorId: { studentId: sv.student.studentProfileId, mentorId: sv.mentor.mentorProfileId } },
      update: {},
      create: { studentId: sv.student.studentProfileId, mentorId: sv.mentor.mentorProfileId },
    });
  }
  console.log('✅ Saved mentors ready');

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log('\n🎉 Seed complete!\n');
  console.log('━━━ MENTORS (нууц үг: 123456+) ━━━');
  MENTORS.forEach((md, i) => console.log(`  mentor${i+1}: ${md.email}  →  ${md.displayName}  (${md.university}, ₮${md.hourlyRate.toLocaleString()}/цаг)`));
  console.log('\n━━━ STUDENTS (нууц үг: 123456+) ━━━');
  STUDENTS.forEach((sd, i) => console.log(`  student${i+1}: ${sd.email}  →  ${sd.displayName}  (${sd.targetCountry} · ${sd.targetMajor})`));
  console.log('\n━━━ PARENTS (нууц үг: 123456+) ━━━');
  PARENTS.forEach((pd, i) => console.log(`  parent${i+1}: ${pd.email}  →  ${pd.displayName}`));
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
