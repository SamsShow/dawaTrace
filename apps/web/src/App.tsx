import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Docs from './pages/Docs';
import Dashboard from './pages/Dashboard';
import Batches from './pages/Batches';
import BatchDetail from './pages/BatchDetail';
import Recalls from './pages/Recalls';
import Analytics from './pages/Analytics';
import Reports from './pages/Reports';
import Admin from './pages/Admin';
import Login from './pages/Login';
import { useAuth } from './hooks/useAuth';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function RegulatorRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.orgRole !== 'REGULATOR') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/docs" element={<Docs />} />
        <Route path="/docs/:slug" element={<Docs />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/batches" element={<ProtectedRoute><Batches /></ProtectedRoute>} />
        <Route path="/batches/:batchId" element={<ProtectedRoute><BatchDetail /></ProtectedRoute>} />
        <Route path="/recalls" element={<ProtectedRoute><Recalls /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
        <Route path="/reports" element={<RegulatorRoute><Reports /></RegulatorRoute>} />
        <Route path="/admin" element={<RegulatorRoute><Admin /></RegulatorRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
