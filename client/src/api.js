const BASE = '/api';
const getToken = () => localStorage.getItem('token') || '';

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    console.error('Ответ сервера:', data);
    throw new Error(data?.error || `Ошибка ${res.status}`);
  }
  return data;
}

export const api = {
  getUsers: () => request('/users'),
  login: (userId, pin) =>
    request('/login', { method: 'POST', body: JSON.stringify({ userId, pin }) }),
  me: () => request('/me'),
  getStock: () => request('/stock'),
  getYarns: (q = '') => request(`/yarns?q=${encodeURIComponent(q)}`),
  getRecentYarns: () => request('/yarns/recent'),
  createTransfer: (items, note) =>
    request('/transfers', { method: 'POST', body: JSON.stringify({ items, note }) }),
  getMyTransfers: () => request('/transfers/my'),
  cancelTransfer: (id) =>
    request(`/transfers/${id}/cancel`, { method: 'POST' }),

  adminUsers: () => request('/admin/users'),
  adminCreateUser: (body) =>
    request('/admin/users', { method: 'POST', body: JSON.stringify(body) }),
  adminResetPin: (id, pin) =>
    request(`/admin/users/${id}/pin`, { method: 'POST', body: JSON.stringify({ pin }) }),
  adminDeactivate: (id) =>
    request(`/admin/users/${id}/deactivate`, { method: 'POST' }),
  
  adminCreateYarn: (body) =>
    request('/admin/yarns', { method: 'POST', body: JSON.stringify(body) }),
  adminUpdateYarn: (id, body) =>
    request(`/admin/yarns/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  
  // Новый метод для быстрого изменения категории
  adminUpdateYarnType: (id, type) =>
    request(`/admin/yarns/${id}`, { method: 'PUT', body: JSON.stringify({ type }) }),
    
  adminDeleteYarn: (id) =>
    request(`/admin/yarns/${id}`, { method: 'DELETE' }),

  adminReceipt: (body) =>
    request('/admin/receipts', { method: 'POST', body: JSON.stringify(body) }),
  adminTransfers: () => request('/admin/transfers'),
  adminReport: () => request('/admin/reports/stock', { method: 'POST' }),

  // Новый метод для загрузки фото чека
    uploadReceipt: async (file, comment) => {
    const formData = new FormData();
    formData.append('photo', file);
    formData.append('comment', comment || '');
    const res = await fetch('/api/upload-receipt', {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: formData,
    });
    if (!res.ok) {
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      throw new Error(data?.error || 'Ошибка загрузки фото');
    }
    return res.json();
  },
};

export function saveAuth(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}
export function clearAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}
export function getUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
}
