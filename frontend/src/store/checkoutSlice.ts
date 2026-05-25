import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Product, Tx } from '../lib/api';

// Only safe card metadata — full PAN and CVV must never enter this slice
export type CardMeta = {
  last4: string;
  holderName: string;
  expiry: string; // MM/YY
  brand: 'visa' | 'mastercard' | 'unknown';
};

export type CustomerData = {
  fullName: string;
  email: string;
  address: string;
};

type CheckoutState = {
  product: Product | null;
  cardMeta: CardMeta | null;
  customer: CustomerData | null;
  transaction: Tx | null;
};

const initialState: CheckoutState = {
  product: null,
  cardMeta: null,
  customer: null,
  transaction: null,
};

export const checkoutSlice = createSlice({
  name: 'checkout',
  initialState,
  reducers: {
    setProduct(state, action: PayloadAction<Product>) {
      state.product = action.payload;
    },
    setCardMeta(state, action: PayloadAction<CardMeta>) {
      state.cardMeta = action.payload;
    },
    setCustomer(state, action: PayloadAction<CustomerData>) {
      state.customer = action.payload;
    },
    setTransaction(state, action: PayloadAction<Tx>) {
      state.transaction = action.payload;
    },
    resetCheckout() {
      return initialState;
    },
  },
});

export const { setProduct, setCardMeta, setCustomer, setTransaction, resetCheckout } =
  checkoutSlice.actions;

export default checkoutSlice.reducer;
