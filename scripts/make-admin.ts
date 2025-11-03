import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function makeAdmin(email: string) {
  try {
    const user = await prisma.user.update({
      where: { email },
      data: { admin: true },
      select: { id: true, email: true, fullName: true, admin: true }
    });
    
    console.log('✅ Usuario actualizado como admin:', user);
  } catch (error) {
    console.error('❌ Error al hacer admin al usuario:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Obtener email desde argumentos de línea de comandos
const email = process.argv[2];

if (!email) {
  console.error('❌ Debes proporcionar un email como argumento');
  console.log('Uso: npx ts-node scripts/make-admin.ts usuario@ejemplo.com');
  process.exit(1);
}

makeAdmin(email);