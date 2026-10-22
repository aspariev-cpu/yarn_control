import { Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './pages/Login.jsx';
import LoaderHome from './pages/LoaderHome.jsx';
import NewTransfer from './pages/NewTransfer.jsx';
import AdminHome from './pages/AdminHome.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx'; // <-- Импорт нового дашборда
import AdminUsers from './pages/AdminUsers.jsx';
import AdminYarns from './pages/AdminYarns.jsx';
import AdminStock from './pages/AdminStock.jsx';
import AdminTransfers from './pages/AdminTransfers.jsx';
import { getUser, clearAuth } from './api.js';

function RequireRole({ role, children }) {
  const user = getUser();
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role && user.role !== 'ADMIN') return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const [, force] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const user = getUser();

  useEffect(() => { force((n) => n + 1); }, [location.pathname]);

  function logout() {
    clearAuth();
    navigate('/login', { replace: true });
  }

  const homePath =
    user?.role === 'ADMIN' ? '/admin' : user?.role === 'LOADER' ? '/' : '/login';

  return (
    <div className="min-h-full flex flex-col">
      {user && (
        <header className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10">
          <Link to={homePath} className="font-semibold text-gray-800">
            Пряжа · {user.name}
          </Link>
          <div className="flex items-center gap-2">
            {user.role === 'ADMIN' && (
              <>
                <Link to="/admin" className="text-sm text-blue-600 px-2 py-2">Дашборд</Link>
                <Link to="/admin/menu" className="text-sm text-gray-600 px-2 py-2">Меню</Link>
              </>
            )}
            {user.role === 'LOADER' && (
              <Link to="/" className="text-sm text-blue-600 px-2 py-2">В цех</Link>
            )}
            <button onClick={logout} className="text-sm text-red-600 px-2 py-2 rounded-lg active:bg-red-50">
              Выйти
            </button>
          </div>
        </header>
      )}
      <main className="flex-1">
        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Роуты грузчика */}
          <Route path="/" element={<RequireRole role="LOADER"><LoaderHome /></RequireRole>} />
          <Route path="/new" element={<RequireRole role="LOADER"><NewTransfer /></RequireRole>} />
          
          {/* Роуты админа */}
          <Route path="/admin" element={<RequireRole role="ADMIN"><AdminDashboard /></RequireRole>} />
          <Route path="/admin/menu" element={<RequireRole role="ADMIN"><AdminHome /></RequireRole>} />
          <Route path="/admin/users" element={<RequireRole role="ADMIN"><AdminUsers /></RequireRole>} />
          <Route path="/admin/yarns" element={<RequireRole role="ADMIN"><AdminYarns /></RequireRole>} />
          <Route path="/admin/stock" element={<RequireRole role="ADMIN"><AdminStock /></RequireRole>} />
          <Route path="/admin/transfers" element={<RequireRole role="ADMIN"><AdminTransfers /></RequireRole>} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
