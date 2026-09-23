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
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { projectApi } from '@/utils/api';
// import { getStatistics } from '@/api/dashboard';

// const statistics = ref({
//   projectCount: 5,
//   caseCount: 27,
//   todayRunCount: 27,
//   successRate: 95,
// });

const statistics = ref([]);

onMounted(async () => {
  const res = await projectApi.getDashboard();
  statistics.value = res;
});
</script>

<style scoped>
.dashboard-container {
  padding: 20px;
}
.el-statistic {
  text-align: center;
  padding: 20px;
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}
</style>
