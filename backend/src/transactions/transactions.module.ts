import { Module } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { PrismaService } from '../prisma.service';
import { WompiModule } from '../wompi/wompi.module';
import { ProductsModule } from '../products/products.module';

@Module({
    controllers: [TransactionsController],
    providers: [TransactionsService, PrismaService],
    imports: [WompiModule, ProductsModule],
})
export class TransactionsModule { }
