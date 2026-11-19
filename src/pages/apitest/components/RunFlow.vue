<template>
  <!-- 一次执行的流水线结果：摘要 + 逐步时间线，点开一步看请求/响应/断言/变量。场景页和执行记录抽屉共用 -->
  <div v-loading="loading" class="at-flow">
    <div v-if="loadError" class="at-empty at-empty--inline">
      <p class="at-empty__title">{{ loadError }}</p>
      <el-button size="small" @click="load(runId)">重试</el-button>
    </div>

    <template v-else-if="run">
      <div class="at-flow__summary">
        <span class="at-status" :class="'at-status--' + statusTone(run.status)">
          <i class="at-dot"></i>{{ statusText(run.status) }}
        </span>
        <span class="at-flow__counts">
          <b>{{ run.passed }}</b> 通过
          <template v-if="run.failed"> · <b class="is-fail">{{ run.failed }}</b> 未通过</template>
          <template v-if="skippedCount"> · {{ skippedCount }} 跳过</template>
          <span class="at-flow__total"> / 共 {{ run.total }} 步</span>
        </span>
        <span class="at-flow__meta"><el-icon><Timer /></el-icon>{{ formatDuration(run.duration_ms) }}</span>
        <span class="at-flow__meta">环境：{{ run.env_name || '未使用' }}</span>
        <span class="at-flow__meta">{{ triggerText(run.trigger) }}<template v-if="run.created_by_name"> · {{ run.created_by_name }}</template></span>
        <span class="at-flow__meta">{{ formatTime(run.started_at || run.created_at) }}</span>
        <span class="at-flow__meta at-mono">#{{ run.id }}</span>
        <label v-if="steps.length > 1" class="at-check-label">
          <input v-model="onlyFailed" type="checkbox" />只看未通过
        </label>
      </div>
      <div class="at-bar" :title="`${run.passed} 通过 / ${run.failed} 未通过`">
        <i
          v-for="step in steps"
          :key="step.id"
          :class="'at-bar__seg at-bar__seg--' + statusTone(step.status)"
          :title="`${step.index + 1}. ${step.name}：${statusText(step.status)}`"
        ></i>
      </div>
      <div v-if="run.error" class="at-resp__error"><el-icon><WarningFilled /></el-icon><span>{{ run.error }}</span></div>

      <div class="at-flow__list">
        <div v-if="!steps.length && !run.error" class="at-hint at-hint--center">这次执行没有步骤</div>
        <div v-else-if="!visibleCount && steps.length" class="at-hint at-hint--center">没有未通过的步骤</div>
        <template v-for="group in groups" :key="group.dataset">
          <div v-if="datasetTotal > 1" class="at-flow__group">
            数据集 第 {{ group.dataset + 1 }} 组
            <span class="at-flow__group-note">{{ group.steps.filter((s) => s.status === 'passed').length }}/{{ group.steps.length }} 通过</span>
          </div>
          <div
            v-for="step in group.steps"
            :key="step.id"
            class="at-fstep"
            :class="['at-fstep--' + statusTone(step.status), { 'is-open': opened.has(step.id) }]"
          >
            <div class="at-fstep__rail"><i class="at-fstep__node"></i></div>
            <div class="at-fstep__card">
              <div class="at-fstep__head" @click="toggle(step.id)">
                <span class="at-fstep__no">{{ step.index + 1 }}</span>
                <span :class="methodClass(step.request?.method)">{{ step.request?.method || '-' }}</span>
                <span class="at-fstep__name" :title="step.name">{{ step.name }}</span>
                <span class="at-fstep__url at-mono" :title="step.request?.url">{{ step.request?.url }}</span>
                <span
                  v-if="step.response?.status_code"
                  class="at-http at-http--sm"
                  :class="'at-http--' + httpClass(step.response.status_code)"
                >{{ step.response.status_code }}</span>
                <span class="at-fstep__time at-mono">{{ step.status === 'skipped' ? '—' : formatDuration(step.duration_ms) }}</span>
                <span class="at-status at-status--plain" :class="'at-status--' + statusTone(step.status)">
                  <i class="at-dot"></i>{{ statusText(step.status) }}
                </span>
                <el-icon class="at-fstep__arrow"><ArrowRight /></el-icon>
              </div>
              <div v-if="opened.has(step.id)" class="at-fstep__body">
                <div v-if="step.status === 'skipped'" class="at-hint">前面的步骤失败，本步已跳过（失败即停）。</div>
                <ResponseView v-else :result="step" embedded />
              </div>
            </div>
          </div>
        </template>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { ArrowRight, Timer, WarningFilled } from '@element-plus/icons-vue';
import { apiTestApi } from '@/utils/apiTestApi';
import ResponseView from './ResponseView.vue';
import {
  errorMessage, formatDuration, formatTime, httpClass, methodClass, statusText, statusTone, triggerText,
} from '../common';

const props = defineProps({
  // 二选一：给 runId 则自己去取；给 data 则直接展示（执行接口已经返回了详情）
  runId: { type: [Number, String], default: null },
  data: { type: Object, default: null },
});

const run = ref(null);
const loading = ref(false);
const loadError = ref('');
const opened = ref(new Set());
const onlyFailed = ref(false);

const steps = computed(() => run.value?.steps || []);
const isBad = (step) => step.status === 'failed' || step.status === 'error';
const skippedCount = computed(() => steps.value.filter((s) => s.status === 'skipped').length);

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
const datasetTotal = computed(() => new Set(steps.value.map((s) => s.dataset_index || 0)).size);
const visibleCount = computed(() => groups.value.reduce((n, g) => n + g.steps.length, 0));

const toggle = (id) => {
  const next = new Set(opened.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  opened.value = next;
};

const show = (data) => {
  run.value = data;
  onlyFailed.value = false;
  const list = data?.steps || [];
  // 默认展开第一个未通过的步骤；只有一步时直接展开
  const bad = list.find(isBad);
  opened.value = new Set(bad ? [bad.id] : list.length === 1 ? [list[0].id] : []);
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
