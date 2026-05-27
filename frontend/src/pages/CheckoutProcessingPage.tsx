import { useEffect, useRef, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store';
import { setTransaction } from '../store/checkoutSlice';
import { createTransaction, getTransaction } from '../lib/api';
import { formatCOP } from '../lib/money';
import { DELIVERY_CENTS, calcTotal } from '../lib/checkout';

// ─── constants ────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 2_500;
const POLL_TIMEOUT_MS = 120_000;

// ─── types ────────────────────────────────────────────────────────────────────

type Phase = 'creating' | 'polling' | 'network_error' | 'timeout';

// ─── page component ───────────────────────────────────────────────────────────

export default function CheckoutProcessingPage() {
  const { product, customer, cardMeta } = useAppSelector(s => s.checkout);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>('creating');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [txId, setTxId] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  // Prevents double POST in React StrictMode (effects fire twice in dev)
  const calledRef = useRef(false);

  // ── Effect 1: create transaction ──────────────────────────────────────────
  useEffect(() => {
    if (!product || !customer) return;
    if (calledRef.current) return;
    calledRef.current = true;

    setPhase('creating');
    setErrorMsg(null);

    createTransaction({
      productId: product.id,
      deliveryCents: DELIVERY_CENTS,
      customer: {
        fullName: customer.fullName,
        email: customer.email,
        address: customer.address,
      },
    })
      .then(({ transaction }) => {
        dispatch(setTransaction(transaction));
        setTxId(transaction.id);
        setPhase('polling');
      })
      .catch((err: unknown) => {
        setErrorMsg(err instanceof Error ? err.message : 'Error inesperado');
        setPhase('network_error');
      });
  // retryKey is the only intentional trigger — product/customer/dispatch are
  // stable references captured once; adding them would risk re-running on
  // unrelated re-renders.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryKey]);

  // ── Effect 2: poll until status changes ───────────────────────────────────
  useEffect(() => {
    if (!txId) return;

    let cancelled = false;
    let iv: ReturnType<typeof setInterval>;
    let killer: ReturnType<typeof setTimeout>;

    iv = setInterval(async () => {
      if (cancelled) return;
      try {
        const fresh = await getTransaction(txId);
        if (cancelled) return;
        if (fresh.status !== 'PENDING') {
          cancelled = true;
          clearInterval(iv);
          clearTimeout(killer);
          dispatch(setTransaction(fresh));
          navigate('/checkout/result');
        }
      } catch {
        // network blip — retry on next tick
      }
    }, POLL_INTERVAL_MS);

    killer = setTimeout(() => {
      if (cancelled) return;
      cancelled = true;
      clearInterval(iv);
      setPhase('timeout');
    }, POLL_TIMEOUT_MS);

    return () => {
      cancelled = true;
      clearInterval(iv);
      clearTimeout(killer);
    };
  // dispatch and navigate are stable references; txId is the real trigger.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txId]);

  // ── Route guards (after all hooks) ────────────────────────────────────────
  if (!product) return <Navigate to="/" replace />;
  if (!customer || !cardMeta) return <Navigate to="/checkout/card" replace />;

  const total = calcTotal(product.priceCents);
  const isSpinning = phase === 'creating' || phase === 'polling';

  function handleRetry() {
    calledRef.current = false;
    setTxId(null);
    setRetryKey(k => k + 1);
  }

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-4">

        <div className="rounded-2xl border bg-white p-6 shadow-sm text-center space-y-5">

          {/* Spinner */}
          {isSpinning && (
            <div className="flex justify-center">
              <div className="w-10 h-10 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
            </div>
          )}

          {/* Status message */}
          <div className="space-y-1">
            <p className="text-sm font-semibold text-gray-800">
              {phase === 'creating' && 'Creando transacción...'}
              {phase === 'polling' && 'Procesando pago...'}
              {phase === 'network_error' && 'Error al procesar la compra.'}
              {phase === 'timeout' && 'La operación tardó demasiado.'}
            </p>
            {phase === 'network_error' && errorMsg && (
              <p className="text-xs text-red-500">{errorMsg}</p>
            )}
            {phase === 'timeout' && (
              <p className="text-xs text-gray-500">No se recibió confirmación en 2 minutos.</p>
            )}
          </div>

          {/* Product + total */}
          <div className="border-t pt-4 text-left space-y-1">
            <p className="text-sm font-semibold">{product.name}</p>
            <p className="text-sm text-gray-500">Total: {formatCOP(total)}</p>
          </div>

          {/* Security note */}
          <p className="text-xs text-gray-400 border-t pt-3">
            No almacenamos CVV ni número completo de tarjeta.
          </p>

        </div>

        {/* Action buttons */}
        {phase === 'creating' && (
          <button
            onClick={() => navigate('/checkout/summary')}
            className="w-full rounded-xl px-4 py-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            ← Volver al resumen
          </button>
        )}

        {(phase === 'network_error' || phase === 'timeout') && (
          <div className="space-y-2">
            <button
              onClick={handleRetry}
              className="w-full rounded-xl px-4 py-3 bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
            >
              Intentar de nuevo
            </button>
            <button
              onClick={() => navigate(phase === 'timeout' ? '/' : '/checkout/summary')}
              className="w-full rounded-xl px-4 py-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
            >
              {phase === 'timeout' ? '← Volver al inicio' : '← Volver al resumen'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
