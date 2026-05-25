export type Product = {
    id: string;
    name: string;
    description: string;
    priceCents: number;
    stock: number;
};

export type Tx = {
    id: string;
    status: 'PENDING' | 'APPROVED' | 'DECLINED' | 'ERROR';
    productId: string;
    customerId: string;
    amountCents: number;
    baseFeeCents: number;
    deliveryCents: number;
    createdAt?: string;
    updatedAt?: string;
};

const API = import.meta.env.VITE_API_URL;

export async function getProducts(): Promise<Product[]> {
    const r = await fetch(`${API}/products`);
    if (!r.ok) throw new Error('No se pudieron cargar los productos');
    return r.json();
}

export async function getTransaction(id: string): Promise<Tx> {
    const r = await fetch(`${API}/transactions/${id}`);
    if (!r.ok) throw new Error('No se pudo consultar la transacción');
    return r.json();
}

export type CreateTransactionInput = {
    productId: string;
    deliveryCents: number;
    customer: {
        fullName: string;
        email: string;
        address: string;
    };
};

export async function createTransaction(input: CreateTransactionInput): Promise<{ message: string; transaction: Tx }> {
    const r = await fetch(`${API}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });
    if (!r.ok) {
        const t = await r.text();
        throw new Error(`Error creando transacción: ${t}`);
    }
    return r.json();
}

export async function finalizeTransaction(id: string, status: Tx['status']): Promise<{ message: string; transaction: Tx }> {
    const r = await fetch(`${API}/transactions/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
    });
    if (!r.ok) {
        const t = await r.text();
        throw new Error(`Error finalizando transacción: ${t}`);
    }
    return r.json();
}
