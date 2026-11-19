import request from './request';

// 从 request.js 取同一个 baseURL，避免硬编码漂移
const API_BASE = request?.defaults?.baseURL || '';

function getAuthToken() {
  try {
    return JSON.parse(localStorage.getItem('authData') || 'null')?.data || '';
  } catch {
    return '';
  }
}

/**
 * 自然语言解析 · 流式版本
 * 后端返回 application/x-ndjson，每行一个事件：
 *   {"type":"delta","text":"..."}         AI 原文 token 碎片
 *   {"type":"done","steps":[...], ...}    最终帧（等价于非流式接口的 response）
 *
 * @param {{text:string, project_id:number}} data
 * @param {{onDelta?:(text:string)=>void, onDone?:(payload:object)=>void, signal?:AbortSignal}} cb
 * @returns {Promise<object>} resolves 到 done 帧 payload
 */
export async function parseNaturalLanguageStream(data, { onDelta, onDone, signal } = {}) {
  const token = getAuthToken();
  const resp = await fetch(`${API_BASE}/api/parse-natural-language/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Token ${token}` } : {}),
    },
    body: JSON.stringify({ ...data, stream: true }),
    signal,
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`HTTP ${resp.status} ${text}`);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buf = '';
  let lastDone = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() || '';
    for (const ln of lines) {
      const s = ln.trim();
      if (!s) continue;
      let ev;
      try {
        ev = JSON.parse(s);
      } catch {
        continue;
      }
      if (ev.type === 'delta') {
        onDelta?.(ev.text || '');
      } else if (ev.type === 'done') {
        lastDone = ev;
        onDone?.(ev);
      }
    }
  }
  return lastDone;
}

// ───────────── UI 用例执行记录（TestRun）相关的公共工具 ─────────────

// 执行记录终态
export const RUN_TERMINAL_STATUS = ['passed', 'failed', 'error', 'canceled'];

// 执行记录/用例状态 → 展示文案与 el-tag 类型（同时兼容旧的 pending/completed 取值）
export const RUN_STATUS_META = {
  queued: { label: '排队中', type: 'info' },
  running: { label: '执行中', type: 'warning' },
  passed: { label: '通过', type: 'success' },
  failed: { label: '失败', type: 'danger' },
  error: { label: '异常', type: 'danger' },
  canceled: { label: '已取消', type: 'info' },
  completed: { label: '已完成', type: 'success' },
  pending: { label: '未执行', type: 'info' },
};

export function runStatusMeta(status) {
  return RUN_STATUS_META[status] || { label: status || '未执行', type: 'info' };
}

// 列表接口返回数组或 {count, results} 都兼容
export function unwrapList(res) {
  if (Array.isArray(res)) return { items: res, total: res.length };
  if (res && Array.isArray(res.results)) return { items: res.results, total: Number(res.count ?? res.results.length) };
  return { items: [], total: 0 };
}

// 截图地址：新接口给 URL（绝对或相对后端），历史数据是 base64
export function resolveScreenshot(s) {
  if (!s || typeof s !== 'string') return '';
  if (/^(https?:|data:|blob:)/i.test(s)) return s;
  if (s.startsWith('/')) return `${API_BASE}${s}`;
  if (/\.(png|jpe?g|webp|gif)(\?.*)?$/i.test(s)) return `${API_BASE}/media/${s}`;
  return `data:image/png;base64,${s}`;
}

// 从 axios 错误里取后端给的说明
export function apiErrorText(error, fallback = '请求失败') {
  const data = error?.response?.data;
  if (typeof data === 'string' && data && data.length < 200) return data;
  return data?.detail || data?.error || data?.message || fallback;
}

/**
 * 通用轮询器。停止条件：isDone 为真（done）、连续 maxErrors 次请求出错（error）、
 * 超过 maxMs（timeout）、调用方 stop()（组件卸载/路由离开时必须调用，此时不回调 onStop）。
 *
 * @param {{fetch:()=>Promise<any>, isDone:(data:any)=>boolean, onTick?:(data:any)=>void,
 *   onStop?:(reason:'done'|'error'|'timeout', payload:any)=>void,
 *   interval?:number, firstDelay?:number, maxMs?:number, maxErrors?:number}} opt
 * @returns {{stop:()=>void}}
 */
export function createPoller({
  fetch: fetchFn,
  isDone,
  onTick,
  onStop,
  interval = 2000,
  firstDelay = 1000,
  maxMs = 30 * 60 * 1000,
  maxErrors = 3,
}) {
  let stopped = false;
  let timer = null;
  let errors = 0;
  const startedAt = Date.now();

  const finish = (reason, payload) => {
    if (stopped) return;
    stopped = true;
    if (timer) clearTimeout(timer);
    timer = null;
    onStop?.(reason, payload);
  };

  const tick = async () => {
    timer = null;
    if (stopped) return;
    let data;
    try {
      data = await fetchFn();
      errors = 0;
    } catch (e) {
      if (stopped) return;
      errors += 1;
      if (errors >= maxErrors) return finish('error', e);
    }
    if (stopped) return;
    if (data !== undefined) {
      onTick?.(data);
      if (isDone(data)) return finish('done', data);
    }
    if (Date.now() - startedAt >= maxMs) return finish('timeout', data);
    timer = setTimeout(tick, interval);
  };

  timer = setTimeout(tick, firstDelay);

  return {
    stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
      timer = null;
    },
  };
}

/**
 * 发起一次用例执行。
 * 新接口 POST /api/testcases/<id>/run/ → {run_id}；409 表示已有排队/执行中的记录（沿用那条 run_id）；
 * 404 说明后端还没升级，退回旧的 POST /execute/（此时拿不到 run_id，legacy=true）。
 *
 * @returns {Promise<{runId:number|null, legacy:boolean, conflict:boolean}>}
 */
export async function startCaseRun(caseId) {
  try {
    const res = await request.post(`/api/testcases/${caseId}/run/`);
    return { runId: res?.run_id ?? res?.id ?? null, legacy: false, conflict: false };
  } catch (e) {
    const status = e?.response?.status;
    if (status === 409 && e.response.data?.run_id != null) {
      return { runId: e.response.data.run_id, legacy: false, conflict: true };
    }
    if (status === 404) {
      await request.post('/execute/', { id: caseId });
      return { runId: null, legacy: true, conflict: false };
    }
    throw e;
  }
}

export const projectApi = {
  // 用户登录
  login: (data) => request.post('login/', data),

  // 用户注册
  register: (data) => request.post('register/', data),

  // 获取用户信息
  getUserInfo: () => request.get('/api/auth/user/'),

  // 用户登出
  logout: () => request.post('/api/auth/logout/'),
  // 获取项目列表
  getProjects: () => request.get('/api/projects/'),

  // 获取单个项目详情
  getProject: (id) => request.get(`/api/projects/${id}/`),

  // 创建项目
  createProject: (data) => request.post('/api/projects/', data),

  // 更新项目
  updateProject: (id, data) => request.put(`/api/projects/${id}/`, data),

  // 删除项目
  deleteProject: (id) => request.delete(`/api/projects/${id}/`),

  // 获取用例列表
  getCases: () => request.get('/api/testcases/'),

  // 获取单个用例详情
  getCase: (id) => request.get(`/api/testcases/${id}/`),

  // 创建用例
  createCase: (data) => request.post('/api/testcases/', data),

  // 更新用例
  updateCase: (id, data) => request.put(`/api/testcases/${id}/`, data),

  // 删除用例
  deleteCase: (id) => request.delete(`/api/testcases/${id}/`),

  // 执行用例（旧流程，仅作为新接口 404 时的兼容；页面请用 startCaseRun）
  runCase: (data) => request.post(`/execute/`, data),

  // 获取用例结果（后端路由不在 /api/ 下）
  getCaseResult: (id) => request.get(`/testcases/${id}/result/`),

  // 执行记录列表（分页：testcase / status / task / page / page_size）
  getRuns: (params) => request.get('/api/runs/', { params }),

  // 执行记录详情（含步骤与截图地址）
  getRun: (id) => request.get(`/api/runs/${id}/`),

  // 执行进度（轻量，只有状态和计数，轮询用）
  getRunProgress: (id) => request.get(`/api/runs/${id}/progress/`),

  // 取消执行
  cancelRun: (id) => request.post(`/api/runs/${id}/cancel/`),

  // 接口场景列表（定时任务里选择接口场景用）
  getApiScenarios: (params) => request.get('/api/automation/scenarios/', { params }),

  // 获取Tasks列表
  getTasks: () => request.get('/api/tasks/'),

  // 获取单个Tasks详情
  getTask: (id) => request.get(`/api/tasks/${id}/`),

  // 创建Tasks
  createTask: (data) => request.post('/api/tasks/', data),

  // 更新Tasks
  updateTask: (id, data) => request.put(`/api/tasks/${id}/`, data),

  // 删除Tasks
  deleteTask: (id) => request.delete(`/api/tasks/${id}/`),

  // ai聊天
  chat: (data) => request.post('/chat/', data),

  // 自然语言 → 结构化 step 解析（基于项目知识库）
  parseNaturalLanguage: (data) => request.post('/api/parse-natural-language/', data),

  // 可视化报表
  getDashboard: () => request.get(`/dashboard/`),

  // 执行任务
  runTask: (data) => request.post('/runtask/', data),

  // 启停任务
  StartTask: (data) => request.post('/startTask/', data),
};

// 接口自动化测试API
export const apiTestApi = {
  // 获取项目列表 (复用现有接口)
  getProjects: () => request.get('/api/projects/'),

  // 获取接口测试用例列表
  getApiCases: () => request.get('/api/automation/test-cases/'),

  // 获取单个接口测试用例详情
  getApiCase: (id) => request.get(`/api/automation/test-cases/${id}/`),

  // 创建接口测试用例
  createApiCase: (data) => request.post('/api/automation/test-cases/', data),

  // 更新接口测试用例
  updateApiCase: (id, data) => request.put(`/api/automation/test-cases/${id}/`, data),

  // 删除接口测试用例
  deleteApiCase: (id) => request.delete(`/api/automation/test-cases/${id}/`),

  // 运行接口测试用例
  runApiCase: (data) => request.post('/api/automation/test-cases/execute/', data),

  // 测试接口用例（不保存结果）
  testApiCase: (data) => request.post('/api/automation/test-cases/test/', data),

  // 获取接口测试结果
  getApiTestResults: () => request.get('/api/automation/test-results/'),

  // 获取单个接口测试结果详情
  getApiTestResult: (id) => request.get(`/api/automation/test-results/${id}/`),

  // 删除接口测试结果
  deleteApiTestResult: (id) => request.delete(`/api/automation/test-results/${id}/`),
};

// 知识库API
export const kbApi = {
  getList: (params) => request.get('/api/kb/', { params }),
  create: (data) => request.post('/api/kb/', data),
  update: (id, data) => request.put(`/api/kb/${id}/`, data),
  delete: (id) => request.delete(`/api/kb/${id}/`),
};

// 知识库 · 页面档案API
export const kbPageApi = {
  getList: (params) => request.get('/api/kb-pages/', { params }),
  create: (data) => request.post('/api/kb-pages/', data),
  update: (id, data) => request.put(`/api/kb-pages/${id}/`, data),
  delete: (id) => request.delete(`/api/kb-pages/${id}/`),
};

// 知识库 · 页面跳转API
export const kbTransitionApi = {
  getList: (params) => request.get('/api/kb-transitions/', { params }),
  create: (data) => request.post('/api/kb-transitions/', data),
  update: (id, data) => request.put(`/api/kb-transitions/${id}/`, data),
  delete: (id) => request.delete(`/api/kb-transitions/${id}/`),
};
