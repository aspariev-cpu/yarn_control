import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

function canCancel(t) {
  if (t.status !== 'SENT') return false;
  return (Date.now() - new Date(t.createdAt).getTime()) / 60000 <= 15;
}

export default function LoaderHome() {
  const [transfers, setTransfers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    try { setTransfers(await api.getMyTransfers()); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function cancel(id) {
    if (!confirm('Отменить это перемещение?')) return;
    try { await api.cancelTransfer(id); load(); } catch (e) { alert(e.message); }
  }

  return (
    <div className="p-4 max-w-md mx-auto pb-24">
      <Link to="/new" className="block w-full bg-blue-600 text-white text-center py-5 rounded-2xl font-bold text-lg active:bg-blue-700">
        + Везти в цех
      </Link>
      <h2 className="mt-6 mb-3 text-gray-600 text-sm font-medium">Мои перемещения</h2>
      {loading && <div className="text-gray-500">Загрузка…</div>}
      {error && <div className="text-red-600">{error}</div>}
      {!loading && transfers.length === 0 && <div className="text-gray-500 text-center py-10">Пока ничего не привозили</div>}
      <div className="space-y-3">
        {transfers.map((t) => (
          <div key={t.id} className={`bg-white rounded-xl p-4 border ${t.status === 'CANCELLED' ? 'opacity-50' : ''}`}>
            <div className="flex justify-between text-xs text-gray-500 mb-2">
              <span>{new Date(t.createdAt).toLocaleString()}</span>
              <span>{t.status === 'CANCELLED' ? 'Отменено' : 'Отправлено'}</span>
            </div>
            <div className="space-y-1">
              {t.items.map((it) => (
                <div key={it.id} className="flex justify-between text-sm">
                  <span className="text-gray-800">{it.yarn.article} {it.yarn.color || ''}</span>
                  <span className="text-gray-600">{Number(it.quantity)} {it.yarn.unit} · {it.fromType === 'CITY_BUY' ? 'куплено' : it.fromType === 'HOME' ? 'из дома' : 'со склада'}</span>
                </div>
              ))}
            </div>
            {canCancel(t) && (
              <button onClick={() => cancel(t.id)} className="mt-3 w-full text-sm text-red-600 py-2 rounded-lg active:bg-red-50 border border-red-200">
                Отменить (можно 15 мин)
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}