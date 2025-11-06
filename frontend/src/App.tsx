import { useEffect, useState } from 'react';
import { createTransaction, getProducts, type Product } from './lib/api';
import ProductCard from './components/ProductCard';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await getProducts();
        setProducts(data);
      } catch (e: any) {
        setError(e?.message ?? 'Error inesperado');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleBuy(id: string) {
    try {
      setToast('Creando transacción…');
      const tx = await createTransaction(id);
      // Aquí puedes:
      // 1) Mostrar referencia y estado
      // 2) Redirigir a un checkout si lo implementas luego
      setToast(`Transacción creada: ${tx.reference} (${tx.status})`);
      // window.location.href = tx.checkoutUrl; // si luego tu backend expone esto
    } catch (e: any) {
      setToast(e?.message ?? 'Error creando transacción');
    } finally {
      setTimeout(() => setToast(null), 3000);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">W-Store</h1>
          <span className="text-sm text-gray-500">Demo Wompi · NestJS + React</span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10">
        {loading && <p className="text-gray-500">Cargando productos…</p>}
        {error && <p className="text-red-600">{error}</p>}

        {!loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map(p => (
              <ProductCard key={p.id} product={p} onBuy={handleBuy} />
            ))}
          </div>
        )}
      </main>

      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-xl bg-black text-white px-4 py-2 text-sm">
          {toast}
        </div>
      )}
    </div>
  );
}
