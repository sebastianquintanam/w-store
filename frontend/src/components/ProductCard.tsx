import { type Product, createTransaction, finalizeTransaction, type Tx, getTransaction } from '../lib/api'
import { useEffect, useState } from 'react'

function formatCOP(value: number) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
    }).format(value)
}

export default function ProductCard({ product }: { product: Product }) {
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<string | null>(null)
    const [tx, setTx] = useState<Tx | null>(null)

    // Polling automático mientras esté en PENDING
    useEffect(() => {
        if (!tx || tx.status !== 'PENDING') return;

        const iv = setInterval(async () => {
            try {
                const fresh = await getTransaction(tx.id);
                setTx(fresh);
                // Si cambió, cortamos polling
                if (fresh.status !== 'PENDING') {
                    setMessage(
                        fresh.status === 'APPROVED'
                            ? 'Transacción aprobada y stock actualizado'
                            : `Transacción finalizada con estado ${fresh.status}`
                    );
                    clearInterval(iv);
                }
            } catch {
                // silenciar o mostrar un mensaje suave
            }
        }, 2500);

        // safety timeout (ej. 2 minutos) para no dejar intervalos vivos eternamente
        const killer = setTimeout(() => clearInterval(iv), 120000);

        return () => {
            clearInterval(iv);
            clearTimeout(killer);
        };
    }, [tx]);

    async function handleBuy() {
        try {
            setLoading(true)
            setMessage('Creando transacción...')
            const data = await createTransaction(product.id)
            setTx(data.transaction)                              // <- guarda id y status
            setMessage(data.message || 'Transacción creada ✅')  // <- usa message del backend
        } catch (err: any) {
            setMessage(err?.message ?? 'Error al crear la transacción ❌')
        } finally {
            setLoading(false)
        }
    }

    async function handleFinalize(status: Tx['status']) {
        if (!tx) return
        try {
            setLoading(true)
            const data = await finalizeTransaction(tx.id, status)
            setTx(data.transaction)
            setMessage(data.message)
        } catch (err: any) {
            setMessage(err?.message ?? 'Error al finalizar ❌')
        } finally {
            setLoading(false)
        }
    }

    const isPending = tx?.status === 'PENDING'

    return (
        <div className="rounded-2xl border p-4 shadow-sm bg-white">
            <div className="aspect-video rounded-xl bg-gray-100 mb-3" />
            <h3 className="font-semibold">{product.name}</h3>
            <p className="text-sm text-gray-500 mb-3">{formatCOP(product.priceCents)}</p>

            <button
                className="w-full rounded-xl px-4 py-2 bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-60"
                onClick={handleBuy}
                disabled={loading}
            >
                {loading ? 'Procesando...' : 'Comprar'}
            </button>

            {/* Botones de simulación para esta fase */}
            <div className="flex gap-2 mt-3">
                <button className="px-3 py-1 rounded bg-green-600 text-white disabled:opacity-60"
                    disabled={!tx || !isPending || loading}
                    onClick={() => handleFinalize('APPROVED')}>
                    Aprobar
                </button>
                <button className="px-3 py-1 rounded bg-amber-600 text-white disabled:opacity-60"
                    disabled={!tx || !isPending || loading}
                    onClick={() => handleFinalize('DECLINED')}>
                    Rechazar
                </button>
                <button className="px-3 py-1 rounded bg-slate-500 text-white disabled:opacity-60"
                    disabled={!tx || !isPending || loading}
                    onClick={() => handleFinalize('ERROR')}>
                    Error
                </button>
            </div>

            {/* Estado y mensajes */}
            {tx && (
                <p className="text-xs text-gray-600 mt-2">
                    Estado actual: <span className="font-medium">{tx.status}</span> · id: {tx.id}
                </p>
            )}
            {message && (
                <p className="text-sm mt-2 text-center text-gray-700">{message}</p>
            )}
        </div>
    )
}
