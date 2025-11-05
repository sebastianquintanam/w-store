import { Test, TestingModule } from '@nestjs/testing';
import { WompiController } from './wompi.controller';
import { TransactionsService } from '../transactions/transactions.service';

describe('WompiController', () => {
    let controller: WompiController;
    const txsMock = { finalize: jest.fn() };

    beforeEach(async () => {
        process.env.VERIFY_WOMPI_SIGNATURE = 'false'; // para este test
        const module: TestingModule = await Test.createTestingModule({
            controllers: [WompiController],
            providers: [{ provide: TransactionsService, useValue: txsMock }],
        }).compile();

        controller = module.get<WompiController>(WompiController);
        jest.resetAllMocks();
    });

    it('ignora si falta signature y VERIFY=false', async () => {
        const body: any = { event: 'transaction.updated', data: { transaction: { status: 'APPROVED', reference: 'trx_1' } } };
        const req: any = { rawBody: Buffer.from('{}'), body };

        const res = await controller.webhook(req, {} as any);
        expect(res.ok).toBe(true);
        expect(txsMock.finalize).toHaveBeenCalledWith('1', 'APPROVED');
    });
});

