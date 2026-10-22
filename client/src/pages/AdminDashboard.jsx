import { useEffect, useState, useMemo } from 'react';
import { api } from '../api.js';

export default function AdminDashboard() {
  const [stock, setStock] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getStock()
      .then((data) => {
        setStock(data);
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  // Общая статистика по всему складу
  const totalStats = useMemo(() => {
    return stock.reduce((acc, item) => {
      acc.home += Number(item.home);
      acc.warehouse += Number(item.warehouse);
      acc.workshop += Number(item.workshop);
      acc.total += Number(item.home) + Number(item.warehouse) + Number(item.workshop);
      return acc;
    }, { home: 0, warehouse: 0, workshop: 0, total: 0 });
  }, [stock]);

  // Группировка и фильтрация
  const groupedAndFiltered = useMemo(() => {
    const filtered = stock.filter(item => {
      const text = `${item.article} ${item.color || ''}`.toLowerCase();
      return text.includes(search.toLowerCase());
    });

    const groups = {};
    filtered.forEach(item => {
      // Берем последнее слово как тип (Ангора, Акрил и т.д.)
      const words = item.article.trim().split(/\s+/);
      let categoryName = words.length > 0 ? words[words.length - 1] : 'Прочее';
      categoryName = categoryName.charAt(0).toUpperCase() + categoryName.slice(1).toLowerCase();

      if (!groups[categoryName]) groups[categoryName] = [];
      groups[categoryName].push(item);
    });

    // Сортируем категории по алфавиту
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [stock, search]);

  if (loading) return <div className="p-8 text-center text-gray-500">Загрузка данных склада...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        
        {/* Заголовок */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Складской учет</h1>
          <p className="text-gray-500 text-sm mt-1">Полный обзор остатков пряжи</p>
        </div>

        {/* Блок общей статистики (Чтобы начальник сразу видел цифры) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6 flex flex-wrap gap-8 items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-1">Всего в наличии (сумма всех мест)</p>
            <p className="text-3xl font-bold text-gray-800">{totalStats.total} <span className="text-lg font-normal text-gray-500">меш</span></p>
          </div>
          <div className="flex gap-6 text-sm">
            <div className="text-center">
              <p className="text-gray-500 mb-1">Дом</p>
              <p className="font-semibold text-lg text-gray-800">{totalStats.home}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-500 mb-1">Склад</p>
              <p className="font-semibold text-lg text-blue-600">{totalStats.warehouse}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-500 mb-1">Цех</p>
              <p className="font-semibold text-lg text-green-600">{totalStats.workshop}</p>
            </div>
          </div>
        </div>

        {/* Поиск */}
        <div className="relative mb-6">
          <input 
            type="text" 
            placeholder="Поиск по названию, цвету или типу..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
          />
          <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
        </div>

        {/* Список категорий */}
        <div className="space-y-6">
          {groupedAndFiltered.map(([categoryName, items]) => (
            <div key={categoryName} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              
              {/* Заголовок категории */}
              <div className="bg-gray-100 px-5 py-3 border-b border-gray-200">
                <h2 className="font-bold text-gray-800">{categoryName}</h2>
              </div>

              {/* Таблица */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-white border-b border-gray-100 text-xs uppercase text-gray-400">
                    <tr>
                      <th className="px-5 py-3 font-medium">Наименование</th>
                      <th className="px-5 py-3 font-medium text-right w-24">Дом</th>
                      <th className="px-5 py-3 font-medium text-right w-24">Склад</th>
                      <th className="px-5 py-3 font-medium text-right w-24">Цех</th>
                      <th className="px-5 py-3 font-medium text-right w-24">Итого</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((item) => {
                      const total = Number(item.home) + Number(item.warehouse) + Number(item.workshop);
                      return (
                        <tr key={item.yarnId} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-3">
                            <span className="font-medium text-gray-800">{item.article}</span>
                            {item.color && <span className="text-gray-400 ml-2">({item.color})</span>}
                          </td>
                          <td className="px-5 py-3 text-right">{Number(item.home) > 0 ? Number(item.home) : <span className="text-gray-300">0</span>}</td>
                          <td className="px-5 py-3 text-right">{Number(item.warehouse) > 0 ? Number(item.warehouse) : <span className="text-gray-300">0</span>}</td>
                          <td className="px-5 py-3 text-right">{Number(item.workshop) > 0 ? Number(item.workshop) : <span className="text-gray-300">0</span>}</td>
                          <td className="px-5 py-3 text-right font-bold text-gray-800">{total > 0 ? total : <span className="text-gray-300">0</span>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {groupedAndFiltered.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200 text-gray-500">
              По запросу «{search}» ничего не найдено
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
