// backend/src/products/products.controller.spec.ts
import { Test } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

describe('ProductsController', () => {
    it('getAll retorna lista', async () => {
        const svc = { findAll: jest.fn().mockResolvedValue([{ id: 'p1' }]) };
        const module = await Test.createTestingModule({
            controllers: [ProductsController],
            providers: [{ provide: ProductsService, useValue: svc }],
        }).compile();

        const ctrl = module.get(ProductsController);
        const res = await ctrl.list();
        expect(res.length).toBe(1);
    });
});
