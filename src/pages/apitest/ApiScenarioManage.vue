<template>
  <div class="apitest-page">
    <!-- 操作和筛选区域 -->
    <el-card class="control-card" shadow="never">
      <div class="control-container">
        <div class="control-left">
          <el-input v-model="searchQuery" placeholder="搜索场景名称或描述..." class="search-input" clearable>
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-select v-model="filterProject" placeholder="筛选项目" class="filter-select" clearable @change="fetchScenarios">
            <el-option v-for="project in projects" :key="project.id" :label="project.name" :value="project.id" />
          </el-select>
        </div>
        <div class="control-right">
          <el-tooltip content="刷新数据" placement="top">
            <el-button circle @click="fetchScenarios" class="refresh-btn">
              <el-icon><Refresh /></el-icon>
            </el-button>
          </el-tooltip>
          <el-button type="primary" size="large" @click="handleAdd" class="action-btn primary">
            <el-icon><Plus /></el-icon>
            新增场景
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 场景列表 -->
    <el-card class="table-card" shadow="never">
      <template #header>
        <div class="table-header">
          <div class="table-title">
            <el-icon><List /></el-icon>
            <span>接口场景</span>
            <el-tag class="count-tag">{{ filteredScenarios.length }}</el-tag>
          </div>
        </div>
      </template>
      <el-table
        v-loading="loading"
        :data="filteredScenarios"
        style="width: 100%"
        class="modern-table"
        empty-text="还没有场景。场景把多条接口用例按顺序串起来，前一步提取的变量后一步可以用。"
      >
        <el-table-column prop="id" label="ID" width="70" align="center">
          <template #default="scope">#{{ scope.row.id }}</template>
        </el-table-column>
        <el-table-column prop="name" label="场景名称" min-width="220">
          <template #default="scope">
            <div class="row-title">{{ scope.row.name }}</div>
            <div v-if="scope.row.description" class="row-sub">{{ scope.row.description }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="project_name" label="所属项目" min-width="120" />
        <el-table-column label="环境" min-width="120">
          <template #default="scope">{{ scope.row.env_name || '项目默认' }}</template>
        </el-table-column>
        <el-table-column label="步骤" width="80" align="center">
          <template #default="scope">{{ scope.row.step_count }}</template>
        </el-table-column>
        <el-table-column label="数据集" width="80" align="center">
          <template #default="scope">{{ (scope.row.datasets || []).length || '-' }}</template>
        </el-table-column>
        <el-table-column label="最近执行" min-width="190" align="center">
          <template #default="scope">
            <template v-if="scope.row.last_run_id">
              <el-tag :type="statusTagType(scope.row.last_run_status)" size="small" effect="light">
                {{ statusText(scope.row.last_run_status) }}
              </el-tag>
              <el-link type="primary" :underline="false" style="margin-left: 8px" @click="launcher?.showRun(scope.row.last_run_id)">
                {{ formatTime(scope.row.last_run_time) }}
              </el-link>
            </template>
            <span v-else class="row-sub">还没执行过</span>
          </template>
        </el-table-column>
        <el-table-column prop="created_by" label="创建人" width="100" />
        <el-table-column label="操作" width="270" align="center" fixed="right">
          <template #default="scope">
            <div class="action-buttons">
              <el-button text size="small" class="action-btn-text" @click="handleEdit(scope.row)">
                <el-icon><Edit /></el-icon>编排
              </el-button>
              <el-button text size="small" class="action-btn-text" @click="handleRun(scope.row)">
                <el-icon><VideoPlay /></el-icon>运行
              </el-button>
              <el-button text size="small" class="action-btn-text" @click="handleHistory(scope.row)">
                <el-icon><Clock /></el-icon>历史
              </el-button>
              <el-button text size="small" class="action-btn-text danger" @click="handleDelete(scope.row)">
                <el-icon><Delete /></el-icon>删除
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <RunLauncher ref="launcher" @done="fetchScenarios" />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Clock, Delete, Edit, List, Plus, Refresh, Search, VideoPlay } from '@element-plus/icons-vue';
import { apiTestApi } from '@/utils/apiTestApi';
import RunLauncher from './components/RunLauncher.vue';
import { errorMessage, formatTime, statusTagType, statusText } from './common';
import './apitest.css';

const router = useRouter();
const launcher = ref(null);
const projects = ref([]);
const scenarios = ref([]);
const loading = ref(false);
const searchQuery = ref('');
const filterProject = ref('');

const filteredScenarios = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) return scenarios.value;
  return scenarios.value.filter(
    (item) => item.name?.toLowerCase().includes(query) || item.description?.toLowerCase().includes(query)
  );
});

const fetchProjects = async () => {
  try {
    projects.value = await apiTestApi.getProjects();
  } catch (error) {
    ElMessage.error(errorMessage(error, '获取项目列表失败'));
  }
};

const fetchScenarios = async () => {
  loading.value = true;
  try {
    scenarios.value = await apiTestApi.getScenarios(filterProject.value ? { project: filterProject.value } : {});
  } catch (error) {
    ElMessage.error(errorMessage(error, '获取场景列表失败'));
  } finally {
    loading.value = false;
  }
};

const handleAdd = () => {
  router.push({ name: 'ApiScenarioEdit', query: filterProject.value ? { project: filterProject.value } : {} });
};
const handleEdit = (scenario) => {
  router.push({ name: 'ApiScenarioEdit', params: { id: scenario.id } });
};
const handleRun = (scenario) => {
  if (!scenario.step_count) {
    ElMessage.warning('这个场景还没有步骤，先去编排');
    return;
  }
  launcher.value?.open({
    kind: 'scenario',
    id: scenario.id,
    name: scenario.name,
    projectId: scenario.project,
    envId: scenario.env,
  });
};
const handleHistory = (scenario) => {
  router.push({ name: 'ApiRunList', query: { scenario: scenario.id } });
};
const handleDelete = (scenario) => {
  ElMessageBox.confirm(`确认删除场景「${scenario.name}」吗？历史执行记录会保留。`, '提示', {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(async () => {
      try {
        await apiTestApi.deleteScenario(scenario.id);
        ElMessage.success('删除成功');
        fetchScenarios();
      } catch (error) {
        ElMessage.error(errorMessage(error, '删除失败'));
      }
    })
    .catch(() => {});
};

onMounted(() => {
  fetchProjects();
  fetchScenarios();
});
</script>
