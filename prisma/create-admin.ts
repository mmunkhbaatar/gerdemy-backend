/**
 * Admin хэрэглэгч үүсгэх скрипт
 * npx ts-node prisma/create-admin.ts
 */
import { PrismaClient, Role, AuthProvider } from '@prisma/client';
import * as admin from 'firebase-admin';
import { join } from 'path';

const prisma = new PrismaClient();

function initFirebase() {
  if (admin.apps.length) return;
  let sa: any;
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else {
    sa = require(join(process.cwd(), 'serviceAccountKey.json'));
  }
  admin.initializeApp({ credential: admin.credential.cert(sa) });
}

async function main() {
  console.log('🔑 Admin хэрэглэгч үүсгэж байна...');
  initFirebase();

  const email = 'admin@gerdemy.com';
  const password = '123456+';
  const displayName = 'Gerdemy Admin';

  // 1. Firebase Auth дээр үүсгэх / олох
  let uid: string;
  try {
    const existing = await admin.auth().getUserByEmail(email);
    uid = existing.uid;
    await admin.auth().updateUser(uid, { displayName, emailVerified: true });
    console.log(`✅ Firebase хэрэглэгч олдлоо: ${uid}`);
  } catch {
    const created = await admin.auth().createUser({
      email,
      password,
      displayName,
      emailVerified: true,
    });
    uid = created.uid;
    console.log(`✅ Firebase хэрэглэгч үүслээ: ${uid}`);
  }

  // 2. Нууц үгийг баталгаажуулах
  await admin.auth().updateUser(uid, { password });

  // 3. PostgreSQL дээр ADMIN role-тайгаар үүсгэх / шинэчлэх
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      role: Role.ADMIN,
      firebaseUid: uid,
      displayName,
      isActive: true,
    },
    create: {
      email,
      firebaseUid: uid,
      displayName,
      role: Role.ADMIN,
      authProvider: AuthProvider.EMAIL,
      isActive: true,
    },
  });

  console.log(`✅ DB хэрэглэгч: id=${user.id}, role=${user.role}`);
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 Admin хэрэглэгч бэлэн боллоо!');
  console.log(`   Email   : ${email}`);
  console.log(`   Нууц үг : ${password}`);
  console.log(`   Role    : ADMIN`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('❌ Алдаа:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
