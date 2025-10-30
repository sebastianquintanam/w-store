import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class TransactionsService {
    constructor(private prisma: PrismaService) { }

    async create(data: {
        productId: string;
        customer: { fullName: string; email: string; address: string };
        deliveryCents: number;
    }) {
        // Buscar producto
        const product = await this.prisma.product.findUnique({ where: { id: data.productId } });
        if (!product) throw new NotFoundException('Producto no encontrado');

        // Crear o actualizar cliente
        const customer = await this.prisma.customer.upsert({
            where: { email: data.customer.email },
            update: { fullName: data.customer.fullName, address: data.customer.address },
            create: data.customer,
        });

        // Crear transacción en estado PENDING
        const baseFeeCents = 1000; // Ejemplo de fee fija
        const amountCents = product.priceCents + baseFeeCents + data.deliveryCents;

        const transaction = await this.prisma.transaction.create({
            data: {
                status: 'PENDING',
                productId: product.id,
                customerId: customer.id,
                baseFeeCents,
                deliveryCents: data.deliveryCents,
                amountCents,
            },
        });

        return {
            message: 'Transacción creada en estado PENDING',
            transaction,
        };
    }

    async finalize(id: string, status: 'APPROVED' | 'DECLINED' | 'ERROR') {
        // Traer transacción + producto
        const trx = await this.prisma.transaction.findUnique({
            where: { id },
            include: { product: true },
        });
        if (!trx) throw new Error('Transaction not found');

        // Si aprueba, validar stock y descontar de forma transaccional
        if (status === 'APPROVED') {
            if (trx.product.stock <= 0) {
                throw new Error('No hay stock disponible para aprobar');
            }

            const [updatedTrx] = await this.prisma.$transaction([
                this.prisma.transaction.update({
                    where: { id },
                    data: { status, updatedAt: new Date() },
                }),
                this.prisma.product.update({
                    where: { id: trx.productId },
                    data: { stock: { decrement: 1 } },
                }),
            ]);

            return {
                message: 'Transacción aprobada y stock actualizado',
                transaction: updatedTrx,
            };
        }

        // Si no aprueba (DECLINED/ERROR), solo actualiza estado
        const updated = await this.prisma.transaction.update({
            where: { id },
            data: { status, updatedAt: new Date() },
        });

        return { message: `Transacción actualizada a ${status}`, transaction: updated };
    }
}
