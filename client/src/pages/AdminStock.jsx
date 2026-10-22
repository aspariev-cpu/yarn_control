import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function AdminStock() {
  const [stock, setStock] = useState([]);
  
  // Состояния для поиска пряжи
  const [search, setSearch] = useState('');
  const [yarns, setYarns] = useState([]);
  const [selectedYarn, setSelectedYarn] = useState(null);

  const [locationType, setLocationType] = useState('WAREHOUSE');
  const [qty, setQty] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  async function load() {
    setStock(await api.getStock());
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  // Поиск пряжи с задержкой (debounce)
  useEffect(() => {
    const t = setTimeout(() => {
      if (search.trim() === '') {
        setYarns([]);
        return;
      }
      api.getYarns(search).then(setYarns).catch(() => {});
    }, 200);
    return () => clearTimeout(t);
  }, [search]);

  function selectYarn(yarn) {
    setSelectedYarn(yarn);
    setSearch(yarn.article + (yarn.color ? ` (${yarn.color})` : ''));
    setYarns([]); // Скрываем подсказки
  }

  async function addReceipt() {
    setError(''); setMsg('');
    if (!selectedYarn) {
      setError('Выберите пряжу');
      return;
    }
    if (!qty || Number(qty) <= 0) {
      setError('Введите количество');
      return;
    }

    try {
      await api.adminReceipt({ 
        locationType, 
        items: [{ yarnId: selectedYarn.id, quantity: Number(qty) }] 
      });
      setMsg('Приход добавлен');
      setQty('');
      setSelectedYarn(null);
      setSearch('');
      await load(); // Обновляем таблицу остатков
    } catch (e) { 
      setError(e.message); 
    }
  }

  async function report() {
    try { 
      await api.adminReport(); 
      setMsg('Отчёт отправлен в Discord'); 
    }
    catch (e) { 
      setError(e.message); 
    }
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-4">Остатки и приход</h1>
      
      <button onClick={report} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold mb-4 active:bg-indigo-700">
        Отправить отчёт в Discord
      </button>

      {/* Форма прихода */}
      <div className="bg-white rounded-xl p-4 border mb-4 space-y-3 shadow-sm">
        <div className="font-semibold text-gray-700">Добавить приход</div>
        
        <select value={locationType} onChange={(e) => setLocationType(e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-white">
          <option value="HOME">Дом</option>
          <option value="WAREHOUSE">Склад</option>
          <option value="WORKSHOP">Цех</option>
        </select>

        {/* Поле поиска пряжи */}
        <div className="relative">
          <input 
            type="text" 
            placeholder="Поиск пряжи (название)..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              if (selectedYarn) setSelectedYarn(null);
            }}
            className="w-full px-3 py-2 border rounded-lg focus:border-blue-500 outline-none" 
          />
          
          {/* Выпадающий список с результатами поиска */}
          {yarns.length > 0 && !selectedYarn && (
            <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg mt-1 shadow-lg max-h-48 overflow-y-auto">
              {yarns.map((y) => (
                <div 
                  key={y.id} 
                  onClick={() => selectYarn(y)}
                  className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b last:border-b-0 text-sm"
                >
                  {y.article} {y.color ? `(${y.color})` : ''}
                </div>
              ))}
            </div>
          )}
        </div>

        <input 
          value={qty} 
          onChange={(e) => setQty(e.target.value)} 
          placeholder="Количество" 
          type="number" 
          className="w-full px-3 py-2 border rounded-lg" 
        />
        
        <button 
          onClick={addReceipt} 
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold active:bg-blue-700"
        >
          Добавить приход
        </button>
      </div>

      {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
      {msg && <div className="text-green-600 text-sm mb-3">{msg}</div>}

      {/* Список остатков */}
      <div className="space-y-2">
        <h2 className="text-sm font-medium text-gray-500 mb-2">Текущие остатки</h2>
        {stock.map((s) => (
          <div key={s.yarnId} className="bg-white rounded-xl p-3 border shadow-sm">
            <div className="font-medium text-gray-800">{s.article} {s.color || ''}</div>
            <div className="text-xs text-gray-600 mt-1">
              Дом: {Number(s.home)} · Склад: {Number(s.warehouse)} · Цех: {Number(s.workshop)} {s.unit}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
