import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

describe('ProductsController', () => {

    // ── list() ────────────────────────────────────────────────────────────────

    describe('list()', () => {
        it('retorna lista de productos', async () => {
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

    // ── findOne() ─────────────────────────────────────────────────────────────

    describe('findOne()', () => {
        const product = { id: 'p1', name: 'Zapatillas', description: 'desc', priceCents: 90000, stock: 3 };

        it('retorna el producto si existe', async () => {
            const svc = { findOne: jest.fn().mockResolvedValue(product) };
            const module = await Test.createTestingModule({
                controllers: [ProductsController],
                providers: [{ provide: ProductsService, useValue: svc }],
            }).compile();

            const ctrl = module.get(ProductsController);
            const res = await ctrl.findOne('p1');

            expect(svc.findOne).toHaveBeenCalledWith('p1');
            expect(res).toMatchObject({ name: 'Zapatillas', priceCents: 90000 });
        });

        it('lanza NotFoundException si el producto no existe', async () => {
            const svc = { findOne: jest.fn().mockRejectedValue(new NotFoundException()) };
            const module = await Test.createTestingModule({
                controllers: [ProductsController],
                providers: [{ provide: ProductsService, useValue: svc }],
            }).compile();

            const ctrl = module.get(ProductsController);
            await expect(ctrl.findOne('no_existe')).rejects.toThrow(NotFoundException);
        });
    });
});
