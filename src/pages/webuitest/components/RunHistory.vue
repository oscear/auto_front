<template>
  <el-drawer
    :model-value="modelValue"
    :title="title || '执行历史'"
    size="60%"
    append-to-body
    destroy-on-close
    @update:model-value="(v) => emit('update:modelValue', v)"
  >
    <div class="run-history">
      <div class="run-toolbar">
        <el-select v-model="statusFilter" placeholder="全部状态" clearable style="width: 140px" @change="reload">
          <el-option v-for="s in statusOptions" :key="s" :label="runStatusMeta(s).label" :value="s" />
        </el-select>
        <el-button @click="fetchRuns" :loading="loading">刷新</el-button>
      </div>

      <el-alert v-if="unsupported" type="warning" :closable="false" show-icon title="后端尚未提供执行记录接口（升级后可用）" />

      <el-table v-else :data="runs" v-loading="loading" style="width: 100%" empty-text="暂无执行记录" border>
        <el-table-column prop="id" label="记录ID" width="80" />
        <el-table-column v-if="!testcaseId" label="用例" min-width="140" show-overflow-tooltip>
          <template #default="scope">{{ caseLabel(scope.row) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="scope">
            <el-tag size="small" :type="runStatusMeta(scope.row.status).type">
              {{ runStatusMeta(scope.row.status).label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="触发" width="80">
          <template #default="scope">{{ triggerLabel(scope.row.trigger) }}</template>
        </el-table-column>
        <el-table-column label="步骤（通过/失败/总数）" width="170">
          <template #default="scope">
            {{ scope.row.passed_steps ?? 0 }} / {{ scope.row.failed_steps ?? 0 }} / {{ scope.row.total_steps ?? 0 }}
          </template>
        </el-table-column>
        <el-table-column label="开始时间" min-width="160">
          <template #default="scope">{{ formatTime(scope.row.started_at || scope.row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="耗时" width="90">
          <template #default="scope">{{ formatDuration(scope.row.duration_ms) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="130" fixed="right">
          <template #default="scope">
            <el-button text size="small" type="primary" @click="openDetail(scope.row)">步骤</el-button>
            <el-button
              v-if="['queued', 'running'].includes(scope.row.status)"
              text
              size="small"
              type="danger"
              @click="handleCancel(scope.row)"
            >
              取消
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="run-pagination" v-if="!unsupported">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @current-change="fetchRuns"
          @size-change="reload"
        />
      </div>
    </div>

    <!-- 单次执行的步骤与截图 -->
    <el-dialog v-model="detailVisible" :title="`执行记录 #${detail?.id ?? ''}`" width="70%" append-to-body>
      <div v-loading="detailLoading">
        <template v-if="detail">
          <div class="run-summary">
            <el-tag :type="runStatusMeta(detail.status).type">{{ runStatusMeta(detail.status).label }}</el-tag>
            <span>通过 {{ detail.passed_steps ?? 0 }}，失败 {{ detail.failed_steps ?? 0 }}，共 {{ detail.total_steps ?? 0 }} 步</span>
            <span>耗时 {{ formatDuration(detail.duration_ms) }}</span>
          </div>
          <div v-if="detail.error" class="run-error">{{ detail.error }}</div>
          <el-table :data="detail.steps || []" style="width: 100%" empty-text="暂无步骤记录" border max-height="480">
            <el-table-column label="#" width="56">
              <template #default="scope">{{ stepNo(scope.row, scope.$index) }}</template>
            </el-table-column>
            <el-table-column prop="name" label="步骤" min-width="140" show-overflow-tooltip />
            <el-table-column prop="action" label="操作" width="110" show-overflow-tooltip />
            <el-table-column label="结果" width="80">
              <template #default="scope">
                <el-tag size="small" :type="stepStatusMeta(scope.row.status).type">
                  {{ stepStatusMeta(scope.row.status).label }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="耗时" width="90">
              <template #default="scope">{{ formatDuration(scope.row.duration_ms) }}</template>
            </el-table-column>
            <el-table-column label="说明" min-width="180">
              <template #default="scope">
                <span class="step-message">{{ scope.row.message }}</span>
              </template>
            </el-table-column>
            <el-table-column label="截图" width="110">
              <template #default="scope">
                <el-image
                  v-if="shotOf(scope.row)"
                  :src="shotOf(scope.row)"
                  :preview-src-list="[shotOf(scope.row)]"
                  fit="cover"
                  lazy
                  preview-teleported
                  style="width: 80px; height: 54px; border-radius: 4px; border: 1px solid #e5e6eb"
                />
              </template>
            </el-table-column>
          </el-table>
        </template>
      </div>
    </el-dialog>
  </el-drawer>
</template>

<script setup>
import { ref, watch, onBeforeUnmount } from 'vue';
import { ElMessage } from 'element-plus';
import { projectApi, runStatusMeta, unwrapList, resolveScreenshot, apiErrorText } from '@/utils/api';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' },
  testcaseId: { type: [Number, String], default: null },
  taskId: { type: [Number, String], default: null },
});
const emit = defineEmits(['update:modelValue']);

const statusOptions = ['queued', 'running', 'passed', 'failed', 'error', 'canceled'];

const runs = ref([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const statusFilter = ref('');
const loading = ref(false);
const unsupported = ref(false);

const detailVisible = ref(false);
const detailLoading = ref(false);
const detail = ref(null);

// 丢弃过期请求的结果（抽屉关闭/切换对象后旧请求才返回）
let requestSeq = 0;

const fetchRuns = async () => {
  const seq = ++requestSeq;
  loading.value = true;
  try {
    const params = { page: page.value, page_size: pageSize.value };
    if (props.testcaseId) params.testcase = props.testcaseId;
    if (props.taskId) params.task = props.taskId;
    if (statusFilter.value) params.status = statusFilter.value;
    const res = await projectApi.getRuns(params);
    if (seq !== requestSeq) return;
    const { items, total: count } = unwrapList(res);
    runs.value = items;
    total.value = count;
    unsupported.value = false;
  } catch (error) {
    if (seq !== requestSeq) return;
    runs.value = [];
    total.value = 0;
    if (error?.response?.status === 404) {
      unsupported.value = true;
    } else {
      ElMessage.error(apiErrorText(error, '获取执行记录失败'));
    }
  } finally {
    if (seq === requestSeq) loading.value = false;
  }
};

const reload = () => {
  page.value = 1;
  fetchRuns();
};

const openDetail = async (row) => {
  detail.value = { ...row, steps: [] };
  detailVisible.value = true;
  detailLoading.value = true;
  try {
    const res = await projectApi.getRun(row.id);
    if (detail.value?.id === row.id) detail.value = res;
  } catch (error) {
    ElMessage.error(apiErrorText(error, '获取执行详情失败'));
  } finally {
    detailLoading.value = false;
  }
};

const handleCancel = async (row) => {
  try {
    await projectApi.cancelRun(row.id);
    ElMessage.success('已请求取消');
    fetchRuns();
  } catch (error) {
    ElMessage.error(apiErrorText(error, '取消失败'));
  }
};

const caseLabel = (row) => row.testcase_name || row.testcase?.name || (row.testcase != null ? `#${row.testcase?.id ?? row.testcase}` : '-');

const triggerLabel = (t) => ({ manual: '手动', schedule: '定时', api: '接口' })[t] || t || '-';

const stepStatusMeta = (status) =>
  ({
    passed: { label: '通过', type: 'success' },
    success: { label: '通过', type: 'success' },
    failed: { label: '失败', type: 'danger' },
    skipped: { label: '跳过', type: 'info' },
  })[status] || { label: status || '-', type: 'info' };

// 步骤序号：后端 index 从 0 或从 1 起都按行号展示，避免猜错
const stepNo = (row, i) => i + 1;

const shotOf = (step) => resolveScreenshot(step.screenshot_url || step.screenshot);

const formatTime = (v) => {
  if (!v) return '-';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString('zh-CN', { hour12: false });
};

const formatDuration = (ms) => {
  if (ms === null || ms === undefined || ms === '') return '-';
  const n = Number(ms);
  if (Number.isNaN(n)) return '-';
  if (n < 1000) return `${n} ms`;
  if (n < 60000) return `${(n / 1000).toFixed(1)} 秒`;
  return `${Math.floor(n / 60000)} 分 ${Math.round((n % 60000) / 1000)} 秒`;
};

watch(
  () => [props.modelValue, props.testcaseId, props.taskId],
  ([visible]) => {
    if (visible) {
      statusFilter.value = '';
      reload();
    } else {
      requestSeq++;
      detailVisible.value = false;
    }
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  requestSeq++;
});
</script>

<style scoped>
.run-history {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.run-toolbar {
  display: flex;
  gap: 8px;
}
.run-pagination {
  display: flex;
  justify-content: flex-end;
}
.run-summary {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
  font-size: 13px;
  color: #606266;
}
.run-error {
  background: #fef0f0;
  border: 1px solid #fde2e2;
  border-radius: 4px;
  padding: 10px 12px;
  color: #f56c6c;
  white-space: pre-wrap;
  word-break: break-all;
  font-size: 13px;
  margin-bottom: 12px;
}
.step-message {
  white-space: pre-wrap;
  word-break: break-all;
  font-size: 12px;
}
</style>
