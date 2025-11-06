// frontend/src/components/ProductCard.tsx
import { type Product } from '../lib/api';

function formatCOP(value: number) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
    }).format(value);
}

export default function ProductCard({
    product,
    onBuy,
}: { product: Product; onBuy: (id: string) => void }) {
    return (
        <div className="rounded-2xl border p-4 shadow-sm bg-white">
            <div className="aspect-video rounded-xl bg-gray-100 mb-3" />
            <h3 className="font-semibold">{product.name}</h3>
            <p className="text-sm text-gray-500 mb-3">
                {formatCOP(product.priceCents)}
            </p>
            <button
                className="w-full rounded-xl px-4 py-2 bg-blue-600 text-white font-medium hover:bg-blue-700"
                onClick={() => onBuy(product.id)}
            >
                Comprar
            </button>
        </div>
    );
}
