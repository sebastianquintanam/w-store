import { Body, Controller, Param, Patch, Post, Get } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Controller('transactions')
export class TransactionsController {
    constructor(private readonly service: TransactionsService) { }

    @Post()
    create(@Body() body: CreateTransactionDto) {
        return this.service.create(body);
    }

    // Finaliza la transacción (simulado)
    @Patch(':id/status')
    finalize(@Param('id') id: string, @Body() dto: UpdateTransactionDto) {
        return this.service.finalize(id, dto.status);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.service.findOne(id);
    }
}
