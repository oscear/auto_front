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

// ------------------------------------------------------------------ 新界面共用

// 请求方法小标签的样式类（配色在 apitest.css 里固定）
export const methodClass = (method) => `at-method at-method--${String(method || 'get').toLowerCase()}`;

// HTTP 状态码 -> 着色档位
export const httpClass = (code) => {
  const n = Number(code);
  if (!n) return 'err';
  if (n < 300) return 'ok';
  if (n < 400) return 'redirect';
  if (n < 500) return 'warn';
  return 'err';
};

// 执行状态 -> 圆点/图标的颜色档位
export const statusTone = (status) => {
  if (status === 'passed') return 'pass';
  if (status === 'failed' || status === 'error') return 'fail';
  if (status === 'running' || status === 'queued') return 'run';
  return 'skip';
};

export const PRIORITIES = [
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
];
export const priorityText = (value) => PRIORITIES.find((p) => p.value === value)?.label || value || '-';

// 键名像密码/令牌的，值默认遮住
export const isSecretKey = (key) => /pass|pwd|token|secret|auth|sign|cookie|session|credential|apikey|api[-_]key|密码|令牌|密钥/i.test(key || '');

export const kvCount = (rows) => (rows || []).filter((r) => r.enabled !== false && (r.key || '').trim()).length;

// 把不带引号的 {{变量}} 换成占位字符串后再解析，这样 {"id": {{id}}} 也能校验和格式化
export const parseLooseJson = (text) => {
  const holders = [];
  let out = '';
  let inString = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      out += ch;
      if (ch === '\\') {
        out += text[i + 1] ?? '';
        i += 1;
      } else if (ch === '"') inString = false;
    } else if (ch === '"') {
      inString = true;
      out += ch;
    } else if (ch === '{' && text[i + 1] === '{') {
      const end = text.indexOf('}}', i + 2);
      if (end < 0) {
        out += ch;
      } else {
        holders.push(text.slice(i, end + 2));
        out += `"@@ATVAR_${holders.length - 1}@@"`;
        i = end + 1;
      }
    } else out += ch;
  }
  try {
    const value = JSON.parse(out);
    const restore = (formatted) => formatted.replace(/"@@ATVAR_(\d+)@@"/g, (_, n) => holders[Number(n)]);
    return { ok: true, value, hasBareVars: holders.length > 0, format: () => restore(JSON.stringify(value, null, 2)) };
  } catch (e) {
    // 浏览器给的报错不一定带位置，自己再走一遍找出错在哪
    const found = locateJsonError(text);
    return { ok: false, error: found.message, line: found.line };
  }
};

// 简单的 JSON 语法检查：只为了说清楚「第几行、哪里不对」。不带引号的 {{变量}} 当成一个值
const locateJsonError = (text) => {
  let i = 0;
  const fail = (message, at = i) => {
    const err = new Error(message);
    err.at = at;
    throw err;
  };
  const ws = () => {
    while (i < text.length && /\s/.test(text[i])) i += 1;
  };
  const str = () => {
    const start = i;
    i += 1;
    while (i < text.length && text[i] !== '"') {
      if (text[i] === '\n') fail('字符串没有用双引号结束', start);
      i += text[i] === '\\' ? 2 : 1;
    }
    if (i >= text.length) fail('字符串没有用双引号结束', start);
    i += 1;
  };
  const value = () => {
    ws();
    const ch = text[i];
    if (ch === undefined) fail('内容不完整，缺少值');
    if (ch === '"') return str();
    if (ch === '{' && text[i + 1] === '{') {
      const end = text.indexOf('}}', i + 2);
      if (end < 0) fail('变量少了结尾的 }}');
      i = end + 2;
      return undefined;
    }
    if (ch === '{' || ch === '[') {
      const close = ch === '{' ? '}' : ']';
      i += 1;
      ws();
      if (text[i] === close) {
        i += 1;
        return undefined;
      }
      for (;;) {
        ws();
        if (ch === '{') {
          if (text[i] !== '"') fail(text[i] === close ? '最后一项后面多了逗号' : '键名要用双引号括起来');
          str();
          ws();
          if (text[i] !== ':') fail('键名后面少了冒号');
          i += 1;
        } else if (text[i] === close) fail('最后一项后面多了逗号');
        value();
        ws();
        if (text[i] === ',') {
          i += 1;
        } else if (text[i] === close) {
          i += 1;
          return undefined;
        } else if (text[i] === undefined) fail(`少了结尾的 ${close}`);
        else fail(`这里应该是逗号或 ${close}`);
      }
    }
    const m = /^(-?\d+(\.\d+)?([eE][+-]?\d+)?|true|false|null)/.exec(text.slice(i, i + 40));
    if (!m) fail(ch === "'" ? '字符串要用双引号，不能用单引号' : ch === ',' || ch === '}' || ch === ']' ? '这里少了一个值' : `不认识的内容「${text.slice(i, i + 8).split('\n')[0]}」`);
    i += m[0].length;
    return undefined;
  };
  try {
    value();
    ws();
    if (i < text.length) fail('JSON 结束后还有多余的内容');
    return { message: '格式不对', line: null };
  } catch (e) {
    const at = Math.min(e.at ?? i, text.length);
    return { message: e.message, line: text.slice(0, at).split('\n').length };
  }
};

export const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(area);
      return ok;
    } catch {
      return false;
    }
  }
};

// 断言的文字说明（编辑器和结果展示共用）
export const ASSERT_TYPE_TEXT = {
  status: '状态码',
  jsonpath: 'JSON 字段',
  contains: '响应文本',
  regex: '正则',
  header: '响应头',
  response_time: '响应时间',
};
export const ASSERT_OP_TEXT = {
  eq: '等于', ne: '不等于', gt: '大于', lt: '小于', ge: '大于等于', le: '小于等于',
  contains: '包含', not_contains: '不包含', exists: '存在', not_exists: '不存在', matches: '匹配正则',
};

export const loadPref = (key, fallback) => {
  try {
    const raw = localStorage.getItem(`apitest:${key}`);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
};
export const savePref = (key, value) => {
  try {
    localStorage.setItem(`apitest:${key}`, JSON.stringify(value));
  } catch {
    /* 存不了就算了 */
  }
};
