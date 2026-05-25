import { useEffect, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store';
import { resetCheckout, resetPayment } from '../store/checkoutSlice';
import { getDeliveryByTransactionId, type Delivery } from '../lib/api';

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatCOP(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

// ─── result config ────────────────────────────────────────────────────────────

type ResultKey = 'APPROVED' | 'DECLINED' | 'ERROR' | 'OTHER';

const RESULT: Record<
  ResultKey,
  { title: string; message: string; iconBg: string; iconColor: string; textColor: string }
> = {
  APPROVED: {
    title: 'Pago aprobado',
    message: 'Tu compra fue confirmada correctamente.',
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    textColor: 'text-green-700',
  },
  DECLINED: {
    title: 'Pago rechazado',
    message: 'La transacción fue rechazada. Puedes intentar nuevamente.',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    textColor: 'text-red-700',
  },
  ERROR: {
    title: 'Error en el pago',
    message: 'No pudimos completar la transacción.',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    textColor: 'text-amber-700',
  },
  OTHER: {
    title: 'Estado desconocido',
    message: '',
    iconBg: 'bg-gray-100',
    iconColor: 'text-gray-600',
    textColor: 'text-gray-700',
  },
};

const STATUS_ICON: Record<ResultKey, string> = {
  APPROVED: '✓',
  DECLINED: '✕',
  ERROR: '!',
  OTHER: '?',
};

const BRAND_DISPLAY: Record<'visa' | 'mastercard' | 'unknown', string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  unknown: 'Desconocida',
};

// ─── page component ───────────────────────────────────────────────────────────

export default function CheckoutResultPage() {
  const { transaction, product, customer, cardMeta } = useAppSelector(s => s.checkout);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);

  // ── Fetch delivery — only when APPROVED ───────────────────────────────────
  useEffect(() => {
    if (transaction?.status !== 'APPROVED') return;

    let cancelled = false;
    setDeliveryLoading(true);

    getDeliveryByTransactionId(transaction.id)
      .then(d => {
        if (!cancelled) { setDelivery(d); setDeliveryLoading(false); }
      })
      .catch(() => {
        if (!cancelled) {
          setDeliveryError('No se pudo cargar el estado de entrega.');
          setDeliveryLoading(false);
        }
      });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transaction?.id, transaction?.status]);

  // ── Guards ────────────────────────────────────────────────────────────────
  if (!transaction || !product || !customer || !cardMeta) {
    return <Navigate to="/" replace />;
  }

  const statusKey: ResultKey =
    transaction.status === 'APPROVED' ? 'APPROVED'
    : transaction.status === 'DECLINED' ? 'DECLINED'
    : transaction.status === 'ERROR' ? 'ERROR'
    : 'OTHER';

  const cfg = RESULT[statusKey];
  const total = transaction.amountCents ?? (product.priceCents + 1_000 + 5_000);
  const isRetryable = statusKey === 'DECLINED' || statusKey === 'ERROR';

  function handleGoHome() {
    dispatch(resetCheckout());
    navigate('/');
  }

  function handleRetry() {
    dispatch(resetPayment());
    navigate('/checkout/card');
  }

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg space-y-4">

        {/* ── Result header ── */}
        <div className="rounded-2xl border bg-white p-6 shadow-sm text-center space-y-3">
          <div className={`mx-auto w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold ${cfg.iconBg} ${cfg.iconColor}`}>
            {STATUS_ICON[statusKey]}
          </div>
          <h1 className={`text-xl font-bold ${cfg.textColor}`}>{cfg.title}</h1>
          {cfg.message && <p className="text-sm text-gray-600">{cfg.message}</p>}
          {statusKey === 'OTHER' && (
            <p className="text-xs font-mono text-gray-400">{transaction.status}</p>
          )}
          <p className="text-xs font-mono text-gray-400">Ref: {transaction.id}</p>
        </div>

        {/* ── Order summary ── */}
        <div className="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-base font-semibold">Resumen del pedido</h2>

          <div className="flex gap-3">
            <div className="w-16 shrink-0 rounded-xl bg-gray-100 aspect-square" />
            <div className="space-y-0.5 min-w-0">
              <p className="text-sm font-semibold leading-snug">{product.name}</p>
              <p className="text-xs text-gray-500 leading-snug">{product.description}</p>
              <p className="text-sm font-medium">{formatCOP(product.priceCents)}</p>
            </div>
          </div>

          <div className="flex justify-between border-t pt-3">
            <span className="text-sm font-semibold">Total pagado</span>
            <span className="text-sm font-semibold">{formatCOP(total)}</span>
          </div>

          <div className="space-y-1.5 border-t pt-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-2">Tarjeta</p>
            <InfoRow label="Marca" value={BRAND_DISPLAY[cardMeta.brand]} />
            <InfoRow label="Número" value={`**** **** **** ${cardMeta.last4}`} mono />
            <InfoRow label="Titular" value={cardMeta.holderName} />
          </div>
        </div>

        {/* ── Customer / Delivery info ── */}
        <div className="rounded-2xl border bg-white p-5 shadow-sm space-y-2">
          <h2 className="text-base font-semibold mb-3">Datos de entrega</h2>
          <InfoRow label="Nombre" value={customer.fullName} />
          <InfoRow label="Email" value={customer.email} />
          <InfoRow label="Dirección" value={customer.address} />
        </div>

        {/* ── Delivery status (APPROVED only) ── */}
        {statusKey === 'APPROVED' && (
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold mb-3">Estado de envío</h2>

            {deliveryLoading && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-blue-100 border-t-blue-500 animate-spin" />
                <span className="text-sm text-gray-500">Cargando estado de entrega...</span>
              </div>
            )}

            {deliveryError && (
              <p className="text-sm text-amber-600">{deliveryError}</p>
            )}

            {delivery && (
              <div className="space-y-1.5">
                <InfoRow label="Estado" value={delivery.status} />
                <InfoRow label="Dirección" value={delivery.address} />
                {delivery.createdAt && (
                  <InfoRow
                    label="Creado"
                    value={new Date(delivery.createdAt).toLocaleString('es-CO')}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Actions ── */}
        <div className="space-y-2 pb-4">
          {isRetryable && (
            <button
              onClick={handleRetry}
              className="w-full rounded-xl px-4 py-3 bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
            >
              Intentar nuevamente
            </button>
          )}
          <button
            onClick={handleGoHome}
            className="w-full rounded-xl px-4 py-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            ← Volver al inicio
          </button>
        </div>

      </div>
    </div>
  );
}

// ─── sub-component ────────────────────────────────────────────────────────────

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-sm text-gray-500 shrink-0">{label}</span>
      <span className={`text-sm text-gray-900 text-right truncate ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  );
}
