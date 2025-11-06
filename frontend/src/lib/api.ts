const BASE = import.meta.env.VITE_API_URL;

export type Product = {
    id: string;
    name: string;
    description: string;
    priceCents: number; 
    stock: number;
};

export async function getProducts(): Promise<Product[]> {
    const res = await fetch(`${BASE}/products`);
    if (!res.ok) throw new Error('Error cargando productos');
    return res.json();
}

export async function createTransaction(productId: string) {
    const res = await fetch(`${BASE}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId })
    });
    if (!res.ok) throw new Error('Error creando transacción');
    return res.json(); // { id, reference, status, amount, ... }
}
