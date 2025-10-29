import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ProductsService {
    constructor(private prisma: PrismaService) { }

    findAll() {
        return this.prisma.product.findMany({
            orderBy: { createdAt: 'asc' },
            select: { id: true, name: true, description: true, priceCents: true, stock: true },
        });
    }
}
