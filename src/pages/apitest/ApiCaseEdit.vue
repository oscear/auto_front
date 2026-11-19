<template>
  <div class="api-case-editor">
    <!-- 顶部工具栏 -->
    <header class="top-toolbar">
      <div class="toolbar-left">
        <el-button text @click="handleBack" class="back-btn">
          <el-icon><ArrowLeft /></el-icon>
          <span>返回</span>
        </el-button>
        <div class="title-divider"></div>
        <div class="page-title-wrap">
          <span class="page-title">{{ isEdit ? '编辑接口用例' : '新增接口用例' }}</span>
          <span class="page-subtitle">{{ isEdit ? '修改现有用例配置' : '创建一条新的接口测试用例' }}</span>
        </div>
      </div>
      <div class="toolbar-right">
        <el-button @click="curlDialogVisible = true" class="ghost-btn">
          <el-icon><Download /></el-icon>
          <span>从 curl 导入</span>
        </el-button>
        <el-button @click="handleBack" class="ghost-btn">取消</el-button>
        <el-button type="primary" @click="handleSave" :loading="saveLoading" class="primary-btn">
          <el-icon><Check /></el-icon>
          <span>保存用例</span>
        </el-button>
      </div>
    </header>

    <!-- 基本信息卡片 -->
    <section class="info-card">
      <div class="info-card-header">
        <span class="section-dot"></span>
        <span class="section-title">基本信息</span>
      </div>
      <el-form :model="formData" inline class="info-form">
        <el-form-item label="用例名称">
          <el-input v-model="formData.name" placeholder="给用例起一个清晰的名称" style="width: 260px" />
        </el-form-item>
        <el-form-item label="所属项目">
          <el-select v-model="formData.project" placeholder="选择项目" style="width: 180px" @change="onProjectChange">
            <el-option v-for="project in projects" :key="project.id" :label="project.name" :value="project.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="优先级">
          <el-select v-model="formData.priority" style="width: 100px">
            <el-option label="高" value="high" />
            <el-option label="中" value="medium" />
            <el-option label="低" value="low" />
          </el-select>
        </el-form-item>
        <el-form-item label="超时(毫秒)">
          <el-input-number v-model="formData.timeout_ms" :min="100" :max="600000" :step="1000" controls-position="right" style="width: 140px" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="formData.description" placeholder="选填" style="width: 260px" />
        </el-form-item>
      </el-form>
    </section>

    <!-- 请求区域 -->
    <section class="request-card">
      <!-- 请求行 -->
      <div class="request-line">
        <el-select v-model="formData.method" class="method-select" :class="`method-${formData.method.toLowerCase()}`">
          <el-option v-for="method in methods" :key="method.value" :label="method.label" :value="method.value" />
        </el-select>
        <el-input
          v-model="formData.url"
          placeholder="完整地址，或 /相对路径（拼环境的基础地址），可用 {{变量}}"
          class="url-input"
        >
          <template #prefix>
            <el-icon><Link /></el-icon>
          </template>
        </el-input>
        <el-select
          v-model="selectedEnvId"
          class="env-select"
          placeholder="环境"
          :disabled="!formData.project"
          :title="formData.project ? '发送时使用的环境' : '先选择所属项目'"
        >
          <el-option :label="defaultEnvLabel" :value="0" />
          <el-option v-for="env in envs" :key="env.id" :label="env.name + (env.is_default ? '（默认）' : '')" :value="env.id" />
        </el-select>
        <el-button type="primary" @click="handleSend" :loading="sendLoading" class="send-btn">
          <el-icon v-if="!sendLoading"><Promotion /></el-icon>
          <span>发送请求</span>
        </el-button>
      </div>

      <!-- 标签页 -->
      <div class="tabs-container">
        <el-tabs v-model="activeTab" class="request-tabs">
          <el-tab-pane name="header">
            <template #label>
              <span class="tab-label">
                Headers
                <span v-if="headerCount" class="count-badge">{{ headerCount }}</span>
              </span>
            </template>
            <KvEditor v-model="headers" show-desc add-text="添加 Header" empty-text="没有请求头（环境里配的默认请求头会自动带上）" />
          </el-tab-pane>

          <el-tab-pane name="query">
            <template #label>
              <span class="tab-label">
                Query
                <span v-if="queryCount" class="count-badge">{{ queryCount }}</span>
              </span>
            </template>
            <KvEditor v-model="queryParams" show-desc add-text="添加 Query" empty-text="没有查询参数" />
          </el-tab-pane>

          <el-tab-pane name="body">
            <template #label>
              <span class="tab-label">
                Body
                <span v-if="bodyParamCount > 0" class="count-badge">{{ bodyParamCount }}</span>
              </span>
            </template>

            <!-- Body类型选择器 -->
            <div class="body-types">
              <label
                v-for="type in bodyTypes"
                :key="type.value"
                class="body-type-item"
                :class="{ active: bodyType === type.value }"
              >
                <input
                  type="radio"
                  :value="type.value"
                  v-model="bodyType"
                  @change="onBodyTypeChange"
                />
                <span>{{ type.label }}</span>
              </label>
              <div class="body-types-spacer"></div>
              <el-button v-if="bodyType === 'raw' && rawType === 'json'" text size="small" @click="formatJson">格式化</el-button>
              <el-select v-if="bodyType === 'raw'" v-model="rawType" size="small" class="raw-type-select">
                <el-option label="JSON" value="json" />
                <el-option label="XML" value="xml" />
                <el-option label="Text" value="text" />
                <el-option label="HTML" value="html" />
              </el-select>
            </div>

            <!-- Body内容 -->
            <div class="body-content">
              <!-- form-data / urlencoded -->
              <KvEditor
                v-if="bodyType === 'form-data' || bodyType === 'urlencoded'"
                v-model="bodyParams"
                show-desc
                add-text="添加参数"
                empty-text="没有表单参数"
              />

              <!-- raw -->
              <div v-else-if="bodyType === 'raw'" class="raw-editor">
                <div class="editor-toolbar">
                  <span class="editor-hint">
                    <el-icon><InfoFilled /></el-icon>
                    {{ rawHint }}
                  </span>
                </div>
                <div class="code-editor">
                  <div class="line-numbers">
                    <div v-for="i in lineCount" :key="i" class="line-number">{{ i }}</div>
                  </div>
                  <el-input
                    v-model="rawContent"
                    type="textarea"
                    :rows="15"
                    placeholder="Enter request body"
                    class="code-textarea"
                    @input="updateLineCount"
                  />
                </div>
              </div>

              <!-- none -->
              <div v-else class="empty-body">
                <el-icon class="empty-icon"><Document /></el-icon>
                <p class="empty-title">此请求没有 Body</p>
                <p class="empty-desc">请在上方选择 Body 类型以配置请求体</p>
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane name="auth">
            <template #label>
              <span class="tab-label">
                认证
                <span v-if="auth.type !== 'none'" class="count-badge">{{ authTypeLabel }}</span>
              </span>
            </template>
            <el-form label-width="90px" class="auth-form">
              <el-form-item label="认证方式">
                <el-radio-group v-model="auth.type">
                  <el-radio-button v-for="t in authTypes" :key="t.value" :value="t.value">{{ t.label }}</el-radio-button>
                </el-radio-group>
              </el-form-item>
              <template v-if="auth.type === 'bearer'">
                <el-form-item label="Token">
                  <el-input v-model="auth.token" placeholder="如 {{token}}，发送时加到 Authorization: Bearer …" />
                </el-form-item>
              </template>
              <template v-else-if="auth.type === 'basic'">
                <el-form-item label="用户名">
                  <el-input v-model="auth.username" placeholder="可用 {{变量}}" />
                </el-form-item>
                <el-form-item label="密码">
                  <el-input v-model="auth.password" placeholder="建议写成环境变量，如 {{password}}" show-password />
                </el-form-item>
              </template>
              <template v-else-if="auth.type === 'header'">
                <el-form-item label="请求头名">
                  <el-input v-model="auth.key" placeholder="如 la517-authsign" />
                </el-form-item>
                <el-form-item label="请求头值">
                  <el-input v-model="auth.value" placeholder="可用 {{变量}}" />
                </el-form-item>
              </template>
              <div v-else class="auth-tip">不使用认证。需要每个接口都带的头，可以放到环境的默认请求头里。</div>
              <div v-if="auth.type !== 'none'" class="auth-tip">
                值里可以用变量；认证产生的请求头在执行记录里会打码。
              </div>
            </el-form>
          </el-tab-pane>

          <el-tab-pane name="assertions">
            <template #label>
              <span class="tab-label">
                断言
                <span v-if="assertionCount" class="count-badge">{{ assertionCount }}</span>
              </span>
            </template>
            <AssertionEditor v-model="assertions" />
          </el-tab-pane>

          <el-tab-pane name="extractors">
            <template #label>
              <span class="tab-label">
                提取变量
                <span v-if="extractorCount" class="count-badge">{{ extractorCount }}</span>
              </span>
            </template>
            <ExtractorEditor v-model="extractors" />
          </el-tab-pane>

          <el-tab-pane name="variables">
            <template #label>
              <span class="tab-label">
                调试变量
                <span v-if="debugVarCount" class="count-badge">{{ debugVarCount }}</span>
              </span>
            </template>
            <KvEditor
              v-model="debugVariables"
              key-label="变量名"
              value-label="值"
              key-placeholder="如 token"
              value-placeholder="值"
              add-text="添加变量"
              empty-text="没有调试变量"
              hint="只在本页点「发送请求」时生效，不随用例保存；优先于环境变量"
            />
          </el-tab-pane>
        </el-tabs>
      </div>
    </section>

    <!-- 响应区域 -->
    <section v-if="debugResult" class="response-card">
      <div class="response-header">
        <div class="response-info">
          <div class="status-badge" :class="getStatusClass(responseStatus)">
            <span class="status-dot"></span>
            <span class="status-label">{{ responseStatus || 'ERR' }}</span>
            <span class="status-text">{{ getStatusText(responseStatus) }}</span>
          </div>
          <el-tag :type="statusTagType(debugResult.status)" size="small" effect="light">
            {{ debugResultText }}
          </el-tag>
          <div class="meta-item">
            <el-icon><Timer /></el-icon>
            <span>{{ debugResult.duration_ms }} ms</span>
          </div>
          <div class="meta-item">
            <el-icon><DataLine /></el-icon>
            <span>{{ formatSize(debugResult.response?.size) }}</span>
          </div>
          <div class="meta-item" v-if="debugResult.env">
            <span>环境：{{ debugResult.env.name }}</span>
          </div>
        </div>
      </div>
      <div class="response-content">
        <StepResult :step="debugResult" />
      </div>
    </section>

    <!-- 从 curl 导入 -->
    <el-dialog v-model="curlDialogVisible" title="从 curl 导入" width="680px">
      <el-input
        v-model="curlText"
        type="textarea"
        :rows="12"
        placeholder="粘贴一条 curl 命令（浏览器开发者工具里「复制为 cURL」的内容即可）"
        class="curl-textarea"
      />
      <div class="curl-tip">导入会覆盖当前页面上的地址、方法、请求头、查询参数、请求体和认证，断言和提取器保留；导入后还需要点保存。</div>
      <template #footer>
        <el-button @click="curlDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="curlLoading" @click="handleImportCurl">解析并填入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import {
  ArrowLeft, Check, Link, Promotion, InfoFilled,
  Document, Timer, DataLine, Download,
} from '@element-plus/icons-vue';
import { apiTestApi } from '@/utils/apiTestApi';
import KvEditor from './components/KvEditor.vue';
import AssertionEditor from './components/AssertionEditor.vue';
import ExtractorEditor from './components/ExtractorEditor.vue';
import StepResult from './components/StepResult.vue';
import { errorMessage, formatSize, objectToRows, rowsToObject, statusTagType } from './common';

const route = useRoute();
const router = useRouter();

// 状态
const isEdit = ref(false);
const saveLoading = ref(false);
const sendLoading = ref(false);
const activeTab = ref('header');
const bodyType = ref('none');
const rawType = ref('json');
const rawContent = ref('');
const lineCount = ref(4);
const debugResult = ref(null);
const projects = ref([]);
const envs = ref([]);
const selectedEnvId = ref(0);
const curlDialogVisible = ref(false);
const curlText = ref('');
const curlLoading = ref(false);

// 表单数据
const formData = ref({
  name: '',
  project: '',
  description: '',
  url: '',
  method: 'POST',
  priority: 'medium',
  is_active: true,
  timeout_ms: 30000,
});

// 请求方法
const methods = [
  { label: 'GET', value: 'GET' },
  { label: 'POST', value: 'POST' },
  { label: 'PUT', value: 'PUT' },
  { label: 'DELETE', value: 'DELETE' },
  { label: 'PATCH', value: 'PATCH' },
  { label: 'HEAD', value: 'HEAD' },
  { label: 'OPTIONS', value: 'OPTIONS' },
];

// Body类型（界面上的分法；保存时映射成后端的 body_type）
const bodyTypes = [
  { label: 'none', value: 'none' },
  { label: 'form-data', value: 'form-data' },
  { label: 'urlencoded', value: 'urlencoded' },
  { label: 'raw', value: 'raw' },
];

const authTypes = [
  { label: '不使用', value: 'none' },
  { label: 'Bearer Token', value: 'bearer' },
  { label: 'Basic', value: 'basic' },
  { label: '自定义请求头', value: 'header' },
];

// 参数数据
const headers = ref([]);
const queryParams = ref([]);
const bodyParams = ref([]);
const debugVariables = ref([]);
const auth = ref({ type: 'none', token: '', username: '', password: '', key: '', value: '' });
const assertions = ref([]);
const extractors = ref([]);

// 计数
const headerCount = computed(() => headers.value.filter(p => p.enabled && p.key).length);
const queryCount = computed(() => queryParams.value.filter(p => p.enabled && p.key).length);
const bodyParamCount = computed(() => {
  if (bodyType.value === 'form-data' || bodyType.value === 'urlencoded') {
    return bodyParams.value.filter(p => p.enabled && p.key).length;
  }
  if (bodyType.value === 'raw' && rawContent.value.trim()) {
    return 1;
  }
  return 0;
});
const assertionCount = computed(() => assertions.value.filter(a => a.enabled !== false).length);
const extractorCount = computed(() => extractors.value.filter(e => e.enabled !== false && e.name).length);
const debugVarCount = computed(() => debugVariables.value.filter(p => p.enabled && p.key).length);
const authTypeLabel = computed(() => authTypes.find(t => t.value === auth.value.type)?.label || '');
const defaultEnvLabel = computed(() => (envs.value.some(e => e.is_default) ? '项目默认环境' : '不使用环境'));
const rawHint = computed(() =>
  rawType.value === 'json'
    ? '写 JSON；可以用 {{变量}}，数字型变量不用加引号，如 {"id": {{id}}}'
    : `按 ${rawType.value.toUpperCase()} 文本原样发送，可以用 {{变量}}`
);

const responseStatus = computed(() => debugResult.value?.response?.status_code || 0);
const debugResultText = computed(() => {
  const r = debugResult.value;
  if (!r) return '';
  if (r.status === 'error') return '请求失败';
  const list = r.assertions || [];
  if (!list.length) return r.status === 'passed' ? '已发送（没有断言）' : '未通过';
  const ok = list.filter(a => a.passed).length;
  return `断言 ${ok}/${list.length} 通过`;
});

// 初始化
onMounted(() => {
  checkEditMode();
  fetchProjects();
  initDefaultData();
});

const checkEditMode = () => {
  const id = route.params.id;
  if (id) {
    isEdit.value = true;
    fetchCaseData(id);
  }
};

const fetchProjects = async () => {
  try {
    projects.value = await apiTestApi.getProjects();
  } catch (error) {
    console.error('获取项目列表失败:', error);
  }
};

const fetchEnvs = async (projectId) => {
  envs.value = [];
  if (!projectId) return;
  try {
    envs.value = await apiTestApi.getEnvironments({ project: projectId });
  } catch (error) {
    console.error('获取环境列表失败:', error);
  }
  if (!envs.value.some(e => e.id === selectedEnvId.value)) selectedEnvId.value = 0;
};

const onProjectChange = (projectId) => {
  selectedEnvId.value = 0;
  fetchEnvs(projectId);
};

// 后端的请求体 -> 界面上的类型和内容
const applyBody = (type, body) => {
  const isEmpty = body === null || body === undefined || body === '' ||
    (typeof body === 'object' && !Array.isArray(body) && Object.keys(body).length === 0);
  bodyParams.value = [];
  rawContent.value = '';
  if (type === 'none') {
    bodyType.value = 'none';
  } else if (type === 'form-data' || type === 'urlencoded') {
    if (body && typeof body === 'object' && !Array.isArray(body)) {
      bodyType.value = type;
      bodyParams.value = objectToRows(body);
    } else {
      bodyType.value = 'raw';
      rawType.value = 'text';
      rawContent.value = isEmpty ? '' : String(body);
    }
  } else if (type === 'xml' || type === 'html' || type === 'text') {
    bodyType.value = 'raw';
    rawType.value = type;
    rawContent.value = isEmpty ? '' : (typeof body === 'string' ? body : JSON.stringify(body, null, 2));
  } else {
    // json（也是老数据的默认值）
    bodyType.value = isEmpty ? 'none' : 'raw';
    rawType.value = 'json';
    rawContent.value = isEmpty ? '' : (typeof body === 'string' ? body : JSON.stringify(body, null, 2));
  }
  updateLineCount();
};

// 界面上的请求体 -> 后端的 { body_type, body }
const collectBody = () => {
  if (bodyType.value === 'form-data' || bodyType.value === 'urlencoded') {
    return { body_type: bodyType.value, body: rowsToObject(bodyParams.value) };
  }
  if (bodyType.value === 'raw') {
    const text = rawContent.value;
    if (!text.trim()) return { body_type: 'none', body: {} };
    if (rawType.value === 'json') {
      // 能解析就存成对象；带不加引号的变量时解析不了，按文本存，执行时替换完变量再解析
      try {
        return { body_type: 'json', body: JSON.parse(text) };
      } catch (e) {
        return { body_type: 'json', body: text };
      }
    }
    return { body_type: rawType.value, body: text };
  }
  return { body_type: 'none', body: {} };
};

const fetchCaseData = async (id) => {
  try {
    const resp = await apiTestApi.getApiCase(id);
    formData.value = {
      name: resp.name,
      project: resp.project ?? '',
      description: resp.description || '',
      url: resp.url,
      method: resp.method,
      priority: resp.priority,
      is_active: resp.is_active,
      timeout_ms: resp.timeout_ms || 30000,
    };
    headers.value = objectToRows(resp.headers);
    queryParams.value = objectToRows(resp.params);
    applyBody(resp.body_type || 'json', resp.body);
    auth.value = { type: 'none', token: '', username: '', password: '', key: '', value: '', ...(resp.auth || {}) };
    if (!auth.value.type) auth.value.type = 'none';
    const savedAssertions = (resp.assertions || []).map(a => ({
      type: a.type, expr: a.expr || '', op: a.op || 'eq',
      expected: a.expected === null || a.expected === undefined ? '' : (typeof a.expected === 'object' ? JSON.stringify(a.expected) : String(a.expected)),
      enabled: a.enabled !== false,
    }));
    // 老用例没有断言列表，执行时按「期望状态码」判定；这里显示出来，保存后就成了正式的断言
    assertions.value = savedAssertions.length
      ? savedAssertions
      : [{ type: 'status', expr: '', op: 'eq', expected: String(resp.expected_status_code || 200), enabled: true }];
    extractors.value = (resp.extractors || []).map(e => ({
      name: e.name || '', from: e.from || 'json', expr: e.expr || '', enabled: e.enabled !== false,
    }));
    fetchEnvs(resp.project);
  } catch (error) {
    console.error('获取用例数据失败:', error);
    ElMessage.error(errorMessage(error, '获取用例数据失败'));
  }
};

const initDefaultData = () => {
  if (!isEdit.value) {
    headers.value = [
      { key: 'Content-Type', value: 'application/json', description: '', enabled: true },
    ];
    bodyType.value = 'raw';
    rawType.value = 'json';
    rawContent.value = '{\n  \n}';
    assertions.value = [{ type: 'status', expr: '', op: 'eq', expected: '200', enabled: true }];
  }
};

const onBodyTypeChange = () => {
  if (bodyType.value === 'raw' && !rawContent.value) {
    rawContent.value = '{\n  \n}';
    updateLineCount();
  }
};

const updateLineCount = () => {
  lineCount.value = Math.max(4, rawContent.value.split('\n').length);
};

const formatJson = () => {
  try {
    rawContent.value = JSON.stringify(JSON.parse(rawContent.value), null, 2);
  } catch (e) {
    ElMessage.warning('不是合法的 JSON（带不加引号的变量时无法格式化）');
  }
};

const collectAuth = () => {
  const a = auth.value;
  if (a.type === 'bearer') return { type: 'bearer', token: a.token };
  if (a.type === 'basic') return { type: 'basic', username: a.username, password: a.password };
  if (a.type === 'header') return { type: 'header', key: a.key, value: a.value };
  return { type: 'none' };
};

const collectAssertions = () =>
  assertions.value.map(a => {
    const item = { type: a.type, expr: a.expr || '', op: a.op, expected: a.expected ?? '' };
    if (a.enabled === false) item.enabled = false;
    return item;
  });

const collectExtractors = () =>
  extractors.value
    .filter(e => (e.name || '').trim() || (e.expr || '').trim())
    .map(e => {
      const item = { name: (e.name || '').trim(), from: e.from, expr: e.expr || '' };
      if (e.enabled === false) item.enabled = false;
      return item;
    });

// 请求相关的字段（保存和发送共用）
const collectRequest = () => ({
  url: (formData.value.url || '').trim(),
  method: formData.value.method,
  headers: rowsToObject(headers.value),
  params: rowsToObject(queryParams.value),
  ...collectBody(),
  auth: collectAuth(),
  assertions: collectAssertions(),
  extractors: collectExtractors(),
  timeout_ms: formData.value.timeout_ms || 30000,
});

// 发送请求：由后端代发（不受浏览器跨域限制），返回响应、断言结果和提取到的变量；不保存用例
const handleSend = async () => {
  if (!formData.value.url) {
    ElMessage.error('请输入请求URL');
    return;
  }

  sendLoading.value = true;
  try {
    const payload = {
      ...collectRequest(),
      variables: rowsToObject(debugVariables.value),
    };
    if (formData.value.project) payload.project = formData.value.project;
    if (selectedEnvId.value) payload.env_id = selectedEnvId.value;
    debugResult.value = await apiTestApi.debugApiCase(payload);
    if (debugResult.value.status === 'error') {
      ElMessage.error(`请求发送失败: ${debugResult.value.error}`);
    } else if (debugResult.value.status === 'failed') {
      ElMessage.warning('请求已发送，断言或变量提取未通过');
    } else {
      ElMessage.success('请求发送成功');
    }
  } catch (error) {
    console.error('请求失败:', error);
    ElMessage.error(errorMessage(error, '请求发送失败'));
  } finally {
    sendLoading.value = false;
  }
};

const handleSave = async () => {
  if (!formData.value.name) {
    ElMessage.error('请输入用例名称');
    return;
  }
  if (!formData.value.url) {
    ElMessage.error('请输入请求URL');
    return;
  }
  if (!formData.value.project) {
    ElMessage.error('请选择所属项目');
    return;
  }

  saveLoading.value = true;
  try {
    const saveData = {
      name: formData.value.name,
      project: formData.value.project,
      description: formData.value.description || '',
      priority: formData.value.priority,
      is_active: formData.value.is_active,
      ...collectRequest(),
    };

    if (isEdit.value) {
      await apiTestApi.updateApiCase(route.params.id, saveData);
      ElMessage.success('用例更新成功');
    } else {
      await apiTestApi.createApiCase(saveData);
      ElMessage.success('用例创建成功');
    }

    router.push({ name: 'ApiCaseManage' });
  } catch (error) {
    console.error('保存失败:', error);
    ElMessage.error(errorMessage(error, '保存失败'));
  } finally {
    saveLoading.value = false;
  }
};

// 从 curl 导入：后端解析，结果填到页面上（不直接保存）
const handleImportCurl = async () => {
  if (!curlText.value.trim()) {
    ElMessage.error('请粘贴 curl 命令');
    return;
  }
  curlLoading.value = true;
  try {
    const parsed = await apiTestApi.importCurl(curlText.value);
    formData.value.url = parsed.url;
    formData.value.method = parsed.method;
    if (!formData.value.name) formData.value.name = parsed.name || '';
    headers.value = objectToRows(parsed.headers);
    queryParams.value = objectToRows(parsed.params);
    applyBody(parsed.body_type, parsed.body);
    auth.value = { type: 'none', token: '', username: '', password: '', key: '', value: '', ...(parsed.auth || {}) };
    curlDialogVisible.value = false;
    curlText.value = '';
    activeTab.value = bodyType.value === 'none' ? 'header' : 'body';
    if (parsed.warnings?.length) ElMessage.warning(parsed.warnings.join('；'));
    else ElMessage.success('已填入，检查后保存');
  } catch (error) {
    ElMessage.error(errorMessage(error, '解析失败'));
  } finally {
    curlLoading.value = false;
  }
};

const handleBack = () => {
  router.push({ name: 'ApiCaseManage' });
};

const getStatusClass = (status) => {
  if (status >= 200 && status < 300) return 'success';
  if (status >= 300 && status < 400) return 'redirect';
  if (status >= 400 && status < 500) return 'warning';
  if (status >= 500 || status === 0) return 'error';
  return 'info';
};

const getStatusText = (status) => {
  if (status >= 200 && status < 300) return 'OK';
  if (status >= 300 && status < 400) return 'Redirect';
  if (status === 400) return 'Bad Request';
  if (status === 401) return 'Unauthorized';
  if (status === 403) return 'Forbidden';
  if (status === 404) return 'Not Found';
  if (status >= 400 && status < 500) return 'Client Error';
  if (status >= 500) return 'Server Error';
  if (status === 0) return 'Network Error';
  return '';
};

watch(rawContent, updateLineCount, { immediate: true });
</script>

<style scoped>
/* ============ 设计令牌 ============ */
.api-case-editor {
  --primary: #6366f1;
  --primary-hover: #4f46e5;
  --primary-soft: #eef2ff;
  --success: #10b981;
  --warning: #f59e0b;
  --danger: #ef4444;
  --redirect: #06b6d4;
  --text-1: #0f172a;
  --text-2: #475569;
  --text-3: #94a3b8;
  --border: #e2e8f0;
  --border-soft: #f1f5f9;
  --bg: #f8fafc;
  --bg-card: #ffffff;
  --radius: 10px;
  --radius-sm: 6px;
  --shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.04);
  --shadow: 0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04);
  --mono: 'JetBrains Mono', 'Fira Code', Monaco, Menlo, Consolas, monospace;

  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  color: var(--text-1);
  font-size: 13px;
}

/* ============ 顶部工具栏 ============ */
.top-toolbar {
  height: 60px;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 10;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-btn {
  color: var(--text-2);
  font-size: 13px;
  height: 34px;
  padding: 0 10px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s;
}
.back-btn:hover {
  color: var(--primary);
  background: var(--primary-soft);
}

.title-divider {
  width: 1px;
  height: 24px;
  background: var(--border);
}

.page-title-wrap {
  display: flex;
  flex-direction: column;
  gap: 2px;
  line-height: 1.2;
}

.page-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-1);
  letter-spacing: -0.01em;
}

.page-subtitle {
  font-size: 12px;
  color: var(--text-3);
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ghost-btn {
  height: 34px;
  border-radius: var(--radius-sm);
  border-color: var(--border);
  color: var(--text-2);
  cursor: pointer;
}
.ghost-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
  background: var(--primary-soft);
}

.primary-btn {
  height: 34px;
  border-radius: var(--radius-sm);
  background: var(--primary);
  border-color: var(--primary);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  box-shadow: 0 1px 2px rgba(99, 102, 241, 0.2);
}
.primary-btn:hover,
.primary-btn:focus {
  background: var(--primary-hover);
  border-color: var(--primary-hover);
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
}

/* ============ 基本信息卡片 ============ */
.info-card {
  margin: 16px 24px 0;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px 20px;
  box-shadow: var(--shadow-sm);
}

.info-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}

.section-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--primary);
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-1);
  letter-spacing: -0.01em;
}

.info-form :deep(.el-form-item) {
  margin-bottom: 0;
  margin-right: 24px;
}
.info-form :deep(.el-form-item__label) {
  font-size: 12px;
  color: var(--text-2);
  font-weight: 500;
}
.info-form :deep(.el-input__wrapper),
.info-form :deep(.el-select__wrapper) {
  border-radius: var(--radius-sm);
  box-shadow: 0 0 0 1px var(--border) inset;
  transition: box-shadow 0.15s;
}
.info-form :deep(.el-input__wrapper:hover),
.info-form :deep(.el-select__wrapper:hover) {
  box-shadow: 0 0 0 1px #cbd5e1 inset;
}
.info-form :deep(.el-input__wrapper.is-focus),
.info-form :deep(.el-select__wrapper.is-focused) {
  box-shadow: 0 0 0 1px var(--primary) inset !important;
}

/* ============ 请求卡片 ============ */
.request-card {
  flex: 1;
  margin: 16px 24px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  min-height: 0;
}

/* 请求行 */
.request-line {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 20px;
  border-bottom: 1px solid var(--border-soft);
  background: linear-gradient(180deg, #fbfcfd 0%, #ffffff 100%);
}

.method-select {
  width: 120px;
}
.method-select :deep(.el-select__wrapper) {
  border-radius: var(--radius-sm);
  font-weight: 700;
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: 0.03em;
  cursor: pointer;
}
.method-get :deep(.el-select__wrapper) { color: #059669; background: #ecfdf5; box-shadow: 0 0 0 1px #a7f3d0 inset; }
.method-post :deep(.el-select__wrapper) { color: #d97706; background: #fffbeb; box-shadow: 0 0 0 1px #fde68a inset; }
.method-put :deep(.el-select__wrapper) { color: #2563eb; background: #eff6ff; box-shadow: 0 0 0 1px #bfdbfe inset; }
.method-delete :deep(.el-select__wrapper) { color: #dc2626; background: #fef2f2; box-shadow: 0 0 0 1px #fecaca inset; }
.method-patch :deep(.el-select__wrapper) { color: #7c3aed; background: #f5f3ff; box-shadow: 0 0 0 1px #ddd6fe inset; }
.method-head :deep(.el-select__wrapper),
.method-options :deep(.el-select__wrapper) { color: #475569; background: #f8fafc; box-shadow: 0 0 0 1px #cbd5e1 inset; }

.url-input {
  flex: 1;
}
.url-input :deep(.el-input__wrapper) {
  border-radius: var(--radius-sm);
  box-shadow: 0 0 0 1px var(--border) inset;
  font-family: var(--mono);
  font-size: 13px;
  transition: box-shadow 0.15s;
}
.url-input :deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #cbd5e1 inset;
}
.url-input :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px var(--primary) inset !important;
}
.url-input :deep(.el-input__prefix) {
  color: var(--text-3);
}

.protocol-tag {
  background: #f1f5f9;
  border-color: var(--border);
  color: var(--text-2);
  font-family: var(--mono);
  font-size: 11px;
  border-radius: 4px;
  padding: 0 8px;
}

.send-btn {
  height: 34px;
  padding: 0 18px;
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
  font-weight: 600;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s;
  box-shadow: 0 1px 3px rgba(99, 102, 241, 0.25);
  display: flex;
  align-items: center;
  gap: 6px;
}
.send-btn:hover,
.send-btn:focus {
  background: var(--primary-hover);
  border-color: var(--primary-hover);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.35);
  transform: translateY(-1px);
}

/* ============ 标签页 ============ */
.tabs-container {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.request-tabs {
  height: 100%;
  display: flex !important;
  flex-direction: column !important;
}

.request-tabs :deep(.el-tabs__header) {
  margin: 0 !important;
  border-bottom: 1px solid var(--border-soft);
  background: #fbfcfd;
  flex-shrink: 0 !important;
  order: 1 !important;
}

.request-tabs :deep(.el-tabs__nav-wrap) {
  padding: 0 12px;
}

.request-tabs :deep(.el-tabs__nav) {
  border: none;
}

.request-tabs :deep(.el-tabs__item) {
  border: none;
  color: var(--text-2);
  font-size: 13px;
  font-weight: 500;
  padding: 14px 18px;
  height: auto;
  cursor: pointer;
  transition: color 0.15s;
}
.request-tabs :deep(.el-tabs__item:hover) {
  color: var(--text-1);
}
.request-tabs :deep(.el-tabs__item.is-active) {
  color: var(--primary);
  font-weight: 600;
}
.request-tabs :deep(.el-tabs__active-bar) {
  background: var(--primary);
  height: 2px;
  border-radius: 2px 2px 0 0;
}

.request-tabs :deep(.el-tabs__content) {
  padding: 0;
  flex: 1 !important;
  overflow-y: auto;
  order: 2 !important;
}
.request-tabs :deep(.el-tab-pane) {
  padding: 20px;
}

.tab-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.count-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  background: var(--primary-soft);
  color: var(--primary);
  font-size: 11px;
  font-weight: 600;
  border-radius: 9px;
  line-height: 1;
}

/* ============ 参数表格 ============ */
.params-table {
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: #fff;
}

.table-row {
  display: flex;
  align-items: center;
  min-height: 40px;
  border-bottom: 1px solid var(--border-soft);
  transition: background 0.1s;
}
.table-row:last-child {
  border-bottom: none;
}
.table-row:not(.table-header):hover {
  background: #fafbfc;
}

.table-header {
  background: #f8fafc;
  font-size: 11px;
  color: var(--text-3);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  min-height: 34px;
}

.col-checkbox { width: 44px; display: flex; justify-content: center; }
.col-key { width: 220px; padding: 6px 10px; }
.col-value { width: 260px; padding: 6px 10px; }
.col-desc { flex: 1; padding: 6px 10px; }
.col-action { width: 48px; display: flex; justify-content: center; }

.params-table :deep(.el-input__wrapper) {
  box-shadow: none !important;
  background: transparent;
  padding: 2px 6px;
  font-family: var(--mono);
  font-size: 12.5px;
}
.params-table :deep(.el-input__wrapper:hover),
.params-table :deep(.el-input__wrapper.is-focus) {
  background: #fff;
  box-shadow: 0 0 0 1px var(--primary) inset !important;
  border-radius: 4px;
}

.row-del-btn {
  color: var(--text-3);
  padding: 4px;
  cursor: pointer;
  transition: all 0.15s;
}
.row-del-btn:hover {
  color: var(--danger);
  background: #fef2f2;
}

.table-footer {
  padding: 8px 12px;
  background: #fbfcfd;
  border-top: 1px dashed var(--border-soft);
}

.add-row-btn {
  color: var(--primary);
  font-weight: 500;
  cursor: pointer;
}
.add-row-btn:hover {
  color: var(--primary-hover);
  background: var(--primary-soft);
}

/* ============ Body 类型选择器 ============ */
.body-types {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 16px;
  padding: 6px;
  background: #f8fafc;
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-sm);
}

.body-type-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-2);
  border-radius: 5px;
  transition: all 0.15s;
  user-select: none;
}
.body-type-item:hover {
  color: var(--text-1);
  background: #fff;
}
.body-type-item input[type="radio"] {
  display: none;
}
.body-type-item.active {
  color: var(--primary);
  background: #fff;
  box-shadow: 0 0 0 1px var(--border), 0 1px 2px rgba(15, 23, 42, 0.04);
  font-weight: 600;
}

.body-types-spacer { flex: 1; }

.raw-type-select {
  width: 100px;
}
.raw-type-select :deep(.el-select__wrapper) {
  border-radius: 5px;
  font-family: var(--mono);
  font-size: 12px;
  min-height: 28px;
  cursor: pointer;
}

/* ============ 代码编辑器 ============ */
.body-content {
  min-height: 320px;
}

.raw-editor {
  display: flex;
  flex-direction: column;
}

.editor-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.editor-hint {
  font-size: 12px;
  color: var(--text-3);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.code-editor {
  display: flex;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: #0f172a;
  transition: box-shadow 0.15s;
}
.code-editor:focus-within {
  box-shadow: 0 0 0 1px var(--primary);
  border-color: var(--primary);
}

.line-numbers {
  background: #0b1220;
  border-right: 1px solid #1e293b;
  padding: 12px 10px;
  font-family: var(--mono);
  font-size: 12.5px;
  line-height: 1.6;
  color: #475569;
  user-select: none;
  min-width: 44px;
  text-align: right;
}

.line-number {
  height: 20px;
}

.code-textarea {
  flex: 1;
}
.code-textarea :deep(.el-textarea__inner) {
  border: none;
  border-radius: 0;
  background: #0f172a;
  color: #e2e8f0;
  font-family: var(--mono);
  font-size: 12.5px;
  line-height: 1.6;
  padding: 12px 14px;
  resize: none;
  height: 100% !important;
  min-height: 320px;
  box-shadow: none;
  caret-color: var(--primary);
}
.code-textarea :deep(.el-textarea__inner::placeholder) {
  color: #475569;
}
.code-textarea :deep(.el-textarea__inner:focus) {
  box-shadow: none;
}

/* ============ 空状态 / 占位 ============ */
.empty-body,
.placeholder-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--text-3);
  text-align: center;
}

.empty-icon,
.placeholder-icon {
  font-size: 40px;
  color: #cbd5e1;
  margin-bottom: 12px;
}

.empty-title,
.placeholder-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-2);
  margin: 0 0 6px;
}

.empty-desc,
.placeholder-desc {
  font-size: 12px;
  color: var(--text-3);
}

/* ============ 响应区域 ============ */
.response-card {
  margin: 0 24px 16px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  max-height: 420px;
}

.response-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-bottom: 1px solid var(--border-soft);
  background: linear-gradient(180deg, #fbfcfd 0%, #ffffff 100%);
}

.response-info {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 12px;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px 4px 8px;
  border-radius: 6px;
  font-weight: 600;
  font-family: var(--mono);
  font-size: 12px;
  line-height: 1.4;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 0 3px currentColor;
  opacity: 0.25;
}
.status-badge .status-dot {
  opacity: 1;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
}

.status-label {
  letter-spacing: 0.02em;
}

.status-text {
  font-weight: 500;
  opacity: 0.85;
  font-family: system-ui, -apple-system, sans-serif;
}

.status-badge.success {
  color: #047857;
  background: #ecfdf5;
  box-shadow: 0 0 0 1px #a7f3d0 inset;
}
.status-badge.success .status-dot { background: #10b981; box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2); }

.status-badge.redirect {
  color: #0e7490;
  background: #ecfeff;
  box-shadow: 0 0 0 1px #a5f3fc inset;
}
.status-badge.redirect .status-dot { background: #06b6d4; box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.2); }

.status-badge.warning {
  color: #b45309;
  background: #fffbeb;
  box-shadow: 0 0 0 1px #fde68a inset;
}
.status-badge.warning .status-dot { background: #f59e0b; box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.2); }

.status-badge.error {
  color: #b91c1c;
  background: #fef2f2;
  box-shadow: 0 0 0 1px #fecaca inset;
}
.status-badge.error .status-dot { background: #ef4444; box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2); }

.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--text-2);
  font-size: 12px;
}
.meta-item .el-icon {
  color: var(--text-3);
  font-size: 14px;
}

.response-actions :deep(.el-button) {
  color: var(--text-2);
  cursor: pointer;
}
.response-actions :deep(.el-button:hover) {
  color: var(--primary);
  background: var(--primary-soft);
}

.response-content {
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.response-tabs {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.response-tabs :deep(.el-tabs__header) {
  margin: 0;
  border-bottom: 1px solid var(--border-soft);
}
.response-tabs :deep(.el-tabs__nav-wrap) { padding: 0 12px; }
.response-tabs :deep(.el-tabs__item) {
  padding: 10px 16px;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--text-2);
  cursor: pointer;
}
.response-tabs :deep(.el-tabs__item.is-active) {
  color: var(--primary);
  font-weight: 600;
}
.response-tabs :deep(.el-tabs__active-bar) {
  background: var(--primary);
  height: 2px;
}
.response-tabs :deep(.el-tabs__content) {
  flex: 1;
  padding: 0;
  overflow-y: auto;
}
.response-tabs :deep(.el-tab-pane) {
  padding: 16px 20px;
}

.response-body {
  margin: 0;
  padding: 14px 16px;
  font-family: var(--mono);
  font-size: 12.5px;
  line-height: 1.6;
  color: #e2e8f0;
  background: #0f172a;
  border-radius: var(--radius-sm);
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-x: auto;
}

.response-headers {
  font-family: var(--mono);
  font-size: 12.5px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.header-item {
  display: flex;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-soft);
  gap: 16px;
}
.header-item:last-child { border-bottom: none; }
.header-item:hover { background: #fafbfc; }

.header-key {
  color: var(--text-1);
  font-weight: 600;
  min-width: 200px;
  word-break: break-all;
}
.header-value {
  color: var(--text-2);
  word-break: break-all;
  flex: 1;
}

/* ============ 响应式 ============ */
@media (max-width: 900px) {
  .info-card,
  .request-card,
  .response-card {
    margin-left: 12px;
    margin-right: 12px;
  }
  .top-toolbar {
    padding: 0 12px;
  }
  .page-subtitle { display: none; }
  .request-line {
    flex-wrap: wrap;
    gap: 8px;
  }
  .method-select { width: 100px; }
  .url-input { flex: 1 1 100%; order: 3; }
  .protocol-tag { display: none; }
  .col-key { width: 140px; }
  .col-value { width: 160px; }
  .col-desc { display: none; }
}

/* ============ 环境选择 / 认证 / curl 导入 ============ */
.env-select {
  width: 170px;
}
.env-select :deep(.el-select__wrapper) {
  border-radius: var(--radius-sm);
  font-size: 12px;
}

.auth-form {
  max-width: 640px;
}
.auth-tip {
  margin-left: 90px;
  font-size: 12px;
  color: var(--text-3);
  line-height: 1.6;
}

.response-card {
  max-height: none;
}
.response-content {
  padding: 12px 20px 16px;
  overflow: visible;
}

.curl-textarea :deep(.el-textarea__inner) {
  font-family: var(--mono);
  font-size: 12.5px;
  line-height: 1.6;
}
.curl-tip {
  margin-top: 8px;
  font-size: 12px;
  color: #94a3b8;
  line-height: 1.5;
}
</style>
