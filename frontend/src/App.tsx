import { Routes, Route, Navigate } from 'react-router-dom';
import ProductListPage from './pages/ProductListPage';
import CheckoutCardPage from './pages/CheckoutCardPage';
import CheckoutSummaryPage from './pages/CheckoutSummaryPage';
import CheckoutProcessingPage from './pages/CheckoutProcessingPage';
import CheckoutResultPage from './pages/CheckoutResultPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ProductListPage />} />
      <Route path="/checkout/card" element={<CheckoutCardPage />} />
      <Route path="/checkout/summary" element={<CheckoutSummaryPage />} />
      <Route path="/checkout/processing" element={<CheckoutProcessingPage />} />
      <Route path="/checkout/result" element={<CheckoutResultPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
