import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { clearAuth } from '../api.js';

export default function KnitterHome() {
  const [stock, setStock] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const loadStock = async () => {
    try {
      const data = await api.getStock();
      setStock(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStock(); }, []);

  const handleSliderChange = async (item, newValue) => {
    const currentValue = Number(item.workshop);
    const delta = newValue - currentValue;
    
    if (delta === 0) return;
    
    // Визуально обновляем сразу
    setStock(stock.map(s => s.yarnId === item.yarnId ? { ...s, workshop: newValue } : s));
    
    try {
      await api.adjustWorkshop(item.yarnId, delta);
      setMsg(`Успешно ${delta > 0 ? 'добавлено' : 'списано'} ${Math.abs(delta)} меш`);
      setTimeout(() => setMsg(''), 2000);
    } catch (e) {
      loadStock(); // Откат при ошибке
      alert('Ошибка: ' + e.message);
    }
  };

  const filtered = stock.filter(item => 
    `${item.article} ${item.color || ''}`.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="p-8 text-center text-gray-500">Загрузка...</div>;

  return (
    <div className="p-4 max-w-md mx-auto pb-24">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">🧵 Пряжа в цеху</h1>
        <button onClick={() => { clearAuth(); window.location.reload(); }} className="text-sm text-red-600 font-medium">Выйти</button>
      </div>

      <input 
        type="text" 
        placeholder="Поиск пряжи..." 
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-4 py-3 rounded-xl border border-gray-300 mb-6 focus:border-blue-500 outline-none"
      />

      {msg && <div className="mb-4 text-green-600 text-center font-medium bg-green-50 py-2 rounded-lg">{msg}</div>}

      <div className="space-y-6">
        {filtered.map((item) => (
          <div key={item.yarnId} className="bg-white rounded-xl p-5 border shadow-sm">
            <div className="mb-4">
              <div className="font-bold text-gray-800 text-lg">{item.article}</div>
              {item.color && <div className="text-sm text-gray-500">{item.color}</div>}
            </div>
            
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">В наличии:</span>
              {/* ТУТ МЕНЯЕМ КГ НА МЕШКИ */}
              <span className="text-2xl font-bold text-blue-600">
                {Number(item.workshop)} <span className="text-sm text-gray-500">меш</span>
              </span>
            </div>

            <input 
              type="range" 
              min="0" 
              max="200" 
              value={Number(item.workshop)} 
              onChange={(e) => handleSliderChange(item, Number(e.target.value))}
              className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>0</span>
              <span>200</span>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-10 text-gray-500">
            Пряжа не найдена
          </div>
        )}
      </div>
    </div>
  );
}
