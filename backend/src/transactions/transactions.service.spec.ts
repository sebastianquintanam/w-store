import { BadRequestException, NotFoundException } from '@nestjs/common';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaService } from '../prisma.service';
import { TransactionsService } from './transactions.service';
import { WompiService } from '../wompi/wompi.service';

describe('TransactionsService', () => {
    let svc: TransactionsService;
    let prisma: DeepMockProxy<PrismaService>;
    let wompi: DeepMockProxy<WompiService>;
    let txMock: any;

    beforeEach(() => {
        prisma = mockDeep<PrismaService>();
        wompi = mockDeep<WompiService>();
        svc = new TransactionsService(prisma, wompi);

        // ── Mocks para create() (fuera de DB transaction) ──────────────────
        prisma.product.findUnique.mockResolvedValue({
            id: 'prod_1',
            name: 'Zapatillas',
            priceCents: 90000,
            stock: 3,
        } as any);

        prisma.customer.upsert.mockResolvedValue({
            id: 'cus_1',
            email: 'sebas@test.com',
            fullName: 'Sebastián',
            address: 'Calle 123 #45-67',
        } as any);

        prisma.transaction.create.mockResolvedValue({
            id: 'trx_1',
            status: 'PENDING',
            productId: 'prod_1',
            customerId: 'cus_1',
            amountCents: 96000,
            baseFeeCents: 1000,
            deliveryCents: 5000,
        } as any);

        // ── txMock: simula el objeto "tx" dentro del callback de $transaction ──
        txMock = {
            transaction: {
                findUnique: jest.fn().mockResolvedValue({
                    id: 'trx_1',
                    status: 'PENDING',
                    productId: 'prod_1',
                    customerId: 'cus_1',
                }),
                update: jest.fn().mockResolvedValue({
                    id: 'trx_1',
                    status: 'APPROVED',
                    productId: 'prod_1',
                    customerId: 'cus_1',
                }),
            },
            product: {
                update: jest.fn().mockResolvedValue({ id: 'prod_1', stock: 2 }),
            },
            customer: {
                findUniqueOrThrow: jest.fn().mockResolvedValue({ address: 'Calle 123 #45-67' }),
            },
            delivery: {
                create: jest.fn().mockResolvedValue({
                    id: 'del_1',
                    transactionId: 'trx_1',
                    customerId: 'cus_1',
                    address: 'Calle 123 #45-67',
                    status: 'PENDING_SHIPMENT',
                }),
            },
        };

        prisma.$transaction.mockImplementation(async (cb: any) => cb(txMock));
    });

    // ── create() ─────────────────────────────────────────────────────────────

    describe('create()', () => {
        const dto = {
            productId: 'prod_1',
            deliveryCents: 5000,
            customer: {
                email: 'sebas@test.com',
                fullName: 'Sebastián',
                address: 'Calle 123 #45-67',
            },
        };

        it('crea transacción PENDING y hace upsert del cliente', async () => {
            const res = await svc.create(dto);
            expect(prisma.transaction.create).toHaveBeenCalled();
            expect(res).toBeDefined();
        });

        it('lanza NotFoundException si el producto no existe', async () => {
            prisma.product.findUnique.mockResolvedValueOnce(null);
            await expect(svc.create({ ...dto, productId: 'no_existe' }))
                .rejects.toThrow(NotFoundException);
        });

        it('lanza BadRequestException si el stock es 0', async () => {
            prisma.product.findUnique.mockResolvedValueOnce({
                id: 'prod_1', name: 'X', priceCents: 90000, stock: 0,
            } as any);
            await expect(svc.create(dto)).rejects.toThrow(BadRequestException);
        });
    });

    // ── finalize() ────────────────────────────────────────────────────────────

    describe('finalize()', () => {
        it('APPROVED: descuenta stock y crea Delivery dentro de la misma DB transaction', async () => {
            const res = await svc.finalize('trx_1', 'APPROVED');

            expect(txMock.product.update).toHaveBeenCalledWith({
                where: { id: 'prod_1' },
                data: { stock: { decrement: 1 } },
            });
            expect(txMock.customer.findUniqueOrThrow).toHaveBeenCalledWith({
                where: { id: 'cus_1' },
                select: { address: true },
            });
            expect(txMock.delivery.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    transactionId: 'trx_1',
                    customerId: 'cus_1',
                    address: 'Calle 123 #45-67',
                    status: 'PENDING_SHIPMENT',
                }),
            });
            expect(res).toHaveProperty('delivery');
            expect((res as any).delivery.status).toBe('PENDING_SHIPMENT');
        });

        it('DECLINED: no descuenta stock ni crea Delivery', async () => {
            const res = await svc.finalize('trx_1', 'DECLINED');

            expect(txMock.product.update).not.toHaveBeenCalled();
            expect(txMock.delivery.create).not.toHaveBeenCalled();
            expect(res).not.toHaveProperty('delivery');
        });

        it('ERROR: no descuenta stock ni crea Delivery', async () => {
            const res = await svc.finalize('trx_1', 'ERROR');

            expect(txMock.product.update).not.toHaveBeenCalled();
            expect(txMock.delivery.create).not.toHaveBeenCalled();
            expect(res).not.toHaveProperty('delivery');
        });

        it('doble finalización: ya estaba APPROVED → retorno anticipado sin updates ni Delivery', async () => {
            txMock.transaction.findUnique.mockResolvedValueOnce({
                id: 'trx_1',
                status: 'APPROVED',
                productId: 'prod_1',
                customerId: 'cus_1',
            });

            const res = await svc.finalize('trx_1', 'APPROVED');

            expect(txMock.transaction.update).not.toHaveBeenCalled();
            expect(txMock.product.update).not.toHaveBeenCalled();
            expect(txMock.delivery.create).not.toHaveBeenCalled();
            expect((res as any).message).toBe('Ya finalizada');
        });
    });
});
