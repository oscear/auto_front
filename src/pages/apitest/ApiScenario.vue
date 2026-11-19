<template>
  <!-- 接口场景：左边场景列表，右边编排、数据集、运行结果 -->
  <div class="at-root">
    <!-- ============================== 左栏：场景 ============================== -->
    <aside class="at-side at-panel">
      <div class="at-side__head">
        <span class="at-side__title">接口场景</span>
        <span class="at-side__count">{{ scenarios.length }}</span>
        <span class="at-flex-1"></span>
        <button type="button" class="at-icon-btn" title="刷新" @click="fetchScenarios"><el-icon><Refresh /></el-icon></button>
      </div>
      <div class="at-side__tools">
        <el-select v-model="filterProject" placeholder="全部项目" popper-class="at-pop" @change="onFilterProject">
          <el-option label="全部项目" value="" />
          <el-option v-for="p in projects" :key="p.id" :label="p.name" :value="p.id" />
        </el-select>
        <el-input v-model="search" placeholder="搜索场景" clearable :prefix-icon="Search" />
        <div class="at-side__actions">
          <el-button type="primary" :icon="Plus" data-test="new-scenario" @click="newScenario">新建场景</el-button>
        </div>
      </div>
      <div v-loading="listLoading" class="at-side__list">
        <div v-if="hasDraft && !currentId" class="at-srow is-active">
          <div class="at-srow__line">
            <span class="at-srow__name">{{ form.name || '未保存的新场景' }}</span>
            <i class="at-dot at-dot--dirty" title="还没保存"></i>
          </div>
          <div class="at-srow__sub">{{ steps.length }} 步 · 还没保存</div>
        </div>
        <div
          v-for="item in filteredScenarios"
          :key="item.id"
          class="at-srow"
          :class="{ 'is-active': item.id === currentId }"
          :data-scenario-id="item.id"
          @click="openScenario(item.id)"
        >
          <div class="at-srow__line">
            <span class="at-srow__name" :title="item.name">{{ item.name }}</span>
            <i
              class="at-dot"
              :class="item.last_run_id ? 'at-dot--' + statusTone(item.last_run_status) : 'at-dot--none'"
              :title="item.last_run_id ? `最近一次：${statusText(item.last_run_status)}` : '还没有执行过'"
            ></i>
            <el-dropdown trigger="click" popper-class="at-pop" @command="(cmd) => onRowCommand(cmd, item)">
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
          <div class="at-srow__sub">
            <span>{{ item.step_count }} 步</span>
            <span v-if="filterProject === ''"> · {{ item.project_name }}</span>
            <span v-if="item.last_run_id"> · {{ statusText(item.last_run_status) }} {{ formatTime(item.last_run_time).slice(5, 16) }}</span>
            <span v-else> · 未执行</span>
          </div>
        </div>
        <div v-if="!listLoading && !filteredScenarios.length && !(hasDraft && !currentId)" class="at-empty at-empty--side">
          <template v-if="scenarios.length">
            <p class="at-empty__title">没有匹配的场景</p>
            <el-button size="small" @click="clearFilter">清除筛选</el-button>
          </template>
          <template v-else>
            <p class="at-empty__title">还没有场景</p>
            <p class="at-empty__desc">场景把多条接口用例按顺序串起来跑，前一步提取的变量后一步可以用。</p>
          </template>
        </div>
      </div>
    </aside>

    <!-- ============================== 右侧：编排 ============================== -->
    <section class="at-main">
      <div v-if="!hasDraft" class="at-panel at-empty at-empty--page">
        <div class="at-empty__art"><el-icon><Share /></el-icon></div>
        <p class="at-empty__title">把几条接口用例串成一个业务流程</p>
        <p class="at-empty__desc">比如「登录 → 下单 → 查订单」：每一步引用一条接口用例，前一步提取到的变量（如 token、订单号）后面的步骤直接用。</p>
        <div class="at-empty__actions">
          <el-button type="primary" :icon="Plus" @click="newScenario">新建场景</el-button>
          <el-button @click="router.push({ name: 'ApiWorkspace' })">先去工作台建用例</el-button>
        </div>
      </div>

      <template v-else>
        <!-- 顶部：名称 + 运行设置 -->
        <div v-loading="detailLoading" class="at-panel at-sc-head">
          <div class="at-meta">
            <input ref="nameInput" v-model="form.name" class="at-meta__name" placeholder="未命名场景（点这里起个名字）" maxlength="200" data-test="scenario-name" />
            <span class="at-flex-1"></span>
            <el-button :loading="saving" data-test="scenario-save" @click="save()">
              保存<i v-if="dirty" class="at-dot at-dot--dirty" title="有未保存的改动"></i>
            </el-button>
            <el-dropdown split-button type="primary" popper-class="at-pop" :disabled="running" data-test="scenario-run" @click="run()" @command="(id) => run(id)">
              <el-icon v-if="!running"><VideoPlay /></el-icon>{{ running ? '运行中' : '运行' }}
              <template #dropdown>
                <el-dropdown-menu>
                  <div class="at-menu-title">本次换一个环境运行（不改场景设置）</div>
                  <el-dropdown-item v-for="env in envs" :key="env.id" :command="env.id">
                    {{ env.name }}<span v-if="env.is_default" class="at-menu-note">默认</span>
                  </el-dropdown-item>
                  <div v-if="!envs.length" class="at-menu-empty">这个项目还没有环境</div>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
          <div class="at-sc-settings">
            <label class="at-field">
              <span>所属项目</span>
              <el-select v-model="form.project" placeholder="选择项目" size="small" popper-class="at-pop" data-test="scenario-project" @change="onProjectChange">
                <el-option v-for="p in projects" :key="p.id" :label="p.name" :value="p.id" />
              </el-select>
            </label>
            <label class="at-field">
              <span>运行环境</span>
              <el-select v-model="form.env" size="small" popper-class="at-pop" placeholder="项目默认环境" clearable data-test="scenario-env">
                <el-option v-for="env in envs" :key="env.id" :label="env.name + (env.is_default ? '（默认）' : '')" :value="env.id" />
              </el-select>
            </label>
            <label class="at-field at-field--xs" title="开：某一步失败后，这一轮余下的步骤跳过；关：失败了也继续往下跑">
              <span>失败即停</span>
              <el-switch v-model="form.stop_on_fail" size="small" data-test="stop-on-fail" />
            </label>
            <label class="at-field at-field--grow">
              <span>描述</span>
              <el-input v-model="form.description" size="small" placeholder="选填，这个场景验证的是什么流程" />
            </label>
          </div>
          <div class="at-tabs at-tabs--req">
            <button type="button" class="at-tab" :class="{ 'is-active': tab === 'steps' }" data-tab="steps" @click="tab = 'steps'">
              步骤编排<span class="at-tab__badge">{{ enabledCount }}{{ enabledCount !== steps.length ? '/' + steps.length : '' }}</span>
            </button>
            <button type="button" class="at-tab" :class="{ 'is-active': tab === 'datasets' }" data-tab="datasets" @click="tab = 'datasets'">
              数据集<span v-if="datasetCount" class="at-tab__badge">{{ datasetCount }} 组</span>
            </button>
            <button type="button" class="at-tab" :class="{ 'is-active': tab === 'result' }" data-tab="result" @click="tab = 'result'">
              运行结果
              <span v-if="running" class="at-spinner at-spinner--tab"></span>
              <i v-else-if="shownRunStatus" class="at-dot" :class="'at-dot--' + statusTone(shownRunStatus)"></i>
            </button>
          </div>
        </div>

        <div class="at-panel at-sc-body">
          <!-- ---------- 步骤流水线 ---------- -->
          <div v-show="tab === 'steps'" class="at-sc-pane">
            <div v-if="!steps.length" class="at-empty at-empty--inline">
              <div class="at-empty__art at-empty__art--sm"><el-icon><Operation /></el-icon></div>
              <p class="at-empty__title">还没有步骤</p>
              <p class="at-empty__desc">从本项目的接口用例里挑几条加进来，按执行顺序排好。</p>
              <el-button type="primary" :icon="Plus" data-test="add-steps" @click="openPicker">添加步骤</el-button>
            </div>
            <div v-else class="at-pipe" @dragover.prevent>
              <div
                v-for="(step, index) in steps"
                :key="step.uid"
                class="at-pstep"
                :class="{
                  'is-off': !step.enabled,
                  'is-open': step.expanded,
                  'is-dragging': dragIndex === index,
                  'drop-before': dropIndex === index && dropPos === 'before',
                  'drop-after': dropIndex === index && dropPos === 'after',
                  'is-missing': !caseMap[step.case_id],
                }"
                :data-step-index="index"
                @dragover.prevent="onDragOver(index, $event)"
                @drop.prevent="onDrop"
              >
                <div class="at-pstep__rail"><span class="at-pstep__no">{{ index + 1 }}</span></div>
                <div class="at-pstep__card">
                  <div class="at-pstep__head">
                    <span class="at-pstep__grip" title="按住拖动排序" draggable="true" @dragstart="onDragStart(index, $event)" @dragend="onDragEnd">
                      <el-icon><Rank /></el-icon>
                    </span>
                    <span v-if="caseMap[step.case_id]" :class="methodClass(caseMap[step.case_id].method)">{{ caseMap[step.case_id].method }}</span>
                    <span v-else class="at-method at-method--none">缺失</span>
                    <input v-model="step.name" class="at-pstep__name" :placeholder="caseMap[step.case_id]?.name || '用例已被删除，请更换或移除'" />
                    <span class="at-pstep__url at-mono" :title="caseMap[step.case_id]?.url">{{ caseMap[step.case_id]?.url }}</span>
                    <span v-if="stepVarCount(step)" class="at-pstep__vars" title="本步覆盖的变量数" @click="step.expanded = !step.expanded">{{ stepVarCount(step) }} 个变量</span>
                    <el-switch v-model="step.enabled" size="small" title="启用 / 停用这一步" />
                    <el-dropdown trigger="click" popper-class="at-pop" @command="(cmd) => onStepCommand(cmd, index)">
                      <button type="button" class="at-icon-btn" title="更多操作"><el-icon><MoreFilled /></el-icon></button>
                      <template #dropdown>
                        <el-dropdown-menu>
                          <el-dropdown-item command="up" :icon="Top" :disabled="index === 0">上移</el-dropdown-item>
                          <el-dropdown-item command="down" :icon="Bottom" :disabled="index === steps.length - 1">下移</el-dropdown-item>
                          <el-dropdown-item command="copy" :icon="CopyDocument">复制这一步</el-dropdown-item>
                          <el-dropdown-item command="open" :icon="Position" :disabled="!caseMap[step.case_id]">在工作台打开用例</el-dropdown-item>
                          <el-dropdown-item command="remove" :icon="Delete" divided class="at-danger-item">移除</el-dropdown-item>
                        </el-dropdown-menu>
                      </template>
                    </el-dropdown>
                    <button type="button" class="at-icon-btn at-pstep__toggle" :title="step.expanded ? '收起' : '展开填本步的变量覆盖'" data-test="step-toggle" @click="step.expanded = !step.expanded">
                      <el-icon><ArrowDown /></el-icon>
                    </button>
                  </div>
                  <div v-if="step.expanded" class="at-pstep__body">
                    <div class="at-pstep__row">
                      <span class="at-pstep__label">引用用例</span>
                      <el-select v-model="step.case_id" filterable size="small" placeholder="选择用例" popper-class="at-pop" class="at-pstep__case">
                        <el-option v-for="c in caseOptions(step.case_id)" :key="c.id" :label="c.name" :value="c.id">
                          <span :class="methodClass(c.method)">{{ c.method }}</span>&nbsp; {{ c.name }}
                        </el-option>
                      </el-select>
                    </div>
                    <div class="at-pstep__label at-pstep__label--block">
                      本步变量覆盖
                      <span class="at-sub-title__note">只对这一步生效，优先级高于环境变量；数据集和前面步骤提取出的变量优先级更高</span>
                    </div>
                    <KvTable v-model="step.variables" key-label="变量名" value-label="值" key-placeholder="变量名" value-placeholder="值" />
                    <p v-if="Object.keys(step.extra).length" class="at-hint">
                      这一步还带有其它覆盖项（{{ Object.keys(step.extra).join('、') }}），页面上不编辑，保存时原样保留。
                    </p>
                  </div>
                </div>
              </div>
              <div class="at-pipe__end">
                <div class="at-pstep__rail"><span class="at-pstep__no at-pstep__no--add"><el-icon><Plus /></el-icon></span></div>
                <button type="button" class="at-pipe__add" data-test="add-steps" @click="openPicker">添加步骤</button>
                <span class="at-pipe__tip">拖动 <el-icon><Rank /></el-icon> 调整顺序 · 共 {{ steps.length }} 步，启用 {{ enabledCount }} 步</span>
              </div>
            </div>
          </div>

          <!-- ---------- 数据集 ---------- -->
          <div v-show="tab === 'datasets'" class="at-sc-pane">
            <div class="at-ds__bar">
              <div class="at-seg at-seg--sm">
                <button type="button" :class="{ 'is-active': dsMode === 'table' }" @click="switchDsMode('table')">表格</button>
                <button type="button" :class="{ 'is-active': dsMode === 'json' }" @click="switchDsMode('json')">JSON</button>
              </div>
              <span class="at-body__note">每一行是一组变量，场景会按每组数据各跑一遍；不填就只跑一遍。数据集变量的优先级最高。</span>
              <span class="at-flex-1"></span>
              <template v-if="dsMode === 'table' && dsColumns.length">
                <button type="button" class="at-link-btn" @click="addColumn"><el-icon><Plus /></el-icon>加变量列</button>
                <button type="button" class="at-link-btn" data-test="ds-add-row" @click="addRow"><el-icon><Plus /></el-icon>加一组数据</button>
              </template>
            </div>
            <template v-if="dsMode === 'table'">
              <div v-if="!dsColumns.length" class="at-empty at-empty--inline">
                <div class="at-empty__art at-empty__art--sm"><el-icon><Grid /></el-icon></div>
                <p class="at-empty__title">还没有数据集</p>
                <p class="at-empty__desc">想用多组数据（比如不同账号、不同关键词）各跑一遍同样的流程时，在这里加。</p>
                <el-button type="primary" plain :icon="Plus" data-test="ds-init" @click="addColumn">添加数据集</el-button>
              </div>
              <div v-else class="at-ds">
                <table class="at-ds__table">
                  <thead>
                    <tr>
                      <th class="at-ds__idx">组</th>
                      <th v-for="(col, ci) in dsColumns" :key="ci">
                        <div class="at-ds__th">
                          <input v-model="dsColumns[ci]" class="at-kv__input at-mono" placeholder="变量名" spellcheck="false" @change="checkColumn(ci)" />
                          <button type="button" class="at-icon-btn at-kv__del" title="删除这一列" @click="removeColumn(ci)"><el-icon><Close /></el-icon></button>
                        </div>
                      </th>
                      <th class="at-ds__act"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, ri) in dsRows" :key="ri">
                      <td class="at-ds__idx">{{ ri + 1 }}</td>
                      <td v-for="(col, ci) in dsColumns" :key="ci">
                        <input v-model="row[ci]" class="at-kv__input at-mono" placeholder="值" spellcheck="false" />
                      </td>
                      <td class="at-ds__act">
                        <button type="button" class="at-icon-btn at-kv__del" title="删除这一组" @click="dsRows.splice(ri, 1)"><el-icon><Delete /></el-icon></button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </template>
            <template v-else>
              <div class="at-editor at-editor--ds" :class="{ 'has-error': dsJsonError }">
                <textarea v-model="dsJson" class="at-editor__area at-mono" wrap="off" spellcheck="false" placeholder='[
  { "user": "tom", "keyword": "机票" },
  { "user": "amy", "keyword": "酒店" }
]'></textarea>
              </div>
              <p v-if="dsJsonError" class="at-body__err"><el-icon><WarningFilled /></el-icon>{{ dsJsonError }}</p>
              <p v-else class="at-hint">JSON 模式能保留数字、布尔、对象等类型；表格模式下值都按文本保存。</p>
            </template>
          </div>

          <!-- ---------- 运行结果 ---------- -->
          <div v-show="tab === 'result'" class="at-sc-pane at-sc-pane--flow">
            <div v-if="running" class="at-empty at-empty--inline">
              <span class="at-spinner at-spinner--lg"></span>
              <p class="at-empty__title">场景运行中…</p>
              <p class="at-empty__desc">已运行 {{ (elapsed / 1000).toFixed(1) }} 秒。步骤按顺序同步执行，跑完后在这里显示每一步的结果。</p>
            </div>
            <RunFlow v-else-if="runData" :data="runData" />
            <RunFlow v-else-if="lastRunId" :run-id="lastRunId" />
            <div v-else class="at-empty at-empty--inline">
              <div class="at-empty__art at-empty__art--sm"><el-icon><VideoPlay /></el-icon></div>
              <p class="at-empty__title">还没有运行过</p>
              <p class="at-empty__desc">点「运行」后，这里会显示每一步的状态和耗时，点开能看这一步的请求、响应、断言和提取到的变量。</p>
              <el-button type="primary" plain :icon="VideoPlay" @click="run()">运行场景</el-button>
            </div>
          </div>
        </div>
      </template>
    </section>

    <!-- 选择用例 -->
    <el-dialog v-model="pickerVisible" title="添加步骤" width="720px" class="at-pop at-dialog at-picker-dialog" append-to-body>
      <div class="at-picker__bar">
        <el-input v-model="pickerSearch" placeholder="搜索用例名或地址" clearable :prefix-icon="Search" />
        <span class="at-picker__count">已选 {{ pickerSelection.length }} 条，按勾选顺序加入</span>
      </div>
      <div v-loading="pickerLoading" class="at-picker__list">
        <div
          v-for="item in pickerCases"
          :key="item.id"
          class="at-picker__row"
          :class="{ 'is-checked': pickerSelection.includes(item.id) }"
          :data-pick-id="item.id"
          @click="togglePick(item.id)"
        >
          <span class="at-picker__check">
            <template v-if="pickerSelection.includes(item.id)">{{ pickerSelection.indexOf(item.id) + 1 }}</template>
          </span>
          <span :class="methodClass(item.method)">{{ item.method }}</span>
          <span class="at-picker__name">{{ item.name }}</span>
          <span class="at-picker__url at-mono">{{ item.url }}</span>
        </div>
        <div v-if="!pickerLoading && !pickerCases.length" class="at-empty at-empty--inline">
          <p class="at-empty__title">{{ projectCases.length ? '没有匹配的用例' : '这个项目下还没有接口用例' }}</p>
          <el-button v-if="!projectCases.length" size="small" type="primary" @click="goWorkspace">去工作台新建用例</el-button>
        </div>
      </div>
      <template #footer>
        <el-button @click="pickerVisible = false">取消</el-button>
        <el-button type="primary" :disabled="!pickerSelection.length" data-test="picker-confirm" @click="confirmPicker">
          加入 {{ pickerSelection.length || '' }} 步
        </el-button>
      </template>
    </el-dialog>

    <HistoryDrawer ref="historyDrawer" />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  ArrowDown, Bottom, Clock, Close, CopyDocument, Delete, Grid, MoreFilled, Operation, Plus, Position, Rank, Refresh,
  Search, Share, Top, VideoPlay, WarningFilled,
} from '@element-plus/icons-vue';
import { apiTestApi } from '@/utils/apiTestApi';
import KvTable from './components/KvTable.vue';
import RunFlow from './components/RunFlow.vue';
import HistoryDrawer from './components/HistoryDrawer.vue';
import {
  errorMessage, formatTime, inline, kvCount, loadPref, methodClass, objectToRows, rowsToObject, savePref,
  statusText, statusTone,
} from './common';
import './apitest.css';

const route = useRoute();
const router = useRouter();

// ------------------------------------------------------------------ 左栏
const projects = ref([]);
const scenarios = ref([]);
const allCases = ref([]);
const listLoading = ref(false);
const filterProject = ref(loadPref('sc.project', ''));
const search = ref('');

const filteredScenarios = computed(() => {
  const q = search.value.trim().toLowerCase();
  return scenarios.value.filter((item) => {
    if (filterProject.value !== '' && item.project !== filterProject.value) return false;
    if (!q) return true;
    return (item.name || '').toLowerCase().includes(q) || (item.description || '').toLowerCase().includes(q);
  });
});
const onFilterProject = () => savePref('sc.project', filterProject.value);
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
const fetchScenarios = async () => {
  listLoading.value = true;
  try {
    scenarios.value = await apiTestApi.getScenarios();
  } catch (error) {
    ElMessage.error(errorMessage(error, '获取场景列表失败'));
  } finally {
    listLoading.value = false;
  }
};
const fetchCases = async () => {
  try {
    allCases.value = await apiTestApi.getApiCases();
  } catch (error) {
    ElMessage.error(errorMessage(error, '获取用例列表失败'));
  }
};

// ------------------------------------------------------------------ 当前场景
const hasDraft = ref(false);
const currentId = ref(null);
const detailLoading = ref(false);
const saving = ref(false);
const tab = ref('steps');
const nameInput = ref(null);
const form = reactive({ name: '', project: '', description: '', env: null, stop_on_fail: true });
const envs = ref([]);

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
const projectCases = computed(() => allCases.value.filter((item) => !item.project || item.project === form.project));
// 下拉里除了本项目用例，还要包含这一步当前选中的那条（哪怕它属于别的项目）
const caseOptions = (currentCaseId) => {
  const list = projectCases.value;
  const current = caseMap.value[currentCaseId];
  return current && !list.includes(current) ? [current, ...list] : list;
};
const enabledCount = computed(() => steps.value.filter((s) => s.enabled).length);
const stepVarCount = (step) => kvCount(step.variables);

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

const moveStep = (from, to) => {
  if (to < 0 || to >= steps.value.length || from === to) return;
  const list = [...steps.value];
  const [item] = list.splice(from, 1);
  list.splice(to, 0, item);
  steps.value = list;
};
const onStepCommand = (cmd, index) => {
  const step = steps.value[index];
  if (cmd === 'up') moveStep(index, index - 1);
  else if (cmd === 'down') moveStep(index, index + 1);
  else if (cmd === 'remove') steps.value.splice(index, 1);
  else if (cmd === 'copy') {
    steps.value.splice(index + 1, 0, makeStep({
      case_id: step.case_id,
      name: step.name,
      enabled: step.enabled,
      overrides: { ...step.extra, variables: rowsToObject(step.variables) },
    }));
  } else if (cmd === 'open') {
    window.open(router.resolve({ name: 'ApiWorkspace', query: { case: step.case_id } }).href, '_blank');
  }
};

// 原生拖放排序：只有左侧把手能拖（卡片里有输入框，整卡可拖会妨碍选字），拖动时显示整张卡片
const dragIndex = ref(-1);
const dropIndex = ref(-1);
const dropPos = ref('before');
const onDragStart = (index, event) => {
  dragIndex.value = index;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', String(index));
  const card = event.currentTarget.closest('.at-pstep__card');
  if (card) event.dataTransfer.setDragImage(card, 14, 19);
};
const onDragOver = (index, event) => {
  if (dragIndex.value < 0) return;
  const rect = event.currentTarget.getBoundingClientRect();
  dropIndex.value = index;
  dropPos.value = event.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
};
const onDrop = () => {
  if (dragIndex.value >= 0 && dropIndex.value >= 0) {
    let to = dropPos.value === 'before' ? dropIndex.value : dropIndex.value + 1;
    if (dragIndex.value < to) to -= 1;
    moveStep(dragIndex.value, to);
  }
  onDragEnd();
};
const onDragEnd = () => {
  dragIndex.value = -1;
  dropIndex.value = -1;
};

// 选择用例弹窗
const pickerVisible = ref(false);
const pickerLoading = ref(false);
const pickerSearch = ref('');
const pickerSelection = ref([]);
const pickerCases = computed(() => {
  const q = pickerSearch.value.trim().toLowerCase();
  if (!q) return projectCases.value;
  return projectCases.value.filter(
    (item) => (item.name || '').toLowerCase().includes(q) || (item.url || '').toLowerCase().includes(q)
  );
});
const openPicker = async () => {
  if (!form.project) {
    ElMessage.warning('先选所属项目，再添加步骤');
    return;
  }
  pickerSearch.value = '';
  pickerSelection.value = [];
  pickerVisible.value = true;
  pickerLoading.value = true;
  await fetchCases(); // 可能刚在别的页签里新建了用例
  pickerLoading.value = false;
};
const togglePick = (id) => {
  const list = pickerSelection.value;
  pickerSelection.value = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
};
const confirmPicker = () => {
  pickerSelection.value.forEach((id) => steps.value.push(makeStep({ case_id: id })));
  pickerVisible.value = false;
};
const goWorkspace = () => {
  pickerVisible.value = false;
  router.push({ name: 'ApiWorkspace' });
};

// ------------------------------------------------------------------ 数据集
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
const dsJsonError = computed(() => {
  if (dsMode.value !== 'json') return '';
  try {
    parseJsonDatasets();
    return '';
  } catch (e) {
    return e.message;
  }
});
const datasetCount = computed(() => {
  try {
    return collectDatasets().length;
  } catch (e) {
    return 0;
  }
});
const hasTypedValue = (list) => list.some((item) => Object.values(item || {}).some((value) => typeof value !== 'string'));
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
const switchDsMode = (mode) => {
  if (mode === dsMode.value) return;
  if (mode === 'json') {
    const list = listFromTable();
    dsJson.value = list.length ? JSON.stringify(list, null, 2) : '';
    dsMode.value = 'json';
    return;
  }
  try {
    const list = parseJsonDatasets();
    if (hasTypedValue(list)) ElMessage.warning('表格模式下值都按文本保存，数字、布尔和对象会变成文本');
    tableFromList(list);
    dsMode.value = 'table';
  } catch (e) {
    ElMessage.error(e.message);
  }
};
const addRow = () => dsRows.value.push(dsColumns.value.map(() => ''));
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
const checkColumn = (ci) => {
  const value = (dsColumns.value[ci] || '').trim();
  if (value && dsColumns.value.some((col, i) => i !== ci && (col || '').trim() === value)) {
    ElMessage.warning(`变量名「${value}」重复了，后面的列会覆盖前面的`);
  }
};

// ------------------------------------------------------------------ 加载、保存
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
  form.env = null;
  fetchEnvs(projectId);
};

const buildPayload = () => {
  if (!form.name.trim()) {
    nameInput.value?.focus();
    throw new Error('给场景起个名字再保存');
  }
  if (!form.project) throw new Error('选一下所属项目');
  const missing = steps.value.findIndex((step) => !step.case_id);
  if (missing >= 0) throw new Error(`第 ${missing + 1} 步还没有选择用例`);
  return {
    name: form.name.trim(),
    project: form.project,
    description: form.description || '',
    env: form.env || null,
    stop_on_fail: form.stop_on_fail,
    steps: steps.value.map((step) => {
      const overrides = { ...step.extra };
      const variables = rowsToObject(step.variables);
      if (Object.keys(variables).length) overrides.variables = variables;
      return { case_id: step.case_id, name: (step.name || '').trim(), enabled: step.enabled, overrides };
    }),
    datasets: collectDatasets(),
  };
};

// 未保存改动：比较「页面当前内容」和上次保存/打开时的
const savedSnapshot = ref('');
const snapshot = () =>
  JSON.stringify([
    form,
    steps.value.map((s) => [s.case_id, s.name, s.enabled, rowsToObject(s.variables), s.extra]),
    dsMode.value === 'json' ? dsJson.value : [dsColumns.value, dsRows.value],
  ]);
const dirty = computed(() => hasDraft.value && snapshot() !== savedSnapshot.value);
const markClean = () => {
  savedSnapshot.value = snapshot();
};

const runData = ref(null);
const lastRunId = ref(null);
const shownRunStatus = computed(() => runData.value?.status || (lastRunId.value ? currentRow.value?.last_run_status : ''));
const currentRow = computed(() => scenarios.value.find((s) => s.id === currentId.value) || null);

const fill = (data) => {
  form.name = data.name || '';
  form.project = data.project ?? '';
  form.description = data.description || '';
  form.env = data.env ?? null;
  form.stop_on_fail = data.stop_on_fail !== false;
  steps.value = (data.steps || []).map(makeStep);
  loadDatasets(data.datasets);
  runData.value = null;
  lastRunId.value = data.last_run_id || null;
};

const save = async (silent = false) => {
  let payload;
  try {
    payload = buildPayload();
  } catch (e) {
    ElMessage.error(e.message);
    if (e.message.includes('数据集')) tab.value = 'datasets';
    return false;
  }
  saving.value = true;
  try {
    if (currentId.value) {
      await apiTestApi.updateScenario(currentId.value, payload);
    } else {
      const created = await apiTestApi.createScenario(payload);
      currentId.value = created.id;
      setQuery(created.id);
    }
    markClean();
    if (!silent) ElMessage.success('场景已保存');
    fetchScenarios();
    return true;
  } catch (error) {
    ElMessage.error(errorMessage(error, '保存失败'));
    return false;
  } finally {
    saving.value = false;
  }
};

const confirmLeave = async () => {
  if (!dirty.value) return true;
  try {
    await ElMessageBox.confirm(`「${form.name || '未命名场景'}」有未保存的改动。`, '离开前要保存吗', {
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
  const current = route.query.scenario ? Number(route.query.scenario) : null;
  if (current === (id || null)) return;
  router.replace({ path: route.path, query: id ? { scenario: id } : {} });
};

const newScenario = async () => {
  if (!(await confirmLeave())) return;
  currentId.value = null;
  fill({
    project: filterProject.value !== '' ? filterProject.value : projects.value.length === 1 ? projects.value[0].id : '',
  });
  hasDraft.value = true;
  tab.value = 'steps';
  markClean();
  setQuery(null);
  fetchEnvs(form.project);
  setTimeout(() => nameInput.value?.focus(), 50);
};

const loadScenario = async (id) => {
  detailLoading.value = true;
  hasDraft.value = true;
  try {
    const data = await apiTestApi.getScenario(id);
    currentId.value = data.id;
    fill(data);
    tab.value = 'steps';
    markClean();
    fetchEnvs(data.project);
    return true;
  } catch (error) {
    ElMessage.error(errorMessage(error, '打开场景失败'));
    if (!currentId.value) hasDraft.value = false;
    return false;
  } finally {
    detailLoading.value = false;
  }
};
const openScenario = async (id) => {
  if (id === currentId.value) return;
  if (!(await confirmLeave())) return;
  if (await loadScenario(id)) setQuery(id);
};

// ------------------------------------------------------------------ 运行
const running = ref(false);
const elapsed = ref(0);
let timer = null;
const stopTimer = () => {
  clearInterval(timer);
  timer = null;
};

// envOverride：本次临时换的环境 ID，不传就按场景设置
const run = async (envOverride) => {
  if (running.value) return;
  if (!steps.value.some((s) => s.enabled)) {
    ElMessage.error(steps.value.length ? '没有启用的步骤，无法运行' : '先添加步骤再运行');
    tab.value = 'steps';
    return;
  }
  if ((dirty.value || !currentId.value) && !(await save(true))) return;
  running.value = true;
  tab.value = 'result';
  const begin = Date.now();
  elapsed.value = 0;
  timer = setInterval(() => {
    elapsed.value = Date.now() - begin;
  }, 100);
  try {
    const data = await apiTestApi.runScenario(currentId.value, typeof envOverride === 'number' ? { env_id: envOverride } : {});
    runData.value = data;
    if (data.status === 'passed') ElMessage.success('场景运行通过');
    else ElMessage.warning(`运行结果：${statusText(data.status)}`);
    fetchScenarios();
  } catch (error) {
    ElMessage.error(errorMessage(error, '运行失败'));
  } finally {
    stopTimer();
    running.value = false;
  }
};

// ------------------------------------------------------------------ 左栏行上的操作
const historyDrawer = ref(null);
const onRowCommand = async (cmd, item) => {
  if (cmd === 'history') {
    historyDrawer.value?.open({ kind: 'scenario', id: item.id, name: item.name });
  } else if (cmd === 'copy') {
    try {
      const src = await apiTestApi.getScenario(item.id);
      const created = await apiTestApi.createScenario({
        name: `${src.name} 副本`.slice(0, 200),
        project: src.project,
        description: src.description || '',
        env: src.env || null,
        stop_on_fail: src.stop_on_fail,
        steps: src.steps || [],
        datasets: src.datasets || [],
      });
      ElMessage.success('已复制');
      await fetchScenarios();
      openScenario(created.id);
    } catch (error) {
      ElMessage.error(errorMessage(error, '复制失败'));
    }
  } else if (cmd === 'delete') {
    try {
      await ElMessageBox.confirm(`确认删除场景「${item.name}」吗？历史执行记录会保留。`, '删除场景', {
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
      await apiTestApi.deleteScenario(item.id);
      ElMessage.success('已删除');
      if (item.id === currentId.value) {
        hasDraft.value = false;
        currentId.value = null;
        setQuery(null);
      }
      fetchScenarios();
    } catch (error) {
      ElMessage.error(errorMessage(error, '删除失败'));
    }
  }
};

// ------------------------------------------------------------------ 路由
watch(
  () => route.query.scenario,
  async (value) => {
    const id = value ? Number(value) : null;
    if (!id || id === currentId.value) return;
    if (!(await confirmLeave())) {
      setQuery(currentId.value);
      return;
    }
    loadScenario(id);
  }
);
onBeforeRouteLeave(async () => (await confirmLeave()) || false);

const onKeydown = (event) => {
  if (hasDraft.value && (event.ctrlKey || event.metaKey) && (event.key === 's' || event.key === 'S')) {
    event.preventDefault();
    save();
  }
};

onMounted(async () => {
  document.addEventListener('keydown', onKeydown);
  fetchScenarios();
  fetchCases();
  await fetchProjects();
  if (route.query.scenario) loadScenario(Number(route.query.scenario));
});
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown);
  stopTimer();
});
</script>
