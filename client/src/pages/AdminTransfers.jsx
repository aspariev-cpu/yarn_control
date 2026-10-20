import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function AdminTransfers() {
  const [transfers, setTransfers] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => { api.adminTransfers().then(setTransfers).catch((e) => setError(e.message)); }, []);

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-4">Перемещения</h1>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <div className="space-y-2">
        {transfers.map((t) => (
          <div key={t.id} className={`bg-white rounded-xl p-3 border ${t.status === 'CANCELLED' ? 'opacity-50' : ''}`}>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{t.loader?.name} · {new Date(t.createdAt).toLocaleString()}</span>
              <span>{t.status === 'CANCELLED' ? 'Отменено' : 'Отправлено'}</span>
            </div>
            {t.items.map((it) => (
              <div key={it.id} className="text-sm flex justify-between">
                <span>{it.yarn.article} {it.yarn.color || ''}</span>
                <span className="text-gray-600">{Number(it.quantity)} {it.yarn.unit} · {it.fromType}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}