import { WompiService } from './wompi.service';

describe('WompiService', () => {
    let svc: WompiService;

    beforeEach(() => {
        process.env.WOMPI_BASE_URL = 'https://api-sandbox.wompi.dev/v1';
        process.env.WOMPI_PRIVATE_KEY = 'prv_test_key';
        svc = new WompiService();
    });

    afterEach(() => {
        jest.restoreAllMocks();
        delete process.env.WOMPI_BASE_URL;
        delete process.env.WOMPI_PRIVATE_KEY;
    });

    // ── createTransaction() ───────────────────────────────────────────────────

    describe('createTransaction()', () => {
        it('retorna el JSON de Wompi cuando la respuesta es OK', async () => {
            const wompiResponse = { data: { id: 'wompi_trx_1', status: 'PENDING' } };
            jest.spyOn(global, 'fetch').mockResolvedValue({
                ok: true,
                json: jest.fn().mockResolvedValue(wompiResponse),
            } as any);

            const result = await svc.createTransaction({ amount_in_cents: 90000 });

            expect(global.fetch).toHaveBeenCalledWith(
                'https://api-sandbox.wompi.dev/v1/transactions',
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        Authorization: 'Bearer prv_test_key',
                    }),
                }),
            );
            expect(result).toEqual(wompiResponse);
        });

        it('lanza Error con status y body cuando Wompi responde error HTTP', async () => {
            jest.spyOn(global, 'fetch').mockResolvedValue({
                ok: false,
                status: 422,
                text: jest.fn().mockResolvedValue('Unprocessable Entity'),
            } as any);

            await expect(svc.createTransaction({ amount_in_cents: 90000 })).rejects.toThrow(
                'Wompi error: 422 Unprocessable Entity',
            );
        });
    });
});
