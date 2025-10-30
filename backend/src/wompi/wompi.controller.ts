// backend/src/wompi/wompi.controller.ts
import { Controller, Headers, HttpCode, Post, Req, Inject, forwardRef } from '@nestjs/common';
import { type Request } from 'express';
import * as crypto from 'crypto';
import { TransactionsService } from '../transactions/transactions.service';

type WompiWebhook = {
    event: string;
    data?: {
        transaction?: {
            id?: string;
            status?: string;        // 'APPROVED' | 'DECLINED' | 'VOIDED' | 'ERROR' | 'PENDING' ...
            reference?: string;     // nosotros enviamos "trx_<idInterno>"
        };
    };
};

@Controller('wompi')
export class WompiController {
    @Inject(forwardRef(() => TransactionsService)) private readonly txs: TransactionsService;

    /** Webhook oficial de Wompi */
    @Post('webhook')
    @HttpCode(200) // Wompi espera 2xx si lo procesaste
    async webhook(@Req() req: Request, @Headers() headers: Record<string, string>) {
        const verifyEnabled = (process.env.VERIFY_WOMPI_SIGNATURE ?? 'false') === 'true';
        const integrityKey = process.env.WOMPI_INTEGRITY_KEY ?? '';

        // 1) Verificar firma si está activada
        if (verifyEnabled) {
            // Wompi envía una firma HMAC-SHA256 del raw body en un header; probamos variantes comunes:
            const headerSig =
                headers['integrity-signature'] ||
                headers['x-integrity-signature'] ||
                headers['x-wompi-signature'] ||
                '';

            const raw = (req as any).rawBody as Buffer | undefined;
            if (!raw || !headerSig || !integrityKey) {
                // No lanzamos error 4xx para no causar reintentos infinitos; respondemos 200 "no-op"
                return { ok: true, ignored: true };
            }

            const expected = crypto.createHmac('sha256', integrityKey).update(raw).digest('hex');
            if (expected !== headerSig) {
                // Firma inválida: ignora silenciosamente (o loguea)
                return { ok: true, signature: 'invalid' };
            }
        }

        // 2) Parseo del payload
        const body = req.body as WompiWebhook;
        const tx = body?.data?.transaction;
        if (!tx) return { ok: true, ignored: true };

        // 3) Resolver el ID interno de la transacción
        // Nosotros pusimos reference: "trx_<idInterno>"
        let internalId = '';
        if (tx.reference?.startsWith('trx_')) {
            internalId = tx.reference.replace(/^trx_/, '');
        }

        // 4) Mapear estado Wompi -> interno
        const wompiStatus = (tx.status ?? '').toUpperCase();
        const final:
            | 'APPROVED'
            | 'DECLINED'
            | 'ERROR' = wompiStatus === 'APPROVED'
                ? 'APPROVED'
                : wompiStatus === 'DECLINED'
                    ? 'DECLINED'
                    : 'ERROR';

        // 5) Finalizar (idempotente: si ya no está PENDING, el servicio lo maneja)
        if (internalId) {
            await this.txs.finalize(internalId, final);
        }

        // Respuesta OK para que Wompi no reintente
        return { ok: true };
    }
}
