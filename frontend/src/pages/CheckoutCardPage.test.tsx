import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import checkoutReducer, { setProduct } from '../store/checkoutSlice';
import CheckoutCardPage from './CheckoutCardPage';
import type { Product } from '../lib/api';

// ─── mock de navegación ───────────────────────────────────────────────────────
// vi.hoisted garantiza que el spy exista antes de que el factory de vi.mock corra.

const mockNavigate = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async (importOriginal) => {
  const mod = await importOriginal<typeof import('react-router-dom')>();
  return { ...mod, useNavigate: () => mockNavigate };
});

// ─── fixture ──────────────────────────────────────────────────────────────────

const mockProduct: Product = {
  id: 'prod-1',
  name: 'Camiseta W-Store',
  description: 'Edición limitada',
  priceCents: 89_900,
  stock: 5,
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeStore(withProduct = true) {
  const s = configureStore({ reducer: { checkout: checkoutReducer } });
  if (withProduct) s.dispatch(setProduct(mockProduct));
  return s;
}

function renderPage(store = makeStore()) {
  render(
    <Provider store={store}>
      <MemoryRouter>
        <CheckoutCardPage />
      </MemoryRouter>
    </Provider>,
  );
  return { store };
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Nombre completo'), 'Sebastian Quintana');
  await user.type(screen.getByLabelText('Email'), 'sebas@test.com');
  await user.type(screen.getByLabelText('Dirección'), 'Calle 123');
  // Card number: digits only — formatCardNumber adds spaces progressively
  await user.type(screen.getByLabelText('Número de tarjeta'), '4111111111111111');
  await user.type(screen.getByLabelText('Titular de la tarjeta'), 'Sebastian Quintana');
  // Expiry: digits only — handleExpiryChange inserts the slash (1299 → 12/99)
  await user.type(screen.getByLabelText('Vencimiento'), '1299');
  await user.type(screen.getByLabelText('CVV'), '123');
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe('CheckoutCardPage', () => {
  // globals: false → cleanup is not auto-registered; we register it explicitly.
  afterEach(cleanup);
  beforeEach(() => mockNavigate.mockClear());

  // ── route guard ─────────────────────────────────────────────────────────────

  describe('route guard — no product in Redux', () => {
    it('does not render the form', () => {
      renderPage(makeStore(false));
      expect(screen.queryByText('Datos de entrega')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /continuar al resumen/i })).not.toBeInTheDocument();
    });

    it('redirects to the home route via <Navigate replace>', () => {
      // <Navigate> in react-router v7 uses the router context's internal navigate,
      // NOT the exported useNavigate hook we mocked. We therefore render a real
      // Routes tree inside MemoryRouter so actual navigation can happen.
      render(
        <Provider store={makeStore(false)}>
          <MemoryRouter initialEntries={['/checkout/card']}>
            <Routes>
              <Route path="/" element={<div data-testid="home-page" />} />
              <Route path="/checkout/card" element={<CheckoutCardPage />} />
            </Routes>
          </MemoryRouter>
        </Provider>,
      );
      expect(screen.getByTestId('home-page')).toBeInTheDocument();
    });
  });

  // ── main render ─────────────────────────────────────────────────────────────

  describe('main render — with product', () => {
    it('shows "Datos de entrega" heading', () => {
      renderPage();
      expect(screen.getByText('Datos de entrega')).toBeInTheDocument();
    });

    it('shows "Datos de tarjeta" heading', () => {
      renderPage();
      expect(screen.getByText('Datos de tarjeta')).toBeInTheDocument();
    });

    it('shows the product name in the summary', () => {
      renderPage();
      // ProductSummary renders in both mobile (lg:hidden) and desktop (hidden lg:block)
      // divs — CSS is not applied in jsdom, so both are in the DOM.
      expect(screen.getAllByText(mockProduct.name).length).toBeGreaterThanOrEqual(1);
    });

    it('shows "Continuar al resumen" button', () => {
      renderPage();
      expect(
        screen.getByRole('button', { name: /continuar al resumen/i }),
      ).toBeInTheDocument();
    });
  });

  // ── validation: empty submit ─────────────────────────────────────────────────

  describe('empty form submit', () => {
    it('shows required field errors', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(screen.getByRole('button', { name: /continuar al resumen/i }));

      expect(screen.getByText('Nombre requerido, mínimo 3 caracteres.')).toBeInTheDocument();
      expect(screen.getByText('Ingresa un email válido.')).toBeInTheDocument();
      expect(screen.getByText('Dirección requerida, mínimo 5 caracteres.')).toBeInTheDocument();
      expect(screen.getByText('Número de tarjeta requerido.')).toBeInTheDocument();
      expect(screen.getByText('CVV requerido.')).toBeInTheDocument();
    });

    it('does not navigate on validation failure', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(screen.getByRole('button', { name: /continuar al resumen/i }));
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  // ── valid form submit ────────────────────────────────────────────────────────

  describe('valid form submit', () => {
    /** Renders, fills every field with valid data and clicks the submit button. */
    async function submitValidForm() {
      const testStore = makeStore();
      const user = userEvent.setup();
      renderPage(testStore);
      await fillValidForm(user);
      await user.click(screen.getByRole('button', { name: /continuar al resumen/i }));
      return testStore;
    }

    it('saves customer data in Redux', async () => {
      const testStore = await submitValidForm();
      expect(testStore.getState().checkout.customer).toEqual({
        fullName: 'Sebastian Quintana',
        email: 'sebas@test.com',
        address: 'Calle 123',
      });
    });

    it('saves cardMeta with last4, holderName, expiry and brand', async () => {
      const testStore = await submitValidForm();
      expect(testStore.getState().checkout.cardMeta).toMatchObject({
        last4: '1111',
        holderName: 'Sebastian Quintana',
        expiry: '12/99',
        brand: 'visa',
      });
    });

    it('does not store cvv in cardMeta', async () => {
      const testStore = await submitValidForm();
      expect(testStore.getState().checkout.cardMeta).not.toHaveProperty('cvv');
    });

    it('does not store full card number in cardMeta', async () => {
      const testStore = await submitValidForm();
      expect(testStore.getState().checkout.cardMeta).not.toHaveProperty('cardNumber');
    });

    it('navigates to /checkout/summary', async () => {
      await submitValidForm();
      expect(mockNavigate).toHaveBeenCalledWith('/checkout/summary');
    });
  });

  // ── Luhn validation ──────────────────────────────────────────────────────────

  describe('Luhn validation', () => {
    it('shows "Número de tarjeta inválido." for a failing Luhn number', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.type(screen.getByLabelText('Nombre completo'), 'Sebastian Quintana');
      await user.type(screen.getByLabelText('Email'), 'sebas@test.com');
      await user.type(screen.getByLabelText('Dirección'), 'Calle 123');
      // 4111111111111112 — last digit changed, fails Luhn
      await user.type(screen.getByLabelText('Número de tarjeta'), '4111111111111112');
      await user.type(screen.getByLabelText('Titular de la tarjeta'), 'Sebastian Quintana');
      await user.type(screen.getByLabelText('Vencimiento'), '1299');
      await user.type(screen.getByLabelText('CVV'), '123');
      await user.click(screen.getByRole('button', { name: /continuar al resumen/i }));

      expect(screen.getByText('Número de tarjeta inválido.')).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  // ── expiry validation ────────────────────────────────────────────────────────

  describe('expiry validation', () => {
    it('shows "Fecha inválida o vencida." for a past date (01/20)', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.type(screen.getByLabelText('Nombre completo'), 'Sebastian Quintana');
      await user.type(screen.getByLabelText('Email'), 'sebas@test.com');
      await user.type(screen.getByLabelText('Dirección'), 'Calle 123');
      await user.type(screen.getByLabelText('Número de tarjeta'), '4111111111111111');
      await user.type(screen.getByLabelText('Titular de la tarjeta'), 'Sebastian Quintana');
      // 0120 → handleExpiryChange → 01/20 (January 2020, expired)
      await user.type(screen.getByLabelText('Vencimiento'), '0120');
      await user.type(screen.getByLabelText('CVV'), '123');
      await user.click(screen.getByRole('button', { name: /continuar al resumen/i }));

      expect(screen.getByText('Fecha inválida o vencida.')).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
