import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';

const SOURCE_LABEL = { HOME: 'Дом', WAREHOUSE: 'Склад', CITY_BUY: 'Купил' };

export default function NewTransfer() {
  const navigate = useNavigate();
  const [yarns, setYarns] = useState([]);
  const [recent, setRecent] = useState([]);
  const [search, setSearch] = useState('');
  const [items, setItems] = useState([]);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [stockMap, setStockMap] = useState({});

  async function refreshStock() {
    const rows = await api.getStock();
    const m = {};
    for (const r of rows) m[r.yarnId] = r;
    setStockMap(m);
  }

  useEffect(() => {
    api.getRecentYarns().then(setRecent).catch(() => {});
    refreshStock().catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { api.getYarns(search).then(setYarns).catch(() => {}); }, 200);
    return () => clearTimeout(t);
  }, [search]);

  function addYarn(yarn) {
    if (items.some((i) => i.yarnId === yarn.id)) return;
    setItems([...items, { yarnId: yarn.id, yarn, quantity: '1', fromType: 'WAREHOUSE', receipt: null, shopName: '' }]);
    setSearch('');
  }
  function updateItem(idx, patch) { setItems(items.map((it, i) => (i === idx ? { ...it, ...patch } : it))); }
  function removeItem(idx) { setItems(items.filter((_, i) => i !== idx)); }
  function availableFor(item) {
    const s = stockMap[item.yarnId];
    if (!s) return null;
    if (item.fromType === 'HOME') return Number(s.home);
    if (item.fromType === 'WAREHOUSE') return Number(s.warehouse);
    return null;
  }

  async function uploadPhoto(idx, file) {
    if (!file) return;
    const it = items[idx];
    if (!it.shopName.trim()) {
      alert('Пожалуйста, сначала укажите, где купили пряжу');
      return;
    }
    updateItem(idx, { uploading: true });
    try {
      const res = await api.uploadReceipt(file, it.shopName);
      updateItem(idx, { receipt: res.url, uploading: false });
    } catch (e) {
      alert('Ошибка загрузки фото: ' + e.message);
      updateItem(idx, { uploading: false });
    }
  }

  async function submit(andNew) {
    if (items.length === 0) { setError('Добавь позицию'); return; }
    for (const it of items) {
      if (!it.quantity || Number(it.quantity) <= 0) { setError('Кол-во > 0'); return; }
      if (it.fromType === 'CITY_BUY' && !it.shopName.trim()) { 
        setError('Для купленной пряжи обязательно укажите магазин'); return; 
      }
    }
    setSaving(true); setError('');
    try {
      const payloadItems = items.map((it) => ({ 
        yarnId: it.yarnId, 
        quantity: Number(it.quantity), 
        fromType: it.fromType,
        receiptUrl: it.receipt || null
      }));
      await api.createTransfer(payloadItems, note);
      if (andNew) {
        setItems([]); setNote(''); setSaving(false);
        await refreshStock();
      } else {
        navigate('/', { replace: true });
      }
    } catch (e) { setError(e.message); setSaving(false); }
  }

  const suggestions = search ? yarns : recent;

  return (
    <div className="p-4 max-w-md mx-auto pb-32">
      <h1 className="text-xl font-bold text-gray-800 mb-4">Везти в цех</h1>
      <input type="text" placeholder="Поиск пряжи (артикул, цвет)…" value={search} onChange={(e) => setSearch(e.target.value)}
        className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-blue-600 outline-none" />
      <div className="mt-2 flex flex-wrap gap-2">
        {suggestions.slice(0, 10).map((y) => (
          <button key={y.id} onClick={() => addYarn(y)} className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm active:bg-gray-50">
            {y.article} {y.color || ''}
          </button>
        ))}
      </div>
      <div className="mt-5 space-y-3">
        {items.map((it, idx) => {
          const avail = availableFor(it);
          const over = avail !== null && Number(it.quantity) > avail;
          return (
            <div key={idx} className="bg-white rounded-xl p-4 border">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="font-medium text-gray-800">{it.yarn.article} {it.yarn.color || ''}</div>
                  <div className="text-xs text-gray-500">{it.yarn.unit}</div>
                </div>
                <button onClick={() => removeItem(idx)} className="text-red-500 text-sm px-2 py-1">Удалить</button>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {['HOME', 'WAREHOUSE', 'CITY_BUY'].map((src) => (
                  <button key={src} onClick={() => updateItem(idx, { fromType: src })}
                    className={`py-2 rounded-lg text-sm font-medium border-2 ${it.fromType === src ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-600'}`}>
                    {SOURCE_LABEL[src]}
                  </button>
                ))}
              </div>
              {avail !== null && (
                <div className={`text-xs mb-2 ${over ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                  Доступно: {avail} {it.yarn.unit}{over ? ' — больше, чем есть!' : ''}
                </div>
              )}
              <div className="flex items-center gap-2 mb-3">
                <button onClick={() => updateItem(idx, { quantity: String(Math.max(0, Number(it.quantity || 0) - 1)) })}
                  className="w-12 h-12 rounded-lg bg-gray-100 text-2xl font-bold active:bg-gray-200">−</button>
                <input type="number" inputMode="decimal" value={it.quantity} onChange={(e) => updateItem(idx, { quantity: e.target.value })}
                  className="flex-1 text-center text-xl py-2 rounded-lg border-2 border-gray-300 focus:border-blue-600 outline-none" />
                <button onClick={() => updateItem(idx, { quantity: String(Number(it.quantity || 0) + 1) })}
                  className="w-12 h-12 rounded-lg bg-gray-100 text-2xl font-bold active:bg-gray-200">+</button>
              </div>

              {it.fromType === 'CITY_BUY' && (
                <div className="mt-3 pt-3 border-t space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Где купили? (обязательно)</label>
                    <input 
                      type="text" 
                      placeholder="Например: Магазин 'Пряжа-Сити'" 
                      value={it.shopName} 
                      onChange={(e) => updateItem(idx, { shopName: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border-2 border-gray-300 focus:border-blue-600 outline-none text-sm" 
                    />
                  </div>
                  {it.receipt ? (
                    <div className="text-green-600 text-sm flex items-center justify-between">
                      <span>✅ Чек прикреплен</span>
                      <a href={it.receipt} target="_blank" rel="noreferrer" className="text-blue-600 underline">Открыть</a>
                    </div>
                  ) : (
                    <label className={`block w-full text-center py-3 rounded-lg border-2 border-dashed border-gray-300 text-sm font-medium ${it.uploading ? 'text-gray-400 bg-gray-50' : 'text-blue-600 active:bg-blue-50'}`}>
                      {it.uploading ? 'Загрузка...' : '📸 Сфотографировать чек'}
                      <input type="file" accept="image/*" capture="environment" className="hidden" 
                        disabled={it.uploading}
                        onChange={(e) => uploadPhoto(idx, e.target.files[0])} />
                    </label>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <textarea placeholder="Комментарий" value={note} onChange={(e) => setNote(e.target.value)}
        className="mt-4 w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-blue-600 outline-none" rows={2} />
      {error && <div className="mt-3 text-red-600 text-sm">{error}</div>}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-3 flex gap-2 max-w-md mx-auto">
        <button onClick={() => submit(true)} disabled={saving || items.length === 0}
          className="flex-1 bg-gray-100 py-4 rounded-xl font-semibold disabled:opacity-50 active:bg-gray-200">Отпр. и ещё</button>
        <button onClick={() => submit(false)} disabled={saving || items.length === 0}
          className="flex-1 bg-blue-600 text-white py-4 rounded-xl font-semibold disabled:opacity-50 active:bg-blue-700">{saving ? 'Отправка…' : 'Отправить'}</button>
      </div>
    </div>
  );
}