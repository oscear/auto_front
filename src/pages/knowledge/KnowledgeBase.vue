<template>
  <div class="kb-manager">
    <!-- 操作和筛选区域 -->
    <el-card class="control-card" shadow="never">
      <div class="control-container">
        <!-- 左侧搜索和筛选 -->
        <div class="control-left">
          <div class="search-section">
            <el-input
              v-model="searchQuery"
              placeholder="搜索 ID、名称或别名..."
              class="search-input"
              clearable
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
            >
              <el-option label="全部项目" value="" />
              <el-option
                v-for="p in projects"
                :key="p.id"
                :label="p.name"
                :value="p.id"
              />
            </el-select>

            <el-select
              v-model="filterPage"
              placeholder="筛选页面"
              class="filter-select"
              clearable
            >
              <el-option label="全部页面" value="" />
              <el-option v-for="p in uniquePages" :key="p" :label="p" :value="p" />
            </el-select>
          </div>
        </div>

        <!-- 右侧操作按钮 -->
        <div class="control-right">
          <el-tooltip content="刷新数据" placement="top">
            <el-button circle @click="fetchList" class="refresh-btn">
              <el-icon><Refresh /></el-icon>
            </el-button>
          </el-tooltip>

          <el-button type="primary" size="large" @click="handleAdd" class="action-btn primary">
            <el-icon><Plus /></el-icon>
            新增
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 数据列表 -->
    <el-card class="table-card" shadow="never">
      <template #header>
        <div class="table-header">
          <div class="table-title">
            <el-icon><List /></el-icon>
            <span>知识库列表</span>
            <el-tag class="count-tag">{{ filteredList.length }}</el-tag>
          </div>
        </div>
      </template>

      <div class="table-container">
        <el-table
          :data="filteredList"
          style="width: 100%"
          class="modern-table"
          empty-text="暂无数据"
          :row-class-name="rowClassName"
        >
          <el-table-column prop="id" label="ID" width="80" align="center" sortable>
            <template #default="scope">
              <span class="kb-id-cell">#{{ scope.row.id }}</span>
            </template>
          </el-table-column>
          <el-table-column label="项目" min-width="100" show-overflow-tooltip>
            <template #default="scope">
              {{ scope.row.project_name }}
            </template>
          </el-table-column>
          <el-table-column prop="page" label="页面" min-width="100" show-overflow-tooltip />
          <el-table-column prop="name" label="名称" min-width="120" show-overflow-tooltip />
          <el-table-column label="选择器" min-width="200">
            <template #default="scope">
              <el-tooltip
                v-if="scope.row.selectors && scope.row.selectors.length"
                placement="top"
                :show-after="300"
              >
                <template #content>
                  <div class="tag-tooltip-content">
                    <div v-for="(tag, i) in scope.row.selectors" :key="i" class="tag-tooltip-item">{{ tag }}</div>
                  </div>
                </template>
                <div class="tag-list">
                  <el-tag
                    v-for="(tag, index) in scope.row.selectors"
                    :key="index"
                    size="small"
                    class="tag-item"
                  >
                    {{ tag }}
                  </el-tag>
                </div>
              </el-tooltip>
              <span v-else class="no-data">-</span>
            </template>
          </el-table-column>
          <el-table-column label="别名" min-width="150">
            <template #default="scope">
              <el-tooltip
                v-if="scope.row.aliases && scope.row.aliases.length"
                placement="top"
                :show-after="300"
              >
                <template #content>
                  <div class="tag-tooltip-content">
                    <div v-for="(tag, i) in scope.row.aliases" :key="i" class="tag-tooltip-item">{{ tag }}</div>
                  </div>
                </template>
                <div class="tag-list">
                  <el-tag
                    v-for="(tag, index) in scope.row.aliases"
                    :key="index"
                    size="small"
                    type="success"
                    class="tag-item"
                  >
                    {{ tag }}
                  </el-tag>
                </div>
              </el-tooltip>
              <span v-else class="no-data">-</span>
            </template>
          </el-table-column>
          <el-table-column prop="desc" label="描述" min-width="120" show-overflow-tooltip />
          <el-table-column prop="priority" label="优先级" min-width="80" align="center" />
          <el-table-column prop="updated_at" label="更新时间" min-width="160" :formatter="formatDate" />
          <el-table-column label="操作" min-width="150" align="center">
            <template #default="scope">
              <div class="action-buttons">
                <el-button text size="small" @click="handleEdit(scope.row)" class="action-btn-text">
                  <el-icon><Edit /></el-icon>
                  编辑
                </el-button>
                <el-button text size="small" @click="handleDelete(scope.row)" class="action-btn-text danger">
                  <el-icon><Delete /></el-icon>
                  删除
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>

    <!-- 新增/编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="60%">
      <el-form :model="form" label-width="120px">
        <el-form-item label="项目">
          <el-select v-model="form.project" placeholder="请选择项目" style="width: 100%">
            <el-option
              v-for="p in projects"
              :key="p.id"
              :label="p.name"
              :value="p.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="页面">
          <el-input v-model="form.page" placeholder="请输入页面名称" />
        </el-form-item>
        <el-form-item label="名称">
          <el-input v-model="form.name" placeholder="请输入名称" />
        </el-form-item>
        <el-form-item label="选择器">
          <div class="tag-input-container">
            <el-tag
              v-for="(tag, index) in form.selectors"
              :key="index"
              closable
              @close="removeSelector(index)"
              class="tag-item"
            >
              {{ tag }}
            </el-tag>
            <el-input
              v-if="selectorInputVisible"
              ref="selectorInputRef"
              v-model="selectorInputValue"
              size="small"
              style="width: 200px"
              placeholder="输入后回车添加"
              @keyup.enter="addSelector"
              @blur="addSelector"
            />
            <el-button v-else size="small" @click="showSelectorInput">+ 添加</el-button>
          </div>
        </el-form-item>
        <el-form-item label="别名">
          <div class="tag-input-container">
            <el-tag
              v-for="(tag, index) in form.aliases"
              :key="index"
              closable
              type="success"
              @close="removeAlias(index)"
              class="tag-item"
            >
              {{ tag }}
            </el-tag>
            <el-input
              v-if="aliasInputVisible"
              ref="aliasInputRef"
              v-model="aliasInputValue"
              size="small"
              style="width: 200px"
              placeholder="输入后回车添加"
              @keyup.enter="addAlias"
              @blur="addAlias"
            />
            <el-button v-else size="small" @click="showAliasInput">+ 添加</el-button>
          </div>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.desc" placeholder="请输入描述" type="textarea" />
        </el-form-item>
        <el-form-item label="优先级">
          <el-input-number v-model="form.priority" :min="0" :max="100" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Plus,
  Search,
  Refresh,
  List,
  Edit,
  Delete,
} from '@element-plus/icons-vue';
import { kbApi, projectApi } from '@/utils/api';

const route = useRoute();

// 数据
const kbList = ref([]);
const projects = ref([]);
const searchQuery = ref('');
const filterProject = ref('');
const filterPage = ref('');

// 对话框
const dialogVisible = ref(false);
const dialogTitle = ref('');
const form = ref({
  id: null,
  project: '',
  page: '',
  name: '',
  selectors: [],
  aliases: [],
  desc: '',
  priority: 10,
});

// 选择器标签输入
const selectorInputVisible = ref(false);
const selectorInputValue = ref('');
const selectorInputRef = ref(null);

// 别名标签输入
const aliasInputVisible = ref(false);
const aliasInputValue = ref('');
const aliasInputRef = ref(null);

// 计算属性：唯一的页面列表
const uniquePages = computed(() => {
  const pages = kbList.value.map((item) => item.page).filter(Boolean);
  return [...new Set(pages)];
});

// 计算属性：筛选后的列表
const filteredList = computed(() => {
  let filtered = kbList.value;

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase().trim();
    filtered = filtered.filter(
      (item) =>
        String(item.id).includes(query) ||
        item.name?.toLowerCase().includes(query) ||
        (item.aliases && item.aliases.some((a) => a.toLowerCase().includes(query)))
    );
  }

  if (filterProject.value) {
    filtered = filtered.filter((item) => item.project === filterProject.value);
  }

  if (filterPage.value) {
    filtered = filtered.filter((item) => item.page === filterPage.value);
  }

  return filtered;
});

// 行高亮：URL 带 ?highlight=<id> 时对应行底色加深
const rowClassName = ({ row }) => {
  if (route.query.highlight && String(row.id) === String(route.query.highlight)) {
    return 'highlighted-row';
  }
  return '';
};

// 格式化日期
const formatDate = (row, column) => {
  const value = row[column.property];
  if (!value) return '';
  const date = new Date(value);
  return date.toLocaleString();
};

// 获取项目列表
const fetchProjects = async () => {
  try {
    const response = await projectApi.getProjects();
    projects.value = response;
  } catch (error) {
    console.error('获取项目列表失败:', error);
  }
};

// 获取知识库列表
const fetchList = async () => {
  try {
    const response = await kbApi.getList();
    kbList.value = response;
  } catch (error) {
    console.error('获取知识库列表失败:', error);
    ElMessage.error('获取知识库列表失败');
  }
};

// 新增
const handleAdd = () => {
  form.value = {
    id: null,
    project: '',
    page: '',
    name: '',
    selectors: [],
    aliases: [],
    desc: '',
    priority: 10,
  };
  dialogTitle.value = '新增知识条目';
  dialogVisible.value = true;
};

// 编辑
const handleEdit = (row) => {
  form.value = {
    ...row,
    selectors: row.selectors ? [...row.selectors] : [],
    aliases: row.aliases ? [...row.aliases] : [],
  };
  dialogTitle.value = '编辑知识条目';
  dialogVisible.value = true;
};

// 删除
const handleDelete = (row) => {
  ElMessageBox.confirm('确认删除该知识条目吗？', '提示', {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(async () => {
    try {
      await kbApi.delete(row.id);
      ElMessage.success('删除成功');
      fetchList();
    } catch (error) {
      ElMessage.error('删除失败');
    }
  });
};

// 提交表单
const submitForm = async () => {
  try {
    if (form.value.id) {
      await kbApi.update(form.value.id, form.value);
      ElMessage.success('更新成功');
    } else {
      await kbApi.create(form.value);
      ElMessage.success('新增成功');
    }
    dialogVisible.value = false;
    fetchList();
  } catch (error) {
    ElMessage.error('操作失败');
  }
};

// 选择器标签操作
const showSelectorInput = () => {
  selectorInputVisible.value = true;
  nextTick(() => {
    selectorInputRef.value?.input?.focus();
  });
};

const addSelector = () => {
  const val = selectorInputValue.value.trim();
  if (val && !form.value.selectors.includes(val)) {
    form.value.selectors.push(val);
  }
  selectorInputVisible.value = false;
  selectorInputValue.value = '';
};

const removeSelector = (index) => {
  form.value.selectors.splice(index, 1);
};

// 别名标签操作
const showAliasInput = () => {
  aliasInputVisible.value = true;
  nextTick(() => {
    aliasInputRef.value?.input?.focus();
  });
};

const addAlias = () => {
  const val = aliasInputValue.value.trim();
  if (val && !form.value.aliases.includes(val)) {
    form.value.aliases.push(val);
  }
  aliasInputVisible.value = false;
  aliasInputValue.value = '';
};

const removeAlias = (index) => {
  form.value.aliases.splice(index, 1);
};

onMounted(() => {
  if (route.query.highlight) {
    searchQuery.value = String(route.query.highlight);
  }
  fetchProjects();
  fetchList();
});
</script>

<style scoped>
.kb-manager {
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

.filter-section {
  display: flex;
  gap: 8px;
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

.modern-table :deep(.el-table__body tr.highlighted-row) {
  background: #ecf5ff;
}

.modern-table :deep(.el-table__body tr.highlighted-row:hover > td) {
  background: #d9ecff !important;
}

.modern-table :deep(.el-table__body tr.highlighted-row > td) {
  background: #ecf5ff !important;
}

.kb-id-cell {
  font-family: Menlo, Consolas, monospace;
  font-size: 12px;
  color: #409eff;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.2px;
}

.modern-table :deep(.el-table__body td) {
  border-right: 1px solid #f0f0f0;
  padding: 8px 6px;
  font-size: 13px;
}

.modern-table :deep(.el-table__body td:last-child) {
  border-right: none;
}

/* 标签列表 · 单行溢出省略，完整内容走 tooltip */
.tag-list {
  display: flex;
  flex-wrap: nowrap;
  gap: 4px;
  overflow: hidden;
  max-width: 100%;
  cursor: default;
}

.tag-item {
  margin: 0;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex-shrink: 0;
}

.tag-item :deep(.el-tag__content) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag-tooltip-content {
  max-width: 420px;
  max-height: 260px;
  overflow-y: auto;
}

.tag-tooltip-item {
  padding: 2px 0;
  font-family: Menlo, Consolas, monospace;
  font-size: 12px;
  line-height: 1.5;
  word-break: break-all;
}

.no-data {
  color: #909399;
}

/* 固定行高，避免标签换行撑开 */
.modern-table :deep(.el-table__body td) {
  height: 44px;
}

/* 标签输入容器 */
.tag-input-container {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

/* 操作按钮 */
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

/* 对话框 */
:deep(.el-dialog__body) {
  padding: 20px;
}

:deep(.el-form-item__label) {
  font-weight: 500;
}

/* 响应式 */
@media (max-width: 768px) {
  .kb-manager {
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
}
</style>
