import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import checkoutReducer, {
  setProduct,
  setCustomer,
  setCardMeta,
} from '../store/checkoutSlice';
import CheckoutProcessingPage from './CheckoutProcessingPage';
import type { Product, Tx } from '../lib/api';
import type { CardMeta, CustomerData } from '../store/checkoutSlice';

// ─── mocks ────────────────────────────────────────────────────────────────────
// vi.hoisted guarantees spies exist before vi.mock factories run.

const mockNavigate = vi.hoisted(() => vi.fn());
const mockCreateTx  = vi.hoisted(() => vi.fn());
const mockGetTx     = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async (importOriginal) => {
  const mod = await importOriginal<typeof import('react-router-dom')>();
  return { ...mod, useNavigate: () => mockNavigate };
});

vi.mock('../lib/api', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../lib/api')>();
  return { ...mod, createTransaction: mockCreateTx, getTransaction: mockGetTx };
});

// ─── fixtures ─────────────────────────────────────────────────────────────────

const mockProduct: Product = {
  id: 'prod-1',
  name: 'Camiseta W-Store',
  description: 'Edición limitada',
  priceCents: 89_900,
  stock: 5,
};

const mockCustomer: CustomerData = {
  fullName: 'Sebastian Quintana',
  email: 'sebas@test.com',
  address: 'Calle 123, Bogotá',
};

const mockCardMeta: CardMeta = {
  last4: '1111',
  holderName: 'SEBASTIAN QUINTANA',
  expiry: '12/99',
  brand: 'visa',
};

// Transaction returned by the backend after a successful POST
const mockTxPending: Tx = {
  id: 'tx-abc-123',
  status: 'PENDING',
  productId: 'prod-1',
  customerId: 'cust-1',
  amountCents: 95_900,
  baseFeeCents: 1_000,
  deliveryCents: 5_000,
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeStore({
  withProduct  = true,
  withCustomer = true,
  withCardMeta = true,
} = {}) {
  const s = configureStore({ reducer: { checkout: checkoutReducer } });
  if (withProduct)  s.dispatch(setProduct(mockProduct));
  if (withCustomer) s.dispatch(setCustomer(mockCustomer));
  if (withCardMeta) s.dispatch(setCardMeta(mockCardMeta));
  return s;
}

/**
 * Plain MemoryRouter — for content tests where state never changes, so the
 * guard cannot re-fire after the initial render.
 */
function renderPage(store = makeStore()) {
  render(
    <Provider store={store}>
      <MemoryRouter>
        <CheckoutProcessingPage />
      </MemoryRouter>
    </Provider>,
  );
  return { store };
}

/**
 * Real Routes — for guard tests (<Navigate> uses the real router context, not
 * the mocked useNavigate hook) and for any test where state is reset after
 * mount (which would re-trigger the guard).
 */
function renderWithRoutes(store: ReturnType<typeof makeStore>) {
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/checkout/processing']}>
        <Routes>
          <Route path="/"                   element={<div data-testid="home-page" />} />
          <Route path="/checkout/card"      element={<div data-testid="card-page" />} />
          <Route path="/checkout/processing" element={<CheckoutProcessingPage />} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
  return { store };
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe('CheckoutProcessingPage', () => {
  afterEach(cleanup);
  beforeEach(() => {
    mockNavigate.mockClear();
    mockCreateTx.mockClear();
    mockGetTx.mockClear();
    // Default: both return a never-resolving promise so the component stays in
    // 'creating' phase and no side-effects (polling, navigation) occur.
    mockCreateTx.mockReturnValue(new Promise(() => {}));
    mockGetTx.mockReturnValue(new Promise(() => {}));
  });

  // ── route guards ──────────────────────────────────────────────────────────────
  //
  // Guards are declared after all hooks, but <Navigate> uses useLayoutEffect
  // which fires before passive useEffect — so the component unmounts (via Routes)
  // before createTransaction is ever called.

  describe('route guard', () => {
    it('does not render the processing screen when product is missing', () => {
      renderWithRoutes(makeStore({ withProduct: false }));
      expect(screen.queryByText('Creando transacción...')).not.toBeInTheDocument();
      expect(screen.queryByText(/No almacenamos CVV/)).not.toBeInTheDocument();
    });

    it('redirects to / via <Navigate replace> when product is missing', () => {
      renderWithRoutes(makeStore({ withProduct: false }));
      expect(screen.getByTestId('home-page')).toBeInTheDocument();
    });

    it('redirects to /checkout/card via <Navigate replace> when customer is missing', () => {
      renderWithRoutes(makeStore({ withCustomer: false }));
      expect(screen.getByTestId('card-page')).toBeInTheDocument();
    });

    it('redirects to /checkout/card via <Navigate replace> when cardMeta is missing', () => {
      renderWithRoutes(makeStore({ withCardMeta: false }));
      expect(screen.getByTestId('card-page')).toBeInTheDocument();
    });
  });

  // ── initial render — creating phase ──────────────────────────────────────────
  //
  // With the default never-resolving mock, the component stays in 'creating'
  // phase for the lifetime of every test in this group.

  describe('initial render — creating phase', () => {
    it('calls createTransaction with productId, deliveryCents, and customer data', () => {
      renderPage();
      // createTransaction is called synchronously inside the useEffect, which
      // act() (used internally by render) flushes before returning.
      expect(mockCreateTx).toHaveBeenCalledWith({
        productId: mockProduct.id,
        deliveryCents: 5_000, // DELIVERY_CENTS from lib/checkout.ts
        customer: {
          fullName: mockCustomer.fullName,
          email: mockCustomer.email,
          address: mockCustomer.address,
        },
      });
    });

    it('shows "Creando transacción..."', () => {
      renderPage();
      expect(screen.getByText('Creando transacción...')).toBeInTheDocument();
    });

    it('shows the product name', () => {
      renderPage();
      expect(screen.getByText(mockProduct.name)).toBeInTheDocument();
    });

    it('shows the total cost', () => {
      renderPage();
      // calcTotal(89_900) = 89_900 + 1_000 + 5_000 = 95_900
      // formatCOP(95_900) → e.g. "$ 95.900" in es-CO — tolerates separator variants
      expect(screen.getByText(/95.*900/)).toBeInTheDocument();
    });

    it('shows the CVV security message', () => {
      renderPage();
      expect(
        screen.getByText('No almacenamos CVV ni número completo de tarjeta.'),
      ).toBeInTheDocument();
    });

    it('shows "← Volver al resumen" button', () => {
      renderPage();
      expect(
        screen.getByRole('button', { name: /volver al resumen/i }),
      ).toBeInTheDocument();
    });
  });

  // ── createTransaction success ─────────────────────────────────────────────────

  describe('createTransaction success', () => {
    beforeEach(() => {
      mockCreateTx.mockResolvedValue({ message: 'ok', transaction: mockTxPending });
    });

    it('transitions to "Procesando pago..." after the transaction is created', async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByText('Procesando pago...')).toBeInTheDocument();
      });
    });

    it('dispatches the PENDING transaction to the Redux store', async () => {
      const { store } = renderPage();
      await waitFor(() => {
        expect(store.getState().checkout.transaction).toEqual(mockTxPending);
      });
    });
  });

  // ── createTransaction failure ─────────────────────────────────────────────────

  describe('createTransaction failure', () => {
    beforeEach(() => {
      mockCreateTx.mockRejectedValue(new Error('Error de red'));
    });

    it('shows "Error al procesar la compra."', async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByText('Error al procesar la compra.')).toBeInTheDocument();
      });
    });

    it('shows the error detail message from the thrown Error', async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByText('Error de red')).toBeInTheDocument();
      });
    });

    it('shows "Intentar de nuevo" button', async () => {
      renderPage();
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /intentar de nuevo/i }),
        ).toBeInTheDocument();
      });
    });

    it('does not call navigate after a failed transaction', async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByText('Error al procesar la compra.')).toBeInTheDocument();
      });
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  // ── "← Volver al resumen" — creating phase ────────────────────────────────────
  //
  // The default never-resolving mock keeps the component in 'creating' phase,
  // so the creating-phase back button is visible and clickable.

  describe('"← Volver al resumen" — creating phase', () => {
    it('navigates to /checkout/summary', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(screen.getByRole('button', { name: /volver al resumen/i }));
      expect(mockNavigate).toHaveBeenCalledWith('/checkout/summary');
    });
  });

  // ── "← Volver al resumen" — network_error phase ──────────────────────────────
  //
  // After createTransaction rejects, the component shows the error UI which
  // includes a "← Volver al resumen" button (distinct from the creating-phase one).

  describe('"← Volver al resumen" — network_error phase', () => {
    it('navigates to /checkout/summary', async () => {
      mockCreateTx.mockRejectedValue(new Error('Error de red'));
      const user = userEvent.setup();
      renderPage();
      // Wait for the error phase so the network_error buttons are visible
      await waitFor(() => {
        expect(screen.getByText('Error al procesar la compra.')).toBeInTheDocument();
      });
      await user.click(screen.getByRole('button', { name: /volver al resumen/i }));
      expect(mockNavigate).toHaveBeenCalledWith('/checkout/summary');
    });
  });
});
