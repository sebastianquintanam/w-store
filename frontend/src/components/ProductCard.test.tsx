import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import checkoutReducer from '../store/checkoutSlice';
import ProductCard from './ProductCard';
import type { Product } from '../lib/api';

// ─── mock de navegación ───────────────────────────────────────────────────────
// vi.hoisted garantiza que el spy exista antes de que el factory de vi.mock corra.

const mockNavigate = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async (importOriginal) => {
  const mod = await importOriginal<typeof import('react-router-dom')>();
  return { ...mod, useNavigate: () => mockNavigate };
});

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeStore() {
  return configureStore({ reducer: { checkout: checkoutReducer } });
}

function renderCard(product: Product) {
  const testStore = makeStore();
  render(
    <Provider store={testStore}>
      <MemoryRouter>
        <ProductCard product={product} />
      </MemoryRouter>
    </Provider>,
  );
  return { testStore };
}

// ─── fixtures ─────────────────────────────────────────────────────────────────

const inStockProduct: Product = {
  id: 'prod-1',
  name: 'Camiseta W-Store',
  description: 'Edición limitada',
  priceCents: 89_900,
  stock: 5,
};

const outOfStockProduct: Product = { ...inStockProduct, stock: 0 };

// ─── tests ────────────────────────────────────────────────────────────────────

describe('ProductCard', () => {
  // @testing-library/react does not auto-register cleanup when vitest globals
  // are disabled — we register it explicitly to avoid DOM accumulation.
  afterEach(cleanup);

  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders product name', () => {
    renderCard(inStockProduct);
    expect(screen.getByText('Camiseta W-Store')).toBeInTheDocument();
  });

  it('renders product description', () => {
    renderCard(inStockProduct);
    expect(screen.getByText('Edición limitada')).toBeInTheDocument();
  });

  it('renders formatted COP price', () => {
    renderCard(inStockProduct);
    // Tolerates locale-specific separators and symbol variants (e.g. "$ 89.900")
    expect(screen.getByText(/89.*900/)).toBeInTheDocument();
  });

  it('renders available stock count when in stock', () => {
    renderCard(inStockProduct);
    expect(screen.getByText('5 disponibles')).toBeInTheDocument();
  });

  it('renders "Pagar con tarjeta" button when in stock', () => {
    renderCard(inStockProduct);
    expect(
      screen.getByRole('button', { name: /pagar con tarjeta/i }),
    ).toBeInTheDocument();
  });

  it('button is enabled when in stock', () => {
    renderCard(inStockProduct);
    expect(
      screen.getByRole('button', { name: /pagar con tarjeta/i }),
    ).not.toBeDisabled();
  });

  // ── sin stock ───────────────────────────────────────────────────────────────

  describe('when stock is 0', () => {
    it('shows "Sin stock" in the stock badge and in the button (2 occurrences)', () => {
      renderCard(outOfStockProduct);
      expect(screen.getAllByText('Sin stock')).toHaveLength(2);
    });

    it('button is disabled', () => {
      renderCard(outOfStockProduct);
      // Use getByRole to target the button unambiguously
      expect(screen.getByRole('button', { name: /sin stock/i })).toBeDisabled();
    });
  });

  // ── click ───────────────────────────────────────────────────────────────────

  describe('when "Pagar con tarjeta" is clicked', () => {
    it('dispatches the product to Redux', async () => {
      const user = userEvent.setup();
      const { testStore } = renderCard(inStockProduct);

      await user.click(screen.getByRole('button', { name: /pagar con tarjeta/i }));

      expect(testStore.getState().checkout.product).toEqual(inStockProduct);
    });

    it('navigates to /checkout/card', async () => {
      const user = userEvent.setup();
      renderCard(inStockProduct);

      await user.click(screen.getByRole('button', { name: /pagar con tarjeta/i }));

      expect(mockNavigate).toHaveBeenCalledOnce();
      expect(mockNavigate).toHaveBeenCalledWith('/checkout/card');
    });
  });
});
