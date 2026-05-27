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
  setTransaction,
} from '../store/checkoutSlice';
import CheckoutResultPage from './CheckoutResultPage';
import type { Product, Tx, Delivery } from '../lib/api';
import type { CardMeta, CustomerData } from '../store/checkoutSlice';

// ─── mocks ────────────────────────────────────────────────────────────────────
// vi.hoisted garantiza que los spies existan antes de que los factories de
// vi.mock corran.

const mockNavigate = vi.hoisted(() => vi.fn());
const mockGetDelivery = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async (importOriginal) => {
  const mod = await importOriginal<typeof import('react-router-dom')>();
  return { ...mod, useNavigate: () => mockNavigate };
});

vi.mock('../lib/api', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../lib/api')>();
  return { ...mod, getDeliveryByTransactionId: mockGetDelivery };
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
  // Distinct from mockDelivery.address to avoid getByText ambiguity
  address: 'Calle 123, Bogotá',
};

// holderName in uppercase to avoid getByText collision with customer.fullName
const mockCardMeta: CardMeta = {
  last4: '1111',
  holderName: 'SEBASTIAN QUINTANA',
  expiry: '12/99',
  brand: 'visa',
};

const mockTransaction: Tx = {
  id: 'tx-abc-123',
  status: 'APPROVED',
  productId: 'prod-1',
  customerId: 'cust-1',
  amountCents: 95_900,
  baseFeeCents: 1_000,
  deliveryCents: 5_000,
};

const mockDelivery: Delivery = {
  id: 'del-1',
  transactionId: 'tx-abc-123',
  customerId: 'cust-1',
  // Distinct from mockCustomer.address
  address: 'Calle 456, Medellín',
  status: 'PENDING_SHIPMENT',
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeStore({
  withProduct = true,
  withCustomer = true,
  withCardMeta = true,
  withTransaction = true,
  txStatus = 'APPROVED' as Tx['status'],
} = {}) {
  const s = configureStore({ reducer: { checkout: checkoutReducer } });
  if (withProduct) s.dispatch(setProduct(mockProduct));
  if (withCustomer) s.dispatch(setCustomer(mockCustomer));
  if (withCardMeta) s.dispatch(setCardMeta(mockCardMeta));
  if (withTransaction) s.dispatch(setTransaction({ ...mockTransaction, status: txStatus }));
  return s;
}

/**
 * Plain MemoryRouter — for content tests where no state reset happens, so
 * the guard never fires after the initial render.
 */
function renderPage(store = makeStore()) {
  render(
    <Provider store={store}>
      <MemoryRouter>
        <CheckoutResultPage />
      </MemoryRouter>
    </Provider>,
  );
  return { store };
}

/**
 * Real Routes — for:
 *  • guard tests: <Navigate> redirects via real router context.
 *  • button tests that dispatch resetCheckout / resetPayment: resetting state
 *    makes the guard fire again; Routes unmounts the page cleanly via <Navigate>.
 */
function renderWithRoutes(store: ReturnType<typeof makeStore>) {
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/checkout/result']}>
        <Routes>
          <Route path="/" element={<div data-testid="home-page" />} />
          <Route path="/checkout/result" element={<CheckoutResultPage />} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
  return { store };
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe('CheckoutResultPage', () => {
  afterEach(cleanup);
  beforeEach(() => {
    mockNavigate.mockClear();
    mockGetDelivery.mockClear();
    mockGetDelivery.mockResolvedValue(mockDelivery);
  });

  // ── route guards ──────────────────────────────────────────────────────────────

  describe('route guard', () => {
    it('does not render result content when all state is missing', () => {
      renderPage(
        makeStore({ withProduct: false, withCustomer: false, withCardMeta: false, withTransaction: false }),
      );
      expect(screen.queryByText('Pago aprobado')).not.toBeInTheDocument();
      expect(screen.queryByText('Resumen del pedido')).not.toBeInTheDocument();
    });

    it('redirects to / via <Navigate replace> when no transaction', () => {
      renderWithRoutes(makeStore({ withTransaction: false }));
      expect(screen.getByTestId('home-page')).toBeInTheDocument();
    });

    it('redirects to / via <Navigate replace> when no product', () => {
      renderWithRoutes(makeStore({ withProduct: false }));
      expect(screen.getByTestId('home-page')).toBeInTheDocument();
    });

    it('redirects to / via <Navigate replace> when no customer', () => {
      renderWithRoutes(makeStore({ withCustomer: false }));
      expect(screen.getByTestId('home-page')).toBeInTheDocument();
    });

    it('redirects to / via <Navigate replace> when no cardMeta', () => {
      renderWithRoutes(makeStore({ withCardMeta: false }));
      expect(screen.getByTestId('home-page')).toBeInTheDocument();
    });
  });

  // ── APPROVED ─────────────────────────────────────────────────────────────────

  describe('APPROVED transaction', () => {
    it('shows "Pago aprobado" title', () => {
      renderPage();
      expect(screen.getByText('Pago aprobado')).toBeInTheDocument();
    });

    it('shows the confirmation message', () => {
      renderPage();
      expect(screen.getByText('Tu compra fue confirmada correctamente.')).toBeInTheDocument();
    });

    it('shows the product name', () => {
      renderPage();
      expect(screen.getByText(mockProduct.name)).toBeInTheDocument();
    });

    it('calls getDeliveryByTransactionId with the transaction id', () => {
      renderPage();
      // useEffect is flushed synchronously by act() inside render()
      expect(mockGetDelivery).toHaveBeenCalledWith(mockTransaction.id);
    });

    it('shows delivery status after the fetch resolves', async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByText(mockDelivery.status)).toBeInTheDocument();
      });
    });

    it('shows delivery address after the fetch resolves', async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByText(mockDelivery.address)).toBeInTheDocument();
      });
    });
  });

  // ── APPROVED — delivery fetch error ──────────────────────────────────────────

  describe('APPROVED — delivery fetch error', () => {
    beforeEach(() => {
      // Override the outer beforeEach's mockResolvedValue
      mockGetDelivery.mockRejectedValue(new Error('network error'));
    });

    it('still shows "Pago aprobado" title', async () => {
      renderPage();
      // Wait for the rejection to be processed (async) before asserting
      await waitFor(() => {
        expect(screen.getByText('No se pudo cargar el estado de entrega.')).toBeInTheDocument();
      });
      expect(screen.getByText('Pago aprobado')).toBeInTheDocument();
    });

    it('shows the non-blocking delivery error message', async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByText('No se pudo cargar el estado de entrega.')).toBeInTheDocument();
      });
    });
  });

  // ── DECLINED ─────────────────────────────────────────────────────────────────

  describe('DECLINED transaction', () => {
    it('shows "Pago rechazado" title', () => {
      renderPage(makeStore({ txStatus: 'DECLINED' }));
      expect(screen.getByText('Pago rechazado')).toBeInTheDocument();
    });

    it('does not call getDeliveryByTransactionId', () => {
      renderPage(makeStore({ txStatus: 'DECLINED' }));
      expect(mockGetDelivery).not.toHaveBeenCalled();
    });

    it('shows "Intentar nuevamente" button', () => {
      renderPage(makeStore({ txStatus: 'DECLINED' }));
      expect(screen.getByRole('button', { name: /intentar nuevamente/i })).toBeInTheDocument();
    });
  });

  // ── ERROR ─────────────────────────────────────────────────────────────────────

  describe('ERROR transaction', () => {
    it('shows "Error en el pago" title', () => {
      renderPage(makeStore({ txStatus: 'ERROR' }));
      expect(screen.getByText('Error en el pago')).toBeInTheDocument();
    });

    it('shows "Intentar nuevamente" button', () => {
      renderPage(makeStore({ txStatus: 'ERROR' }));
      expect(screen.getByRole('button', { name: /intentar nuevamente/i })).toBeInTheDocument();
    });
  });

  // ── "← Volver al inicio" ──────────────────────────────────────────────────────
  //
  // Uses renderWithRoutes: after resetCheckout() empties the Redux store, the
  // component re-renders, the guard fires (<Navigate to="/" replace>), real
  // router navigates to "/", and CheckoutResultPage unmounts cleanly.

  describe('"← Volver al inicio"', () => {
    it('dispatches resetCheckout — all fields become null in the store', async () => {
      const user = userEvent.setup();
      const testStore = makeStore();
      renderWithRoutes(testStore);
      await user.click(screen.getByRole('button', { name: /volver al inicio/i }));
      const state = testStore.getState().checkout;
      expect(state.product).toBeNull();
      expect(state.customer).toBeNull();
      expect(state.cardMeta).toBeNull();
      expect(state.transaction).toBeNull();
    });

    it('navigates to "/"', async () => {
      const user = userEvent.setup();
      renderWithRoutes(makeStore());
      await user.click(screen.getByRole('button', { name: /volver al inicio/i }));
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  // ── "Intentar nuevamente" ─────────────────────────────────────────────────────
  //
  // Uses renderWithRoutes for the same reason: resetPayment() nulls cardMeta +
  // transaction, guard fires, page unmounts cleanly.

  describe('"Intentar nuevamente"', () => {
    it('preserves product and customer in Redux (resetPayment)', async () => {
      const user = userEvent.setup();
      const testStore = makeStore({ txStatus: 'DECLINED' });
      renderWithRoutes(testStore);
      await user.click(screen.getByRole('button', { name: /intentar nuevamente/i }));
      const state = testStore.getState().checkout;
      expect(state.product).toEqual(mockProduct);
      expect(state.customer).toEqual(mockCustomer);
    });

    it('clears cardMeta and transaction in Redux (resetPayment)', async () => {
      const user = userEvent.setup();
      const testStore = makeStore({ txStatus: 'DECLINED' });
      renderWithRoutes(testStore);
      await user.click(screen.getByRole('button', { name: /intentar nuevamente/i }));
      const state = testStore.getState().checkout;
      expect(state.cardMeta).toBeNull();
      expect(state.transaction).toBeNull();
    });

    it('navigates to "/checkout/card"', async () => {
      const user = userEvent.setup();
      renderWithRoutes(makeStore({ txStatus: 'DECLINED' }));
      await user.click(screen.getByRole('button', { name: /intentar nuevamente/i }));
      expect(mockNavigate).toHaveBeenCalledWith('/checkout/card');
    });
  });
});
