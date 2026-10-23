import { useEffect, useState, useMemo } from 'react';
import { api } from '../api.js';

const YARN_TYPES = [
  'норка', 'мираль', 'вискоза', 'букле', 'аванде', 
  'ангора', 'объемка', 'блэк', 'вискоза поетка', 
  'п/шерсть', 'хлопок'
];

export default function AdminDashboard({ isReportMode = false }) {
  const [stock, setStock] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [editingYarn, setEditingYarn] = useState(null);
  const [newType, setNewType] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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

  useEffect(() => {
    loadStock();
  }, []);

  const totalStats = useMemo(() => {
    return stock.reduce((acc, item) => {
      acc.home += Number(item.home);
      acc.warehouse += Number(item.warehouse);
      acc.workshop += Number(item.workshop);
      acc.total += Number(item.home) + Number(item.warehouse) + Number(item.workshop);
      return acc;
    }, { home: 0, warehouse: 0, workshop: 0, total: 0 });
  }, [stock]);

  const groupedAndFiltered = useMemo(() => {
    const filtered = stock.filter(item => {
      const text = `${item.article} ${item.color || ''} ${item.type || ''}`.toLowerCase();
      return text.includes(search.toLowerCase());
    });

    const groups = {};
    filtered.forEach(item => {
      const categoryName = item.type && item.type.trim() !== '' ? item.type.trim() : 'Без категории';
      if (!groups[categoryName]) groups[categoryName] = [];
      groups[categoryName].push(item);
    });

    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [stock, search]);

  const handleSaveType = async () => {
    if (!editingYarn || !newType) return;
    setIsSaving(true);
    
    try {
      await api.adminUpdateYarnType(editingYarn.yarnId, newType);
      setEditingYarn(null);
      await loadStock();
    } catch (e) {
      alert('Ошибка: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Загрузка...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        
        <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Складской учет</h1>
            <p className="text-gray-500 text-sm mt-1">Все категории на одной странице</p>
          </div>
          <div className="relative w-full md:w-96">
            <input 
              type="text" 
              placeholder="Поиск..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 shadow-sm focus:border-blue-500 outline-none"
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </div>
        </div>

        {/* Статистика */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8 flex flex-wrap gap-8 items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-1">Всего в наличии</p>
            {/* ТУТ МЕНЯЕМ КГ НА МЕШКИ */}
            <p className="text-3xl font-bold text-gray-800">{totalStats.total} <span className="text-lg font-normal text-gray-500">меш</span></p>
          </div>
          <div className="flex gap-8 text-sm">
            <div className="text-center"><p className="text-gray-500 mb-1">Дом</p><p className="font-semibold text-lg text-gray-800">{totalStats.home}</p></div>
            <div className="text-center"><p className="text-gray-500 mb-1">Склад</p><p className="font-semibold text-lg text-blue-600">{totalStats.warehouse}</p></div>
            <div className="text-center"><p className="text-gray-500 mb-1">Цех</p><p className="font-semibold text-lg text-green-600">{totalStats.workshop}</p></div>
          </div>
        </div>

        {/* Таблицы */}
        <div className="space-y-6">
          {groupedAndFiltered.map(([categoryName, items]) => (
            <div key={categoryName} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              
              <div className="bg-slate-50 px-5 py-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                  {categoryName}
                </h2>
                <span className="text-sm text-gray-500 font-medium">
                  Итого: {items.reduce((sum, i) => sum + Number(i.home) + Number(i.warehouse) + Number(i.workshop), 0)} меш
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-white border-b border-gray-100 text-xs uppercase text-gray-400">
                    <tr>
                      <th className="px-5 py-3 font-medium">Наименование и Цвет</th>
                      <th className="px-5 py-3 font-medium text-right w-24">Дом</th>
                      <th className="px-5 py-3 font-medium text-right w-24">Склад</th>
                      <th className="px-5 py-3 font-medium text-right w-24">Цех</th>
                      <th className="px-5 py-3 font-medium text-center w-24">Итого</th>
                      {!isReportMode && <th className="px-5 py-3 font-medium w-20"></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((item) => {
                      const total = Number(item.home) + Number(item.warehouse) + Number(item.workshop);
                      return (
                        <tr key={item.yarnId} className="hover:bg-blue-50/30 transition-colors group">
                          <td className="px-5 py-3 flex flex-wrap items-center gap-2">
                            <span className="font-medium text-gray-800">{item.article}</span>
                            {item.color && (
                              <span className="text-gray-500 text-xs bg-gray-100 px-2 py-1 rounded-md border border-gray-200">
                                {item.color}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-right">{Number(item.home) || <span className="text-gray-300">0</span>}</td>
                          <td className="px-5 py-3 text-right">{Number(item.warehouse) || <span className="text-gray-300">0</span>}</td>
                          <td className="px-5 py-3 text-right">{Number(item.workshop) || <span className="text-gray-300">0</span>}</td>
                          <td className="px-5 py-3 text-center font-bold text-gray-800 bg-gray-50 rounded">{total}</td>
                          {!isReportMode && (
                            <td className="px-5 py-3 text-right">
                              <button 
                                onClick={() => {
                                  setEditingYarn(item);
                                  setNewType(item.type || '');
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-gray-200 text-blue-600 px-3 py-1 rounded-lg hover:bg-blue-50 text-xs font-medium"
                              >
                                Изменить
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Модальное окно редактирования */}
      {editingYarn && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Категория пряжи</h3>
            <div className="text-sm text-gray-600 mb-4 flex items-center gap-2">
              <span className="font-medium">{editingYarn.article}</span>
              {editingYarn.color && <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">{editingYarn.color}</span>}
            </div>
            
            <label className="block text-xs text-gray-500 mb-1">Выберите тип из списка:</label>
            <select 
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl mb-4 focus:border-blue-500 outline-none bg-white"
            >
              <option value="" disabled>Выберите...</option>
              {YARN_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setEditingYarn(null)}
                className="flex-1 py-3 text-gray-600 font-medium hover:bg-gray-100 rounded-xl"
              >
                Отмена
              </button>
              <button 
                onClick={handleSaveType}
                disabled={isSaving || !newType}
                className="flex-1 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50"
              >
                {isSaving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
