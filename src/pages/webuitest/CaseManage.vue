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
            <el-button circle @click="fetchtestcases" class="refresh-btn">
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
            <span>用例列表</span>
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
            <template #default="scope"> #{{ scope.row.id }}
              <!-- <el-tag size="small" class="id-tag">#{{ scope.row.id }}</el-tag> -->
            </template>
          </el-table-column>

          <el-table-column prop="name" label="用例名称" min-width="180" show-overflow-tooltip>
            <template #default="scope">
              <div class="case-name-cell">
                <div class="case-text">
                  <div class="case-title">{{ scope.row.name }}</div>
                  <!-- <div class="case-desc" v-if="scope.row.description">
                    {{ scope.row.description }}
                  </div> -->
                </div>
              </div>
      </template>
          </el-table-column>

          <el-table-column prop="project" label="所属项目" min-width="100">
            <template #default="scope">
              <span class="project-text">{{ getProjectName(scope.row.project) }}</span>
            </template>
          </el-table-column>

          <el-table-column prop="device" label="测试设备" min-width="120">
            <template #default="scope">
              <div class="device-cell">
                <el-icon class="device-icon">
                  <Monitor v-if="scope.row.device === 'chrome' || scope.row.device === 'firefox'" />
                  <Iphone v-else />
                </el-icon>
                <span>{{ scope.row.device }}</span>
              </div>
            </template>
          </el-table-column>

          <el-table-column prop="username" label="创建人" min-width="50">
            <template #default="scope">
              <div class="creator-cell">
                <el-avatar :size="24" class="creator-avatar">
                  {{ scope.row.username?.charAt(0)?.toUpperCase() }}
                </el-avatar>
                <!-- <span>{{ scope.row.username }}</span> -->
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
                <el-button text size="small" @click.stop="handlExecute(scope.row)" class="action-btn-text">
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
                      <el-dropdown-item @click="handlExecute(testcase)">
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
                  <el-tag size="small" type="success" effect="light">正常</el-tag>
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
                  <el-icon class="meta-icon">
                    <Monitor v-if="testcase.device === 'chrome' || testcase.device === 'firefox'" />
                    <Iphone v-else />
                  </el-icon>
                  <span class="meta-label">设备:</span>
                  <span class="meta-value">{{ testcase.device }}</span>
                </div>
                <div class="meta-item">
                  <el-icon class="meta-icon"><User /></el-icon>
                  <span class="meta-label">创建人:</span>
                  <span class="meta-value">{{ testcase.username }}</span>
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
import { ref, onMounted, computed, nextTick, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useRouter } from 'vue-router';
import {
  Document,
  Plus,
  Search,
  Refresh,
  User,
  List,
  Edit,
  VideoPlay,
  View,
  Delete,
  Monitor,
  Iphone,
  MoreFilled,
  Clock,
} from '@element-plus/icons-vue';
import { projectApi } from '@/utils/api';

const router = useRouter();

// 原有的数据
const testcases = ref([]);
const projects = ref([]);

// 新增的筛选和搜索数据
const searchQuery = ref('');
const filterProject = ref('');
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
      (item) => item.name?.toLowerCase().includes(query) || item.description?.toLowerCase().includes(query)
    );
  }

  // 项目过滤
  if (filterProject.value) {
    filtered = filtered.filter((item) => item.project === filterProject.value);
  }

  // 创建人过滤
  if (filterCreator.value) {
    filtered = filtered.filter((item) => item.username === filterCreator.value);
  }

  return filtered;
});

// 计算属性：唯一的创建人列表
const uniqueCreators = computed(() => {
  const creators = testcases.value.map((item) => item.username).filter(Boolean);
  return [...new Set(creators)];
});

// 保存筛选条件到 sessionStorage
const saveFiltersToStorage = () => {
  const filters = {
    searchQuery: searchQuery.value,
    filterProject: filterProject.value,
    filterCreator: filterCreator.value,
    viewMode: viewMode.value
  };
  sessionStorage.setItem('caseManage_filters', JSON.stringify(filters));
};

// 从 sessionStorage 恢复筛选条件
const restoreFiltersFromStorage = () => {
  try {
    const savedFilters = JSON.parse(sessionStorage.getItem('caseManage_filters') || '{}');
    if (savedFilters.searchQuery !== undefined) searchQuery.value = savedFilters.searchQuery;
    if (savedFilters.filterProject !== undefined) filterProject.value = savedFilters.filterProject;
    if (savedFilters.filterCreator !== undefined) filterCreator.value = savedFilters.filterCreator;
    if (savedFilters.viewMode !== undefined) viewMode.value = savedFilters.viewMode;
  } catch (error) {
    console.error('恢复筛选条件失败:', error);
  }
};

// 搜索处理
const handleSearch = () => {
  // 搜索逻辑已在计算属性中处理
  saveFiltersToStorage();
};

// 筛选处理
const handleFilter = () => {
  // 筛选逻辑已在计算属性中处理
  saveFiltersToStorage();
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

//必填校验
const formRef = ref(null);
const rules = {
  project: [{ required: true, message: '请选择项目', trigger: 'change' }],
  name: [{ required: true, message: '请输入用例名称', trigger: 'blur' }],
  device: [{ required: true, message: '请选择测试设备', trigger: 'change' }],
};

// 获取用例列表
const fetchtestcases = async () => {
  try {
    const response = await projectApi.getCases();
    console.log('获取到的用例列表:', response.data);
    testcases.value = response;
  } catch (error) {
    console.error('获取用例列表失败:', error);
    ElMessage.error('用例正在执行中running,请稍后再试');
  }
};

// 获取项目列表
const fetchProjects = async () => {
  try {
    const response = await projectApi.getProjects();
    projects.value = response;
  } catch (error) {
    console.error('获取项目列表失败:', error);
    ElMessage.error('获取项目列表失败');
  }
};

// 新增用例（新页面）
const handleAddNew = () => {
  router.push({ name: 'TestCaseEdit' });
};

// 编辑用例（新页面）
const handleEditNew = (testcase) => {
  router.push({ name: 'TestCaseEdit', params: { id: testcase.id } });
};

// 运行用例
const handlExecute = async (project) => {
  console.log('运行用例', project);
  await projectApi.runCase({'id':project.id});
  ElMessage.success('执行成功');
};

// 查看执行结果
const handleViewResult = (project) => {
  console.log('查看执行结果', project);
  // 跳转到TestCaseEdit页面的查看模式
  router.push({ 
    name: 'TestCaseEdit', 
    params: { id: project.id },
    query: { viewMode: 'true' }
  });
};

// 删除用例
const handleDelete = (project) => {
  ElMessageBox.confirm('确认删除该用例吗？', '提示', {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(async () => {
    try {
      await projectApi.deleteCase(project.id);
      ElMessage.success('删除成功');
      fetchtestcases();
    } catch (error) {
      ElMessage.error('删除失败');
    }
  });
};



// 监听筛选条件变化，自动保存
watch([searchQuery, filterProject, filterCreator, viewMode], () => {
  saveFiltersToStorage();
}, { deep: true });

onMounted(() => {
  fetchtestcases();
  fetchProjects();
  restoreFiltersFromStorage();
});
</script>

<style scoped>
.case-manager {
  padding: 12px;
  background: #f5f7fa;
  min-height: 100vh;
}

/* 操作和筛选区域 */
.control-card {
  margin-bottom: 8px;
  border-radius: 4px;
  border: 1px solid #e5e6eb;
  background: #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}

.control-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
}

.control-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.search-section {
  min-width: 160px;
}

.search-input :deep(.el-input__wrapper) {
  border-radius: 4px;
  border: 1px solid #e5e6eb;
  height: 28px;
}

.filter-select {
  width: 150px;
}

.filter-select :deep(.el-select__wrapper) {
  border-radius: 4px;
  border: 1px solid #e5e6eb;
  height: 28px;
}

.control-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.refresh-btn {
  width: 28px;
  height: 28px;
  border-radius: 4px;
}

.view-switch :deep(.el-segmented) {
  height: 28px;
  border-radius: 4px;
}

.action-buttons {
  display: flex;
  gap: 4px;
}

.action-btn {
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
}

/* 表格卡片 */
.table-card {
  margin-top: 8px;
  border-radius: 6px;
  border: 1px solid #e5e6eb;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.table-card :deep(.el-card__header) {
  padding: 12px 16px;
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
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.count-tag {
  background: #409eff;
  color: white;
  border: none;
  border-radius: 10px;
  padding: 1px 6px;
  font-size: 11px;
}

/* 表格样式 */
.modern-table {
  border-radius: 6px;
}

.modern-table :deep(.el-table__header th) {
  background: #f8f9fa;
  border-bottom: 1px solid #e5e6eb;
  color: #333;
  font-weight: 600;
  padding: 8px 6px;
  font-size: 13px;
}

.modern-table :deep(.el-table__body tr) {
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
}

.modern-table :deep(.el-table__body tr:hover) {
  background: #f7f8fa;
}

.modern-table :deep(.el-table__body td) {
  border-right: 1px solid #f0f0f0;
  padding: 8px 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
}

.modern-table :deep(.el-table__body td:last-child) {
  border-right: none;
}

.case-name-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}

.case-title-ellipsis {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  display: block;
}

.case-desc {
  font-size: 11px;
  color: #666;
}

.project-text {
  color: #666;
  font-size: 12px;
  font-weight: 500;
}

.device-cell {
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

.device-icon {
  color: #666;
  font-size: 12px;
}

.creator-cell {
  display: flex;
  align-items: center;
  gap: 4px;
}

.creator-avatar {
  background: #409eff;
  color: white;
  font-size: 11px;
}

.action-buttons {
  display: flex;
  gap: 2px;
  white-space: nowrap;
  justify-content: center;
}

.action-btn-text {
  padding: 2px 6px;
  font-size: 11px;
  border-radius: 3px;
  color: #666;
  transition: all 0.2s;
}

.action-btn-text:hover {
  background: #f5f7fa;
  color: #409eff;
}

.action-btn-text.danger:hover {
  background: #fef0f0;
  color: #f56c6c;
}

.case-id {
  color: #999;
  font-size: 11px;
  font-weight: 500;
  background: #f5f7fa;
  padding: 1px 4px;
  border-radius: 3px;
}

.case-project {
  color: #666;
  font-size: 11px;
  font-weight: 500;
  background: #f0f9ff;
  padding: 1px 4px;
  border-radius: 3px;
  border-left: 2px solid #409eff;
}

/* 卡片视图 */
.cards-container {
  padding: 12px 0;
}

.cases-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.case-card {
  border-radius: 8px;
  border: 1px solid #e8eaed;
  background: #fff;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.case-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, #409eff, #67c23a);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.case-card::after {
  content: '';
  position: absolute;
  top: 8px;
  right: 8px;
  width: 6px;
  height: 6px;
  background: #10b981;
  border-radius: 50%;
  box-shadow: 0 0 0 1px rgba(16, 185, 129, 0.2);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
  }
  70% {
    box-shadow: 0 0 0 4px rgba(16, 185, 129, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
  }
}

.case-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: #d0d7de;
}

.case-card:hover::before {
  opacity: 1;
}

.case-card:active {
  transform: translateY(-1px);
  transition: transform 0.1s ease;
}

.case-card :deep(.el-card__header) {
  padding: 0;
  border-bottom: none;
  background: transparent;
}

.case-card :deep(.el-card__body) {
  padding: 0;
}

.case-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px 8px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-bottom: 1px solid #f1f5f9;
  position: relative;
}

.case-card-header::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 16px;
  right: 16px;
  height: 1px;
  background: linear-gradient(90deg, transparent, #e2e8f0, transparent);
}

.case-info {
  display: flex;
  gap: 6px;
  align-items: center;
}

.case-id {
  color: #64748b;
  font-size: 11px;
  font-weight: 600;
  background: #e2e8f0;
  padding: 2px 6px;
  border-radius: 4px;
  letter-spacing: 0.3px;
  transition: all 0.2s ease;
}

.case-card:hover .case-id {
  background: #cbd5e1;
  color: #475569;
}

.case-project {
  color: #475569;
  font-size: 11px;
  font-weight: 500;
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  padding: 2px 8px;
  border-radius: 4px;
  border-left: 2px solid #3b82f6;
  position: relative;
  transition: all 0.2s ease;
}

.case-card:hover .case-project {
  background: linear-gradient(135deg, #bfdbfe 0%, #93c5fd 100%);
  color: #1e40af;
}

.case-card-body {
  padding: 16px;
  background: #fff;
  position: relative;
}

.case-card-body .case-title {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 8px;
  line-height: 1.3;
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
  margin-bottom: 8px;
}

.case-header-section .case-title {
  flex: 1;
  margin-bottom: 0;
  margin-right: 8px;
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
  font-size: 12px;
  line-height: 1.4;
  margin-bottom: 12px;
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
  gap: 6px;
  padding-top: 12px;
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
  gap: 6px;
  font-size: 11px;
  color: #475569;
  padding: 4px 0;
  transition: all 0.2s ease;
}

.meta-item:hover {
  background: #f8fafc;
  border-radius: 3px;
  padding-left: 3px;
  padding-right: 3px;
}

.meta-icon {
  font-size: 12px;
  color: #64748b;
  width: 14px;
  text-align: center;
  transition: color 0.2s ease;
}

.meta-item:hover .meta-icon {
  color: #3b82f6;
}

.meta-label {
  color: #64748b;
  font-weight: 500;
  min-width: 50px;
}

.meta-value {
  color: #1e293b;
  font-weight: 500;
  transition: color 0.2s ease;
}

.meta-item:hover .meta-value {
  color: #3b82f6;
}

/* 卡片操作按钮优化 */
.case-card :deep(.el-dropdown) {
  position: relative;
}

.card-action-btn {
  border-radius: 4px;
  transition: all 0.2s ease;
  padding: 4px;
  width: 28px;
  height: 28px;
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
  border-radius: 4px;
  transition: all 0.2s ease;
}

.case-card :deep(.el-button:hover) {
  background: #f1f5f9;
  color: #3b82f6;
}

/* 响应式卡片布局 */
@media (max-width: 1200px) {
  .cases-grid {
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 10px;
  }
}

@media (max-width: 768px) {
  .cases-grid {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  
  .case-card {
    border-radius: 6px;
  }
  
  .case-card-header {
    padding: 10px 12px 6px;
  }
  
  .case-card-body {
    padding: 12px;
  }
  
  .case-header-section {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
  
  .case-status {
    align-self: flex-end;
  }
}

/* 响应式 */
@media (max-width: 768px) {
  .case-manager {
    padding: 6px;
  }

  .control-container {
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
  }

  .control-left {
    flex-direction: column;
    align-items: stretch;
    gap: 4px;
  }

  .search-section {
    min-width: 100%;
  }

  .filter-section {
    display: flex;
    gap: 4px;
  }

  .filter-select {
    width: 100%;
  }

  .control-right {
    flex-wrap: wrap;
    justify-content: center;
    gap: 4px;
  }

  .cases-grid {
    grid-template-columns: 1fr;
  }
}
</style>
