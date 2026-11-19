// 接口自动化各页面共用的小工具

export const STATUS_MAP = {
  pending: { text: '待执行', type: 'info' },
  queued: { text: '排队中', type: 'info' },
  running: { text: '执行中', type: 'warning' },
  passed: { text: '通过', type: 'success' },
  failed: { text: '失败', type: 'danger' },
  error: { text: '错误', type: 'danger' },
  canceled: { text: '已取消', type: 'info' },
  skipped: { text: '已跳过', type: 'info' },
};

export const statusText = (status) => STATUS_MAP[status]?.text || status || '-';
export const statusTagType = (status) => STATUS_MAP[status]?.type || 'info';

export const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

export const methodTagType = (method) => {
  const typeMap = { GET: 'success', POST: 'primary', PUT: 'warning', DELETE: 'danger' };
  return typeMap[method] || 'info';
};

export const TRIGGER_TEXT = { manual: '手动', schedule: '定时任务', api: '接口调用' };
export const triggerText = (trigger) => TRIGGER_TEXT[trigger] || trigger || '-';

const pad = (n) => String(n).padStart(2, '0');

export const formatTime = (value) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

export const formatDuration = (ms) => {
  if (ms === null || ms === undefined) return '-';
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)} s`;
  return `${Math.floor(ms / 60000)} 分 ${Math.round((ms % 60000) / 1000)} 秒`;
};

export const formatSize = (bytes) => {
  if (bytes === null || bytes === undefined) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

// 展示用：对象转成带缩进的 JSON 文本，其余原样
export const pretty = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  return String(value);
};

// 单行展示（断言实际值、变量值）
export const inline = (value) => {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

export const newRow = () => ({ key: '', value: '', description: '', enabled: true });

// {k: v} -> 键值行
export const objectToRows = (obj) =>
  Object.entries(obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : {}).map(([key, value]) => ({
    key,
    value: typeof value === 'string' ? value : inline(value),
    description: '',
    enabled: true,
  }));

// 键值行 -> {k: v}（只取启用且有键的）
export const rowsToObject = (rows) => {
  const obj = {};
  (rows || []).forEach((row) => {
    const key = (row.key || '').trim();
    if (row.enabled !== false && key) obj[key] = row.value ?? '';
  });
  return obj;
};

// 从接口报错里取一句能给人看的话
export const errorMessage = (error, fallback = '操作失败') => {
  const data = error?.response?.data;
  if (!data) return error?.message ? `${fallback}：${error.message}` : fallback;
  if (typeof data === 'string') return data.length < 200 ? data : fallback;
  if (data.error) return String(data.error);
  if (data.detail) return String(data.detail);
  const parts = [];
  Object.entries(data).forEach(([field, msgs]) => {
    const text = Array.isArray(msgs) ? msgs.join('；') : typeof msgs === 'object' ? JSON.stringify(msgs) : String(msgs);
    parts.push(field === 'non_field_errors' ? text : `${field}：${text}`);
  });
  return parts.length ? parts.join('；') : fallback;
};
