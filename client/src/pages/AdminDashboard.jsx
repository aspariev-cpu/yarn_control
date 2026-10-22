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

  // Группировка пряжи по ТИПУ (последнее слово в названии)
  const categories = useMemo(() => {
    const grouped = {};
    
    const filtered = stock.filter(item => {
      const text = `${item.article} ${item.color || ''}`.toLowerCase();
      return text.includes(search.toLowerCase());
    });

    filtered.forEach(item => {
      // Разбиваем название на слова
      const words = item.article.trim().split(/\s+/);
      let categoryName = 'Прочее';
      
      // Берем последнее слово как тип (если слов больше одного)
      if (words.length > 1) {
        categoryName = words[words.length - 1];
      } else if (words.length === 1) {
        categoryName = words[0];
      }

      // Делаем первую букву заглавной
      categoryName = categoryName.charAt(0).toUpperCase() + categoryName.slice(1).toLowerCase();

      if (!grouped[categoryName]) {
        grouped[categoryName] = {
          totalHome: 0,
          totalWarehouse: 0,
          totalWorkshop: 0,
          items: []
        };
      }

      grouped[categoryName].items.push(item);
      grouped[categoryName].totalHome += Number(item.home);
      grouped[categoryName].totalWarehouse += Number(item.warehouse);
      grouped[categoryName].totalWorkshop += Number(item.workshop);
    });

    // Сортируем категории по алфавиту
    return Object.fromEntries(Object.entries(grouped).sort());
  }, [stock, search]);

  // Общая статистика
  const totalStats = useMemo(() => {
    return stock.reduce((acc, item) => {
      acc.home += Number(item.home);
      acc.warehouse += Number(item.warehouse);
      acc.workshop += Number(item.workshop);
      return acc;
    }, { home: 0, warehouse: 0, workshop: 0 });
  }, [stock]);

  if (loading) return <div className="p-8 text-center text-gray-500">Загрузка данных склада...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* Заголовок и Поиск */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Складской учет</h1>
            <p className="text-gray-500 mt-1">Обзор текущих остатков пряжи по типам</p>
          </div>
          
          <div className="relative w-full md:w-96">
            <input 
              type="text" 
              placeholder="Поиск по названию (например, Ангора)..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </div>
        </div>

        {/* Верхние карточки статистики */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mr-4 text-2xl">🏠</div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Всего на Дому</p>
              <p className="text-2xl font-bold text-gray-800">{totalStats.home} <span className="text-base font-normal text-gray-500">меш</span></p>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center">
            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center mr-4 text-2xl">📦</div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Всего на Складе</p>
              <p className="text-2xl font-bold text-gray-800">{totalStats.warehouse} <span className="text-base font-normal text-gray-500">меш</span></p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mr-4 text-2xl">🏭</div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Всего в Цеху</p>
              <p className="text-2xl font-bold text-gray-800">{totalStats.workshop} <span className="text-base font-normal text-gray-500">меш</span></p>
            </div>
          </div>
        </div>

        {/* Категории (Типы пряжи) */}
        <div className="space-y-8">
          {Object.entries(categories).map(([categoryName, data]) => (
            <div key={categoryName} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              
              {/* Заголовок категории */}
              <div className="bg-gray-50/80 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <span className="w-2 h-6 bg-indigo-500 rounded-full inline-block"></span>
                  {categoryName}
                </h2>
                <div className="text-sm text-gray-600 font-medium hidden md:block">
                  Дом: {data.totalHome} · Склад: {data.totalWarehouse} · Цех: {data.totalWorkshop}
                </div>
              </div>

              {/* Сетка карточек внутри категории */}
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {data.items.map((item) => (
                  <div key={item.yarnId} className="border border-gray-100 rounded-xl p-4 hover:shadow-md transition-shadow bg-white relative overflow-hidden">
                    {/* Декоративная полоска слева */}
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-400"></div>
                    
                    <div className="font-bold text-gray-800 text-base mb-1 pl-2">{item.article}</div>
                    <div className="text-sm text-gray-500 mb-4 pl-2">{item.color || 'Без цвета'}</div>
                    
                    <div className="space-y-2 pl-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">Дом</span>
                        <span className="font-semibold text-gray-800">{Number(item.home)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">Склад</span>
                        <span className="font-semibold text-blue-600">{Number(item.warehouse)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">Цех</span>
                        <span className="font-semibold text-green-600">{Number(item.workshop)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          ))}
          
          {Object.keys(categories).length === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 text-gray-500">
              По запросу «{search}» ничего не найдено
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
