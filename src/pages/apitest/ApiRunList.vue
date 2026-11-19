<template>
  <div class="apitest-page">
    <!-- 筛选区域 -->
    <el-card class="control-card" shadow="never">
      <div class="control-container">
        <div class="control-left">
          <el-select v-model="filters.project" placeholder="筛选项目" class="filter-select" clearable @change="reload">
            <el-option v-for="project in projects" :key="project.id" :label="project.name" :value="project.id" />
          </el-select>
          <el-select v-model="filters.kind" placeholder="类型" class="filter-select" clearable @change="reload">
            <el-option label="场景" value="scenario" />
            <el-option label="单条用例" value="case" />
          </el-select>
          <el-select v-model="filters.status" placeholder="筛选状态" class="filter-select" clearable @change="reload">
            <el-option label="通过" value="passed" />
            <el-option label="失败" value="failed" />
            <el-option label="错误" value="error" />
            <el-option label="执行中" value="running" />
          </el-select>
          <el-select v-model="filters.trigger" placeholder="触发方式" class="filter-select" clearable @change="reload">
            <el-option label="手动" value="manual" />
            <el-option label="定时任务" value="schedule" />
          </el-select>
          <el-tag v-if="filters.scenario" closable type="info" @close="clearTarget">场景 #{{ filters.scenario }}</el-tag>
          <el-tag v-if="filters.case" closable type="info" @close="clearTarget">用例 #{{ filters.case }}</el-tag>
          <el-tag v-if="filters.task" closable type="info" @close="clearTarget">定时任务 #{{ filters.task }}</el-tag>
        </div>
        <div class="control-right">
          <el-tooltip content="刷新数据" placement="top">
            <el-button circle @click="fetchRuns" class="refresh-btn">
              <el-icon><Refresh /></el-icon>
            </el-button>
          </el-tooltip>
        </div>
      </div>
    </el-card>

    <!-- 执行记录列表 -->
    <el-card class="table-card" shadow="never">
      <template #header>
        <div class="table-header">
          <div class="table-title">
            <el-icon><List /></el-icon>
            <span>接口执行记录</span>
            <el-tag class="count-tag">{{ total }}</el-tag>
          </div>
        </div>
      </template>
      <el-table
        v-loading="loading"
        :data="runs"
        style="width: 100%"
        class="modern-table"
        empty-text="暂无执行记录"
        @row-click="openDetail"
      >
        <el-table-column prop="id" label="ID" width="80" align="center">
          <template #default="scope">#{{ scope.row.id }}</template>
        </el-table-column>
        <el-table-column label="执行对象" min-width="240" show-overflow-tooltip>
          <template #default="scope">
            <el-tag size="small" effect="plain" :type="scope.row.kind === 'scenario' ? 'primary' : 'info'">
              {{ scope.row.kind === 'scenario' ? '场景' : '用例' }}
            </el-tag>
            <span class="row-title" style="margin-left: 8px">{{ scope.row.name || scope.row.scenario_name || scope.row.case_name }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90" align="center">
          <template #default="scope">
            <el-tag :type="statusTagType(scope.row.status)" size="small" effect="light">{{ statusText(scope.row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="步骤（通过/失败/总数）" width="170" align="center">
          <template #default="scope">
            <span style="color: #059669">{{ scope.row.passed }}</span> /
            <span :style="{ color: scope.row.failed ? '#dc2626' : '#94a3b8' }">{{ scope.row.failed }}</span> /
            {{ scope.row.total }}
          </template>
        </el-table-column>
        <el-table-column label="环境" min-width="120">
          <template #default="scope">{{ scope.row.env_name || '-' }}</template>
        </el-table-column>
        <el-table-column label="耗时" width="110" align="center">
          <template #default="scope">{{ formatDuration(scope.row.duration_ms) }}</template>
        </el-table-column>
        <el-table-column label="触发" width="100" align="center">
          <template #default="scope">{{ triggerText(scope.row.trigger) }}</template>
        </el-table-column>
        <el-table-column label="执行人" width="100">
          <template #default="scope">{{ scope.row.created_by_name || '-' }}</template>
        </el-table-column>
        <el-table-column label="开始时间" width="170" align="center">
          <template #default="scope">{{ formatTime(scope.row.started_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template #default="scope">
            <el-button text size="small" class="action-btn-text" @click.stop="openDetail(scope.row)">
              <el-icon><View /></el-icon>详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pager">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @current-change="fetchRuns"
          @size-change="reload"
        />
      </div>
    </el-card>

    <el-drawer v-model="drawerVisible" title="执行详情" size="62%" destroy-on-close>
      <RunDetail :run-id="currentRunId" />
    </el-drawer>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { List, Refresh, View } from '@element-plus/icons-vue';
import { apiTestApi } from '@/utils/apiTestApi';
import RunDetail from './components/RunDetail.vue';
import { errorMessage, formatDuration, formatTime, statusTagType, statusText, triggerText } from './common';
import './apitest.css';

const route = useRoute();
const router = useRouter();

const projects = ref([]);
const runs = ref([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const loading = ref(false);
const drawerVisible = ref(false);
const currentRunId = ref(null);

// scenario / case / task 由别的页面带过来（如「执行历史」）
const filters = reactive({
  project: '',
  kind: '',
  status: '',
  trigger: '',
  scenario: route.query.scenario || '',
  case: route.query.case || '',
  task: route.query.task || '',
});

const fetchProjects = async () => {
  try {
    projects.value = await apiTestApi.getProjects();
  } catch (error) {
    console.error('获取项目列表失败:', error);
  }
};

const fetchRuns = async () => {
  loading.value = true;
  try {
    const params = { page: page.value, page_size: pageSize.value };
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) params[key] = value;
    });
    const res = await apiTestApi.getRuns(params);
    runs.value = res.results || [];
    total.value = res.count || 0;
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

const clearTarget = () => {
  filters.scenario = '';
  filters.case = '';
  filters.task = '';
  router.replace({ name: 'ApiRunList' });
  reload();
};

const openDetail = (row) => {
  currentRunId.value = row.id;
  drawerVisible.value = true;
};

onMounted(() => {
  fetchProjects();
  fetchRuns();
  // 带 ?run=ID 进来时直接打开这次执行的详情
  if (route.query.run) openDetail({ id: route.query.run });
});
</script>
