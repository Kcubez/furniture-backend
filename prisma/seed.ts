import { PrismaClient, Prisma } from '../src/generated/prisma';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const userData: Prisma.UserCreateInput[] = [
  {
    phone: '1234567890',
    password: '',
    randToken: 'a;jvro[fjeai;janve93',
  },
  {
    phone: '1234567891',
    password: '',
    randToken: 'a;jvro[fjeai;janve93',
  },
  {
    phone: '1234567892',
    password: '',
    randToken: 'a;jvro[fjeai;janve93',
  },
  {
    phone: '1234567893',
    password: '',
    randToken: 'a;jvro[fjeai;janve93',
  },
  {
    phone: '1234567894',
    password: '',
    randToken: 'a;jvro[fjeai;janve93',
  },
];

async function main() {
  console.log('Seeding database...');
  const salt = await bcrypt.genSalt(10);
  const password = await bcrypt.hash('password123', 10);

  // Hash passwords and create users
  for (const user of userData) {
    user.password = password;
    await prisma.user.create({ data: user });
  }
  console.log('Users created successfully');
}

// Seed the database
main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async e => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
