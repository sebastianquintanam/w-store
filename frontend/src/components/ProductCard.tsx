import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../store';
import { setProduct } from '../store/checkoutSlice';
import type { Product } from '../lib/api';

function formatCOP(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function ProductCard({ product }: { product: Product }) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const outOfStock = product.stock === 0;

  function handleSelect() {
    dispatch(setProduct(product));
    navigate('/checkout/card');
  }

  return (
    <div className="rounded-2xl border p-4 shadow-sm bg-white">
      <div className="aspect-video rounded-xl bg-gray-100 mb-3" />

      <h3 className="font-semibold">{product.name}</h3>
      <p className="text-sm text-gray-500 mb-2">{product.description}</p>
      <p className="text-sm font-medium">{formatCOP(product.priceCents)}</p>
      <p className="text-xs text-gray-400 mb-4">
        {outOfStock ? 'Sin stock' : `${product.stock} disponibles`}
      </p>

      <button
        className="w-full rounded-xl px-4 py-2 bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={handleSelect}
        disabled={outOfStock}
      >
        {outOfStock ? 'Sin stock' : 'Pagar con tarjeta'}
      </button>
    </div>
  );
}
