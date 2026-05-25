import { Injectable, NotFoundException } from '@nestjs/common';
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

    async findOne(id: string) {
        const product = await this.prisma.product.findUnique({
            where: { id },
            select: { id: true, name: true, description: true, priceCents: true, stock: true },
        });
        if (!product) throw new NotFoundException('Product not found');
        return product;
    }
}
