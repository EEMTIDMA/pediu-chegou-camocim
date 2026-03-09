// @ts-nocheck
import { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Importação vital para o funcionamento dos Mapas
import 'leaflet/dist/leaflet.css';

// Importações das Páginas
import Login from './pages/Login';
import Register from './pages/Register';
import EmpresaDash from './pages/EmpresaDash';
import EntregadorDash from './pages/EntregadorDash';
import AdminDash from './pages/AdminDash'; // Importação da nova página
import RastreioPublico from './pages/RastreioPublico';

// Redirecionamento inteligente baseado no cargo (Role)
const HomeRedirect = () => {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>Carregando...</div>
    );

  if (!user) return <Navigate to="/login" replace />;

  // Redirecionamento com 'replace' para evitar loops no histórico do navegador
  switch (user.role) {
    case 'admin':
      return <Navigate to="/admin" replace />;
    case 'empresa':
      return <Navigate to="/empresa" replace />;
    case 'entregador':
      return <Navigate to="/entregador" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
};

// Proteção de Rota
const ProtectedRoute = ({
  children,
  role,
}: {
  children: ReactNode;
  role: string;
}) => {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>Verificando...</div>
    );
  if (!user) return <Navigate to="/login" replace />;

  // Admin tem acesso a tudo, caso contrário verifica o role específico
  if (user.role !== role && user.role !== 'admin')
    return <Navigate to="/" replace />;

  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/rastreio/:codigo" element={<RastreioPublico />} />

          {/* ROTA DO ADMIN - ADICIONADA */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute role="admin">
                <AdminDash />
              </ProtectedRoute>
            }
          />

          <Route
            path="/empresa"
            element={
              <ProtectedRoute role="empresa">
                <EmpresaDash />
              </ProtectedRoute>
            }
          />

          <Route
            path="/entregador"
            element={
              <ProtectedRoute role="entregador">
                <EntregadorDash />
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<HomeRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
