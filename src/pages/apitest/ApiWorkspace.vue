<template>
  <!-- 接口工作台：左边找用例，中间上半改请求，下半看响应 -->
  <div class="at-root" :class="{ 'is-side-collapsed': sideCollapsed }">
    <!-- ============================== 左栏：用例 ============================== -->
    <aside v-show="!sideCollapsed" class="at-side at-panel">
      <div class="at-side__head">
        <span class="at-side__title">接口用例</span>
        <span class="at-side__count">{{ cases.length }}</span>
        <span class="at-flex-1"></span>
        <button type="button" class="at-icon-btn" title="刷新" @click="fetchCases"><el-icon><Refresh /></el-icon></button>
        <button type="button" class="at-icon-btn" title="收起左栏" @click="toggleSide"><el-icon><Fold /></el-icon></button>
      </div>
      <div class="at-side__tools">
        <el-select v-model="filterProject" placeholder="全部项目" class="at-side__project" popper-class="at-pop" @change="onFilterProject">
          <el-option label="全部项目" value="" />
          <el-option v-for="p in projects" :key="p.id" :label="p.name" :value="p.id" />
        </el-select>
        <el-input v-model="search" placeholder="搜索用例名或地址" clearable :prefix-icon="Search" />
        <div class="at-side__actions">
          <el-button type="primary" :icon="Plus" data-test="new-case" @click="newCase">新建</el-button>
          <el-button :icon="Download" data-test="import-curl" @click="openCurl">从 curl 导入</el-button>
        </div>
      </div>

      <div v-loading="listLoading" class="at-side__list">
        <div
          v-if="hasDraft && !currentId"
          class="at-case is-active is-draft"
        >
          <span :class="methodClass(form.method)">{{ form.method }}</span>
          <span class="at-case__name">{{ form.name || '未保存的新用例' }}</span>
          <i class="at-dot at-dot--dirty" title="还没保存"></i>
        </div>
        <template v-for="group in groups" :key="group.key">
          <div v-if="grouped" class="at-group" @click="toggleGroup(group.key)">
            <el-icon class="at-group__arrow" :class="{ 'is-open': !collapsedGroups[group.key] }"><CaretRight /></el-icon>
            <span class="at-group__name">{{ group.name }}</span>
            <span class="at-group__count">{{ group.cases.length }}</span>
          </div>
          <template v-if="!grouped || !collapsedGroups[group.key]">
            <div
              v-for="item in group.cases"
              :key="item.id"
              class="at-case"
              :class="{ 'is-active': item.id === currentId, 'is-disabled': item.is_active === false }"
              :title="item.url"
              :data-case-id="item.id"
              @click="openCase(item.id)"
            >
              <span :class="methodClass(item.method)">{{ item.method }}</span>
              <span class="at-case__name">{{ item.name }}</span>
              <i
                class="at-dot"
                :class="'at-dot--' + statusTone(item.status) + (item.last_run_id ? '' : ' at-dot--none')"
                :title="item.last_run_id ? `最近一次：${statusText(item.status)}  ${formatTime(item.last_run_time)}` : '还没有执行过'"
              ></i>
              <el-dropdown trigger="click" popper-class="at-pop" @command="(cmd) => onCaseCommand(cmd, item)">
                <button type="button" class="at-icon-btn at-case__more" title="更多操作" @click.stop>
                  <el-icon><MoreFilled /></el-icon>
                </button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="copy" :icon="CopyDocument">复制</el-dropdown-item>
                    <el-dropdown-item command="history" :icon="Clock">查看历史</el-dropdown-item>
                    <el-dropdown-item command="delete" :icon="Delete" divided class="at-danger-item">删除</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </template>
        </template>
        <div v-if="!listLoading && !visibleCount && !(hasDraft && !currentId)" class="at-empty at-empty--side">
          <template v-if="cases.length">
            <p class="at-empty__title">没有匹配的用例</p>
            <p class="at-empty__desc">换个关键词，或切换到「全部项目」。</p>
            <el-button size="small" @click="clearFilter">清除筛选</el-button>
          </template>
          <template v-else>
            <p class="at-empty__title">还没有接口用例</p>
            <p class="at-empty__desc">新建一条，或粘贴 curl 命令导入。</p>
          </template>
        </div>
      </div>
    </aside>

    <!-- ============================== 中间：请求 + 响应 ============================== -->
    <section class="at-main">
      <!-- 空态：没选用例 -->
      <div v-if="!hasDraft" class="at-panel at-empty at-empty--page">
        <button v-if="sideCollapsed" type="button" class="at-icon-btn at-empty__expand" title="展开左栏" @click="toggleSide">
          <el-icon><Expand /></el-icon>
        </button>
        <div class="at-empty__art"><el-icon><Connection /></el-icon></div>
        <p class="at-empty__title">在一个页面里调接口、看响应、存用例</p>
        <p class="at-empty__desc">从左边选一条用例打开；或者新建一条，填好地址点「发送」就能看到响应，调通后再保存。</p>
        <div class="at-empty__actions">
          <el-button type="primary" :icon="Plus" @click="newCase">新建用例</el-button>
          <el-button :icon="Download" @click="openCurl">从 curl 导入</el-button>
        </div>
        <ul class="at-empty__tips">
          <li><kbd>Ctrl</kbd> + <kbd>Enter</kbd> 发送请求</li>
          <li><kbd>Ctrl</kbd> + <kbd>S</kbd> 保存用例</li>
          <li>地址、请求头、请求体里都可以写 <code v-pre>{{变量}}</code>，值来自所选环境</li>
        </ul>
      </div>

      <template v-else>
        <div ref="splitBox" v-loading="caseLoading" class="at-split">
          <!-- ---------- 请求区 ---------- -->
          <div class="at-panel at-req" :style="{ height: `calc(${ratio * 100}% - 4px)` }">
            <!-- 元信息细条 -->
            <div class="at-meta">
              <button v-if="sideCollapsed" type="button" class="at-icon-btn" title="展开左栏" @click="toggleSide">
                <el-icon><Expand /></el-icon>
              </button>
              <input
                ref="nameInput"
                v-model="form.name"
                class="at-meta__name"
                placeholder="未命名用例（点这里起个名字）"
                maxlength="200"
                data-test="case-name"
              />
              <template v-if="!metaOpen">
                <button type="button" class="at-meta__chip" :class="{ 'is-warn': !form.project }" @click="metaOpen = true">
                  <el-icon><FolderOpened /></el-icon>{{ projectName(form.project) || '未选项目' }}
                </button>
                <button type="button" class="at-meta__chip" @click="metaOpen = true">优先级 {{ priorityText(form.priority) }}</button>
                <button type="button" class="at-meta__chip" @click="metaOpen = true">超时 {{ form.timeout_ms / 1000 }}s</button>
                <span v-if="!form.is_active" class="at-meta__chip is-warn">已停用</span>
              </template>
              <span class="at-flex-1"></span>
              <span v-if="currentCase?.last_run_id" class="at-meta__last" @click="showHistory(currentCase)">
                <i class="at-dot" :class="'at-dot--' + statusTone(currentCase.status)"></i>
                最近执行{{ statusText(currentCase.status) }} · {{ formatTime(currentCase.last_run_time) }}
              </span>
              <button type="button" class="at-link-btn" data-test="meta-toggle" @click="metaOpen = !metaOpen">
                <el-icon><Setting /></el-icon>用例设置
                <el-icon class="at-meta__arrow" :class="{ 'is-open': metaOpen }"><ArrowDown /></el-icon>
              </button>
            </div>
            <div v-show="metaOpen" class="at-meta__more">
              <label class="at-field">
                <span>所属项目</span>
                <el-select v-model="form.project" placeholder="选择项目" size="small" popper-class="at-pop" data-test="case-project" @change="onProjectChange">
                  <el-option v-for="p in projects" :key="p.id" :label="p.name" :value="p.id" />
                </el-select>
              </label>
              <label class="at-field at-field--sm">
                <span>优先级</span>
                <el-select v-model="form.priority" size="small" popper-class="at-pop">
                  <el-option v-for="p in PRIORITIES" :key="p.value" :label="p.label" :value="p.value" />
                </el-select>
              </label>
              <label class="at-field at-field--sm">
                <span>超时(毫秒)</span>
                <el-input-number v-model="form.timeout_ms" :min="100" :max="600000" :step="1000" size="small" controls-position="right" />
              </label>
              <label class="at-field at-field--xs">
                <span>启用</span>
                <el-switch v-model="form.is_active" size="small" />
              </label>
              <label class="at-field at-field--grow">
                <span>描述</span>
                <el-input v-model="form.description" size="small" placeholder="选填，这条用例是验证什么的" />
              </label>
            </div>

            <!-- 请求行 -->
            <div class="at-urlbar">
              <el-select v-model="form.method" class="at-urlbar__method" :class="'is-' + form.method.toLowerCase()" popper-class="at-pop at-method-pop" data-test="method">
                <el-option v-for="m in METHODS" :key="m" :label="m" :value="m">
                  <span :class="methodClass(m)">{{ m }}</span>
                </el-option>
              </el-select>
              <VarInput
                ref="urlInput"
                v-model="form.url"
                class="at-urlbar__url"
                placeholder="请求地址，如 https://api.test/v1/orders 或 /v1/orders（相对地址会拼上环境的基础地址）"
                data-test="url"
                @enter="send"
              />
              <el-select v-model="envId" class="at-urlbar__env" popper-class="at-pop" title="发送时使用的环境" data-test="env">
                <template #prefix><el-icon><SetUp /></el-icon></template>
                <el-option :label="defaultEnvLabel" :value="0" />
                <el-option v-for="env in envs" :key="env.id" :label="env.name + (env.is_default ? '（默认）' : '')" :value="env.id" />
                <template #footer>
                  <button type="button" class="at-link-btn" @click="goEnv">管理环境与变量</button>
                </template>
              </el-select>
              <el-dropdown split-button type="primary" class="at-urlbar__send" popper-class="at-pop" :disabled="sending" data-test="send" @click="send" @command="onSendCommand">
                <el-icon v-if="!sending"><Promotion /></el-icon>{{ sending ? '发送中' : '发送' }}
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="debug">
                      <div class="at-menu-item"><b>发送</b><span>只调试，不保存、不留执行记录（Ctrl+Enter）</span></div>
                    </el-dropdown-item>
                    <el-dropdown-item command="run">
                      <div class="at-menu-item"><b>运行并记录</b><span>先保存，再按所选环境正式执行一次，记入执行记录</span></div>
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
              <el-button class="at-urlbar__save" :loading="saving" data-test="save" @click="save">
                保存<i v-if="dirty" class="at-dot at-dot--dirty" title="有未保存的改动"></i>
              </el-button>
            </div>

            <!-- 请求标签页 -->
            <div class="at-tabs at-tabs--req">
              <button
                v-for="tab in reqTabs"
                :key="tab.name"
                type="button"
                class="at-tab"
                :class="{ 'is-active': activeTab === tab.name }"
                :data-tab="tab.name"
                @click="activeTab = tab.name"
              >
                {{ tab.label }}<span v-if="tab.badge" class="at-tab__badge">{{ tab.badge }}</span>
              </button>
            </div>

            <div class="at-req__pane">
              <KvTable v-show="activeTab === 'params'" v-model="params" key-label="参数名" value-label="参数值" key-placeholder="参数名" show-desc />
              <KvTable v-show="activeTab === 'headers'" v-model="headers" key-label="请求头" value-label="值" key-placeholder="如 Content-Type" show-desc />

              <!-- 请求体 -->
              <div v-show="activeTab === 'body'" class="at-body">
                <div class="at-body__bar">
                  <div class="at-seg at-seg--sm">
                    <button v-for="m in BODY_MODES" :key="m.value" type="button" :class="{ 'is-active': bodyMode === m.value }" :data-body="m.value" @click="setBodyMode(m.value)">
                      {{ m.label }}
                    </button>
                  </div>
                  <select v-if="bodyMode === 'raw'" v-model="rawType" class="at-select at-select--boxed">
                    <option value="text">Text</option>
                    <option value="xml">XML</option>
                    <option value="html">HTML</option>
                  </select>
                  <template v-if="bodyMode === 'json'">
                    <button type="button" class="at-link-btn" data-test="format-json" @click="formatJson"><el-icon><MagicStick /></el-icon>格式化</button>
                    <span v-if="jsonState.empty" class="at-body__note">写 JSON；数字型变量不用加引号，如 <code v-pre>{"id": {{id}}}</code></span>
                    <span v-else-if="jsonState.ok" class="at-body__ok"><el-icon><CircleCheckFilled /></el-icon>JSON 合法{{ jsonState.hasBareVars ? '（含变量）' : '' }}</span>
                    <span v-else class="at-body__err" data-test="json-error">
                      <el-icon><WarningFilled /></el-icon>JSON 语法错误{{ jsonState.line ? `（第 ${jsonState.line} 行附近）` : '' }}：{{ jsonState.error }}
                    </span>
                  </template>
                  <span v-else-if="bodyMode === 'form-data'" class="at-body__note">按 multipart/form-data 发送（暂不支持文件）</span>
                  <span v-else-if="bodyMode === 'urlencoded'" class="at-body__note">按 application/x-www-form-urlencoded 发送</span>
                  <span v-else-if="bodyMode === 'raw'" class="at-body__note">按文本原样发送，可以用 <code v-pre>{{变量}}</code></span>
                </div>
                <div v-if="bodyMode === 'none'" class="at-hint at-hint--center">这个请求不带请求体</div>
                <KvTable v-else-if="bodyMode === 'form-data' || bodyMode === 'urlencoded'" v-model="formRows" key-label="字段名" value-label="值" key-placeholder="字段名" />
                <div v-else class="at-editor" :class="{ 'has-error': bodyMode === 'json' && !jsonState.ok && !jsonState.empty }">
                  <div ref="gutter" class="at-editor__gutter at-mono">
                    <span v-for="n in lineCount" :key="n" :class="{ 'is-err': bodyMode === 'json' && jsonState.line === n }">{{ n }}</span>
                  </div>
                  <textarea
                    v-model="bodyText"
                    class="at-editor__area at-mono"
                    wrap="off"
                    spellcheck="false"
                    data-test="body-text"
                    :placeholder="bodyMode === 'json' ? '{\n  &quot;key&quot;: &quot;value&quot;\n}' : '请求体原文'"
                    @scroll="onEditorScroll"
                    @keydown.tab.prevent="insertTab"
                  ></textarea>
                </div>
              </div>

              <!-- 认证 -->
              <div v-show="activeTab === 'auth'" class="at-auth">
                <div class="at-seg at-seg--sm">
                  <button v-for="t in AUTH_TYPES" :key="t.value" type="button" :class="{ 'is-active': auth.type === t.value }" :data-auth="t.value" @click="auth.type = t.value">
                    {{ t.label }}
                  </button>
                </div>
                <div v-if="auth.type === 'none'" class="at-hint">不附加认证信息。也可以直接在「请求头」里自己写。</div>
                <div v-else-if="auth.type === 'bearer'" class="at-auth__form">
                  <label class="at-field at-field--row"><span>Token</span>
                    <el-input v-model="auth.token" class="at-mono-input" placeholder="可用 {{token}} 引用变量" data-test="auth-token" />
                  </label>
                  <p class="at-hint">发送时自动加请求头 <code>Authorization: Bearer &lt;Token&gt;</code></p>
                </div>
                <div v-else-if="auth.type === 'basic'" class="at-auth__form">
                  <label class="at-field at-field--row"><span>用户名</span><el-input v-model="auth.username" class="at-mono-input" placeholder="用户名" /></label>
                  <label class="at-field at-field--row"><span>密码</span><el-input v-model="auth.password" class="at-mono-input" type="password" show-password placeholder="密码" autocomplete="new-password" /></label>
                  <p class="at-hint">发送时自动加请求头 <code>Authorization: Basic …</code></p>
                </div>
                <div v-else class="at-auth__form">
                  <label class="at-field at-field--row"><span>请求头名</span><el-input v-model="auth.key" class="at-mono-input" placeholder="如 X-Api-Key" /></label>
                  <label class="at-field at-field--row"><span>值</span><el-input v-model="auth.value" class="at-mono-input" placeholder="可用 {{变量}}" /></label>
                </div>
              </div>

              <AssertionEditor v-show="activeTab === 'assertions'" v-model="assertions" />
              <ExtractorEditor v-show="activeTab === 'extractors'" v-model="extractors" />

              <div v-show="activeTab === 'vars'">
                <p class="at-hint at-hint--top">调试变量只在这个页面「发送 / 运行并记录」时临时生效，优先级高于环境变量，不随用例保存。</p>
                <KvTable v-model="debugVars" key-label="变量名" value-label="值" key-placeholder="变量名" value-placeholder="值" />
              </div>
            </div>
          </div>

          <!-- 拖动条 -->
          <div class="at-splitter" title="拖动调整高度，双击还原" @mousedown="startDrag" @dblclick="resetRatio"><i></i></div>

          <!-- ---------- 响应区 ---------- -->
          <div class="at-panel at-split__resp">
            <ResponseView :result="result" :loading="sending" :elapsed-ms="elapsed">
              <template #empty>
                <div class="at-empty at-empty--inline">
                  <div class="at-empty__art at-empty__art--sm"><el-icon><Promotion /></el-icon></div>
                  <p class="at-empty__title">还没有发送过</p>
                  <p class="at-empty__desc">填好地址后点「发送」，这里会显示状态码、耗时、响应体，以及每条断言的结果和提取到的变量。</p>
                  <el-button type="primary" plain size="small" :icon="Promotion" @click="send">发送请求</el-button>
                </div>
              </template>
            </ResponseView>
            <div v-if="resultNote && !sending" class="at-resp__note">{{ resultNote }}</div>
          </div>
        </div>
      </template>
    </section>

    <!-- curl 导入 -->
    <el-dialog v-model="curlVisible" title="从 curl 导入" width="640px" class="at-pop at-dialog" append-to-body>
      <p class="at-hint at-hint--top">
        粘贴一条 curl 命令（浏览器开发者工具里右键请求 → 复制为 cURL）。解析结果会填进{{ hasDraft ? '当前' : '一条新' }}用例，检查后再保存。
      </p>
      <el-input
        v-model="curlText"
        type="textarea"
        :rows="10"
        class="at-mono-input"
        data-test="curl-text"
        placeholder="curl 'https://api.test/v1/pay?id=9' -H 'Content-Type: application/json' -d '{&quot;amt&quot;: 1}'"
      />
      <template #footer>
        <el-button @click="curlVisible = false">取消</el-button>
        <el-button type="primary" :loading="curlLoading" data-test="curl-confirm" @click="importCurl">解析并填入</el-button>
      </template>
    </el-dialog>

    <HistoryDrawer ref="historyDrawer" />
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  ArrowDown, CaretRight, CircleCheckFilled, Clock, Connection, CopyDocument, Delete, Download, Expand, Fold,
  FolderOpened, MagicStick, MoreFilled, Plus, Promotion, Refresh, Search, Setting, SetUp, WarningFilled,
} from '@element-plus/icons-vue';
import { apiTestApi } from '@/utils/apiTestApi';
import KvTable from './components/KvTable.vue';
import VarInput from './components/VarInput.vue';
import AssertionEditor from './components/AssertionEditor.vue';
import ExtractorEditor from './components/ExtractorEditor.vue';
import ResponseView from './components/ResponseView.vue';
import HistoryDrawer from './components/HistoryDrawer.vue';
import {
  METHODS, PRIORITIES, errorMessage, formatTime, kvCount, loadPref, methodClass, objectToRows, parseLooseJson,
  priorityText, rowsToObject, savePref, statusText, statusTone,
} from './common';
import './apitest.css';

const route = useRoute();
const router = useRouter();

const BODY_MODES = [
  { value: 'none', label: '无' },
  { value: 'json', label: 'JSON' },
  { value: 'form-data', label: '表单 form-data' },
  { value: 'urlencoded', label: '表单 urlencoded' },
  { value: 'raw', label: '原文' },
];
const AUTH_TYPES = [
  { value: 'none', label: '不使用' },
  { value: 'bearer', label: 'Bearer Token' },
  { value: 'basic', label: 'Basic' },
  { value: 'header', label: '自定义请求头' },
];
const emptyAuth = () => ({ type: 'none', token: '', username: '', password: '', key: '', value: '' });

// ------------------------------------------------------------------ 左栏
const projects = ref([]);
const cases = ref([]);
const listLoading = ref(false);
const filterProject = ref(loadPref('ws.project', ''));
const search = ref('');
const sideCollapsed = ref(loadPref('ws.sideCollapsed', false));
const collapsedGroups = reactive({});

const projectName = (id) => projects.value.find((p) => p.id === id)?.name || '';
const grouped = computed(() => filterProject.value === '');

const filteredCases = computed(() => {
  const q = search.value.trim().toLowerCase();
  return cases.value.filter((item) => {
    if (filterProject.value !== '' && item.project !== filterProject.value) return false;
    if (!q) return true;
    return (item.name || '').toLowerCase().includes(q) || (item.url || '').toLowerCase().includes(q);
  });
});
const groups = computed(() => {
  if (!grouped.value) return [{ key: 'flat', name: '', cases: filteredCases.value }];
  const map = new Map();
  filteredCases.value.forEach((item) => {
    const key = item.project ?? 0;
    if (!map.has(key)) map.set(key, { key, name: item.project_name || projectName(item.project) || '未归属项目', cases: [] });
    map.get(key).cases.push(item);
  });
  return [...map.values()];
});
const visibleCount = computed(() => filteredCases.value.length);
const toggleGroup = (key) => {
  collapsedGroups[key] = !collapsedGroups[key];
};
const toggleSide = () => {
  sideCollapsed.value = !sideCollapsed.value;
  savePref('ws.sideCollapsed', sideCollapsed.value);
};
const onFilterProject = () => savePref('ws.project', filterProject.value);
const clearFilter = () => {
  search.value = '';
  filterProject.value = '';
  onFilterProject();
};

const fetchProjects = async () => {
  try {
    projects.value = await apiTestApi.getProjects();
    if (filterProject.value !== '' && !projects.value.some((p) => p.id === filterProject.value)) clearFilter();
  } catch (error) {
    ElMessage.error(errorMessage(error, '获取项目列表失败'));
  }
};
const fetchCases = async () => {
  listLoading.value = true;
  try {
    cases.value = await apiTestApi.getApiCases();
  } catch (error) {
    ElMessage.error(errorMessage(error, '获取用例列表失败'));
  } finally {
    listLoading.value = false;
  }
};

// ------------------------------------------------------------------ 当前用例
const hasDraft = ref(false);
const currentId = ref(null);
const caseLoading = ref(false);
const saving = ref(false);
const metaOpen = ref(false);
const activeTab = ref('params');
const nameInput = ref(null);
const urlInput = ref(null);

const form = reactive({
  name: '', project: '', description: '', priority: 'medium', is_active: true, timeout_ms: 30000,
  method: 'GET', url: '',
});
const params = ref([]);
const headers = ref([]);
const bodyMode = ref('none');
const rawType = ref('text');
const bodyText = ref('');
const formRows = ref([]);
const auth = ref(emptyAuth());
const assertions = ref([]);
const extractors = ref([]);
const debugVars = ref([]);

const currentCase = computed(() => cases.value.find((c) => c.id === currentId.value) || null);

// 后端的请求体 -> 界面上的类型和内容
const applyBody = (type, body) => {
  const isEmpty = body === null || body === undefined || body === ''
    || (typeof body === 'object' && !Array.isArray(body) && Object.keys(body).length === 0);
  const asText = (v) => (typeof v === 'string' ? v : JSON.stringify(v, null, 2));
  formRows.value = [];
  bodyText.value = '';
  rawType.value = 'text';
  if (type === 'none') {
    bodyMode.value = 'none';
  } else if (type === 'form-data' || type === 'urlencoded') {
    if (isEmpty || (body && typeof body === 'object' && !Array.isArray(body))) {
      bodyMode.value = type;
      formRows.value = objectToRows(body);
    } else {
      bodyMode.value = 'raw';
      bodyText.value = String(body);
    }
  } else if (type === 'xml' || type === 'html' || type === 'text') {
    bodyMode.value = 'raw';
    rawType.value = type;
    bodyText.value = isEmpty ? '' : asText(body);
  } else {
    // json（也是老数据的默认值）
    bodyMode.value = isEmpty ? 'none' : 'json';
    bodyText.value = isEmpty ? '' : asText(body);
  }
};

// 界面上的请求体 -> 后端的 { body_type, body }
const collectBody = () => {
  if (bodyMode.value === 'form-data' || bodyMode.value === 'urlencoded') {
    return { body_type: bodyMode.value, body: rowsToObject(formRows.value) };
  }
  const text = bodyText.value;
  if (bodyMode.value === 'json') {
    if (!text.trim()) return { body_type: 'none', body: {} };
    // 能解析就存成对象；带不加引号的变量时解析不了，按文本存，执行时替换完变量再解析
    try {
      return { body_type: 'json', body: JSON.parse(text) };
    } catch {
      return { body_type: 'json', body: text };
    }
  }
  if (bodyMode.value === 'raw') {
    if (!text.trim()) return { body_type: 'none', body: {} };
    return { body_type: rawType.value, body: text };
  }
  return { body_type: 'none', body: {} };
};

const collectAuth = () => {
  const a = auth.value;
  if (a.type === 'bearer') return { type: 'bearer', token: a.token };
  if (a.type === 'basic') return { type: 'basic', username: a.username, password: a.password };
  if (a.type === 'header') return { type: 'header', key: a.key, value: a.value };
  return { type: 'none' };
};
const collectAssertions = () =>
  assertions.value.map((a) => {
    const item = { type: a.type, expr: a.expr || '', op: a.op, expected: a.expected ?? '' };
    if (a.enabled === false) item.enabled = false;
    return item;
  });
const collectExtractors = () =>
  extractors.value
    .filter((e) => (e.name || '').trim() || (e.expr || '').trim())
    .map((e) => {
      const item = { name: (e.name || '').trim(), from: e.from, expr: e.expr || '' };
      if (e.enabled === false) item.enabled = false;
      return item;
    });

// 请求相关的字段（保存和发送共用）
const collectRequest = () => ({
  url: (form.url || '').trim(),
  method: form.method,
  headers: rowsToObject(headers.value),
  params: rowsToObject(params.value),
  ...collectBody(),
  auth: collectAuth(),
  assertions: collectAssertions(),
  extractors: collectExtractors(),
  timeout_ms: form.timeout_ms || 30000,
});
const collectSave = () => ({
  name: (form.name || '').trim(),
  project: form.project || null,
  description: form.description || '',
  priority: form.priority,
  is_active: form.is_active,
  ...collectRequest(),
});

// 未保存改动：拿「要保存的内容」和上次保存/打开时的比
const savedSnapshot = ref('');
const snapshot = () => JSON.stringify(collectSave());
const dirty = computed(() => hasDraft.value && snapshot() !== savedSnapshot.value);
const markClean = () => {
  savedSnapshot.value = snapshot();
};

const fill = (data) => {
  form.name = data.name || '';
  form.project = data.project ?? '';
  form.description = data.description || '';
  form.priority = data.priority || 'medium';
  form.is_active = data.is_active !== false;
  form.timeout_ms = data.timeout_ms || 30000;
  form.method = (data.method || 'GET').toUpperCase();
  form.url = data.url || '';
  headers.value = objectToRows(data.headers);
  params.value = objectToRows(data.params);
  applyBody(data.body_type || 'json', data.body);
  auth.value = { ...emptyAuth(), ...(data.auth || {}) };
  if (!auth.value.type) auth.value.type = 'none';
  const savedAssertions = (data.assertions || []).map((a) => ({
    type: a.type,
    expr: a.expr || '',
    op: a.op || 'eq',
    expected: a.expected === null || a.expected === undefined ? '' : typeof a.expected === 'object' ? JSON.stringify(a.expected) : String(a.expected),
    enabled: a.enabled !== false,
  }));
  // 老用例没有断言列表，执行时按「期望状态码」判定；这里显示出来，保存后就成了正式的断言
  assertions.value = savedAssertions.length || !data.id
    ? savedAssertions
    : [{ type: 'status', expr: '', op: 'eq', expected: String(data.expected_status_code || 200), enabled: true }];
  extractors.value = (data.extractors || []).map((e) => ({
    name: e.name || '', from: e.from || 'json', expr: e.expr || '', enabled: e.enabled !== false,
  }));
};

// 有未保存改动时，离开前问一句。返回 false 表示用户不走了
const confirmLeave = async () => {
  if (!dirty.value) return true;
  try {
    await ElMessageBox.confirm(`「${form.name || '未命名用例'}」有未保存的改动。`, '离开前要保存吗', {
      confirmButtonText: '保存',
      cancelButtonText: '不保存',
      distinguishCancelAndClose: true,
      type: 'warning',
      customClass: 'at-pop',
    });
    return await save();
  } catch (action) {
    return action === 'cancel';
  }
};

const setQuery = (id) => {
  const current = route.query.case ? Number(route.query.case) : null;
  if (current === (id || null)) return;
  router.replace({ path: route.path, query: id ? { case: id } : {} });
};

const resetResult = () => {
  result.value = null;
  resultNote.value = '';
};

const newCase = async () => {
  if (!(await confirmLeave())) return;
  currentId.value = null;
  fill({
    project: filterProject.value !== '' ? filterProject.value : projects.value.length === 1 ? projects.value[0].id : '',
    method: 'GET',
    body_type: 'none',
    assertions: [{ type: 'status', expr: '', op: 'eq', expected: '200', enabled: true }],
  });
  debugVars.value = [];
  hasDraft.value = true;
  activeTab.value = 'params';
  metaOpen.value = !form.project;
  resetResult();
  markClean();
  setQuery(null);
  fetchEnvs(form.project);
  nextTick(() => urlInput.value?.focus());
};

const loadCase = async (id) => {
  caseLoading.value = true;
  hasDraft.value = true;
  try {
    const data = await apiTestApi.getApiCase(id);
    currentId.value = data.id;
    fill(data);
    debugVars.value = [];
    metaOpen.value = false;
    resetResult();
    markClean();
    fetchEnvs(data.project);
    if (kvCount(params.value)) activeTab.value = 'params';
    else if (bodyMode.value !== 'none') activeTab.value = 'body';
    else activeTab.value = 'params';
    return true;
  } catch (error) {
    ElMessage.error(errorMessage(error, '打开用例失败'));
    if (!currentId.value) hasDraft.value = false;
    return false;
  } finally {
    caseLoading.value = false;
  }
};

const openCase = async (id) => {
  if (id === currentId.value) return;
  if (!(await confirmLeave())) return;
  if (await loadCase(id)) setQuery(id);
};

const closeDraft = () => {
  hasDraft.value = false;
  currentId.value = null;
  resetResult();
  setQuery(null);
};

// ------------------------------------------------------------------ 环境
const envs = ref([]);
const envId = ref(0);
const defaultEnvLabel = computed(() => (envs.value.some((e) => e.is_default) ? '项目默认环境' : '不使用环境'));
const fetchEnvs = async (projectId) => {
  envs.value = [];
  if (projectId) {
    try {
      envs.value = await apiTestApi.getEnvironments({ project: projectId });
    } catch (error) {
      console.error('获取环境列表失败:', error);
    }
  }
  if (!envs.value.some((e) => e.id === envId.value)) envId.value = 0;
};
const onProjectChange = (projectId) => {
  envId.value = 0;
  fetchEnvs(projectId);
};
const goEnv = () => router.push({ name: 'ApiEnvManage', query: form.project ? { project: form.project } : {} });

// ------------------------------------------------------------------ 请求体编辑器
const gutter = ref(null);
const lineCount = computed(() => Math.max(1, bodyText.value.split('\n').length));
const jsonState = computed(() => {
  const text = bodyText.value;
  if (!text.trim()) return { empty: true, ok: true };
  return { empty: false, ...parseLooseJson(text) };
});
const onEditorScroll = (event) => {
  if (gutter.value) gutter.value.scrollTop = event.target.scrollTop;
};
const insertTab = (event) => {
  const el = event.target;
  const { selectionStart, selectionEnd } = el;
  bodyText.value = `${bodyText.value.slice(0, selectionStart)}  ${bodyText.value.slice(selectionEnd)}`;
  nextTick(() => el.setSelectionRange(selectionStart + 2, selectionStart + 2));
};
const formatJson = () => {
  const state = jsonState.value;
  if (state.empty) return;
  if (!state.ok) {
    ElMessage.warning('JSON 有语法错误，改好后再格式化');
    return;
  }
  bodyText.value = state.format();
};
const setBodyMode = (mode) => {
  bodyMode.value = mode;
  if (mode === 'json' && !bodyText.value.trim()) bodyText.value = '{\n  \n}';
  // 切到 JSON 时，没有 Content-Type 就补一个，省得每次手填
  if (mode === 'json' && !headers.value.some((h) => (h.key || '').toLowerCase() === 'content-type')) {
    headers.value = [...headers.value, { key: 'Content-Type', value: 'application/json', description: '', enabled: true }];
  }
};

// ------------------------------------------------------------------ 标签页
const bodyBadge = computed(() => {
  if (bodyMode.value === 'none') return '';
  if (bodyMode.value === 'form-data' || bodyMode.value === 'urlencoded') return kvCount(formRows.value) || '';
  return bodyText.value.trim() ? (bodyMode.value === 'json' ? 'JSON' : rawType.value.toUpperCase()) : '';
});
const reqTabs = computed(() => [
  { name: 'params', label: '参数', badge: kvCount(params.value) },
  { name: 'headers', label: '请求头', badge: kvCount(headers.value) },
  { name: 'body', label: '请求体', badge: bodyBadge.value },
  { name: 'auth', label: '认证', badge: auth.value.type === 'none' ? '' : AUTH_TYPES.find((t) => t.value === auth.value.type)?.label.split(' ')[0] },
  { name: 'assertions', label: '断言', badge: assertions.value.filter((a) => a.enabled !== false).length },
  { name: 'extractors', label: '提取变量', badge: extractors.value.filter((e) => e.enabled !== false && e.name).length },
  { name: 'vars', label: '调试变量', badge: kvCount(debugVars.value) },
]);

// ------------------------------------------------------------------ 发送 / 运行 / 保存
const result = ref(null);
const resultNote = ref('');
const sending = ref(false);
const elapsed = ref(0);
let timer = null;
const startTimer = () => {
  const begin = Date.now();
  elapsed.value = 0;
  timer = setInterval(() => {
    elapsed.value = Date.now() - begin;
  }, 100);
};
const stopTimer = () => {
  clearInterval(timer);
  timer = null;
};

const checkBeforeSend = () => {
  if (!(form.url || '').trim()) {
    ElMessage.error('先填请求地址');
    urlInput.value?.focus();
    return false;
  }
  if (bodyMode.value === 'json' && !jsonState.value.ok) {
    ElMessage.error('请求体的 JSON 有语法错误');
    activeTab.value = 'body';
    return false;
  }
  return true;
};

// 发送：由后端代发（不受浏览器跨域限制），不保存用例、不留执行记录
const send = async () => {
  if (sending.value || !hasDraft.value || !checkBeforeSend()) return;
  sending.value = true;
  resultNote.value = '';
  startTimer();
  try {
    const payload = { ...collectRequest(), variables: rowsToObject(debugVars.value) };
    if (form.project) payload.project = form.project;
    if (envId.value) payload.env_id = envId.value;
    const data = await apiTestApi.debugApiCase(payload);
    result.value = data;
    resultNote.value = `调试发送，未记入执行记录${data.env?.name ? ` · 环境：${data.env.name}` : ' · 未使用环境'}`;
  } catch (error) {
    ElMessage.error(errorMessage(error, '请求发送失败'));
  } finally {
    stopTimer();
    sending.value = false;
  }
};

const save = async () => {
  if (!hasDraft.value) return false;
  if (!form.name.trim()) {
    ElMessage.error('给用例起个名字再保存');
    nameInput.value?.focus();
    return false;
  }
  if (!(form.url || '').trim()) {
    ElMessage.error('先填请求地址');
    urlInput.value?.focus();
    return false;
  }
  if (!form.project) {
    ElMessage.error('选一下所属项目');
    metaOpen.value = true;
    return false;
  }
  saving.value = true;
  try {
    const payload = collectSave();
    if (currentId.value) {
      await apiTestApi.updateApiCase(currentId.value, payload);
    } else {
      const created = await apiTestApi.createApiCase(payload);
      currentId.value = created.id;
      setQuery(created.id);
    }
    markClean();
    ElMessage.success('已保存');
    fetchCases();
    return true;
  } catch (error) {
    ElMessage.error(errorMessage(error, '保存失败'));
    return false;
  } finally {
    saving.value = false;
  }
};

// 运行并记录：先保存，再按所选环境正式执行一次，写入执行记录
const runRecorded = async () => {
  if (sending.value || !checkBeforeSend()) return;
  if ((dirty.value || !currentId.value) && !(await save())) return;
  sending.value = true;
  resultNote.value = '';
  startTimer();
  try {
    const payload = {};
    if (envId.value) payload.env_id = envId.value;
    const variables = rowsToObject(debugVars.value);
    if (Object.keys(variables).length) payload.variables = variables;
    const run = await apiTestApi.runApiCase(currentId.value, payload);
    result.value = run.steps?.[0] || { status: 'error', error: run.error || '没有执行', duration_ms: run.duration_ms };
    resultNote.value = `已记入执行记录 #${run.id} · 环境：${run.env_name || '未使用'}`;
    fetchCases();
  } catch (error) {
    ElMessage.error(errorMessage(error, '执行失败'));
  } finally {
    stopTimer();
    sending.value = false;
  }
};
const onSendCommand = (cmd) => (cmd === 'run' ? runRecorded() : send());

// ------------------------------------------------------------------ 左栏行上的操作
const historyDrawer = ref(null);
const showHistory = (item) => historyDrawer.value?.open({ kind: 'case', id: item.id, name: item.name });

const copyCase = async (item) => {
  try {
    const src = await apiTestApi.getApiCase(item.id);
    const created = await apiTestApi.createApiCase({
      name: `${src.name} 副本`.slice(0, 200),
      project: src.project,
      description: src.description || '',
      priority: src.priority,
      is_active: src.is_active,
      url: src.url,
      method: src.method,
      headers: src.headers || {},
      params: src.params || {},
      body: src.body,
      body_type: src.body_type,
      auth: src.auth || { type: 'none' },
      assertions: src.assertions || [],
      extractors: src.extractors || [],
      timeout_ms: src.timeout_ms || 30000,
    });
    ElMessage.success('已复制');
    await fetchCases();
    openCase(created.id);
  } catch (error) {
    ElMessage.error(errorMessage(error, '复制失败'));
  }
};

const deleteCase = async (item) => {
  try {
    await ElMessageBox.confirm(`确认删除用例「${item.name}」吗？引用它的场景步骤会失效，历史执行记录保留。`, '删除用例', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
      confirmButtonClass: 'el-button--danger',
      customClass: 'at-pop',
    });
  } catch {
    return;
  }
  try {
    await apiTestApi.deleteApiCase(item.id);
    ElMessage.success('已删除');
    if (item.id === currentId.value) closeDraft();
    fetchCases();
  } catch (error) {
    ElMessage.error(errorMessage(error, '删除失败'));
  }
};

const onCaseCommand = (cmd, item) => {
  if (cmd === 'copy') copyCase(item);
  else if (cmd === 'history') showHistory(item);
  else if (cmd === 'delete') deleteCase(item);
};

// ------------------------------------------------------------------ curl 导入
const curlVisible = ref(false);
const curlText = ref('');
const curlLoading = ref(false);
const openCurl = () => {
  curlText.value = '';
  curlVisible.value = true;
};
// 后端解析，结果填到页面上（不直接保存）
const importCurl = async () => {
  if (!curlText.value.trim()) {
    ElMessage.error('请粘贴 curl 命令');
    return;
  }
  curlLoading.value = true;
  try {
    const parsed = await apiTestApi.importCurl(curlText.value);
    if (!hasDraft.value) await newCase();
    form.url = parsed.url || '';
    form.method = (parsed.method || 'GET').toUpperCase();
    if (!form.name) form.name = parsed.name || '';
    headers.value = objectToRows(parsed.headers);
    params.value = objectToRows(parsed.params);
    applyBody(parsed.body_type, parsed.body);
    auth.value = { ...emptyAuth(), ...(parsed.auth || {}) };
    curlVisible.value = false;
    activeTab.value = bodyMode.value === 'none' ? (kvCount(params.value) ? 'params' : 'headers') : 'body';
    if (parsed.warnings?.length) ElMessage.warning(parsed.warnings.join('；'));
    else ElMessage.success('已填入，检查后保存');
  } catch (error) {
    ElMessage.error(errorMessage(error, '解析失败'));
  } finally {
    curlLoading.value = false;
  }
};

// ------------------------------------------------------------------ 请求区 / 响应区 高度拖动
const splitBox = ref(null);
const DEFAULT_RATIO = 0.5;
const ratio = ref(Math.min(0.8, Math.max(0.2, loadPref('ws.ratio', DEFAULT_RATIO))));
const startDrag = (event) => {
  event.preventDefault();
  const box = splitBox.value.getBoundingClientRect();
  const onMove = (e) => {
    const next = (e.clientY - box.top) / box.height;
    ratio.value = Math.min(0.8, Math.max(0.2, next));
  };
  const onUp = () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    document.body.classList.remove('at-dragging');
    savePref('ws.ratio', ratio.value);
  };
  document.body.classList.add('at-dragging');
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
};
const resetRatio = () => {
  ratio.value = DEFAULT_RATIO;
  savePref('ws.ratio', ratio.value);
};

// ------------------------------------------------------------------ 快捷键、路由
const onKeydown = (event) => {
  if (!hasDraft.value || !(event.ctrlKey || event.metaKey)) return;
  if (event.key === 'Enter') {
    event.preventDefault();
    send();
  } else if (event.key === 's' || event.key === 'S') {
    event.preventDefault();
    save();
  }
};
const onBeforeUnload = (event) => {
  if (dirty.value) {
    event.preventDefault();
    event.returnValue = '';
  }
};

// 地址栏 ?case=ID 变了（比如从场景页点「打开用例」过来）
watch(
  () => route.query.case,
  async (value) => {
    const id = value ? Number(value) : null;
    if (!id || id === currentId.value) return;
    if (!(await confirmLeave())) {
      setQuery(currentId.value);
      return;
    }
    loadCase(id);
  }
);

onBeforeRouteLeave(async () => (await confirmLeave()) || false);

onMounted(async () => {
  document.addEventListener('keydown', onKeydown);
  window.addEventListener('beforeunload', onBeforeUnload);
  fetchCases();
  await fetchProjects();
  if (route.query.case) loadCase(Number(route.query.case));
});
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown);
  window.removeEventListener('beforeunload', onBeforeUnload);
  stopTimer();
});
</script>
