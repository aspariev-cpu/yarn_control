import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, saveAuth, getUser } from '../api.js';

export default function KnitterLogin() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Если уже залогинен как вязальщик — сразу на его страницу
  useEffect(() => {
    const user = getUser();
    if (user && user.role === 'KNITTER') {
      navigate('/knitter', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    api.getUsers().then(data => {
      // Оставляем только вязальщиков
      setUsers(data.filter(u => u.role === 'KNITTER'));
    }).catch((e) => setError(e.message));
  }, []);

  async function handleLogin(userId) {
    setLoading(true); 
    setError('');
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
      <div className="mt-6 mb-8 text-center">
        <h1 className="text-2xl font-bold text-gray-800">Вход для вязальщиков</h1>
        <p className="text-sm text-gray-500 mt-2">Выберите свое имя из списка</p>
      </div>

      <div className="space-y-3">
        {users.map((u) => (
          <button 
            key={u.id} 
            onClick={() => handleLogin(u.id)} 
            disabled={loading}
            className="w-full text-left px-5 py-5 rounded-2xl border-2 border-gray-200 bg-white hover:border-blue-500 active:bg-blue-50 transition-colors flex justify-between items-center group"
          >
            <div>
              <div className="font-bold text-lg text-gray-800 group-hover:text-blue-700 transition-colors">
                {u.name}
              </div>
              <div className="text-xs text-gray-400 mt-1">Вязальщик</div>
            </div>
            <div className="text-gray-300 group-hover:text-blue-500 font-bold text-xl">
              ➔
            </div>
          </button>
        ))}

        {users.length === 0 && !loading && (
          <div className="text-center text-gray-500 py-10">
            Нет доступных вязальщиков
          </div>
        )}
      </div>

      {error && <div className="mt-4 text-red-600 text-sm text-center bg-red-50 py-2 rounded-lg">{error}</div>}
      
      {loading && <div className="mt-4 text-center text-blue-600 text-sm font-medium">Загрузка...</div>}
    </div>
  );
}
