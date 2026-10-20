import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [role, setRole] = useState('LOADER');
  const [error, setError] = useState('');

  async function load() { setUsers(await api.adminUsers()); }
  useEffect(() => { load().catch((e) => setError(e.message)); }, []);

  async function create() {
    setError('');
    try {
      await api.adminCreateUser({ name, pin, role });
      setName(''); setPin(''); setRole('LOADER');
      await load();
    } catch (e) { setError(e.message); }
  }

  async function resetPin(id) {
    const newPin = prompt('Новый PIN (4 цифры):');
    if (!newPin) return;
    try { await api.adminResetPin(id, newPin); alert('PIN сброшен'); }
    catch (e) { alert(e.message); }
  }
  async function deactivate(id) {
    if (!confirm('Деактивировать?')) return;
    try { await api.adminDeactivate(id); await load(); }
    catch (e) { alert(e.message); }
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-4">Пользователи</h1>
      <div className="bg-white rounded-xl p-4 border mb-4 space-y-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Имя" className="w-full px-3 py-2 border rounded-lg" />
        <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="PIN (4 цифры)" className="w-full px-3 py-2 border rounded-lg" />
        <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
          <option value="LOADER">Грузчик</option>
          <option value="KNITTER">Вязальщик</option>
          <option value="ADMIN">Админ</option>
        </select>
        <button onClick={create} className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold active:bg-blue-700">Создать</button>
      </div>
      {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
      <div className="space-y-2">
        {users.map((u) => (
          <div key={u.id} className="bg-white rounded-xl p-4 border flex justify-between items-start">
            <div>
              <div className="font-medium">{u.name}</div>
              <div className="text-xs text-gray-500">{u.role} {u.active ? '' : '· неактивен'}</div>
              <div className="text-xs text-gray-400">Вход: {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : '—'}</div>
            </div>
            <div className="flex flex-col gap-1">
              <button onClick={() => resetPin(u.id)} className="text-xs text-blue-600 px-2 py-1 border rounded">Сбросить PIN</button>
              {u.active && <button onClick={() => deactivate(u.id)} className="text-xs text-red-600 px-2 py-1 border rounded">Отключить</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}