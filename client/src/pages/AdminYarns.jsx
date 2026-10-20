import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function AdminYarns() {
  const [yarns, setYarns] = useState([]);
  const [name, setName] = useState('');
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  async function load() {
    setYarns(await api.getYarns());
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function save() {
    setError('');
    setMsg('');
    if (!name.trim()) {
      setError('Введите название пряжи');
      return;
    }
    try {
      if (editId) {
        await api.adminUpdateYarn(editId, { article: name });
        setMsg('Пряжа обновлена');
      } else {
        await api.adminCreateYarn({ article: name });
        setMsg('Пряжа добавлена');
      }
      setName('');
      setEditId(null);
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function remove(id, article) {
    if (!window.confirm(`Точно удалить пряжу "${article}"?`)) return;
    try {
      await api.adminDeleteYarn(id);
      setMsg('Пряжа удалена');
      if (editId === id) cancelEdit();
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  function startEdit(yarn) {
    setEditId(yarn.id);
    setName(yarn.article);
    setError('');
    setMsg('');
  }

  function cancelEdit() {
    setEditId(null);
    setName('');
    setError('');
    setMsg('');
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-4 text-gray-800">Справочник пряжи</h1>
      
      <div className="bg-white rounded-xl p-4 border mb-4 shadow-sm">
        <div className="font-semibold text-gray-700 mb-3">
          {editId ? 'Редактировать пряжу' : 'Добавить новую пряжу'}
        </div>
        
        <div className="space-y-3">
          <div>
            <input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Название пряжи (например: 32/2 серая)" 
              className="w-full px-3 py-2 border rounded-lg focus:border-blue-500 outline-none" 
            />
          </div>

          <div className="flex gap-2">
            <button onClick={save} className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold active:bg-blue-700">
              {editId ? 'Сохранить' : 'Добавить'}
            </button>
            {editId && (
              <button onClick={cancelEdit} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-semibold active:bg-gray-200">
                Отмена
              </button>
            )}
          </div>
        </div>
      </div>

      {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
      {msg && <div className="text-green-600 text-sm mb-3">{msg}</div>}

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        {yarns.length === 0 && (
          <div className="p-4 text-center text-gray-500 text-sm">Справочник пуст</div>
        )}
        {yarns.map((y, index) => (
          <div 
            key={y.id} 
            className={`flex justify-between items-center p-3 ${index !== yarns.length - 1 ? 'border-b' : ''}`}
          >
            <span className="text-sm text-gray-800 flex-1">{y.article}</span>
            <div className="flex gap-2">
              <button 
                onClick={() => startEdit(y)} 
                className="text-blue-600 text-sm px-2 py-1 active:bg-blue-50 rounded"
              >
                Изменить
              </button>
              <button 
                onClick={() => remove(y.id, y.article)} 
                className="text-red-600 text-sm px-2 py-1 active:bg-red-50 rounded"
              >
                Удалить
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}