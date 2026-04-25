const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const result = await prisma.post.updateMany({ data: { isPublished: true } });
  console.log('Updated posts count:', result.count);
}
main().finally(() => prisma.$disconnect());
