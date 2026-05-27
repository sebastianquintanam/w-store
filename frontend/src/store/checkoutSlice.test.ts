import { describe, expect, it } from 'vitest';
import checkoutReducer, {
  setProduct,
  setCardMeta,
  setCustomer,
  setTransaction,
  resetCheckout,
  resetPayment,
  type CardMeta,
  type CustomerData,
} from './checkoutSlice';
import type { Product, Tx } from '../lib/api';

// ─── fixtures ─────────────────────────────────────────────────────────────────

const mockProduct: Product = {
  id: 'prod-1',
  name: 'Camiseta W-Store',
  description: 'Edición limitada',
  priceCents: 89_900,
  stock: 10,
};

const mockCustomer: CustomerData = {
  fullName: 'Sebastian Quintana',
  email: 'test@test.com',
  address: 'Calle 123, Bogotá',
};

const mockCardMeta: CardMeta = {
  last4: '1111',
  holderName: 'Sebastian Quintana',
  expiry: '12/99',
  brand: 'visa',
};

const mockTransaction: Tx = {
  id: 'tx-abc-123',
  status: 'PENDING',
  productId: 'prod-1',
  customerId: 'cust-1',
  amountCents: 95_900,
  baseFeeCents: 1_000,
  deliveryCents: 5_000,
};

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Returns the initial state by dispatching an unknown action. */
function getInitialState() {
  return checkoutReducer(undefined, { type: '' });
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe('initialState', () => {
  it('product is null', () => {
    expect(getInitialState().product).toBeNull();
  });

  it('customer is null', () => {
    expect(getInitialState().customer).toBeNull();
  });

  it('cardMeta is null', () => {
    expect(getInitialState().cardMeta).toBeNull();
  });

  it('transaction is null', () => {
    expect(getInitialState().transaction).toBeNull();
  });
});

describe('setProduct', () => {
  it('stores the selected product', () => {
    const state = checkoutReducer(getInitialState(), setProduct(mockProduct));
    expect(state.product).toEqual(mockProduct);
  });
});

describe('setCustomer', () => {
  it('stores fullName', () => {
    const state = checkoutReducer(getInitialState(), setCustomer(mockCustomer));
    expect(state.customer?.fullName).toBe(mockCustomer.fullName);
  });

  it('stores email', () => {
    const state = checkoutReducer(getInitialState(), setCustomer(mockCustomer));
    expect(state.customer?.email).toBe(mockCustomer.email);
  });

  it('stores address', () => {
    const state = checkoutReducer(getInitialState(), setCustomer(mockCustomer));
    expect(state.customer?.address).toBe(mockCustomer.address);
  });
});

describe('setCardMeta', () => {
  it('stores brand', () => {
    const state = checkoutReducer(getInitialState(), setCardMeta(mockCardMeta));
    expect(state.cardMeta?.brand).toBe('visa');
  });

  it('stores last4', () => {
    const state = checkoutReducer(getInitialState(), setCardMeta(mockCardMeta));
    expect(state.cardMeta?.last4).toBe('1111');
  });

  it('stores holderName', () => {
    const state = checkoutReducer(getInitialState(), setCardMeta(mockCardMeta));
    expect(state.cardMeta?.holderName).toBe(mockCardMeta.holderName);
  });

  it('stores expiry', () => {
    const state = checkoutReducer(getInitialState(), setCardMeta(mockCardMeta));
    expect(state.cardMeta?.expiry).toBe('12/99');
  });

  it('does not store cvv', () => {
    const state = checkoutReducer(getInitialState(), setCardMeta(mockCardMeta));
    expect(state.cardMeta).not.toHaveProperty('cvv');
  });

  it('does not store full card number', () => {
    const state = checkoutReducer(getInitialState(), setCardMeta(mockCardMeta));
    expect(state.cardMeta).not.toHaveProperty('cardNumber');
  });
});

describe('setTransaction', () => {
  it('stores the transaction', () => {
    const state = checkoutReducer(getInitialState(), setTransaction(mockTransaction));
    expect(state.transaction).toEqual(mockTransaction);
  });
});

describe('resetPayment', () => {
  /** State with all fields populated, used as baseline for resetPayment tests. */
  function getFullState() {
    let s = getInitialState();
    s = checkoutReducer(s, setProduct(mockProduct));
    s = checkoutReducer(s, setCustomer(mockCustomer));
    s = checkoutReducer(s, setCardMeta(mockCardMeta));
    s = checkoutReducer(s, setTransaction(mockTransaction));
    return s;
  }

  it('clears cardMeta', () => {
    const state = checkoutReducer(getFullState(), resetPayment());
    expect(state.cardMeta).toBeNull();
  });

  it('clears transaction', () => {
    const state = checkoutReducer(getFullState(), resetPayment());
    expect(state.transaction).toBeNull();
  });

  it('preserves product', () => {
    const state = checkoutReducer(getFullState(), resetPayment());
    expect(state.product).toEqual(mockProduct);
  });

  it('preserves customer', () => {
    const state = checkoutReducer(getFullState(), resetPayment());
    expect(state.customer).toEqual(mockCustomer);
  });
});

describe('resetCheckout', () => {
  it('sets product to null', () => {
    const full = checkoutReducer(getInitialState(), setProduct(mockProduct));
    expect(checkoutReducer(full, resetCheckout()).product).toBeNull();
  });

  it('sets customer to null', () => {
    const full = checkoutReducer(getInitialState(), setCustomer(mockCustomer));
    expect(checkoutReducer(full, resetCheckout()).customer).toBeNull();
  });

  it('sets cardMeta to null', () => {
    const full = checkoutReducer(getInitialState(), setCardMeta(mockCardMeta));
    expect(checkoutReducer(full, resetCheckout()).cardMeta).toBeNull();
  });

  it('sets transaction to null', () => {
    const full = checkoutReducer(getInitialState(), setTransaction(mockTransaction));
    expect(checkoutReducer(full, resetCheckout()).transaction).toBeNull();
  });
});
