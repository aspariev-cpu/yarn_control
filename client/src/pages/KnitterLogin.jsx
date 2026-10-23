import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, saveAuth, getUser } from '../api.js';

export default function KnitterLogin() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (getUser()) navigate('/knitter', { replace: true });
  }, [navigate]);

  useEffect(() => {
    api.getUsers().then(data => {
      // Оставляем только вязальщиков
      setUsers(data.filter(u => u.role === 'KNITTER'));
    }).catch((e) => setError(e.message));
  }, []);

  async function handleLogin(userId) {
    setLoading(true); setError('');
    try {
      const res = await api.loginKnitter(userId);
      saveAuth(res.token, res.user);
      navigate('/knitter', { replace: true });
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  }

  return (
    <div className="p-5 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mt-6 mb-6">Вход для вязальщиков</h1>
      <div className="space-y-2">
        {users.map((u) => (
          <button key={u.id} onClick={() => handleLogin(u.id)} disabled={loading}
            className="w-full text-left px-4 py-5 rounded-xl border-2 border-gray-200 bg-white active:bg-gray-50 hover:border-blue-400 transition">
            <div className="font-bold text-lg text-gray-800">{u.name}</div>
            <div className="text-xs text-gray-500 mt-1">Нажмите, чтобы войти</div>
          </button>
        ))}
      </div>
      {error && <div className="mt-4 text-red-600 text-sm">{error}</div>}
    </div>
  );
}
