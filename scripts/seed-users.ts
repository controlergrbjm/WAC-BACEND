import prisma from '../prisma/db';
import bcrypt from 'bcryptjs';

async function main() {
  const accounts = [
    { nik: 'SA', name: 'SA', password: '1', role: 'SERVICE_ADVISOR', dealer: 'Wira Toyota BJM' },
    { nik: 'VALET', name: 'VALET', password: '1', role: 'VALET', dealer: 'Wira Toyota BJM' },
    { nik: 'HENDRI', name: 'Hendri', password: 'BISMILLAH', role: 'MANAGER', dealer: 'Wira Toyota BJM' },
  ];

  for (const acc of accounts) {
    const hashed = await bcrypt.hash(acc.password, 10);
    const existing = await prisma.users.findUnique({ where: { nik: acc.nik } });

    if (existing) {
      await prisma.users.update({
        where: { nik: acc.nik },
        data: { name: acc.name, password: hashed, role: acc.role as any, dealer: acc.dealer },
      });
      console.log(`Updated existing user: ${acc.nik}`);
    } else {
      await prisma.users.create({
        data: { nik: acc.nik, name: acc.name, password: hashed, role: acc.role as any, dealer: acc.dealer },
      });
      console.log(`Created user: ${acc.nik}`);
    }
  }

  console.log('Done!');
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
