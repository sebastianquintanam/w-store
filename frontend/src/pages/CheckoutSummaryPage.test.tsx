import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import checkoutReducer, {
  setProduct,
  setCustomer,
  setCardMeta,
} from '../store/checkoutSlice';
import CheckoutSummaryPage from './CheckoutSummaryPage';
import type { Product } from '../lib/api';
import type { CardMeta, CustomerData } from '../store/checkoutSlice';

// ─── mock de navegación ───────────────────────────────────────────────────────
// vi.hoisted garantiza que el spy exista antes de que el factory de vi.mock corra.
// Sólo afecta a llamadas directas de useNavigate en el componente.
// <Navigate> usa el router context interno — se testea con Routes + Route reales.

const mockNavigate = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async (importOriginal) => {
  const mod = await importOriginal<typeof import('react-router-dom')>();
  return { ...mod, useNavigate: () => mockNavigate };
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
  address: 'Calle 123',
};

// holderName in uppercase to avoid getByText collision with customer.fullName
const mockCardMeta: CardMeta = {
  last4: '1111',
  holderName: 'SEBASTIAN QUINTANA',
  expiry: '12/99',
  brand: 'visa',
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeStore({
  withProduct = true,
  withCustomer = true,
  withCardMeta = true,
} = {}) {
  const s = configureStore({ reducer: { checkout: checkoutReducer } });
  if (withProduct) s.dispatch(setProduct(mockProduct));
  if (withCustomer) s.dispatch(setCustomer(mockCustomer));
  if (withCardMeta) s.dispatch(setCardMeta(mockCardMeta));
  return s;
}

/** Default render: full state, bare MemoryRouter (no Routes). */
function renderPage(store = makeStore()) {
  render(
    <Provider store={store}>
      <MemoryRouter>
        <CheckoutSummaryPage />
      </MemoryRouter>
    </Provider>,
  );
  return { store };
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe('CheckoutSummaryPage', () => {
  afterEach(cleanup);
  beforeEach(() => mockNavigate.mockClear());

  // ── route guards ─────────────────────────────────────────────────────────────

  describe('route guard — no product', () => {
    it('does not render the summary form', () => {
      renderPage(makeStore({ withProduct: false, withCustomer: false, withCardMeta: false }));
      expect(screen.queryByText('Entrega')).not.toBeInTheDocument();
      expect(screen.queryByText('Tarjeta')).not.toBeInTheDocument();
    });

    it('redirects to / via <Navigate replace>', () => {
      // <Navigate> uses the router context's internal navigate (react-router),
      // not the mocked useNavigate — we need real Routes to observe redirection.
      render(
        <Provider store={makeStore({ withProduct: false, withCustomer: false, withCardMeta: false })}>
          <MemoryRouter initialEntries={['/checkout/summary']}>
            <Routes>
              <Route path="/" element={<div data-testid="home-page" />} />
              <Route path="/checkout/summary" element={<CheckoutSummaryPage />} />
            </Routes>
          </MemoryRouter>
        </Provider>,
      );
      expect(screen.getByTestId('home-page')).toBeInTheDocument();
    });
  });

  describe('route guard — no customer', () => {
    it('redirects to /checkout/card via <Navigate replace>', () => {
      render(
        <Provider store={makeStore({ withCustomer: false, withCardMeta: false })}>
          <MemoryRouter initialEntries={['/checkout/summary']}>
            <Routes>
              <Route path="/checkout/card" element={<div data-testid="card-page" />} />
              <Route path="/checkout/summary" element={<CheckoutSummaryPage />} />
            </Routes>
          </MemoryRouter>
        </Provider>,
      );
      expect(screen.getByTestId('card-page')).toBeInTheDocument();
    });
  });

  describe('route guard — no cardMeta', () => {
    it('redirects to /checkout/card via <Navigate replace>', () => {
      render(
        <Provider store={makeStore({ withCardMeta: false })}>
          <MemoryRouter initialEntries={['/checkout/summary']}>
            <Routes>
              <Route path="/checkout/card" element={<div data-testid="card-page" />} />
              <Route path="/checkout/summary" element={<CheckoutSummaryPage />} />
            </Routes>
          </MemoryRouter>
        </Provider>,
      );
      expect(screen.getByTestId('card-page')).toBeInTheDocument();
    });
  });

  // ── main render ──────────────────────────────────────────────────────────────

  describe('main render — full state', () => {
    it('shows the product name', () => {
      renderPage();
      expect(screen.getByText(mockProduct.name)).toBeInTheDocument();
    });

    it('shows the product description', () => {
      renderPage();
      expect(screen.getByText(mockProduct.description)).toBeInTheDocument();
    });

    it('shows customer delivery data', () => {
      renderPage();
      expect(screen.getByText(mockCustomer.fullName)).toBeInTheDocument();
      expect(screen.getByText(mockCustomer.email)).toBeInTheDocument();
      expect(screen.getByText(mockCustomer.address)).toBeInTheDocument();
    });

    it('shows card brand "Visa"', () => {
      renderPage();
      // InfoRow renders BRAND_DISPLAY['visa'] = 'Visa' — appears once in card section
      expect(screen.getByText('Visa')).toBeInTheDocument();
    });

    it('shows masked card number', () => {
      renderPage();
      // maskCard('1111') = '**** **** **** 1111' — InfoRow renders it once
      expect(screen.getByText('**** **** **** 1111')).toBeInTheDocument();
    });

    it('shows card holderName and expiry', () => {
      renderPage();
      expect(screen.getByText(mockCardMeta.holderName)).toBeInTheDocument();
      expect(screen.getByText(mockCardMeta.expiry)).toBeInTheDocument();
    });

    it('shows cost breakdown sections (CostBreakdown renders twice in jsdom)', () => {
      renderPage();
      // CostBreakdown is rendered in both lg:hidden and hidden lg:block divs —
      // CSS is not applied in jsdom, so both are visible → expect 2 instances.
      expect(screen.getAllByText('Tarifa base')).toHaveLength(2);
      expect(screen.getAllByText('Envío')).toHaveLength(2);
      expect(screen.getAllByText('Total')).toHaveLength(2);
    });
  });

  // ── navigation ───────────────────────────────────────────────────────────────

  describe('navigation', () => {
    it('header "← Tarjeta" button navigates to /checkout/card', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(screen.getByRole('button', { name: /← tarjeta/i }));
      expect(mockNavigate).toHaveBeenCalledWith('/checkout/card');
    });

    it('"← Volver" button navigates to /checkout/card', async () => {
      const user = userEvent.setup();
      renderPage();
      // CostBreakdown renders twice; click the first instance
      const backButtons = screen.getAllByRole('button', { name: /← volver/i });
      expect(backButtons).toHaveLength(2);
      await user.click(backButtons[0]);
      expect(mockNavigate).toHaveBeenCalledWith('/checkout/card');
    });

    it('"Confirmar pago" button navigates to /checkout/processing', async () => {
      const user = userEvent.setup();
      renderPage();
      // CostBreakdown renders twice; click the first instance
      const confirmButtons = screen.getAllByRole('button', { name: /confirmar pago/i });
      expect(confirmButtons).toHaveLength(2);
      await user.click(confirmButtons[0]);
      expect(mockNavigate).toHaveBeenCalledWith('/checkout/processing');
    });
  });
});
