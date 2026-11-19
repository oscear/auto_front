<template>
  <div class="scenario-editor">
    <!-- 顶部工具栏 -->
    <header class="top-toolbar">
      <div class="toolbar-left">
        <el-button text @click="handleBack" class="back-btn">
          <el-icon><ArrowLeft /></el-icon>
          <span>返回</span>
        </el-button>
        <div class="title-divider"></div>
        <div class="page-title-wrap">
          <span class="page-title">{{ scenarioId ? '编排接口场景' : '新增接口场景' }}</span>
          <span class="page-subtitle">多条接口用例按顺序执行，前一步提取的变量后一步可以直接用</span>
        </div>
      </div>
      <div class="toolbar-right">
        <el-button @click="handleBack" class="ghost-btn">取消</el-button>
        <el-button @click="handleSave(false)" :loading="saveLoading" class="ghost-btn">
          <el-icon><Check /></el-icon>
          <span>保存</span>
        </el-button>
        <el-button type="primary" @click="handleSave(true)" :loading="saveLoading" class="primary-btn">
          <el-icon><VideoPlay /></el-icon>
          <span>保存并运行</span>
        </el-button>
      </div>
    </header>

    <!-- 基本信息 -->
    <section class="card">
      <div class="card-header">
        <span class="section-dot"></span>
        <span class="section-title">基本信息</span>
      </div>
      <el-form :model="form" inline class="info-form">
        <el-form-item label="场景名称">
          <el-input v-model="form.name" placeholder="如 登录后下单" style="width: 240px" />
        </el-form-item>
        <el-form-item label="所属项目">
          <el-select v-model="form.project" placeholder="选择项目" style="width: 180px" @change="onProjectChange">
            <el-option v-for="project in projects" :key="project.id" :label="project.name" :value="project.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="执行环境">
          <el-select v-model="form.env" placeholder="项目默认环境" clearable style="width: 200px" :disabled="!form.project">
            <el-option v-for="env in envs" :key="env.id" :label="env.name + (env.is_default ? '（默认）' : '')" :value="env.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="失败即停">
          <el-switch v-model="form.stop_on_fail" />
          <span class="inline-tip">{{ form.stop_on_fail ? '某一步失败后，这一轮余下的步骤跳过' : '某一步失败后继续执行后面的步骤' }}</span>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" placeholder="选填" style="width: 360px" />
        </el-form-item>
      </el-form>
    </section>

    <!-- 步骤 -->
    <section class="card">
      <div class="card-header">
        <span class="section-dot"></span>
        <span class="section-title">步骤</span>
        <span class="count-badge">{{ enabledStepCount }}/{{ steps.length }}</span>
        <span class="header-spacer"></span>
        <el-button type="primary" plain size="small" :disabled="!form.project" @click="openCasePicker">
          <el-icon><Plus /></el-icon>
          添加用例
        </el-button>
      </div>

      <div v-if="steps.length" class="steps">
        <div class="step-row step-header">
          <div class="s-no">顺序</div>
          <div class="s-switch">启用</div>
          <div class="s-case">用例</div>
          <div class="s-name">步骤名称</div>
          <div class="s-ops">操作</div>
        </div>
        <div v-for="(step, index) in steps" :key="step.uid" class="step-block" :class="{ disabled: !step.enabled }">
          <div class="step-row">
            <div class="s-no">
              <span class="step-no">{{ index + 1 }}</span>
            </div>
            <div class="s-switch">
              <el-switch v-model="step.enabled" size="small" />
            </div>
            <div class="s-case">
              <el-select v-model="step.case_id" filterable placeholder="选择用例" size="small" style="width: 100%">
                <el-option
                  v-for="item in caseOptions(step.case_id)"
                  :key="item.id"
                  :label="`#${item.id} ${item.name}`"
                  :value="item.id"
                />
              </el-select>
              <div class="case-line">
                <template v-if="caseMap[step.case_id]">
                  <el-tag size="small" effect="plain" :type="methodTagType(caseMap[step.case_id].method)">
                    {{ caseMap[step.case_id].method }}
                  </el-tag>
                  <span class="case-url">{{ caseMap[step.case_id].url }}</span>
                  <el-link type="primary" :underline="false" class="case-edit-link" @click="editCase(step.case_id)">
                    编辑用例
                  </el-link>
                </template>
                <span v-else class="case-missing">用例不存在或已删除（#{{ step.case_id }}）</span>
              </div>
            </div>
            <div class="s-name">
              <el-input v-model="step.name" size="small" :placeholder="caseMap[step.case_id]?.name || '留空则用用例名称'" />
            </div>
            <div class="s-ops">
              <el-tooltip content="上移" placement="top">
                <el-button text size="small" :disabled="index === 0" @click="moveStep(index, -1)">
                  <el-icon><Top /></el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip content="下移" placement="top">
                <el-button text size="small" :disabled="index === steps.length - 1" @click="moveStep(index, 1)">
                  <el-icon><Bottom /></el-icon>
                </el-button>
              </el-tooltip>
              <el-button text size="small" :type="stepVarCount(step) ? 'primary' : ''" @click="step.expanded = !step.expanded">
                覆盖变量<template v-if="stepVarCount(step)">（{{ stepVarCount(step) }}）</template>
              </el-button>
              <el-tooltip content="复制这一步" placement="top">
                <el-button text size="small" @click="copyStep(index)">
                  <el-icon><CopyDocument /></el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip content="移除" placement="top">
                <el-button text size="small" class="danger" @click="removeStep(index)">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </el-tooltip>
            </div>
          </div>
          <div v-if="step.expanded" class="step-extra">
            <KvEditor
              v-model="step.variables"
              key-label="变量名"
              value-label="值"
              key-placeholder="如 keyword"
              value-placeholder="只在这一步生效的值，可用 {{变量}}"
              add-text="添加变量"
              empty-text="这一步没有覆盖变量"
              hint="优先级：数据集 > 前面步骤提取的变量 > 这里的覆盖变量 > 环境变量"
            />
          </div>
        </div>
      </div>
      <div v-else class="empty-block">
        <p>还没有步骤</p>
        <span>{{ form.project ? '点右上角「添加用例」，把接口用例按执行顺序加进来' : '先选择所属项目，再添加用例' }}</span>
      </div>
    </section>

    <!-- 数据集 -->
    <section class="card">
      <div class="card-header">
        <span class="section-dot"></span>
        <span class="section-title">数据集</span>
        <span class="count-badge">{{ datasetCount }}</span>
        <span class="header-tip">每组数据把全部步骤跑一轮；不填则只跑一轮</span>
        <span class="header-spacer"></span>
        <el-radio-group v-model="dsMode" size="small" @change="onDsModeChange">
          <el-radio-button value="table">表格</el-radio-button>
          <el-radio-button value="json">JSON</el-radio-button>
        </el-radio-group>
      </div>

      <template v-if="dsMode === 'table'">
        <div v-if="dsColumns.length" class="ds-table-wrap">
          <table class="ds-table">
            <thead>
              <tr>
                <th class="ds-no">#</th>
                <th v-for="(col, ci) in dsColumns" :key="ci">
                  <div class="ds-col-head">
                    <el-input v-model="dsColumns[ci]" size="small" placeholder="变量名" @change="renameColumn(ci, $event)" />
                    <el-button text size="small" class="danger" @click="removeColumn(ci)">
                      <el-icon><Close /></el-icon>
                    </el-button>
                  </div>
                </th>
                <th class="ds-act"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, ri) in dsRows" :key="ri">
                <td class="ds-no">{{ ri + 1 }}</td>
                <td v-for="(col, ci) in dsColumns" :key="ci">
                  <el-input v-model="row[ci]" size="small" placeholder="值" />
                </td>
                <td class="ds-act">
                  <el-button text size="small" class="danger" @click="dsRows.splice(ri, 1)">
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="empty-block small">
          <span>没有数据集。先加一个变量列（如 username），再加几行数据。</span>
        </div>
        <div class="ds-footer">
          <el-button text type="primary" @click="addColumn"><el-icon><Plus /></el-icon>添加变量列</el-button>
          <el-button text type="primary" :disabled="!dsColumns.length" @click="addRow"><el-icon><Plus /></el-icon>添加一组数据</el-button>
          <span class="header-tip">表格里的值都按文本保存；需要数字、布尔或对象时切到 JSON 模式</span>
        </div>
      </template>
      <template v-else>
        <el-input
          v-model="dsJson"
          type="textarea"
          :rows="10"
          class="ds-json"
          placeholder='[
  {"username": "tom", "expect_code": 0},
  {"username": "amy", "expect_code": 0}
]'
        />
        <div class="ds-footer">
          <span class="header-tip">写成数组，每一项是一组变量（变量名: 值）</span>
        </div>
      </template>
    </section>

    <!-- 选择用例 -->
    <el-dialog v-model="pickerVisible" title="添加用例" width="860px" top="6vh">
      <div class="picker-toolbar">
        <el-input v-model="pickerSearch" placeholder="搜索用例名称或地址" clearable style="width: 280px">
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <span class="header-tip">已选 {{ pickerSelection.length }} 条，按勾选顺序加到步骤末尾</span>
      </div>
      <el-table
        :data="pickerCases"
        height="420"
        size="small"
        empty-text="这个项目下还没有接口用例"
        @selection-change="onPickerSelectionChange"
      >
        <el-table-column type="selection" width="46" />
        <el-table-column label="ID" width="70">
          <template #default="scope">#{{ scope.row.id }}</template>
        </el-table-column>
        <el-table-column prop="name" label="用例名称" min-width="200" show-overflow-tooltip />
        <el-table-column label="方法" width="90">
          <template #default="scope">
            <el-tag size="small" effect="light" :type="methodTagType(scope.row.method)">{{ scope.row.method }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="url" label="接口地址" min-width="280" show-overflow-tooltip />
      </el-table>
      <template #footer>
        <el-button @click="pickerVisible = false">取消</el-button>
        <el-button type="primary" :disabled="!pickerSelection.length" @click="confirmPicker">
          添加 {{ pickerSelection.length || '' }} 条
        </el-button>
      </template>
    </el-dialog>

    <RunLauncher ref="launcher" />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import {
  ArrowLeft, Bottom, Check, Close, CopyDocument, Delete, Plus, Search, Top, VideoPlay,
} from '@element-plus/icons-vue';
import { apiTestApi } from '@/utils/apiTestApi';
import KvEditor from './components/KvEditor.vue';
import RunLauncher from './components/RunLauncher.vue';
import { errorMessage, inline, methodTagType, objectToRows, rowsToObject } from './common';

const route = useRoute();
const router = useRouter();
const launcher = ref(null);

const scenarioId = ref(route.params.id ? Number(route.params.id) : null);
const saveLoading = ref(false);
const projects = ref([]);
const envs = ref([]);
const allCases = ref([]);

const form = ref({
  name: '',
  project: route.query.project ? Number(route.query.project) : '',
  description: '',
  env: null,
  stop_on_fail: true,
});

// ---------------------------------------------------------------- 步骤
let uidSeed = 0;
const steps = ref([]);

const caseMap = computed(() => {
  const map = {};
  allCases.value.forEach((item) => {
    map[item.id] = item;
  });
  return map;
});
// 本项目的用例（没归属项目的老用例也可选）
const projectCases = computed(() =>
  allCases.value.filter((item) => !item.project || item.project === form.value.project)
);
// 下拉里除了本项目用例，还要包含这一步当前选中的那条（哪怕它属于别的项目）
const caseOptions = (currentId) => {
  const list = projectCases.value;
  const current = caseMap.value[currentId];
  return current && !list.includes(current) ? [current, ...list] : list;
};

const enabledStepCount = computed(() => steps.value.filter((s) => s.enabled).length);
const stepVarCount = (step) => step.variables.filter((v) => v.enabled !== false && (v.key || '').trim()).length;

const makeStep = (raw = {}) => {
  const overrides = raw.overrides && typeof raw.overrides === 'object' ? raw.overrides : {};
  const { variables, ...rest } = overrides;
  uidSeed += 1;
  return {
    uid: uidSeed,
    case_id: raw.case_id ?? null,
    name: raw.name || '',
    enabled: raw.enabled !== false,
    variables: objectToRows(variables),
    extra: rest, // 页面上不编辑的其它覆盖项，原样保留
    expanded: false,
  };
};

const moveStep = (index, delta) => {
  const target = index + delta;
  if (target < 0 || target >= steps.value.length) return;
  const list = steps.value;
  [list[index], list[target]] = [list[target], list[index]];
};
const removeStep = (index) => steps.value.splice(index, 1);
const copyStep = (index) => {
  const src = steps.value[index];
  const copy = makeStep({
    case_id: src.case_id,
    name: src.name,
    enabled: src.enabled,
    overrides: { ...src.extra, variables: rowsToObject(src.variables) },
  });
  steps.value.splice(index + 1, 0, copy);
};
const editCase = (caseId) => {
  const url = router.resolve({ name: 'ApiCaseEdit', params: { id: caseId } }).href;
  window.open(url, '_blank');
};

// 选择用例弹窗
const pickerVisible = ref(false);
const pickerSearch = ref('');
const pickerSelection = ref([]);
const pickerCases = computed(() => {
  const query = pickerSearch.value.trim().toLowerCase();
  if (!query) return projectCases.value;
  return projectCases.value.filter(
    (item) => item.name?.toLowerCase().includes(query) || item.url?.toLowerCase().includes(query)
  );
});
const openCasePicker = async () => {
  pickerSearch.value = '';
  pickerSelection.value = [];
  pickerVisible.value = true;
  await fetchCases(); // 可能刚在别的页签里新建了用例
};
const onPickerSelectionChange = (rows) => {
  // 保持勾选的先后顺序
  const kept = pickerSelection.value.filter((item) => rows.includes(item));
  const added = rows.filter((item) => !kept.includes(item));
  pickerSelection.value = [...kept, ...added];
};
const confirmPicker = () => {
  pickerSelection.value.forEach((item) => steps.value.push(makeStep({ case_id: item.id })));
  pickerVisible.value = false;
};

// ---------------------------------------------------------------- 数据集
const dsMode = ref('table');
const dsColumns = ref([]); // 变量名
const dsRows = ref([]); // 每行是与列对应的值数组
const dsJson = ref('');

const cellText = (value) => (value === undefined || value === null ? '' : typeof value === 'string' ? value : inline(value));

const tableFromList = (list) => {
  const columns = [];
  list.forEach((item) => {
    Object.keys(item || {}).forEach((key) => {
      if (!columns.includes(key)) columns.push(key);
    });
  });
  dsColumns.value = columns;
  dsRows.value = list.map((item) => columns.map((key) => cellText(item?.[key])));
};

const listFromTable = () => {
  const names = dsColumns.value.map((name) => (name || '').trim());
  return dsRows.value
    .filter((row) => row.some((cell) => cell !== '' && cell !== undefined && cell !== null))
    .map((row) => {
      const item = {};
      names.forEach((name, ci) => {
        if (name) item[name] = row[ci] ?? '';
      });
      return item;
    });
};

const parseJsonDatasets = () => {
  const text = dsJson.value.trim();
  if (!text) return [];
  let list;
  try {
    list = JSON.parse(text);
  } catch (e) {
    throw new Error('数据集不是合法的 JSON');
  }
  if (!Array.isArray(list) || list.some((item) => !item || typeof item !== 'object' || Array.isArray(item))) {
    throw new Error('数据集要写成数组，每一项是一个对象（变量名: 值）');
  }
  return list;
};

const collectDatasets = () => (dsMode.value === 'json' ? parseJsonDatasets() : listFromTable());

const datasetCount = computed(() => {
  try {
    return collectDatasets().length;
  } catch (e) {
    return '?';
  }
});

const hasTypedValue = (list) =>
  list.some((item) => Object.values(item || {}).some((value) => typeof value !== 'string'));

const loadDatasets = (list) => {
  list = Array.isArray(list) ? list : [];
  if (hasTypedValue(list)) {
    // 有数字/布尔/对象：用 JSON 模式打开，避免表格把类型抹成文本
    dsMode.value = 'json';
    dsJson.value = JSON.stringify(list, null, 2);
    dsColumns.value = [];
    dsRows.value = [];
  } else {
    dsMode.value = 'table';
    tableFromList(list);
    dsJson.value = '';
  }
};

const onDsModeChange = (mode) => {
  if (mode === 'json') {
    const list = listFromTable();
    dsJson.value = list.length ? JSON.stringify(list, null, 2) : '';
    return;
  }
  try {
    const list = parseJsonDatasets();
    if (hasTypedValue(list)) ElMessage.warning('表格模式下值都按文本保存，数字、布尔和对象会变成文本');
    tableFromList(list);
  } catch (e) {
    ElMessage.error(e.message);
    dsMode.value = 'json';
  }
};

const addColumn = () => {
  dsColumns.value.push('');
  dsRows.value.forEach((row) => row.push(''));
  if (!dsRows.value.length) addRow();
};
const removeColumn = (ci) => {
  dsColumns.value.splice(ci, 1);
  dsRows.value.forEach((row) => row.splice(ci, 1));
  if (!dsColumns.value.length) dsRows.value = [];
};
const renameColumn = (ci, name) => {
  const value = (name || '').trim();
  if (value && dsColumns.value.some((col, i) => i !== ci && (col || '').trim() === value)) {
    ElMessage.warning(`变量名「${value}」重复了，后面的列会覆盖前面的`);
  }
};
const addRow = () => dsRows.value.push(dsColumns.value.map(() => ''));

// ---------------------------------------------------------------- 加载与保存
const fetchProjects = async () => {
  try {
    projects.value = await apiTestApi.getProjects();
  } catch (error) {
    console.error('获取项目列表失败:', error);
  }
};
const fetchCases = async () => {
  try {
    allCases.value = await apiTestApi.getApiCases();
  } catch (error) {
    ElMessage.error(errorMessage(error, '获取用例列表失败'));
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
};
const onProjectChange = (projectId) => {
  form.value.env = null;
  fetchEnvs(projectId);
};

const fetchScenario = async () => {
  try {
    const data = await apiTestApi.getScenario(scenarioId.value);
    form.value = {
      name: data.name,
      project: data.project,
      description: data.description || '',
      env: data.env ?? null,
      stop_on_fail: data.stop_on_fail !== false,
    };
    steps.value = (data.steps || []).map(makeStep);
    loadDatasets(data.datasets);
    fetchEnvs(data.project);
  } catch (error) {
    ElMessage.error(errorMessage(error, '获取场景失败'));
  }
};

const buildPayload = () => {
  if (!form.value.name.trim()) throw new Error('请输入场景名称');
  if (!form.value.project) throw new Error('请选择所属项目');
  const missing = steps.value.findIndex((step) => !step.case_id);
  if (missing >= 0) throw new Error(`第 ${missing + 1} 步还没有选择用例`);
  return {
    name: form.value.name.trim(),
    project: form.value.project,
    description: form.value.description || '',
    env: form.value.env || null,
    stop_on_fail: form.value.stop_on_fail,
    steps: steps.value.map((step) => {
      const overrides = { ...step.extra };
      const variables = rowsToObject(step.variables);
      if (Object.keys(variables).length) overrides.variables = variables;
      return { case_id: step.case_id, name: (step.name || '').trim(), enabled: step.enabled, overrides };
    }),
    datasets: collectDatasets(),
  };
};

const handleSave = async (thenRun) => {
  let payload;
  try {
    payload = buildPayload();
  } catch (e) {
    ElMessage.error(e.message);
    return;
  }
  if (thenRun && !payload.steps.some((step) => step.enabled)) {
    ElMessage.error('没有启用的步骤，无法运行');
    return;
  }
  saveLoading.value = true;
  try {
    let saved;
    if (scenarioId.value) {
      saved = await apiTestApi.updateScenario(scenarioId.value, payload);
    } else {
      saved = await apiTestApi.createScenario(payload);
      scenarioId.value = saved.id;
      // 地址换成带 ID 的，刷新页面不会变成再新建一个
      router.replace({ name: 'ApiScenarioEdit', params: { id: saved.id } });
    }
    ElMessage.success('场景已保存');
    if (thenRun) {
      launcher.value?.open({
        kind: 'scenario',
        id: saved.id,
        name: saved.name,
        projectId: saved.project,
        envId: saved.env,
      });
    }
  } catch (error) {
    ElMessage.error(errorMessage(error, '保存失败'));
  } finally {
    saveLoading.value = false;
  }
};

const handleBack = () => {
  router.push({ name: 'ApiScenarioManage' });
};

onMounted(() => {
  fetchProjects();
  fetchCases();
  if (scenarioId.value) fetchScenario();
  else if (form.value.project) fetchEnvs(form.value.project);
});
</script>

<style scoped>
.scenario-editor {
  --primary: #6366f1;
  --primary-hover: #4f46e5;
  --primary-soft: #eef2ff;
  --danger: #ef4444;
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
  --mono: 'JetBrains Mono', 'Fira Code', Monaco, Menlo, Consolas, monospace;

  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  color: var(--text-1);
  font-size: 13px;
  padding-bottom: 24px;
}

/* 顶部工具栏（与接口用例编辑页一致） */
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
.toolbar-left { display: flex; align-items: center; gap: 16px; }
.toolbar-right { display: flex; align-items: center; gap: 10px; }
.back-btn { color: var(--text-2); font-size: 13px; height: 34px; padding: 0 10px; border-radius: var(--radius-sm); }
.back-btn:hover { color: var(--primary); background: var(--primary-soft); }
.title-divider { width: 1px; height: 24px; background: var(--border); }
.page-title-wrap { display: flex; flex-direction: column; gap: 2px; line-height: 1.2; }
.page-title { font-size: 15px; font-weight: 600; }
.page-subtitle { font-size: 12px; color: var(--text-3); }
.ghost-btn { height: 34px; border-radius: var(--radius-sm); border-color: var(--border); color: var(--text-2); }
.ghost-btn:hover { border-color: var(--primary); color: var(--primary); background: var(--primary-soft); }
.primary-btn { height: 34px; border-radius: var(--radius-sm); background: var(--primary); border-color: var(--primary); font-weight: 500; }
.primary-btn:hover,
.primary-btn:focus { background: var(--primary-hover); border-color: var(--primary-hover); }

/* 卡片 */
.card {
  margin: 16px 24px 0;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px 20px;
  box-shadow: var(--shadow-sm);
}
.card-header { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }
.section-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--primary); }
.section-title { font-size: 13px; font-weight: 600; }
.header-spacer { flex: 1; }
.header-tip { font-size: 12px; color: var(--text-3); }
.count-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 6px;
  background: var(--primary-soft);
  color: var(--primary);
  font-size: 11px;
  font-weight: 600;
  border-radius: 9px;
}
.info-form :deep(.el-form-item) { margin-bottom: 8px; margin-right: 24px; }
.info-form :deep(.el-form-item__label) { font-size: 12px; color: var(--text-2); font-weight: 500; }
.inline-tip { margin-left: 10px; font-size: 12px; color: var(--text-3); }

/* 步骤 */
.steps { border: 1px solid var(--border); border-radius: var(--radius-sm); overflow: hidden; }
.step-block { border-bottom: 1px solid var(--border-soft); }
.step-block:last-child { border-bottom: none; }
.step-block.disabled .s-case,
.step-block.disabled .s-name { opacity: 0.5; }
.step-row { display: flex; align-items: flex-start; padding: 10px 0; }
.step-row:hover { background: #fafbfc; }
.step-header {
  background: #f8fafc;
  font-size: 12px;
  color: var(--text-3);
  font-weight: 600;
  padding: 8px 0;
  border-bottom: 1px solid var(--border-soft);
}
.step-header:hover { background: #f8fafc; }
.s-no { width: 60px; text-align: center; flex-shrink: 0; }
.s-switch { width: 60px; text-align: center; flex-shrink: 0; }
.s-case { flex: 1.6; min-width: 0; padding: 0 8px; }
.s-name { flex: 1; min-width: 0; padding: 0 8px; }
.s-ops { width: 290px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.s-ops :deep(.el-button) { margin-left: 0; padding: 4px 6px; }
.step-no {
  display: inline-block;
  width: 24px;
  height: 24px;
  line-height: 24px;
  border-radius: 50%;
  background: var(--primary-soft);
  color: var(--primary);
  font-size: 12px;
  font-weight: 600;
}
.case-line { display: flex; align-items: center; gap: 8px; margin-top: 6px; min-height: 20px; }
.case-url {
  font-family: var(--mono);
  font-size: 12px;
  color: var(--text-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
.case-edit-link { font-size: 12px; flex-shrink: 0; }
.case-missing { font-size: 12px; color: var(--danger); }
.step-extra { padding: 4px 16px 14px 120px; background: #fbfcfd; }
.danger { color: var(--danger); }
.empty-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 36px 20px;
  color: var(--text-3);
  font-size: 12px;
  border: 1px dashed var(--border);
  border-radius: var(--radius-sm);
}
.empty-block p { margin: 0 0 6px; font-size: 14px; font-weight: 600; color: var(--text-2); }
.empty-block.small { padding: 18px; }

/* 数据集 */
.ds-table-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: var(--radius-sm); }
.ds-table { width: 100%; border-collapse: collapse; }
.ds-table th,
.ds-table td { padding: 6px 8px; border-bottom: 1px solid var(--border-soft); min-width: 160px; }
.ds-table th { background: #f8fafc; }
.ds-table tr:last-child td { border-bottom: none; }
.ds-table .ds-no { width: 44px; min-width: 44px; text-align: center; color: var(--text-3); font-size: 12px; }
.ds-table .ds-act { width: 48px; min-width: 48px; text-align: center; }
.ds-col-head { display: flex; align-items: center; gap: 2px; }
.ds-table :deep(.el-input__inner) { font-family: var(--mono); font-size: 12.5px; }
.ds-footer { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
.ds-footer :deep(.el-button) { margin-left: 0; }
.ds-json :deep(.el-textarea__inner) { font-family: var(--mono); font-size: 12.5px; line-height: 1.6; }

.picker-toolbar { display: flex; align-items: center; gap: 14px; margin-bottom: 10px; }

@media (max-width: 1100px) {
  .card { margin-left: 12px; margin-right: 12px; }
  .page-subtitle { display: none; }
  .step-row { flex-wrap: wrap; }
  .s-ops { width: 100%; justify-content: flex-end; padding-top: 6px; }
}
</style>
