<template>
  <!-- 一步（一次请求）的完整结果：响应、断言、提取的变量、请求 -->
  <div class="step-result">
    <el-alert
      v-if="step.error"
      :title="step.error"
      :type="step.status === 'skipped' ? 'info' : 'error'"
      :closable="false"
      show-icon
      class="step-error"
    />
    <el-tabs v-model="activeTab" class="result-tabs">
      <el-tab-pane name="body" label="响应体">
        <div v-if="hasResponse">
          <div class="body-toolbar">
            <span v-if="response.truncated" class="truncated-tip">
              响应体共 {{ formatSize(response.size) }}，只保留了前 200 KB
            </span>
            <span class="toolbar-spacer"></span>
            <el-button text size="small" @click="copy(pretty(response.body))">
              <el-icon><CopyDocument /></el-icon>
              复制
            </el-button>
          </div>
          <pre class="code-block">{{ pretty(response.body) || '（空）' }}</pre>
        </div>
        <div v-else class="empty-tip">没有收到响应</div>
      </el-tab-pane>

      <el-tab-pane name="headers" label="响应头">
        <div v-if="hasResponse" class="pair-list">
          <div v-for="(value, key) in response.headers" :key="key" class="pair-item">
            <span class="pair-key">{{ key }}</span>
            <span class="pair-value">{{ value }}</span>
          </div>
        </div>
        <div v-else class="empty-tip">没有收到响应</div>
      </el-tab-pane>

      <el-tab-pane name="assertions">
        <template #label>
          <span class="tab-label">
            断言
            <span v-if="assertions.length" class="count-badge" :class="{ bad: failedCount > 0 }">
              {{ assertions.length - failedCount }}/{{ assertions.length }}
            </span>
          </span>
        </template>
        <el-table v-if="assertions.length" :data="assertions" size="small" class="plain-table">
          <el-table-column label="结果" width="80" align="center">
            <template #default="scope">
              <el-tag :type="scope.row.passed ? 'success' : 'danger'" size="small" effect="light">
                {{ scope.row.passed ? '通过' : '未通过' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="断言" min-width="220">
            <template #default="scope">
              <span class="mono">{{ describeAssertion(scope.row) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="期望值" min-width="140">
            <template #default="scope">
              <span class="mono">{{ scope.row.op === 'exists' ? '-' : inline(scope.row.expected) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="实际值" min-width="180">
            <template #default="scope">
              <span class="mono" :class="{ 'bad-text': !scope.row.passed }">{{ inline(scope.row.actual) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="说明" min-width="140">
            <template #default="scope">{{ scope.row.message || '-' }}</template>
          </el-table-column>
        </el-table>
        <div v-else class="empty-tip">这一步没有断言</div>
      </el-tab-pane>

      <el-tab-pane name="extracted">
        <template #label>
          <span class="tab-label">
            提取变量
            <span v-if="extractedList.length" class="count-badge">{{ extractedList.length }}</span>
          </span>
        </template>
        <div v-if="extractedList.length" class="pair-list">
          <div v-for="item in extractedList" :key="item.name" class="pair-item">
            <span class="pair-key">{{ item.name }}</span>
            <span class="pair-value" :class="{ 'bad-text': item.value === null }">
              {{ item.value === null ? '没有取到' : inline(item.value) }}
            </span>
          </div>
        </div>
        <div v-else class="empty-tip">这一步没有提取变量</div>
      </el-tab-pane>

      <el-tab-pane name="request" label="请求">
        <div v-if="request.url || request.method">
          <div class="request-line-view">
            <el-tag size="small" effect="light" :type="methodTagType(request.method)">{{ request.method }}</el-tag>
            <span class="mono request-url">{{ request.url }}</span>
          </div>
          <div class="sub-title">请求头<span class="sub-note">（敏感头已打码）</span></div>
          <div class="pair-list">
            <div v-for="(value, key) in request.headers" :key="key" class="pair-item">
              <span class="pair-key">{{ key }}</span>
              <span class="pair-value">{{ value }}</span>
            </div>
            <div v-if="!request.headers || !Object.keys(request.headers).length" class="empty-tip small">无</div>
          </div>
          <template v-if="request.params && Object.keys(request.params).length">
            <div class="sub-title">查询参数</div>
            <div class="pair-list">
              <div v-for="(value, key) in request.params" :key="key" class="pair-item">
                <span class="pair-key">{{ key }}</span>
                <span class="pair-value">{{ inline(value) }}</span>
              </div>
            </div>
          </template>
          <div class="sub-title">
            请求体<span class="sub-note">（{{ request.body_type || 'none' }}{{ request.body_truncated ? '，已截断' : '' }}）</span>
          </div>
          <pre v-if="hasRequestBody" class="code-block">{{ pretty(request.body) }}</pre>
          <div v-else class="empty-tip small">无</div>
        </div>
        <div v-else class="empty-tip">请求没有发出</div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { CopyDocument } from '@element-plus/icons-vue';
import { formatSize, inline, methodTagType, pretty } from '../common';

const props = defineProps({
  // { status, duration_ms, request, response, assertions, extracted, error }
  step: { type: Object, required: true },
});

const activeTab = ref('body');

const request = computed(() => props.step.request || {});
const response = computed(() => props.step.response || {});
const assertions = computed(() => props.step.assertions || []);
const hasResponse = computed(() => response.value.status_code !== undefined && response.value.status_code !== null);
const hasRequestBody = computed(() => {
  const body = request.value.body;
  return body !== null && body !== undefined && body !== '';
});
const failedCount = computed(() => assertions.value.filter((a) => !a.passed).length);
const extractedList = computed(() =>
  Object.entries(props.step.extracted || {}).map(([name, value]) => ({ name, value }))
);

// 有断言没过时，默认停在断言页
watch(
  () => props.step,
  () => {
    activeTab.value = failedCount.value > 0 ? 'assertions' : hasResponse.value ? 'body' : 'request';
  },
  { immediate: true }
);

const TYPE_TEXT = {
  status: '状态码',
  jsonpath: 'JSON 字段',
  contains: '响应文本',
  regex: '正则',
  header: '响应头',
  response_time: '响应时间(ms)',
};
const OP_TEXT = {
  eq: '等于', ne: '不等于', gt: '大于', lt: '小于', ge: '大于等于', le: '小于等于',
  contains: '包含', not_contains: '不包含', exists: '存在', not_exists: '不存在', matches: '匹配正则',
};
const describeAssertion = (item) => {
  const target = item.expr ? `${TYPE_TEXT[item.type] || item.type} ${item.expr}` : TYPE_TEXT[item.type] || item.type;
  return `${target} ${OP_TEXT[item.op] || item.op}`;
};

const copy = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    ElMessage.success('已复制到剪贴板');
  } catch (e) {
    ElMessage.error('复制失败');
  }
};
</script>

<style scoped>
.step-result {
  --mono: 'JetBrains Mono', 'Fira Code', Monaco, Menlo, Consolas, monospace;
  font-size: 13px;
}
.step-error { margin-bottom: 10px; }
.result-tabs :deep(.el-tabs__header) { margin-bottom: 10px; }
.result-tabs :deep(.el-tabs__item) { font-size: 12.5px; height: 36px; }
.result-tabs :deep(.el-tabs__item.is-active) { color: #6366f1; font-weight: 600; }
.result-tabs :deep(.el-tabs__active-bar) { background: #6366f1; }
.tab-label { display: inline-flex; align-items: center; gap: 6px; }
.count-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  background: #ecfdf5;
  color: #047857;
  font-size: 11px;
  font-weight: 600;
  border-radius: 9px;
}
.count-badge.bad { background: #fef2f2; color: #b91c1c; }
.body-toolbar { display: flex; align-items: center; margin-bottom: 6px; min-height: 24px; }
.toolbar-spacer { flex: 1; }
.truncated-tip { font-size: 12px; color: #b45309; }
.code-block {
  margin: 0;
  padding: 12px 14px;
  font-family: var(--mono);
  font-size: 12.5px;
  line-height: 1.6;
  color: #e2e8f0;
  background: #0f172a;
  border-radius: 6px;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 420px;
  overflow: auto;
}
.pair-list { font-family: var(--mono); font-size: 12.5px; }
.pair-item { display: flex; gap: 16px; padding: 7px 10px; border-bottom: 1px solid #f1f5f9; }
.pair-item:last-child { border-bottom: none; }
.pair-item:hover { background: #fafbfc; }
.pair-key { color: #0f172a; font-weight: 600; min-width: 200px; word-break: break-all; }
.pair-value { color: #475569; word-break: break-all; flex: 1; }
.mono { font-family: var(--mono); font-size: 12.5px; word-break: break-all; }
.bad-text { color: #dc2626; }
.empty-tip { padding: 24px; text-align: center; color: #94a3b8; font-size: 12px; }
.empty-tip.small { padding: 8px 10px; text-align: left; }
.sub-title { margin: 14px 0 6px; font-size: 12px; font-weight: 600; color: #475569; }
.sub-note { font-weight: 400; color: #94a3b8; }
.request-line-view { display: flex; align-items: center; gap: 10px; }
.request-url { color: #0f172a; }
.plain-table :deep(.el-table__cell) { vertical-align: top; }
</style>
