// backend/src/transactions/transactions.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { WompiService } from '../wompi/wompi.service';

type FinalStatus = 'APPROVED' | 'DECLINED' | 'ERROR';

@Injectable()
export class TransactionsService {
    constructor(
        private prisma: PrismaService,
        private wompi: WompiService,
    ) { }

    private readonly BASE_FEE = 1000;

    /**
     * Crea una transacción PENDING. Si USE_WOMPI=true, intenta llamar a Wompi sandbox
     * y finaliza en APPROVED/DECLINED; si falla, deja PENDING y retorna la trx creada.
     */
    async create(dto: CreateTransactionDto) {
        // 1) Producto válido y con stock
        const product = await this.prisma.product.findUnique({
            where: { id: dto.productId },
        });
        if (!product) throw new NotFoundException('Product not found');
        if (product.stock <= 0) throw new BadRequestException('Insufficient stock');

        // 2) Upsert de Customer por email (único)
        const customer = await this.prisma.customer.upsert({
            where: { email: dto.customer.email },
            create: {
                email: dto.customer.email,
                fullName: dto.customer.fullName,
                address: dto.customer.address,
            },
            update: {
                fullName: dto.customer.fullName,
                address: dto.customer.address,
            },
        });

        // 3) Montos
        const amountCents = product.priceCents + dto.deliveryCents + this.BASE_FEE;

        // 4) Crea transacción local en PENDING
        const trx = await this.prisma.transaction.create({
            data: {
                status: 'PENDING',
                productId: product.id,
                customerId: customer.id,
                amountCents,
                baseFeeCents: this.BASE_FEE,
                deliveryCents: dto.deliveryCents,
            },
        });

        // 5) Hook opcional a Wompi
        const useWompi = process.env.USE_WOMPI === 'true';
        if (useWompi) {
            try {
                const wompiPayload = {
                    amount_in_cents: amountCents,
                    currency: 'COP',
                    customer_email: customer.email,
                    // Usamos el id interno como referencia
                    reference: trx.id,
                    // En un flujo real, aquí se incluye el método de pago tokenizado (sandbox)
                };

                const wompiRes = await this.wompi.createTransaction(wompiPayload);

                // Mapeo simple para sandbox (ajustaremos cuando conectemos el flujo real)
                const approved =
                    wompiRes?.data?.status === 'APPROVED' || wompiRes?.status === 'APPROVED';

                return this.finalize(trx.id, approved ? 'APPROVED' : 'DECLINED');
            } catch (err) {
                // Si Wompi falla, dejamos PENDING
                return {
                    message: 'Transacción creada en estado PENDING (Wompi no finalizó)',
                    transaction: trx,
                };
            }
        }

        // Si USE_WOMPI=false: dejamos PENDING y devolvemos la trx
        return {
            message: 'Transacción creada en estado PENDING',
            transaction: trx,
        };
    }

    /**
     * Finaliza la transacción y, si se aprueba, descuenta stock.
     */
    async finalize(id: string, status: FinalStatus) {
        return this.prisma.$transaction(async (tx) => {
            const current = await tx.transaction.findUnique({ where: { id } });
            if (!current) throw new NotFoundException('Transaction not found');

            if (current.status !== 'PENDING') {
                return { message: 'Ya finalizada', transaction: current };
            }

            const updated = await tx.transaction.update({
                where: { id },
                data: { status },
            });

            if (status === 'APPROVED') {
                await tx.product.update({
                    where: { id: updated.productId },
                    data: { stock: { decrement: 1 } },
                });
            }

            return {
                message:
                    status === 'APPROVED'
                        ? 'Transacción aprobada y stock actualizado'
                        : `Transacción finalizada con estado ${status}`,
                transaction: updated,
            };
        });
    }

    /**
     * Consulta una transacción por id.
     */
    async findOne(id: string) {
        const tx = await this.prisma.transaction.findUnique({ where: { id } });
        if (!tx) throw new NotFoundException('Transaction not found');
        return tx;
    }
}
