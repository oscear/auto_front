import request from './request';
import { projectApi } from './api';

// 接口自动化的接口封装（后端路由前缀 /api/automation/）
const BASE = '/api/automation';

// 列表接口不带 page_size 时返回数组，带了返回 {count, results}；这里统一成数组
export const asList = (res) => (Array.isArray(res) ? res : res?.results || []);

export const apiTestApi = {
  // 项目列表（复用 UI 自动化的项目）
  getProjects: () => projectApi.getProjects().then(asList),

  // ---------- 用例 ----------
  getApiCases: (params) => request.get(`${BASE}/cases/`, { params }).then(asList),
  getApiCase: (id) => request.get(`${BASE}/cases/${id}/`),
  createApiCase: (data) => request.post(`${BASE}/cases/`, data),
  updateApiCase: (id, data) => request.put(`${BASE}/cases/${id}/`, data),
  deleteApiCase: (id) => request.delete(`${BASE}/cases/${id}/`),
  // 执行用例：data 可带 { env_id, variables }，返回执行记录详情（含步骤）
  runApiCase: (id, data = {}) => request.post(`${BASE}/cases/${id}/run/`, data),
  // 调试发送：不落用例、不建执行记录，由后端代发
  debugApiCase: (data) => request.post(`${BASE}/cases/debug/`, data),
  // 把 curl 命令解析成用例字段（不保存）
  importCurl: (curl) => request.post(`${BASE}/import/curl/`, { curl }),

  // ---------- 环境 ----------
  getEnvironments: (params) => request.get(`${BASE}/environments/`, { params }).then(asList),
  createEnvironment: (data) => request.post(`${BASE}/environments/`, data),
  updateEnvironment: (id, data) => request.put(`${BASE}/environments/${id}/`, data),
  deleteEnvironment: (id) => request.delete(`${BASE}/environments/${id}/`),

  // ---------- 场景 ----------
  getScenarios: (params) => request.get(`${BASE}/scenarios/`, { params }).then(asList),
  getScenario: (id) => request.get(`${BASE}/scenarios/${id}/`),
  createScenario: (data) => request.post(`${BASE}/scenarios/`, data),
  updateScenario: (id, data) => request.put(`${BASE}/scenarios/${id}/`, data),
  deleteScenario: (id) => request.delete(`${BASE}/scenarios/${id}/`),
  runScenario: (id, data = {}) => request.post(`${BASE}/scenarios/${id}/run/`, data),

  // ---------- 执行记录 ----------
  // 分页：{ page, page_size, project, kind, status, scenario, case, task }，返回 { count, results }
  getRuns: (params) => request.get(`${BASE}/runs/`, { params }),
  getRun: (id) => request.get(`${BASE}/runs/${id}/`),
};

export default apiTestApi;
