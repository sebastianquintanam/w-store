import { Routes, Route, Navigate } from 'react-router-dom';
import ProductListPage from './pages/ProductListPage';
import CheckoutCardPage from './pages/CheckoutCardPage';
import CheckoutSummaryPage from './pages/CheckoutSummaryPage';
import CheckoutProcessingPage from './pages/CheckoutProcessingPage';

function CheckoutPlaceholder({ step }: { step: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400 text-sm">Checkout — {step} (próximamente)</p>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ProductListPage />} />
      <Route path="/checkout/card" element={<CheckoutCardPage />} />
      <Route path="/checkout/summary" element={<CheckoutSummaryPage />} />
      <Route path="/checkout/processing" element={<CheckoutProcessingPage />} />
      <Route path="/checkout/result" element={<CheckoutPlaceholder step="Resultado" />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
