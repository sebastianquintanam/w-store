import { Body, Controller, Param, Patch, Post } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

@Controller('transactions')
export class TransactionsController {
    constructor(private readonly service: TransactionsService) { }

    @Post()
    create(@Body() body: any) {
        return this.service.create(body);
    }

    // Finaliza la transacción (simulado)
    @Patch(':id/status')
    finalize(@Param('id') id: string, @Body() dto: UpdateTransactionDto) {
        return this.service.finalize(id, dto.status);
    }
}
