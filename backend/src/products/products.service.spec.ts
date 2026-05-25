import { NotFoundException } from '@nestjs/common';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaService } from '../prisma.service';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
    let svc: ProductsService;
    let prisma: DeepMockProxy<PrismaService>;

    const productSelect = {
        id: 'prod_1',
        name: 'Audífonos Bluetooth',
        description: 'Sonido premium',
        priceCents: 150000,
        stock: 5,
    };

    beforeEach(() => {
        prisma = mockDeep<PrismaService>();
        svc = new ProductsService(prisma);
    });

    // ── findAll() ─────────────────────────────────────────────────────────────

    describe('findAll()', () => {
        it('retorna la lista de productos con los campos del select', async () => {
            prisma.product.findMany.mockResolvedValue([productSelect] as any);

            const result = await svc.findAll();

            expect(prisma.product.findMany).toHaveBeenCalledWith({
                orderBy: { createdAt: 'asc' },
                select: { id: true, name: true, description: true, priceCents: true, stock: true },
            });
            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({ id: 'prod_1', name: 'Audífonos Bluetooth' });
        });
    });

    // ── findOne() ─────────────────────────────────────────────────────────────

    describe('findOne()', () => {
        it('retorna el producto si existe', async () => {
            prisma.product.findUnique.mockResolvedValue(productSelect as any);

            const result = await svc.findOne('prod_1');

            expect(prisma.product.findUnique).toHaveBeenCalledWith({
                where: { id: 'prod_1' },
                select: { id: true, name: true, description: true, priceCents: true, stock: true },
            });
            expect(result).toMatchObject({ id: 'prod_1', priceCents: 150000, stock: 5 });
        });

        it('lanza NotFoundException si el producto no existe', async () => {
            prisma.product.findUnique.mockResolvedValue(null);

            await expect(svc.findOne('no_existe')).rejects.toThrow(NotFoundException);
            await expect(svc.findOne('no_existe')).rejects.toThrow('Product not found');
        });
    });
});
