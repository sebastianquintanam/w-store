import { Injectable } from '@nestjs/common';

@Injectable()
export class WompiService {
    private base = process.env.WOMPI_BASE_URL!;
    private prv = process.env.WOMPI_PRIVATE_KEY!;

    async createTransaction(payload: any) {
        const res = await fetch(`${this.base}/transactions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.prv}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Wompi error: ${res.status} ${text}`);
        }
        return res.json();
    }
}
