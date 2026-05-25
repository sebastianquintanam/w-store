import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class DeliveriesService {
    constructor(private prisma: PrismaService) {}

    async findByTransactionId(transactionId: string) {
        const delivery = await this.prisma.delivery.findUnique({
            where: { transactionId },
        });
        if (!delivery) throw new NotFoundException(`Delivery not found for transaction ${transactionId}`);
        return delivery;
    }
}
