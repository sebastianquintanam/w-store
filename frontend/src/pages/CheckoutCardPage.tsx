import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store';
import { setCustomer, setCardMeta } from '../store/checkoutSlice';
import type { Product } from '../lib/api';
import { formatCOP } from '../lib/money';
import {
  onlyDigits,
  formatCardNumber,
  detectBrand,
  isValidLuhn,
  isValidExpiry,
} from '../lib/card';

// ─── form types ───────────────────────────────────────────────────────────────

type FormFields = {
  fullName: string;
  email: string;
  address: string;
  cardNumber: string;
  holderName: string;
  expiry: string;
  cvv: string;
};

type FormErrors = Partial<Record<keyof FormFields, string>>;

function validate(f: FormFields): FormErrors {
  const err: FormErrors = {};

  if (f.fullName.trim().length < 3)
    err.fullName = 'Nombre requerido, mínimo 3 caracteres.';

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim()))
    err.email = 'Ingresa un email válido.';

  if (f.address.trim().length < 5)
    err.address = 'Dirección requerida, mínimo 5 caracteres.';

  const digits = onlyDigits(f.cardNumber);
  if (!digits)
    err.cardNumber = 'Número de tarjeta requerido.';
  else if (digits.length < 13 || digits.length > 16)
    err.cardNumber = 'Número de tarjeta inválido.';
  else if (!isValidLuhn(digits))
    err.cardNumber = 'Número de tarjeta inválido.';

  if (f.holderName.trim().length < 3)
    err.holderName = 'Titular requerido, mínimo 3 caracteres.';

  if (!f.expiry)
    err.expiry = 'Fecha de vencimiento requerida.';
  else if (!isValidExpiry(f.expiry))
    err.expiry = 'Fecha inválida o vencida.';

  const cvvDigits = onlyDigits(f.cvv);
  if (!cvvDigits)
    err.cvv = 'CVV requerido.';
  else if (cvvDigits.length < 3 || cvvDigits.length > 4)
    err.cvv = 'CVV debe tener 3 o 4 dígitos.';

  return err;
}

const BRAND_LABEL: Record<'visa' | 'mastercard' | 'unknown', string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  unknown: '',
};

// ─── page component ───────────────────────────────────────────────────────────

export default function CheckoutCardPage() {
  const product = useAppSelector(s => s.checkout.product);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [form, setFormState] = useState<FormFields>({
    fullName: '',
    email: '',
    address: '',
    cardNumber: '',
    holderName: '',
    expiry: '',
    cvv: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);

  if (!product) return <Navigate to="/" replace />;

  const brand = detectBrand(onlyDigits(form.cardNumber));

  function setField(field: keyof FormFields, value: string) {
    const next = { ...form, [field]: value };
    setFormState(next);
    if (submitted) {
      const fresh = validate(next);
      setErrors(prev => ({ ...prev, [field]: fresh[field] }));
    }
  }

  function handleExpiryChange(raw: string) {
    const digits = onlyDigits(raw).slice(0, 4);
    const formatted = digits.length > 2
      ? `${digits.slice(0, 2)}/${digits.slice(2)}`
      : digits;
    setField('expiry', formatted);
  }

  function handleContinue() {
    setSubmitted(true);
    const errs = validate(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    const digits = onlyDigits(form.cardNumber);

    dispatch(setCustomer({
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
    }));

    dispatch(setCardMeta({
      last4: digits.slice(-4),
      holderName: form.holderName.trim(),
      expiry: form.expiry,
      brand,
    }));

    // CVV is intentionally not dispatched — must never enter Redux or localStorage

    navigate('/checkout/summary');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            ← Productos
          </button>
          <span className="text-gray-300">|</span>
          <h1 className="text-xl font-bold">W-Store</h1>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* ── forms column ── */}
          <div className="flex-1 space-y-6">

            {/* Product summary — visible on mobile only */}
            <div className="lg:hidden">
              <ProductSummary product={product} />
            </div>

            {/* Delivery */}
            <section>
              <h2 className="text-base font-semibold mb-3">Datos de entrega</h2>
              <div className="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
                <Field
                  label="Nombre completo"
                  id="fullName"
                  value={form.fullName}
                  onChange={v => setField('fullName', v)}
                  error={errors.fullName}
                  placeholder="Sebastian Quintana"
                  autoComplete="name"
                />
                <Field
                  label="Email"
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={v => setField('email', v)}
                  error={errors.email}
                  placeholder="sebas@test.com"
                  autoComplete="email"
                />
                <Field
                  label="Dirección"
                  id="address"
                  value={form.address}
                  onChange={v => setField('address', v)}
                  error={errors.address}
                  placeholder="Calle 123, Ciudad"
                  autoComplete="street-address"
                />
              </div>
            </section>

            {/* Card */}
            <section>
              <h2 className="text-base font-semibold mb-3">Datos de tarjeta</h2>
              <div className="rounded-2xl border bg-white p-5 shadow-sm space-y-4">

                {/* Card number */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium text-gray-700" htmlFor="cardNumber">
                      Número de tarjeta
                    </label>
                    {brand !== 'unknown' && (
                      <span className="text-xs font-semibold tracking-wide text-blue-600 uppercase">
                        {BRAND_LABEL[brand]}
                      </span>
                    )}
                  </div>
                  <input
                    id="cardNumber"
                    type="text"
                    inputMode="numeric"
                    value={form.cardNumber}
                    onChange={e => setField('cardNumber', formatCardNumber(e.target.value))}
                    placeholder="4111 1111 1111 1111"
                    maxLength={19}
                    autoComplete="cc-number"
                    className="w-full rounded-lg border px-3 py-2 text-sm font-mono tracking-widest outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {errors.cardNumber && (
                    <p className="text-xs text-red-500 mt-1">{errors.cardNumber}</p>
                  )}
                </div>

                <Field
                  label="Titular de la tarjeta"
                  id="holderName"
                  value={form.holderName}
                  onChange={v => setField('holderName', v)}
                  error={errors.holderName}
                  placeholder="Como aparece en la tarjeta"
                  autoComplete="cc-name"
                />

                <div className="grid grid-cols-2 gap-4">
                  {/* Expiry */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="expiry">
                      Vencimiento
                    </label>
                    <input
                      id="expiry"
                      type="text"
                      inputMode="numeric"
                      value={form.expiry}
                      onChange={e => handleExpiryChange(e.target.value)}
                      placeholder="MM/YY"
                      maxLength={5}
                      autoComplete="cc-exp"
                      className="w-full rounded-lg border px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {errors.expiry && (
                      <p className="text-xs text-red-500 mt-1">{errors.expiry}</p>
                    )}
                  </div>

                  {/* CVV — type="password" to mask on screen, never leaves local state */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="cvv">
                      CVV
                    </label>
                    <input
                      id="cvv"
                      type="password"
                      inputMode="numeric"
                      value={form.cvv}
                      onChange={e => setField('cvv', onlyDigits(e.target.value).slice(0, 4))}
                      placeholder="•••"
                      maxLength={4}
                      autoComplete="cc-csc"
                      className="w-full rounded-lg border px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {errors.cvv && (
                      <p className="text-xs text-red-500 mt-1">{errors.cvv}</p>
                    )}
                  </div>
                </div>

              </div>
            </section>

            <button
              onClick={handleContinue}
              className="w-full rounded-xl px-4 py-3 bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
            >
              Continuar al resumen →
            </button>

          </div>

          {/* ── product summary column (desktop only) ── */}
          <aside className="hidden lg:block w-80 shrink-0">
            <div className="sticky top-24 rounded-2xl border bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold mb-4">Resumen del producto</h2>
              <ProductSummary product={product} />
            </div>
          </aside>

        </div>
      </main>
    </div>
  );
}

// ─── shared sub-components ────────────────────────────────────────────────────

function Field({
  label,
  id,
  value,
  onChange,
  error,
  placeholder,
  type = 'text',
  autoComplete,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function ProductSummary({ product }: { product: Product }) {
  return (
    <div className="space-y-2">
      <div className="aspect-video rounded-xl bg-gray-100" />
      <p className="font-semibold text-sm">{product.name}</p>
      <p className="text-sm text-gray-500">{product.description}</p>
      <p className="text-sm font-medium">{formatCOP(product.priceCents)}</p>
      <p className="text-xs text-gray-400">{product.stock} disponibles</p>
    </div>
  );
}
