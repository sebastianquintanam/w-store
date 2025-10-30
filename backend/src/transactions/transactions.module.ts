import { Module } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { PrismaService } from '../prisma.service';
import { WompiModule } from '../wompi/wompi.module';

@Module({
    controllers: [TransactionsController],
    providers: [TransactionsService, PrismaService],
    imports: [WompiModule],
})
export class TransactionsModule { }
