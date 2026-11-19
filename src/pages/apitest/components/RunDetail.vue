<template>
  <!-- 一次执行的详情：汇总 + 每一步的请求 / 响应 / 断言 / 变量 -->
  <div v-loading="loading" class="run-detail">
    <template v-if="run">
      <div class="run-summary">
        <el-tag :type="statusTagType(run.status)" effect="dark" size="large">{{ statusText(run.status) }}</el-tag>
        <div class="summary-name">
          <span class="summary-title">{{ run.name || run.scenario_name || run.case_name || '执行记录' }}</span>
          <span class="summary-sub">
            #{{ run.id }} · {{ run.kind === 'scenario' ? '场景' : '单条用例' }} · {{ triggerText(run.trigger) }}
            <template v-if="run.created_by_name"> · {{ run.created_by_name }}</template>
          </span>
        </div>
        <div class="summary-stats">
          <div class="stat"><span class="stat-num">{{ run.total }}</span><span class="stat-label">步骤</span></div>
          <div class="stat ok"><span class="stat-num">{{ run.passed }}</span><span class="stat-label">通过</span></div>
          <div class="stat bad"><span class="stat-num">{{ run.failed }}</span><span class="stat-label">失败</span></div>
          <div class="stat"><span class="stat-num">{{ formatDuration(run.duration_ms) }}</span><span class="stat-label">耗时</span></div>
        </div>
      </div>
      <div class="run-meta">
        <span>环境：{{ run.env_name || '未使用环境' }}</span>
        <span>开始：{{ formatTime(run.started_at) }}</span>
        <span>结束：{{ formatTime(run.finished_at) }}</span>
      </div>
      <el-alert v-if="run.error" :title="run.error" type="error" :closable="false" show-icon class="run-error" />

      <div v-if="steps.length" class="steps-toolbar">
        <span class="steps-title">步骤明细</span>
        <el-checkbox v-model="onlyFailed">只看未通过</el-checkbox>
      </div>
      <el-collapse v-model="opened" class="steps-collapse">
        <template v-for="group in groups" :key="group.dataset">
          <div v-if="groups.length > 1" class="dataset-title">第 {{ group.dataset + 1 }} 组数据</div>
          <el-collapse-item v-for="step in group.steps" :key="step.id ?? step.index" :name="step.index">
            <template #title>
              <div class="step-head">
                <span class="step-no">{{ step.index + 1 }}</span>
                <el-tag :type="statusTagType(step.status)" size="small" effect="light">{{ statusText(step.status) }}</el-tag>
                <span class="step-name">{{ step.name }}</span>
                <el-tag v-if="step.request?.method" size="small" effect="plain" :type="methodTagType(step.request.method)">
                  {{ step.request.method }}
                </el-tag>
                <span class="step-url">{{ step.request?.url }}</span>
                <span class="step-spacer"></span>
                <span v-if="step.response?.status_code" class="step-code">{{ step.response.status_code }}</span>
                <span class="step-time">{{ formatDuration(step.duration_ms) }}</span>
              </div>
            </template>
            <StepResult :step="step" />
          </el-collapse-item>
        </template>
      </el-collapse>
      <div v-if="!steps.length && !run.error" class="empty-tip">没有步骤记录</div>
      <div v-else-if="steps.length && !visibleCount" class="empty-tip">全部通过，没有未通过的步骤</div>
    </template>
    <div v-else-if="!loading" class="empty-tip">{{ loadError || '没有执行记录' }}</div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { apiTestApi } from '@/utils/apiTestApi';
import StepResult from './StepResult.vue';
import {
  errorMessage, formatDuration, formatTime, methodTagType, statusTagType, statusText, triggerText,
} from '../common';

const props = defineProps({
  // 二选一：给 runId 则自己去取；给 data 则直接展示（执行接口已经返回了详情）
  runId: { type: [Number, String], default: null },
  data: { type: Object, default: null },
});

const run = ref(null);
const loading = ref(false);
const loadError = ref('');
const opened = ref([]);
const onlyFailed = ref(false);

const steps = computed(() => run.value?.steps || []);
const isBad = (step) => step.status === 'failed' || step.status === 'error';

const groups = computed(() => {
  const map = new Map();
  steps.value.forEach((step) => {
    if (onlyFailed.value && !isBad(step)) return;
    const key = step.dataset_index || 0;
    if (!map.has(key)) map.set(key, { dataset: key, steps: [] });
    map.get(key).steps.push(step);
  });
  return [...map.values()].sort((a, b) => a.dataset - b.dataset);
});
const visibleCount = computed(() => groups.value.reduce((n, g) => n + g.steps.length, 0));

const show = (data) => {
  run.value = data;
  onlyFailed.value = false;
  const list = data?.steps || [];
  // 默认展开未通过的步骤；只有一步时直接展开
  const bad = list.filter(isBad).map((s) => s.index);
  opened.value = bad.length ? bad : list.length === 1 ? [list[0].index] : [];
};

const load = async (id) => {
  loading.value = true;
  loadError.value = '';
  run.value = null;
  try {
    show(await apiTestApi.getRun(id));
  } catch (error) {
    loadError.value = errorMessage(error, '获取执行记录失败');
  } finally {
    loading.value = false;
  }
};

watch(
  () => [props.runId, props.data],
  () => {
    if (props.data) show(props.data);
    else if (props.runId) load(props.runId);
    else run.value = null;
  },
  { immediate: true }
);
</script>

<style scoped>
.run-detail { min-height: 160px; font-size: 13px; color: #0f172a; }
.run-summary {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}
.summary-name { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0; }
.summary-title { font-size: 15px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.summary-sub { font-size: 12px; color: #94a3b8; }
.summary-stats { display: flex; gap: 18px; }
.stat { display: flex; flex-direction: column; align-items: center; min-width: 48px; }
.stat-num { font-size: 16px; font-weight: 600; color: #0f172a; }
.stat.ok .stat-num { color: #059669; }
.stat.bad .stat-num { color: #dc2626; }
.stat-label { font-size: 12px; color: #94a3b8; }
.run-meta { display: flex; flex-wrap: wrap; gap: 20px; margin: 10px 2px; font-size: 12px; color: #64748b; }
.run-error { margin-bottom: 10px; }
.steps-toolbar { display: flex; align-items: center; justify-content: space-between; margin: 14px 2px 6px; }
.steps-title { font-size: 13px; font-weight: 600; }
.dataset-title {
  margin-top: 10px;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 600;
  color: #4f46e5;
  background: #eef2ff;
  border-radius: 4px;
}
.steps-collapse { border-top: none; }
.step-head { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; padding-right: 10px; }
.step-no {
  width: 22px;
  height: 22px;
  line-height: 22px;
  text-align: center;
  border-radius: 50%;
  background: #f1f5f9;
  color: #475569;
  font-size: 12px;
  flex-shrink: 0;
}
.step-name { font-weight: 600; white-space: nowrap; max-width: 220px; overflow: hidden; text-overflow: ellipsis; }
.step-url {
  color: #94a3b8;
  font-size: 12px;
  font-family: 'JetBrains Mono', Monaco, Menlo, Consolas, monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
.step-spacer { flex: 1; }
.step-code { font-family: Monaco, Menlo, Consolas, monospace; font-size: 12px; color: #475569; }
.step-time { font-size: 12px; color: #94a3b8; white-space: nowrap; }
.empty-tip { padding: 32px; text-align: center; color: #94a3b8; font-size: 12px; }
</style>
