<template>
  <!-- 执行记录：顶部筛选条 + 紧凑列表，点一行从右侧滑出详情 -->
  <el-config-provider :locale="zhCn">
  <div class="at-root at-root--column">
    <div class="at-panel at-filter">
      <span class="at-filter__title">执行记录</span>
      <el-select v-model="filters.project" placeholder="全部项目" clearable popper-class="at-pop" class="at-filter__item" data-test="f-project" @change="reload">
        <el-option v-for="p in projects" :key="p.id" :label="p.name" :value="p.id" />
      </el-select>
      <div class="at-seg" data-test="f-kind">
        <button v-for="k in KINDS" :key="k.value" type="button" :class="{ 'is-active': filters.kind === k.value }" @click="setFilter('kind', k.value)">{{ k.label }}</button>
      </div>
      <el-select v-model="filters.status" placeholder="全部状态" clearable popper-class="at-pop" class="at-filter__item at-filter__item--sm" data-test="f-status" @change="reload">
        <el-option label="通过" value="passed" />
        <el-option label="失败" value="failed" />
        <el-option label="错误" value="error" />
      </el-select>
      <el-select v-model="filters.trigger" placeholder="全部触发方式" clearable popper-class="at-pop" class="at-filter__item" data-test="f-trigger" @change="reload">
        <el-option label="手动" value="manual" />
        <el-option label="定时任务" value="schedule" />
        <el-option label="接口调用" value="api" />
      </el-select>
      <el-date-picker
        v-model="timeRange"
        type="daterange"
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        :shortcuts="SHORTCUTS"
        popper-class="at-pop"
        class="at-filter__date"
        unlink-panels
        @change="reload"
      />
      <span v-if="targetLabel" class="at-badge at-badge--primary at-filter__target">
        {{ targetLabel }}
        <button type="button" title="取消这个限定" @click="clearTarget"><el-icon><Close /></el-icon></button>
      </span>
      <span class="at-flex-1"></span>
      <button v-if="hasFilter" type="button" class="at-link-btn" @click="resetFilters">重置</button>
      <button type="button" class="at-icon-btn" title="刷新" @click="fetchRuns"><el-icon><Refresh /></el-icon></button>
    </div>

    <div class="at-panel at-runs">
      <div class="at-runs__row at-runs__head">
        <span>状态</span>
        <span>执行对象</span>
        <span>通过 / 步数</span>
        <span>耗时</span>
        <span>环境</span>
        <span>触发</span>
        <span>开始时间</span>
        <span class="at-runs__id">编号</span>
      </div>
      <div v-loading="loading" class="at-runs__list">
        <div
          v-for="row in pageRows"
          :key="row.id"
          class="at-runs__row"
          :class="{ 'is-active': drawerVisible && currentRun?.id === row.id }"
          :data-run-id="row.id"
          @click="openDetail(row)"
        >
          <span class="at-status at-status--plain" :class="'at-status--' + statusTone(row.status)">
            <i class="at-dot"></i>{{ statusText(row.status) }}
          </span>
          <span class="at-runs__name">
            <span class="at-badge" :class="row.kind === 'scenario' ? 'at-badge--violet' : 'at-badge--gray'">{{ row.kind === 'scenario' ? '场景' : '单条' }}</span>
            <span class="at-runs__title" :title="row.name">{{ row.name || row.scenario_name || row.case_name || '-' }}</span>
            <span v-if="row.error" class="at-runs__err" :title="row.error">{{ row.error }}</span>
          </span>
          <span class="at-runs__ratio">
            <span class="at-mono">{{ row.passed }}/{{ row.total }}</span>
            <span class="at-meter" :class="{ 'has-fail': row.total > row.passed }"><i :style="{ width: (row.total ? (row.passed / row.total) * 100 : 0) + '%' }"></i></span>
          </span>
          <span class="at-mono">{{ formatDuration(row.duration_ms) }}</span>
          <span class="at-runs__dim" :title="row.env_name">{{ row.env_name || '—' }}</span>
          <span class="at-runs__dim">{{ triggerText(row.trigger) }}<template v-if="row.created_by_name"> · {{ row.created_by_name }}</template></span>
          <span class="at-runs__dim">{{ formatTime(row.started_at || row.created_at) }}</span>
          <span class="at-runs__id at-mono">#{{ row.id }}</span>
        </div>
        <div v-if="!loading && !pageRows.length" class="at-empty at-empty--inline">
          <div class="at-empty__art at-empty__art--sm"><el-icon><List /></el-icon></div>
          <template v-if="hasFilter || targetLabel">
            <p class="at-empty__title">没有符合条件的执行记录</p>
            <el-button size="small" @click="resetAll">清除全部筛选</el-button>
          </template>
          <template v-else>
            <p class="at-empty__title">还没有执行记录</p>
            <p class="at-empty__desc">在工作台对用例「运行并记录」，或者运行一个场景，结果会留在这里。</p>
            <div class="at-empty__actions">
              <el-button type="primary" size="small" @click="router.push({ name: 'ApiWorkspace' })">去接口工作台</el-button>
              <el-button size="small" @click="router.push({ name: 'ApiScenarioManage' })">去接口场景</el-button>
            </div>
          </template>
        </div>
      </div>
      <div class="at-runs__foot">
        <span class="at-runs__total">
          共 {{ total }} 条<template v-if="clientMode && scanCapped">（按时间筛选时只检查最近 {{ SCAN_LIMIT }} 条）</template>
        </span>
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[20, 50, 100]"
          layout="sizes, prev, pager, next"
          size="small"
          background
          popper-class="at-pop"
          @current-change="onPageChange"
          @size-change="reload"
        />
      </div>
    </div>

    <el-drawer v-model="drawerVisible" direction="rtl" size="min(920px, 74vw)" class="at-pop at-drawer" append-to-body destroy-on-close>
      <template #header>
        <div class="at-drawer__title">
          <span class="at-badge" :class="currentRun?.kind === 'scenario' ? 'at-badge--violet' : 'at-badge--gray'">{{ currentRun?.kind === 'scenario' ? '场景' : currentRun?.kind === 'case' ? '单条' : '执行' }}</span>
          <span>{{ currentRun?.name || `执行记录 #${currentRun?.id}` }}</span>
          <button v-if="currentRun?.scenario" type="button" class="at-link-btn" @click="goSource">打开场景</button>
          <button v-else-if="currentRun?.case" type="button" class="at-link-btn" @click="goSource">在工作台打开</button>
        </div>
      </template>
      <RunFlow v-if="currentRun" :run-id="currentRun.id" />
    </el-drawer>
  </div>
  </el-config-provider>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Close, List, Refresh } from '@element-plus/icons-vue';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import { apiTestApi } from '@/utils/apiTestApi';
import RunFlow from './components/RunFlow.vue';
import { errorMessage, formatDuration, formatTime, statusText, statusTone, triggerText } from './common';
import './apitest.css';

const route = useRoute();
const router = useRouter();

const KINDS = [
  { value: '', label: '全部' },
  { value: 'case', label: '单条' },
  { value: 'scenario', label: '场景' },
];
const dayStart = (offset = 0) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d;
};
const SHORTCUTS = [
  { text: '今天', value: () => [dayStart(), dayStart()] },
  { text: '近 3 天', value: () => [dayStart(-2), dayStart()] },
  { text: '近 7 天', value: () => [dayStart(-6), dayStart()] },
  { text: '近 30 天', value: () => [dayStart(-29), dayStart()] },
];
// 后端列表接口没有时间参数：选了时间就把最近这么多条取回来在页面上筛
const SCAN_LIMIT = 2000;

const projects = ref([]);
const loading = ref(false);
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const serverRows = ref([]);
const scannedRows = ref([]);
const scanCapped = ref(false);
const timeRange = ref(null);

// scenario / case / task 由别的页面带过来（如「查看历史」、定时任务页）
const filters = reactive({
  project: '',
  kind: '',
  status: '',
  trigger: '',
  scenario: route.query.scenario || '',
  case: route.query.case || '',
  task: route.query.task || '',
});

const clientMode = computed(() => Array.isArray(timeRange.value) && timeRange.value.length === 2);
const pageRows = computed(() =>
  clientMode.value
    ? scannedRows.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value)
    : serverRows.value
);
const hasFilter = computed(
  () => !!(filters.project || filters.kind || filters.status || filters.trigger || clientMode.value)
);
const targetLabel = computed(() => {
  if (filters.scenario) return `只看场景 #${filters.scenario}`;
  if (filters.case) return `只看用例 #${filters.case}`;
  if (filters.task) return `只看定时任务 #${filters.task}`;
  return '';
});

const baseParams = () => {
  const params = {};
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== '' && value !== null && value !== undefined) params[key] = value;
  });
  return params;
};

const fetchRuns = async () => {
  loading.value = true;
  try {
    if (!clientMode.value) {
      const res = await apiTestApi.getRuns({ ...baseParams(), page: page.value, page_size: pageSize.value });
      serverRows.value = res.results || [];
      total.value = res.count || 0;
      return;
    }
    const from = new Date(timeRange.value[0]);
    from.setHours(0, 0, 0, 0);
    const to = new Date(timeRange.value[1]);
    to.setHours(23, 59, 59, 999);
    const hits = [];
    let scanned = 0;
    let done = false;
    scanCapped.value = false;
    for (let p = 1; !done; p += 1) {
      // 记录按编号倒序返回（新的在前），翻到早于开始日期的就可以停了
      const res = await apiTestApi.getRuns({ ...baseParams(), page: p, page_size: 200 });
      const rows = res.results || [];
      rows.forEach((row) => {
        const at = new Date(row.started_at || row.created_at);
        if (at >= from && at <= to) hits.push(row);
        else if (at < from) done = true;
      });
      scanned += rows.length;
      if (!rows.length || scanned >= (res.count || 0)) done = true;
      if (!done && scanned >= SCAN_LIMIT) {
        scanCapped.value = true;
        done = true;
      }
    }
    scannedRows.value = hits;
    total.value = hits.length;
  } catch (error) {
    ElMessage.error(errorMessage(error, '获取执行记录失败'));
  } finally {
    loading.value = false;
  }
};

const reload = () => {
  page.value = 1;
  fetchRuns();
};
const onPageChange = () => {
  if (!clientMode.value) fetchRuns();
};
const setFilter = (key, value) => {
  filters[key] = value;
  reload();
};
const resetFilters = () => {
  filters.project = '';
  filters.kind = '';
  filters.status = '';
  filters.trigger = '';
  timeRange.value = null;
  reload();
};
const clearTarget = () => {
  filters.scenario = '';
  filters.case = '';
  filters.task = '';
  router.replace({ path: route.path });
  reload();
};
const resetAll = () => {
  filters.scenario = '';
  filters.case = '';
  filters.task = '';
  router.replace({ path: route.path });
  resetFilters();
};

// ------------------------------------------------------------------ 详情抽屉
const drawerVisible = ref(false);
const currentRun = ref(null);
const openDetail = (row) => {
  currentRun.value = row;
  drawerVisible.value = true;
};
const goSource = () => {
  const run = currentRun.value;
  drawerVisible.value = false;
  if (run.scenario) router.push({ name: 'ApiScenarioManage', query: { scenario: run.scenario } });
  else if (run.case) router.push({ name: 'ApiWorkspace', query: { case: run.case } });
};

onMounted(async () => {
  apiTestApi.getProjects().then((list) => {
    projects.value = list;
  }).catch(() => {});
  fetchRuns();
  // 带 ?run=ID 进来时直接打开这次执行的详情
  if (route.query.run) {
    try {
      const run = await apiTestApi.getRun(route.query.run);
      openDetail(run);
    } catch (error) {
      ElMessage.error(errorMessage(error, '打开执行记录失败'));
    }
  }
});
</script>
