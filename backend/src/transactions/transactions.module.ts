import { Module, forwardRef } from '@nestjs/common';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { PrismaService } from '../prisma.service';
import { WompiModule } from '../wompi/wompi.module';

@Module({
    imports: [forwardRef(() => WompiModule)],      // para romper el ciclo
    controllers: [TransactionsController],
    providers: [TransactionsService, PrismaService],
    exports: [TransactionsService],                // lo usa WompiController
})
export class TransactionsModule { }
