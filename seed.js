const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);
  const user = await prisma.users.upsert({
    where: { nik: '123456789' },
    update: {},
    create: {
      nik: '123456789',
      name: 'Test Valet',
      password: passwordHash,
      role: 'VALET',
    },
  });
  console.log('User created:', user);
  
  const customer = await prisma.customers.create({
    data: {
      name: 'PT Dummy Transport',
      phone: '08123456789'
    }
  });
  
  const vehicle = await prisma.vehicles.create({
    data: {
      customer_id: customer.id,
      license_plate: 'B 1234 WAC',
      model: 'Hino 500',
    }
  });
  console.log('Vehicle created:', vehicle);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
