import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import checkoutReducer from '../store/checkoutSlice';
import ProductListPage from './ProductListPage';
import type { Product } from '../lib/api';

// ─── mocks ────────────────────────────────────────────────────────────────────
// useNavigate is mocked because ProductCard (rendered by ProductListPage) calls
// it internally; without this mock the hook throws outside a Router context.

const mockNavigate   = vi.hoisted(() => vi.fn());
const mockGetProducts = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async (importOriginal) => {
  const mod = await importOriginal<typeof import('react-router-dom')>();
  return { ...mod, useNavigate: () => mockNavigate };
});

vi.mock('../lib/api', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../lib/api')>();
  return { ...mod, getProducts: mockGetProducts };
});

// ─── fixtures ─────────────────────────────────────────────────────────────────

const mockProducts: Product[] = [
  {
    id: 'prod-1',
    name: 'Camiseta W-Store',
    description: 'Edición limitada',
    priceCents: 89_900,
    stock: 5,
  },
  {
    id: 'prod-2',
    name: 'Gorra W-Store',
    description: 'Accesorio clásico',
    priceCents: 45_000,
    stock: 3,
  },
];

// ─── helpers ──────────────────────────────────────────────────────────────────

function renderPage() {
  render(
    <Provider store={configureStore({ reducer: { checkout: checkoutReducer } })}>
      <MemoryRouter>
        <ProductListPage />
      </MemoryRouter>
    </Provider>,
  );
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe('ProductListPage', () => {
  afterEach(cleanup);
  beforeEach(() => {
    mockNavigate.mockClear();
    mockGetProducts.mockClear();
    // Default: never-resolving promise keeps the component in loading state.
    mockGetProducts.mockReturnValue(new Promise(() => {}));
  });

  it('shows "Cargando productos…" while getProducts is pending', () => {
    renderPage();
    expect(screen.getByText('Cargando productos…')).toBeInTheDocument();
  });

  it('shows the "W-Store" header', () => {
    renderPage();
    expect(screen.getByText('W-Store')).toBeInTheDocument();
  });

  it('shows product names after getProducts resolves', async () => {
    mockGetProducts.mockResolvedValue(mockProducts);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Camiseta W-Store')).toBeInTheDocument();
      expect(screen.getByText('Gorra W-Store')).toBeInTheDocument();
    });
  });

  it('renders one "Pagar con tarjeta" button per in-stock product', async () => {
    mockGetProducts.mockResolvedValue(mockProducts);
    renderPage();
    await waitFor(() => {
      expect(
        screen.getAllByRole('button', { name: /pagar con tarjeta/i }),
      ).toHaveLength(mockProducts.length);
    });
  });

  it('shows the error message when getProducts fails', async () => {
    mockGetProducts.mockRejectedValue(new Error('No se pudieron cargar los productos'));
    renderPage();
    await waitFor(() => {
      expect(
        screen.getByText('No se pudieron cargar los productos'),
      ).toBeInTheDocument();
    });
  });

  it('does not render product buttons while loading', () => {
    // Default mock never resolves → component stays in loading state
    renderPage();
    expect(
      screen.queryByRole('button', { name: /pagar con tarjeta/i }),
    ).not.toBeInTheDocument();
  });
});
