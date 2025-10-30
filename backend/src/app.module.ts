import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TransactionsModule } from './transactions/transactions.module';
import { WompiModule } from './wompi/wompi.module';
import { ProductsModule } from './products/products.module';

@Module({
  imports: [ProductsModule, TransactionsModule, WompiModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
