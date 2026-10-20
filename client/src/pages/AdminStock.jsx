import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function AdminStock() {
  const [stock, setStock] = useState([]);
  const [yarns, setYarns] = useState([]);
  const [locationType, setLocationType] = useState('WAREHOUSE');
  const [yarnId, setYarnId] = useState('');
  const [qty, setQty] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  async function load() {
    setStock(await api.getStock());
    setYarns(await api.getYarns());
  }
  useEffect(() => { load().catch((e) => setError(e.message)); }, []);

  async function addReceipt() {
    setError(''); setMsg('');
    try {
      await api.adminReceipt({ locationType, items: [{ yarnId, quantity: Number(qty) }] });
      setMsg('Приход добавлен');
      setQty('');
      await load();
    } catch (e) { setError(e.message); }
  }
    async function report() {
    try { 
      await api.adminReport(); 
      setMsg('Отчёт отправлен в Discord'); 
    }
    catch (e) { 
      alert('Ошибка от сервера: ' + e.message);
      setError(e.message); 
    }
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-4">Остатки и приход</h1>
      <button onClick={report} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold mb-4 active:bg-indigo-700">Отправить отчёт в Discord</button>
      <div className="bg-white rounded-xl p-4 border mb-4 space-y-2">
        <div className="font-medium">Приход</div>
        <select value={locationType} onChange={(e) => setLocationType(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
          <option value="HOME">Дом</option>
          <option value="WAREHOUSE">Склад</option>
          <option value="WORKSHOP">Цех</option>
        </select>
        <select value={yarnId} onChange={(e) => setYarnId(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
          <option value="">— выбери пряжу —</option>
          {yarns.map((y) => <option key={y.id} value={y.id}>{y.article} {y.color || ''}</option>)}
        </select>
        <input value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Количество" type="number" className="w-full px-3 py-2 border rounded-lg" />
        <button onClick={addReceipt} disabled={!yarnId || !qty} className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold disabled:opacity-50 active:bg-blue-700">Добавить приход</button>
      </div>
      {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
      {msg && <div className="text-green-600 text-sm mb-3">{msg}</div>}
      <div className="space-y-2">
        {stock.map((s) => (
          <div key={s.yarnId} className="bg-white rounded-xl p-3 border">
            <div className="font-medium">{s.article} {s.color || ''}</div>
            <div className="text-xs text-gray-600">Дом: {Number(s.home)} · Склад: {Number(s.warehouse)} · Цех: {Number(s.workshop)} {s.unit}</div>
          </div>
        ))}
      </div>
    </div>
  );
}