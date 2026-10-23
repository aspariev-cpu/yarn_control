import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, saveAuth, getUser } from '../api.js';

export default function Login() {
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (getUser()) navigate('/', { replace: true });
  }, [navigate]);

  useEffect(() => {
    api.getUsers().then(setUsers).catch((e) => setError(e.message));
  }, []);

  async function submit() {
    if (!selected) return;

    // Если вязальщик — пускаем без пароля
    if (selected.role === 'KNITTER') {
      setLoading(true);
      try {
        const res = await api.loginKnitter(selected.id);
        saveAuth(res.token, res.user);
        navigate('/knitter', { replace: true });
      } catch (e) {
        setError(e.message);
        setLoading(false);
      }
      return;
    }

    // Для админа и грузчика — проверка PIN
    if (!/^\d{4}$/.test(pin)) { setError('PIN — 4 цифры'); return; }
    setLoading(true); setError('');
    try {
      const res = await api.login(selected.id, pin);
      saveAuth(res.token, res.user);
      if (res.user.role === 'ADMIN') navigate('/admin', { replace: true });
      else navigate('/', { replace: true });
    } catch (e) {
      setError(e.message); setPin('');
    } finally { setLoading(false); }
  }

  return (
    <div className="p-5 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mt-6 mb-6">Кто вы?</h1>
      <div className="space-y-2">
        {users.map((u) => (
          <button key={u.id} onClick={() => { setSelected(u); setPin(''); setError(''); }}
            className={`w-full text-left px-4 py-4 rounded-xl border-2 transition ${selected?.id === u.id ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white active:bg-gray-50'}`}>
            <div className="font-medium text-gray-800">{u.name}</div>
            <div className="text-xs text-gray-500 mt-1">{u.role === 'KNITTER' ? 'Вязальщик' : u.role === 'LOADER' ? 'Грузчик' : 'Админ'}</div>
          </button>
        ))}
      </div>

      {selected && selected.role !== 'KNITTER' && (
        <div className="mt-6">
          <label className="block text-sm text-gray-600 mb-2">PIN из 4 цифр</label>
          <input type="password" inputMode="numeric" maxLength={4} value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            className="w-full text-center text-3xl tracking-[0.5em] py-4 rounded-xl border-2 border-gray-300 focus:border-blue-600 outline-none"
            placeholder="••••" autoFocus />
          <button onClick={submit} disabled={loading || pin.length !== 4}
            className="mt-4 w-full bg-blue-600 text-white py-4 rounded-xl font-semibold text-lg disabled:opacity-50 active:bg-blue-700">
            {loading ? 'Вход…' : 'Войти'}
          </button>
        </div>
      )}

      {selected && selected.role === 'KNITTER' && (
        <div className="mt-6">
          <button onClick={submit} disabled={loading}
            className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold text-lg disabled:opacity-50 active:bg-blue-700">
            {loading ? 'Вход…' : 'Войти в цех'}
          </button>
        </div>
      )}

      {error && <div className="mt-4 text-red-600 text-sm">{error}</div>}
    </div>
  );
}
