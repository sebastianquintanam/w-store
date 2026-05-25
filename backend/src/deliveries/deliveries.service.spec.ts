import { NotFoundException } from '@nestjs/common';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaService } from '../prisma.service';
import { DeliveriesService } from './deliveries.service';

describe('DeliveriesService', () => {
    let svc: DeliveriesService;
    let prisma: DeepMockProxy<PrismaService>;

    const delivery = {
        id: 'del_1',
        transactionId: 'trx_1',
        customerId: 'cus_1',
        address: 'Calle 123 #45-67',
        status: 'PENDING_SHIPMENT',
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    beforeEach(() => {
        prisma = mockDeep<PrismaService>();
        svc = new DeliveriesService(prisma);
    });

    // ── findByTransactionId() ─────────────────────────────────────────────────

    describe('findByTransactionId()', () => {
        it('retorna la entrega si existe para esa transacción', async () => {
            prisma.delivery.findUnique.mockResolvedValue(delivery as any);

            const result = await svc.findByTransactionId('trx_1');

            expect(prisma.delivery.findUnique).toHaveBeenCalledWith({
                where: { transactionId: 'trx_1' },
            });
            expect(result).toMatchObject({ id: 'del_1', status: 'PENDING_SHIPMENT', transactionId: 'trx_1' });
        });

        it('lanza NotFoundException con mensaje correcto si no existe', async () => {
            prisma.delivery.findUnique.mockResolvedValue(null);

            await expect(svc.findByTransactionId('no_existe')).rejects.toThrow(NotFoundException);
            await expect(svc.findByTransactionId('no_existe')).rejects.toThrow(
                'Delivery not found for transaction no_existe',
            );
        });
    });
});
