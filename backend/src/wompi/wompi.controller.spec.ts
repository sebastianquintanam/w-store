import { Test, TestingModule } from '@nestjs/testing';
import * as crypto from 'crypto';
import { WompiController } from './wompi.controller';
import { TransactionsService } from '../transactions/transactions.service';

describe('WompiController', () => {
    let controller: WompiController;
    const txsMock = { finalize: jest.fn() };

    beforeEach(async () => {
        process.env.VERIFY_WOMPI_SIGNATURE = 'false';
        const module: TestingModule = await Test.createTestingModule({
            controllers: [WompiController],
            providers: [{ provide: TransactionsService, useValue: txsMock }],
        }).compile();

        controller = module.get<WompiController>(WompiController);
        jest.resetAllMocks();
    });

    afterEach(() => {
        delete process.env.WOMPI_INTEGRITY_KEY;
    });

    // ── Mapeo de status (VERIFY=false) ────────────────────────────────────────

    it('ignora si falta signature y VERIFY=false', async () => {
        const body: any = { event: 'transaction.updated', data: { transaction: { status: 'APPROVED', reference: 'trx_1' } } };
        const req: any = { rawBody: Buffer.from('{}'), body };

        const res = await controller.webhook(req, {} as any);
        expect(res.ok).toBe(true);
        expect(txsMock.finalize).toHaveBeenCalledWith('1', 'APPROVED');
    });

    it('DECLINED → finaliza como DECLINED', async () => {
        const body: any = { event: 'transaction.updated', data: { transaction: { status: 'DECLINED', reference: 'trx_abc' } } };
        const req: any = { rawBody: Buffer.from('{}'), body };

        const res = await controller.webhook(req, {} as any);
        expect(res.ok).toBe(true);
        expect(txsMock.finalize).toHaveBeenCalledWith('abc', 'DECLINED');
    });

    it('estado desconocido (VOIDED) → finaliza como ERROR', async () => {
        const body: any = { event: 'transaction.updated', data: { transaction: { status: 'VOIDED', reference: 'trx_xyz' } } };
        const req: any = { rawBody: Buffer.from('{}'), body };

        const res = await controller.webhook(req, {} as any);
        expect(res.ok).toBe(true);
        expect(txsMock.finalize).toHaveBeenCalledWith('xyz', 'ERROR');
    });

    // ── Referencia sin prefijo trx_ ───────────────────────────────────────────

    it('referencia sin prefijo trx_ → no llama finalize', async () => {
        const body: any = { event: 'transaction.updated', data: { transaction: { status: 'APPROVED', reference: 'REF-9999' } } };
        const req: any = { rawBody: Buffer.from('{}'), body };

        const res = await controller.webhook(req, {} as any);
        expect(res.ok).toBe(true);
        expect(txsMock.finalize).not.toHaveBeenCalled();
    });

    // ── Verificación de firma (VERIFY=true) ───────────────────────────────────

    describe('VERIFY_WOMPI_SIGNATURE=true', () => {
        it('sin header de firma → responde { ignored: true } sin finalizar', async () => {
            process.env.VERIFY_WOMPI_SIGNATURE = 'true';
            process.env.WOMPI_INTEGRITY_KEY = 'clave-secreta';

            const body: any = { event: 'test', data: { transaction: { status: 'APPROVED', reference: 'trx_1' } } };
            const req: any = { rawBody: Buffer.from('{"event":"test"}'), body };

            const res = await controller.webhook(req, {});
            expect(res).toMatchObject({ ok: true, ignored: true });
            expect(txsMock.finalize).not.toHaveBeenCalled();
        });

        it('firma inválida → responde { signature: "invalid" } sin finalizar', async () => {
            process.env.VERIFY_WOMPI_SIGNATURE = 'true';
            process.env.WOMPI_INTEGRITY_KEY = 'clave-secreta';

            const body: any = { event: 'test', data: { transaction: { status: 'APPROVED', reference: 'trx_1' } } };
            const req: any = { rawBody: Buffer.from('{"event":"test"}'), body };

            const res = await controller.webhook(req, { 'integrity-signature': 'firma-incorrecta' });
            expect(res).toMatchObject({ ok: true, signature: 'invalid' });
            expect(txsMock.finalize).not.toHaveBeenCalled();
        });

        it('firma correcta → finaliza la transacción', async () => {
            process.env.VERIFY_WOMPI_SIGNATURE = 'true';
            const key = 'clave-secreta';
            process.env.WOMPI_INTEGRITY_KEY = key;

            const rawBody = Buffer.from('{"event":"test"}');
            const sig = crypto.createHmac('sha256', key).update(rawBody).digest('hex');
            const body: any = { event: 'test', data: { transaction: { status: 'APPROVED', reference: 'trx_42' } } };
            const req: any = { rawBody, body };

            const res = await controller.webhook(req, { 'integrity-signature': sig });
            expect(res).toMatchObject({ ok: true });
            expect(txsMock.finalize).toHaveBeenCalledWith('42', 'APPROVED');
        });
    });
});
