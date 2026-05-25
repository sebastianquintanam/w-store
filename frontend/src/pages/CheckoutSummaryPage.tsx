import { useNavigate, Navigate } from 'react-router-dom';
import { useAppSelector } from '../store';

// ─── constants ────────────────────────────────────────────────────────────────

const BASE_FEE_CENTS = 1_000;
const DELIVERY_CENTS = 5_000;

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatCOP(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

const BRAND_DISPLAY: Record<'visa' | 'mastercard' | 'unknown', string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  unknown: 'Desconocida',
};

// ─── page component ───────────────────────────────────────────────────────────

export default function CheckoutSummaryPage() {
  const { product, customer, cardMeta } = useAppSelector(s => s.checkout);
  const navigate = useNavigate();

  if (!product) return <Navigate to="/" replace />;
  if (!customer || !cardMeta) return <Navigate to="/checkout/card" replace />;

  const total = product.priceCents + BASE_FEE_CENTS + DELIVERY_CENTS;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate('/checkout/card')}
            className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            ← Tarjeta
          </button>
          <span className="text-gray-300">|</span>
          <h1 className="text-xl font-bold">W-Store</h1>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* ── left: detail sections ── */}
          <div className="flex-1 space-y-6">

            {/* Product */}
            <section>
              <h2 className="text-base font-semibold mb-3">Producto</h2>
              <div className="rounded-2xl border bg-white p-5 shadow-sm flex gap-4">
                <div className="w-24 shrink-0 rounded-xl bg-gray-100 aspect-square" />
                <div className="space-y-1 min-w-0">
                  <p className="font-semibold text-sm leading-snug">{product.name}</p>
                  <p className="text-sm text-gray-500 leading-snug">{product.description}</p>
                  <p className="text-sm font-medium">{formatCOP(product.priceCents)}</p>
                  <p className="text-xs text-gray-400">{product.stock} disponibles</p>
                </div>
              </div>
            </section>

            {/* Delivery */}
            <section>
              <h2 className="text-base font-semibold mb-3">Entrega</h2>
              <div className="rounded-2xl border bg-white p-5 shadow-sm space-y-2">
                <Row label="Nombre" value={customer.fullName} />
                <Row label="Email" value={customer.email} />
                <Row label="Dirección" value={customer.address} />
              </div>
            </section>

            {/* Card */}
            <section>
              <h2 className="text-base font-semibold mb-3">Tarjeta</h2>
              <div className="rounded-2xl border bg-white p-5 shadow-sm space-y-2">
                <Row label="Marca" value={BRAND_DISPLAY[cardMeta.brand]} />
                <Row label="Número" value={`**** **** **** ${cardMeta.last4}`} mono />
                <Row label="Titular" value={cardMeta.holderName} />
                <Row label="Vencimiento" value={cardMeta.expiry} mono />
              </div>
            </section>

            {/* Cost breakdown — mobile only */}
            <div className="lg:hidden">
              <CostBreakdown
                priceCents={product.priceCents}
                baseFeeCents={BASE_FEE_CENTS}
                deliveryCents={DELIVERY_CENTS}
                total={total}
                onBack={() => navigate('/checkout/card')}
                onConfirm={() => navigate('/checkout/processing')}
              />
            </div>

          </div>

          {/* ── right: cost summary (desktop) ── */}
          <aside className="hidden lg:block w-80 shrink-0">
            <div className="sticky top-24">
              <CostBreakdown
                priceCents={product.priceCents}
                baseFeeCents={BASE_FEE_CENTS}
                deliveryCents={DELIVERY_CENTS}
                total={total}
                onBack={() => navigate('/checkout/card')}
                onConfirm={() => navigate('/checkout/processing')}
              />
            </div>
          </aside>

        </div>
      </main>
    </div>
  );
}

// ─── sub-components ───────────────────────────────────────────────────────────

function Row({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-sm text-gray-500 shrink-0">{label}</span>
      <span className={`text-sm text-gray-900 text-right truncate ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  );
}

function CostBreakdown({
  priceCents,
  baseFeeCents,
  deliveryCents,
  total,
  onBack,
  onConfirm,
}: {
  priceCents: number;
  baseFeeCents: number;
  deliveryCents: number;
  total: number;
  onBack: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
      <h2 className="text-base font-semibold">Desglose</h2>

      <div className="space-y-2">
        <LineItem label="Producto" value={formatCOP(priceCents)} />
        <LineItem label="Tarifa base" value={formatCOP(baseFeeCents)} />
        <LineItem label="Envío" value={formatCOP(deliveryCents)} />
        <div className="border-t pt-2 flex justify-between">
          <span className="text-sm font-semibold">Total</span>
          <span className="text-sm font-semibold">{formatCOP(total)}</span>
        </div>
      </div>

      <div className="flex flex-col gap-2 pt-1">
        <button
          onClick={onConfirm}
          className="w-full rounded-xl px-4 py-3 bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
        >
          Confirmar pago →
        </button>
        <button
          onClick={onBack}
          className="w-full rounded-xl px-4 py-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          ← Volver
        </button>
      </div>
    </div>
  );
}

function LineItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm text-gray-900">{value}</span>
    </div>
  );
}
