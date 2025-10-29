import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');
    await prisma.product.deleteMany();

    await prisma.product.createMany({
        data: [
            { name: 'Audífonos Bluetooth', description: 'Over-ear con cancelación de ruido', priceCents: 199900, stock: 5 },
            { name: 'Mouse Inalámbrico', description: 'Con sensor óptico y 2.4G', priceCents: 89900, stock: 10 },
            { name: 'Teclado Mecánico', description: 'Switches rojos retroiluminado', priceCents: 249900, stock: 3 },
        ],
    });

    console.log('✅ Seed completado.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
