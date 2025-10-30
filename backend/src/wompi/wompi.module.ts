import { Module, forwardRef } from '@nestjs/common';
import { WompiService } from './wompi.service';
import { WompiController } from './wompi.controller';
import { TransactionsModule } from '../transactions/transactions.module';

@Module({
    imports: [forwardRef(() => TransactionsModule)], // para romper el ciclo
    controllers: [WompiController],
    providers: [WompiService],
    exports: [WompiService],                         // lo usa TransactionsService
})
export class WompiModule { }
