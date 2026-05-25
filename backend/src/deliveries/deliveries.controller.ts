import { Controller, Get, Param } from '@nestjs/common';
import { DeliveriesService } from './deliveries.service';

@Controller('deliveries')
export class DeliveriesController {
    constructor(private readonly deliveries: DeliveriesService) {}

    @Get(':transactionId')
    findByTransactionId(@Param('transactionId') transactionId: string) {
        return this.deliveries.findByTransactionId(transactionId);
    }
}
