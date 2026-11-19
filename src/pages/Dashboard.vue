<template>
  <div class="dashboard-container">
    <h1>测试数据概览</h1>
    <el-row :gutter="20">
      <el-col :span="6">
        <el-statistic title="项目总数" :value="statistics.projectCount" />
      </el-col>
      <el-col :span="6">
        <el-statistic title="用例总数" :value="statistics.caseCount" />
      </el-col>
      <el-col :span="6">
        <el-statistic title="今日执行" :value="statistics.todayRunCount" />
      </el-col>
      <el-col :span="6">
        <el-statistic title="成功率" :value="statistics.successRate" suffix="%" />
      </el-col>
    </el-row>

    <!-- 最近执行（按执行记录）；后端未升级时不显示 -->
    <div v-if="recentRuns.length" class="recent-runs">
      <h3>最近执行</h3>
      <el-table :data="recentRuns" style="width: 100%" border>
        <el-table-column prop="id" label="记录ID" width="90" />
        <el-table-column label="用例" min-width="160" show-overflow-tooltip>
          <template #default="scope">{{ caseLabel(scope.row) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="scope">
            <el-tag size="small" :type="runStatusMeta(scope.row.status).type">
              {{ runStatusMeta(scope.row.status).label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="步骤（通过/失败/总数）" width="180">
          <template #default="scope">
            {{ scope.row.passed_steps ?? 0 }} / {{ scope.row.failed_steps ?? 0 }} / {{ scope.row.total_steps ?? 0 }}
          </template>
        </el-table-column>
        <el-table-column label="开始时间" min-width="170">
          <template #default="scope">{{ formatTime(scope.row.started_at || scope.row.created_at) }}</template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { projectApi, runStatusMeta, unwrapList } from '@/utils/api';

// 字段沿用 /dashboard/ 的四个键；成功率由后端按执行记录统计
const statistics = ref({
  projectCount: 0,
  caseCount: 0,
  todayRunCount: 0,
  successRate: 0,
});
const recentRuns = ref([]);

const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const caseLabel = (row) =>
  row.testcase_name || row.testcase?.name || (row.testcase != null ? `#${row.testcase?.id ?? row.testcase}` : '-');

const formatTime = (v) => {
  if (!v) return '-';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString('zh-CN', { hour12: false });
};

onMounted(async () => {
  try {
    const res = (await projectApi.getDashboard()) || {};
    statistics.value = {
      projectCount: toNumber(res.projectCount),
      caseCount: toNumber(res.caseCount),
      todayRunCount: toNumber(res.todayRunCount),
      successRate: toNumber(res.successRate),
    };
  } catch (error) {
    console.error('获取概览数据失败:', error);
  }
  try {
    recentRuns.value = unwrapList(await projectApi.getRuns({ page: 1, page_size: 10 })).items.slice(0, 10);
  } catch (error) {
    recentRuns.value = [];
  }
});
</script>

<style scoped>
.dashboard-container {
  padding: 20px;
}
.recent-runs {
  margin-top: 24px;
  padding: 16px 20px;
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}
.recent-runs h3 {
  margin: 0 0 12px;
  font-size: 15px;
}
.el-statistic {
  text-align: center;
  padding: 20px;
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}
</style>
