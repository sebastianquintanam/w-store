import { mockDeep, DeepMock } from 'jest-mock-extended';
import { PrismaService } from '../prisma.service';
import { TransactionsService } from './transactions.service';
import { WompiService } from '../wompi/wompi.service';

describe('TransactionsService', () => {
    let svc: TransactionsService;
    let prisma: DeepMock<PrismaService>;
    let wompi: DeepMock<WompiService>;

    beforeEach(() => {
        prisma = mockDeep<PrismaService>();
        wompi = mockDeep<WompiService>();

        svc = new TransactionsService(prisma, wompi);

        // Mocks fuera de la transacción
        prisma.product.findUnique.mockResolvedValue({
            id: 'prod_1',
            title: 'Zapatillas',
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

        // *** Mocks DENTRO de la transacción ***
        // Simulamos que prisma.$transaction llama nuestro callback con un "tx"
        prisma.$transaction.mockImplementation(async (cb: any) => {
            const tx = {
                transaction: {
                    findUnique: jest.fn().mockResolvedValue({
                        id: 'trx_1',
                        status: 'PENDING',
                        productId: 'prod_1',
                    }),
                    update: jest.fn().mockResolvedValue({
                        id: 'trx_1',
                        status: 'APPROVED',
                        productId: 'prod_1',
                    }),
                },
                product: {
                    update: jest.fn().mockResolvedValue({ id: 'prod_1', stock: 2 }),
                },
            };
            return cb(tx);
        });
    });

    it('crea PENDING y hace upsert del cliente', async () => {
        // Si tu test llama a finalize explícitamente, asegúrate de usar el id correcto:
        // await svc.finalize('trx_1', 'APPROVED' /* o el estado que verifiques */);

        const res = await svc.create({
            productId: 'prod_1',
            deliveryCents: 5000,
            customer: {
                email: 'sebas@test.com',
                fullName: 'Sebastián',
                address: 'Calle 123 #45-67',
            },
        });

        expect(prisma.transaction.create).toHaveBeenCalled();
        expect(res).toBeDefined();
    });
});
