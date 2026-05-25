import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';

describe('TransactionsController', () => {
    let ctrl: TransactionsController;
    const svc = {
        create: jest.fn(),
        finalize: jest.fn(),
        findOne: jest.fn(),
    };

    beforeEach(async () => {
        const module = await Test.createTestingModule({
            controllers: [TransactionsController],
            providers: [{ provide: TransactionsService, useValue: svc }],
        }).compile();
        ctrl = module.get(TransactionsController);
        jest.resetAllMocks();
    });

    // ── create() ──────────────────────────────────────────────────────────────

    describe('create()', () => {
        it('llama service.create() con el DTO y retorna el resultado', async () => {
            const dto: any = {
                productId: 'prod_1',
                deliveryCents: 5000,
                customer: { fullName: 'Test User', email: 'test@test.com', address: 'Calle 1' },
            };
            const expected = { transaction: { id: 'trx_1', status: 'PENDING' } };
            svc.create.mockResolvedValue(expected);

            const result = await ctrl.create(dto);

            expect(svc.create).toHaveBeenCalledWith(dto);
            expect(result).toBe(expected);
        });
    });

    // ── findOne() ─────────────────────────────────────────────────────────────

    describe('findOne()', () => {
        it('retorna la transacción con relaciones si existe', async () => {
            const tx = { id: 'trx_1', status: 'APPROVED', product: { name: 'Zapatillas' }, customer: { email: 'test@test.com' }, delivery: null };
            svc.findOne.mockResolvedValue(tx);

            const result = await ctrl.findOne('trx_1');

            expect(svc.findOne).toHaveBeenCalledWith('trx_1');
            expect(result).toBe(tx);
        });

        it('propaga NotFoundException si la transacción no existe', async () => {
            svc.findOne.mockRejectedValue(new NotFoundException());

            await expect(ctrl.findOne('no_existe')).rejects.toThrow(NotFoundException);
        });
    });

    // ── finalize() ────────────────────────────────────────────────────────────

    describe('finalize()', () => {
        it('llama service.finalize() con id y status extraído del DTO', async () => {
            const dto: any = { status: 'APPROVED' };
            const expected = { message: 'Transacción aprobada y stock actualizado', transaction: { id: 'trx_1' } };
            svc.finalize.mockResolvedValue(expected);

            const result = await ctrl.finalize('trx_1', dto);

            expect(svc.finalize).toHaveBeenCalledWith('trx_1', 'APPROVED');
            expect(result).toBe(expected);
        });
    });
});
