import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TransactionsModule } from './transactions/transactions.module';
import { WompiModule } from './wompi/wompi.module';
import { ProductsModule } from './products/products.module';
import { DeliveriesModule } from './deliveries/deliveries.module';

@Module({
  imports: [ProductsModule, TransactionsModule, WompiModule, DeliveriesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
