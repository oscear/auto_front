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

  //执行用例
  runCase: (data) => request.post(`/execute/`, data),

  //获取用例结果
  getCaseResult: (id) => request.get(`/api/testcases/${id}/result/`),

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
