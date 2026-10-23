import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { clearAuth } from '../api.js';

export default function KnitterHome() {
  const [stock, setStock] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  // Для ввода текста (чтобы при вводе с клавиатуры не дёргать сервер каждую секунду)
  const [inputValues, setInputValues] = useState({});

  const loadStock = async () => {
    try {
      const data = await api.getStock();
      setStock(data);
      
      // Инициализируем поля ввода текущими значениями
      const initialValues = {};
      data.forEach(item => {
        initialValues[item.yarnId] = Number(item.workshop);
      });
      setInputValues(initialValues);
      
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStock(); }, []);

  const handleUpdate = async (item, newValue) => {
    // Защита от ухода в минус
    if (newValue < 0) newValue = 0;

    const currentValue = Number(item.workshop);
    const delta = newValue - currentValue;
    
    if (delta === 0) return;
    
    // Обновляем визуально сразу
    setStock(stock.map(s => s.yarnId === item.yarnId ? { ...s, workshop: newValue } : s));
    setInputValues({ ...inputValues, [item.yarnId]: newValue });
    
    try {
      await api.adjustWorkshop(item.yarnId, delta);
      setMsg(`Успешно: ${delta > 0 ? '+' : ''}${delta} меш`);
      setTimeout(() => setMsg(''), 2000);
    } catch (e) {
      loadStock(); // Откат при ошибке
      alert('Ошибка: ' + e.message);
    }
  };

  // Обработка ручного ввода текста
  const handleInputChange = (item, text) => {
    setInputValues({ ...inputValues, [item.yarnId]: text });
  };

  // Когда поле теряет фокус — отправляем на сервер
  const handleInputBlur = (item) => {
    const textValue = inputValues[item.yarnId];
    let parsedValue = parseInt(textValue, 10);
    
    if (isNaN(parsedValue) || parsedValue < 0) {
      parsedValue = 0;
    }

    if (parsedValue !== Number(item.workshop)) {
      handleUpdate(item, parsedValue);
    } else {
      // Если не изменилось, просто вернем красивый вид
      setInputValues({ ...inputValues, [item.yarnId]: Number(item.workshop) });
    }
  };

  // Функция выхода для вязальщика
  const handleLogout = () => {
    clearAuth();
    window.location.href = '/knitter-login';
  };

  const filtered = stock.filter(item => 
    `${item.article} ${item.color || ''}`.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="p-8 text-center text-gray-500">Загрузка...</div>;

  return (
    <div className="p-4 max-w-md mx-auto pb-24">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">🧵 Пряжа в цеху</h1>
        <button onClick={handleLogout} className="text-sm text-red-600 font-medium">Выйти</button>
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
            
            {/* Верхняя строка: ввод и кнопка +/- */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-500">В наличии:</span>
              
              <div className="flex items-center gap-2">
                {/* Кнопка МИНУС */}
                <button 
                  onClick={() => handleUpdate(item, Number(item.workshop) - 1)}
                  className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xl font-bold text-gray-700 active:bg-gray-200"
                >
                  −
                </button>

                {/* Поле ввода */}
                <div className="relative">
                  <input 
                    type="number"
                    value={inputValues[item.yarnId] ?? ''}
                    onChange={(e) => handleInputChange(item, e.target.value)}
                    onBlur={() => handleInputBlur(item)}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                    className="w-16 text-center text-xl font-bold text-blue-600 border-b-2 border-blue-200 focus:border-blue-600 outline-none bg-transparent"
                    style={{ WebkitAppearance: 'none', margin: 0 }}
                  />
                  <span className="absolute right-0 top-2 text-xs text-gray-400 pointer-events-none">меш</span>
                </div>

                {/* Кнопка ПЛЮС */}
                <button 
                  onClick={() => handleUpdate(item, Number(item.workshop) + 1)}
                  className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-xl font-bold text-blue-700 active:bg-blue-200"
                >
                  +
                </button>
              </div>
            </div>

            {/* Ползунок — сделали толще и больше */}
            <div className="relative pt-2">
              <input 
                type="range" 
                min="0" 
                max="200" 
                value={Number(item.workshop)} 
                onChange={(e) => handleUpdate(item, Number(e.target.value))}
                className="w-full h-4 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                style={{
                  // Стилизуем ползунок для Webkit (Chrome/Safari) — делаем его больше
                  WebkitAppearance: 'none',
                }}
              />
              <div className="flex justify-between text-xs text-gray-400 mt-2">
                <span>0</span>
                <span>200</span>
              </div>
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
