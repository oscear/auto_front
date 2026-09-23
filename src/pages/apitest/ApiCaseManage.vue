<template>
  <div class="case-manager">
    <!-- 操作和筛选区域 -->
    <el-card class="control-card" shadow="never">
      <div class="control-container">
        <!-- 左侧搜索和筛选 -->
        <div class="control-left">
          <div class="search-section">
            <el-input
              v-model="searchQuery"
              placeholder="搜索用例名称或描述..."
              class="search-input"
              clearable
              @input="handleSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </div>

          <div class="filter-section">
            <el-select
              v-model="filterProject"
              placeholder="筛选项目"
              class="filter-select"
              clearable
              @change="handleFilter"
            >
              <el-option label="全部项目" value="" />
              <el-option v-for="project in projects" :key="project.id" :label="project.name" :value="project.id" />
            </el-select>

            <el-select
              v-model="filterMethod"
              placeholder="筛选请求方法"
              class="filter-select"
              clearable
              @change="handleFilter"
            >
              <el-option label="全部方法" value="" />
              <el-option label="GET" value="GET" />
              <el-option label="POST" value="POST" />
              <el-option label="PUT" value="PUT" />
              <el-option label="DELETE" value="DELETE" />
              <el-option label="PATCH" value="PATCH" />
            </el-select>

            <el-select
              v-model="filterStatus"
              placeholder="筛选状态"
              class="filter-select"
              clearable
              @change="handleFilter"
            >
              <el-option label="全部状态" value="" />
              <el-option label="待执行" value="pending" />
              <el-option label="通过" value="passed" />
              <el-option label="失败" value="failed" />
              <el-option label="错误" value="error" />
            </el-select>

            <el-select
              v-model="filterCreator"
              placeholder="筛选创建人"
              class="filter-select"
              clearable
              @change="handleFilter"
            >
              <el-option label="全部创建人" value="" />
              <el-option v-for="creator in uniqueCreators" :key="creator" :label="creator" :value="creator" />
            </el-select>
          </div>
        </div>

        <!-- 右侧操作按钮 -->
        <div class="control-right">
          <el-tooltip content="刷新数据" placement="top">
            <el-button circle @click="fetchApiCases" class="refresh-btn">
              <el-icon><Refresh /></el-icon>
            </el-button>
          </el-tooltip>

          <div class="view-switch">
            <el-segmented v-model="viewMode" :options="viewOptions" size="default" />
          </div>

          <div class="action-buttons">
            <el-button type="primary" size="large" @click="handleAddNew" class="action-btn primary">
              <el-icon><Plus /></el-icon>
              新增用例
            </el-button>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 用例列表 -->
    <el-card class="table-card" shadow="never">
      <template #header>
        <div class="table-header">
          <div class="table-title">
            <el-icon><List /></el-icon>
            <span>接口用例列表</span>
            <el-tag class="count-tag">{{ filteredTestcases.length }}</el-tag>
          </div>
        </div>
      </template>

      <!-- 表格视图 -->
      <div v-if="viewMode === 'table'" class="table-container">
        <el-table
          :data="filteredTestcases"
          style="width: 100%"
          class="modern-table"
          empty-text="暂无数据"
          @row-click="handleRowClick"
        >
          <el-table-column prop="id" label="ID" min-width="60" align="center">
            <template #default="scope">
              #{{ scope.row.id }}
            </template>
          </el-table-column>

          <el-table-column prop="name" label="用例名称" min-width="200" show-overflow-tooltip>
            <template #default="scope">
              <div class="case-name-cell">
                <div class="case-text">
                  <div class="case-title">{{ scope.row.name }}</div>
                </div>
              </div>
            </template>
          </el-table-column>

          <el-table-column prop="method" label="请求方法" min-width="80" align="center">
            <template #default="scope">
              <el-tag 
                :type="getMethodTagType(scope.row.method)" 
                size="small"
                effect="light"
              >
                {{ scope.row.method }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="url" label="接口地址" min-width="250" show-overflow-tooltip>
            <template #default="scope">
              <div class="url-cell">
                <el-icon class="url-icon"><Link /></el-icon>
                <span>{{ scope.row.url }}</span>
              </div>
            </template>
          </el-table-column>

          <el-table-column prop="project" label="所属项目" min-width="120">
            <template #default="scope">
              <span class="project-text">{{ getProjectName(scope.row.project) }}</span>
            </template>
          </el-table-column>

          <el-table-column prop="status" label="状态" min-width="80" align="center">
            <template #default="scope">
              <el-tag :type="getStatusTagType(scope.row.status)" size="small" effect="light">
                {{ getStatusText(scope.row.status) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="priority" label="优先级" min-width="80" align="center">
            <template #default="scope">
              <el-tag :type="getPriorityTagType(scope.row.priority)" size="small" effect="light">
                {{ getPriorityText(scope.row.priority) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="created_by" label="创建人" min-width="100">
            <template #default="scope">
              <div class="creator-cell">
                <el-avatar :size="24" class="creator-avatar">
                  {{ scope.row.created_by?.charAt(0)?.toUpperCase() }}
                </el-avatar>
                <span>{{ scope.row.created_by }}</span>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="操作" min-width="200" align="center">
            <template #default="scope">
              <div class="action-buttons">
                <el-button text size="small" @click.stop="handleEditNew(scope.row)" class="action-btn-text">
                  <el-icon><Edit /></el-icon>
                  编辑
                </el-button>
                <el-button text size="small" @click.stop="handleExecute(scope.row)" class="action-btn-text">
                  <el-icon><VideoPlay /></el-icon>
                  运行
                </el-button>
                <el-button text size="small" @click.stop="handleViewResult(scope.row)" class="action-btn-text">
                  <el-icon><View /></el-icon>
                  结果
                </el-button>
                <el-button text size="small" @click.stop="handleDelete(scope.row)" class="action-btn-text danger">
                  <el-icon><Delete /></el-icon>
                  删除
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 卡片视图 -->
      <div v-else class="cards-container">
        <div class="cases-grid">
          <el-card
            v-for="testcase in filteredTestcases"
            :key="testcase.id"
            class="case-card"
            shadow="hover"
            @click="handleRowClick(testcase)"
          >
            <template #header>
              <div class="case-card-header">
                <div class="case-info">
                  <span class="case-id">#{{ testcase.id }}</span>
                  <span class="case-project">{{ getProjectName(testcase.project) }}</span>
                </div>
                <el-dropdown trigger="click" @click.stop>
                  <el-button text class="card-action-btn">
                    <el-icon><MoreFilled /></el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item @click="handleEditNew(testcase)">
                        <el-icon><Edit /></el-icon>编辑
                      </el-dropdown-item>
                      <el-dropdown-item @click="handleExecute(testcase)">
                        <el-icon><VideoPlay /></el-icon>运行
                      </el-dropdown-item>
                      <el-dropdown-item @click="handleViewResult(testcase)">
                        <el-icon><View /></el-icon>查看结果
                      </el-dropdown-item>
                      <el-dropdown-item divided @click="handleDelete(testcase)">
                        <el-icon><Delete /></el-icon>删除
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </template>

            <div class="case-card-body">
              <div class="case-header-section">
                <h3 class="case-title">{{ testcase.name }}</h3>
                <div class="case-status">
                  <el-tag :type="getStatusTagType(testcase.status)" size="small" effect="light">
                    {{ getStatusText(testcase.status) }}
                  </el-tag>
                </div>
              </div>
              
              <p class="case-description" v-if="testcase.description">
                {{ testcase.description }}
              </p>
              <p class="case-description placeholder" v-else>
                暂无描述信息
              </p>

              <div class="case-meta">
                <div class="meta-item">
                  <el-icon class="meta-icon"><Link /></el-icon>
                  <span class="meta-label">方法:</span>
                  <el-tag :type="getMethodTagType(testcase.method)" size="small" effect="light">
                    {{ testcase.method }}
                  </el-tag>
                </div>
                <div class="meta-item">
                  <el-icon class="meta-icon"><Position /></el-icon>
                  <span class="meta-label">URL:</span>
                  <span class="meta-value url-text">{{ testcase.url }}</span>
                </div>
                <div class="meta-item">
                  <el-icon class="meta-icon"><Star /></el-icon>
                  <span class="meta-label">优先级:</span>
                  <el-tag :type="getPriorityTagType(testcase.priority)" size="small" effect="light">
                    {{ getPriorityText(testcase.priority) }}
                  </el-tag>
                </div>
                <div class="meta-item">
                  <el-icon class="meta-icon"><User /></el-icon>
                  <span class="meta-label">创建人:</span>
                  <span class="meta-value">{{ testcase.created_by }}</span>
                </div>
                <div class="meta-item" v-if="testcase.created_at">
                  <el-icon class="meta-icon"><Clock /></el-icon>
                  <span class="meta-label">创建时间:</span>
                  <span class="meta-value">{{ formatDate(testcase.created_at) }}</span>
                </div>
              </div>
            </div>
          </el-card>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useRouter } from 'vue-router';
import {
  Plus,
  Search,
  Refresh,
  User,
  List,
  Edit,
  VideoPlay,
  View,
  Delete,
  Link,
  Position,
  Star,
  Clock,
  MoreFilled,
} from '@element-plus/icons-vue';
import { apiTestApi } from '@/utils/api';

const router = useRouter();

// 数据
const testcases = ref([]);
const projects = ref([]);

// 筛选和搜索数据
const searchQuery = ref('');
const filterProject = ref('');
const filterMethod = ref('');
const filterStatus = ref('');
const filterCreator = ref('');
const viewMode = ref('table');

// 视图模式选项
const viewOptions = [
  { label: '表格视图', value: 'table' },
  { label: '卡片视图', value: 'cards' },
];

// 计算属性：筛选后的用例列表
const filteredTestcases = computed(() => {
  let filtered = testcases.value;

  // 搜索过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(
      (item) => item.name?.toLowerCase().includes(query) || 
                item.description?.toLowerCase().includes(query) ||
                item.url?.toLowerCase().includes(query)
    );
  }

  // 项目过滤
  if (filterProject.value) {
    filtered = filtered.filter((item) => item.project === filterProject.value);
  }

  // 请求方法过滤
  if (filterMethod.value) {
    filtered = filtered.filter((item) => item.method === filterMethod.value);
  }

  // 状态过滤
  if (filterStatus.value) {
    filtered = filtered.filter((item) => item.status === filterStatus.value);
  }

  // 创建人过滤
  if (filterCreator.value) {
    filtered = filtered.filter((item) => item.created_by === filterCreator.value);
  }

  return filtered;
});

// 计算属性：唯一的创建人列表
const uniqueCreators = computed(() => {
  const creators = testcases.value.map((item) => item.created_by).filter(Boolean);
  return [...new Set(creators)];
});

// 搜索处理
const handleSearch = () => {
  // 搜索逻辑已在计算属性中处理
};

// 筛选处理
const handleFilter = () => {
  // 筛选逻辑已在计算属性中处理
};

// 行点击处理
const handleRowClick = (row) => {
  // 可以在这里添加行点击逻辑，比如快速预览
};

// 获取项目名称
const getProjectName = (projectId) => {
  const project = projects.value.find((p) => p.id === projectId);
  return project?.name || '未知项目';
};

// 获取方法标签类型
const getMethodTagType = (method) => {
  const typeMap = {
    GET: 'success',
    POST: 'primary',
    PUT: 'warning',
    DELETE: 'danger',
    PATCH: 'info',
    HEAD: 'info',
    OPTIONS: 'info',
  };
  return typeMap[method] || 'info';
};

// 获取状态标签类型
const getStatusTagType = (status) => {
  const typeMap = {
    pending: 'info',
    running: 'warning',
    passed: 'success',
    failed: 'danger',
    error: 'danger',
  };
  return typeMap[status] || 'info';
};

// 获取状态文本
const getStatusText = (status) => {
  const textMap = {
    pending: '待执行',
    running: '执行中',
    passed: '通过',
    failed: '失败',
    error: '错误',
  };
  return textMap[status] || status;
};

// 获取优先级标签类型
const getPriorityTagType = (priority) => {
  const typeMap = {
    high: 'danger',
    medium: 'warning',
    low: 'info',
  };
  return typeMap[priority] || 'info';
};

// 获取优先级文本
const getPriorityText = (priority) => {
  const textMap = {
    high: '高',
    medium: '中',
    low: '低',
  };
  return textMap[priority] || priority;
};

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 1) {
    return '今天';
  } else if (diffDays === 2) {
    return '昨天';
  } else if (diffDays <= 7) {
    return `${diffDays - 1}天前`;
  } else {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }
};

// 获取用例列表
const fetchApiCases = async () => {
  try {
    const response = await apiTestApi.getApiCases();
    console.log('获取到的接口用例列表:', response.data);
    testcases.value = response;
  } catch (error) {
    console.error('获取接口用例列表失败:', error);
    ElMessage.error('获取接口用例列表失败');
  }
};

// 获取项目列表
const fetchProjects = async () => {
  try {
    const response = await apiTestApi.getProjects();
    projects.value = response;
  } catch (error) {
    console.error('获取项目列表失败:', error);
    ElMessage.error('获取项目列表失败');
  }
};

// 新增用例
const handleAddNew = () => {
  router.push({ name: 'ApiCaseEdit' });
};

// 编辑用例
const handleEditNew = (testcase) => {
  router.push({ name: 'ApiCaseEdit', params: { id: testcase.id } });
};

// 运行用例
const handleExecute = async (testcase) => {
  try {
    console.log('运行接口用例', testcase);
    await apiTestApi.runApiCase({ id: testcase.id });
    ElMessage.success('执行成功');
    // 刷新列表以更新状态
    fetchApiCases();
  } catch (error) {
    console.error('执行失败:', error);
    ElMessage.error('执行失败');
  }
};

// 查看执行结果
const handleViewResult = (testcase) => {
  console.log('查看执行结果', testcase);
  router.push({ 
    name: 'ApiCaseEdit', 
    params: { id: testcase.id },
    query: { viewMode: 'true' }
  });
};

// 删除用例
const handleDelete = (testcase) => {
  ElMessageBox.confirm('确认删除该接口用例吗？', '提示', {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(async () => {
    try {
      await apiTestApi.deleteApiCase(testcase.id);
      ElMessage.success('删除成功');
      fetchApiCases();
    } catch (error) {
      console.error('删除失败:', error);
      ElMessage.error('删除失败');
    }
  });
};

onMounted(() => {
  fetchApiCases();
  fetchProjects();
});
</script>

<style scoped>
.case-manager {
  padding: 20px;
  background: #f5f5f5;
  min-height: 100vh;
}

/* 操作和筛选区域 */
.control-card {
  margin-bottom: 16px;
  border-radius: 8px;
  border: 1px solid #e5e6eb;
  background: #fff;
}

.control-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
}

.control-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.search-section {
  min-width: 200px;
}

.search-input :deep(.el-input__wrapper) {
  border-radius: 6px;
  border: 1px solid #e5e6eb;
  height: 36px;
}

.filter-section {
  display: flex;
  gap: 12px;
}

.filter-select {
  width: 140px;
}

.filter-select :deep(.el-select__wrapper) {
  border-radius: 6px;
  border: 1px solid #e5e6eb;
  height: 36px;
}

.control-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.refresh-btn {
  width: 36px;
  height: 36px;
  border-radius: 6px;
}

.view-switch :deep(.el-segmented) {
  height: 36px;
  border-radius: 6px;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
}

/* 表格卡片 */
.table-card {
  margin-top: 16px;
  border-radius: 8px;
  border: 1px solid #e5e6eb;
  background: #fff;
}

.table-card :deep(.el-card__header) {
  padding: 16px 20px;
  border-bottom: 1px solid #e5e6eb;
}

.table-card :deep(.el-card__body) {
  padding: 0;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.count-tag {
  background: #409eff;
  color: white;
  border: none;
  border-radius: 12px;
  padding: 2px 8px;
  font-size: 12px;
}

/* 表格样式 */
.modern-table {
  border-radius: 8px;
}

.modern-table :deep(.el-table__header th) {
  background: #fafbfc;
  border-bottom: 1px solid #e5e6eb;
  color: #333;
  font-weight: 600;
  padding: 12px 8px;
}

.modern-table :deep(.el-table__body tr) {
  background: #fff;
  border-bottom: 1px solid #e5e6eb;
}

.modern-table :deep(.el-table__body tr:hover) {
  background: #f7f8fa;
}

.modern-table :deep(.el-table__body td) {
  border-right: 1px solid #e5e6eb;
  padding: 12px 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.modern-table :deep(.el-table__body td:last-child) {
  border-right: none;
}

.case-name-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.case-text {
  flex: 1;
}

.case-title {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 4px;
}

.url-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.url-icon {
  color: #64748b;
  font-size: 14px;
}

.creator-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.creator-avatar {
  background: #409eff;
  color: white;
  font-size: 12px;
  font-weight: 600;
}

.action-btn-text {
  color: #64748b;
  font-size: 13px;
}

.action-btn-text:hover {
  color: #3b82f6;
}

.action-btn-text.danger {
  color: #ef4444;
}

.action-btn-text.danger:hover {
  color: #dc2626;
}

/* 卡片视图样式 */
.cards-container {
  padding: 20px;
}

.cases-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.case-card {
  border-radius: 8px;
  border: 1px solid #e5e6eb;
  transition: all 0.3s ease;
  cursor: pointer;
}

.case-card:hover {
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.case-card :deep(.el-card__header) {
  padding: 12px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e5e6eb;
}

.case-card :deep(.el-card__body) {
  padding: 16px;
}

.case-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.case-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.case-id {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

.case-project {
  font-size: 12px;
  color: #3b82f6;
  background: #eff6ff;
  padding: 2px 8px;
  border-radius: 4px;
}

.case-card-body .case-title {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 12px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.case-header-section {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.case-header-section .case-title {
  flex: 1;
  margin-bottom: 0;
  margin-right: 12px;
  transition: color 0.2s ease;
}

.case-card:hover .case-title {
  color: #3b82f6;
}

.case-status {
  flex-shrink: 0;
}

.case-description {
  color: #64748b;
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 16px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.2s ease;
}

.case-description.placeholder {
  color: #94a3b8;
  font-style: italic;
}

.case-meta {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 16px;
  border-top: 1px solid #f1f5f9;
  position: relative;
}

.case-meta::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, #e2e8f0, transparent);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #475569;
  padding: 6px 0;
  transition: all 0.2s ease;
}

.meta-item:hover {
  background: #f8fafc;
  border-radius: 4px;
  padding-left: 4px;
  padding-right: 4px;
}

.meta-icon {
  font-size: 14px;
  color: #64748b;
  width: 16px;
  text-align: center;
  transition: color 0.2s ease;
}

.meta-item:hover .meta-icon {
  color: #3b82f6;
}

.meta-label {
  color: #64748b;
  font-weight: 500;
  min-width: 60px;
}

.meta-value {
  color: #1e293b;
  font-weight: 500;
  transition: color 0.2s ease;
}

.meta-item:hover .meta-value {
  color: #3b82f6;
}

.url-text {
  font-size: 12px;
  word-break: break-all;
  line-height: 1.4;
}

/* 卡片操作按钮优化 */
.case-card :deep(.el-dropdown) {
  position: relative;
}

.card-action-btn {
  border-radius: 6px;
  transition: all 0.2s ease;
  padding: 6px;
  width: 32px;
  height: 32px;
  opacity: 0.7;
}

.card-action-btn:hover {
  background: #f1f5f9;
  color: #3b82f6;
  opacity: 1;
  transform: scale(1.05);
}

.case-card:hover .card-action-btn {
  opacity: 1;
}

.case-card :deep(.el-button) {
  border-radius: 6px;
  transition: all 0.2s ease;
}

.case-card :deep(.el-button:hover) {
  background: #f1f5f9;
  color: #3b82f6;
}

/* 响应式卡片布局 */
@media (max-width: 1200px) {
  .cases-grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
  }
}

@media (max-width: 768px) {
  .cases-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  
  .case-card {
    border-radius: 8px;
  }
  
  .case-card-header {
    padding: 12px 16px 8px;
  }
  
  .case-card-body {
    padding: 16px;
  }
  
  .case-header-section {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .case-status {
    align-self: flex-end;
  }
  
  .control-container {
    flex-direction: column;
    gap: 12px;
  }
  
  .control-left {
    width: 100%;
    flex-direction: column;
    gap: 8px;
  }
  
  .filter-section {
    width: 100%;
    flex-wrap: wrap;
  }
  
  .filter-select {
    flex: 1;
    min-width: 120px;
  }
}

/* 响应式 */
@media (max-width: 768px) {
  .case-manager {
    padding: 12px;
  }
}
</style> 