import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DeliveriesController } from './deliveries.controller';
import { DeliveriesService } from './deliveries.service';

describe('DeliveriesController', () => {
    const delivery = {
        id: 'del_1',
        transactionId: 'trx_1',
        customerId: 'cus_1',
        address: 'Calle 123 #45-67',
        status: 'PENDING_SHIPMENT',
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    // ── findByTransactionId() ─────────────────────────────────────────────────

    describe('findByTransactionId()', () => {
        it('retorna la entrega si existe para esa transacción', async () => {
            const svc = { findByTransactionId: jest.fn().mockResolvedValue(delivery) };
            const module = await Test.createTestingModule({
                controllers: [DeliveriesController],
                providers: [{ provide: DeliveriesService, useValue: svc }],
            }).compile();

            const ctrl = module.get(DeliveriesController);
            const res = await ctrl.findByTransactionId('trx_1');

            expect(svc.findByTransactionId).toHaveBeenCalledWith('trx_1');
            expect(res).toMatchObject({ status: 'PENDING_SHIPMENT', transactionId: 'trx_1' });
        });

        it('lanza NotFoundException si no existe delivery para esa transacción', async () => {
            const svc = { findByTransactionId: jest.fn().mockRejectedValue(new NotFoundException()) };
            const module = await Test.createTestingModule({
                controllers: [DeliveriesController],
                providers: [{ provide: DeliveriesService, useValue: svc }],
            }).compile();

            const ctrl = module.get(DeliveriesController);
            await expect(ctrl.findByTransactionId('trx_no_existe')).rejects.toThrow(NotFoundException);
        });
    });
});
