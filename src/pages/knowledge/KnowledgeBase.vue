<template>
  <div class="kb-manager">
    <el-tabs v-model="activeTab" class="kb-tabs">
      <el-tab-pane label="元素条目" name="elements" />
      <el-tab-pane label="页面档案" name="pages" />
      <el-tab-pane label="页面跳转" name="transitions" />
    </el-tabs>

    <KbPageStates
      v-if="activeTab === 'pages'"
      :projects="projects"
      @view-elements="viewElements"
    />
    <KbTransitions v-else-if="activeTab === 'transitions'" :projects="projects" />

    <template v-else>
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

            <el-select v-model="filterState" placeholder="筛选状态" class="filter-select" clearable>
              <el-option v-for="st in uniqueStates" :key="st.value" :label="st.label" :value="st.value" />
            </el-select>

            <el-select v-model="filterSource" placeholder="筛选来源" class="filter-select" clearable>
              <el-option v-for="(o, k) in SOURCE_MAP" :key="k" :label="o.label" :value="k" />
            </el-select>

            <el-select v-model="filterRole" placeholder="筛选角色" class="filter-select" clearable>
              <el-option v-for="r in ROLE_OPTIONS" :key="r" :label="r" :value="r" />
            </el-select>
          </div>
        </div>

        <!-- 右侧操作按钮 -->
        <div class="control-right">
          <el-tooltip content="刷新数据" placement="top">
            <el-button circle @click="refresh" class="refresh-btn">
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
            <el-tag class="count-tag">{{ total }}</el-tag>
          </div>
        </div>
      </template>

      <div class="table-container">
        <el-table
          :data="kbList"
          v-loading="loading"
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
          <el-table-column label="状态" min-width="80" show-overflow-tooltip>
            <template #default="scope">{{ scope.row.state || '-' }}</template>
          </el-table-column>
          <el-table-column label="角色" min-width="80">
            <template #default="scope">{{ scope.row.role || '-' }}</template>
          </el-table-column>
          <el-table-column label="来源" min-width="90" align="center">
            <template #default="scope">
              <el-tag size="small" :type="sourceInfo(scope.row.source).type">
                {{ sourceInfo(scope.row.source).label }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="置信度" min-width="110">
            <template #default="scope">
              <el-progress
                v-if="scope.row.confidence !== null && scope.row.confidence !== undefined"
                :percentage="Math.min(100, Math.max(0, Number(scope.row.confidence)))"
                :stroke-width="6"
                :color="confidenceColor(scope.row.confidence)"
              />
              <span v-else class="no-data">-</span>
            </template>
          </el-table-column>
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
      <div class="pagination-bar">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[20, 50, 100, 200]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          background
          small
        />
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
        <el-form-item label="页面状态">
          <el-input v-model="form.state" placeholder="页面状态（留空为默认状态）" />
        </el-form-item>
        <el-form-item label="元素角色">
          <el-select v-model="form.role" placeholder="请选择角色" clearable style="width: 100%">
            <el-option v-for="r in ROLE_OPTIONS" :key="r" :label="r" :value="r" />
          </el-select>
        </el-form-item>
        <el-form-item label="所在容器">
          <el-input v-model="form.container" placeholder="所在容器" />
        </el-form-item>
        <el-form-item label="来源">
          <el-select v-model="form.source" style="width: 100%">
            <el-option v-for="(o, k) in SOURCE_MAP" :key="k" :label="o.label" :value="k" />
          </el-select>
        </el-form-item>
        <el-form-item label="置信度">
          <el-input-number v-model="form.confidence" :min="0" :max="100" />
        </el-form-item>
        <el-form-item v-if="form.meta && Object.keys(form.meta).length" label="meta 明细">
          <el-collapse class="meta-collapse">
            <el-collapse-item title="展开查看（只读）" name="meta">
              <pre class="meta-json">{{ JSON.stringify(form.meta, null, 2) }}</pre>
            </el-collapse-item>
          </el-collapse>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">确认</el-button>
      </template>
    </el-dialog>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed, nextTick, watch } from 'vue';
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
import { kbApi, projectApi, unwrapList } from '@/utils/api';
import KbPageStates from './KbPageStates.vue';
import KbTransitions from './KbTransitions.vue';

const route = useRoute();

// 数据：kbList 只放当前页（后端分页），total 是筛选后的总条数
const kbList = ref([]);
const total = ref(0);
const loading = ref(false);
const facets = ref({ pages: [], states: [] });
const projects = ref([]);
const searchQuery = ref('');
const filterProject = ref('');
const filterPage = ref('');
const filterState = ref('');
const filterSource = ref('');
const filterRole = ref('');
const activeTab = ref('elements');

// 分页（后端分页：筛选、搜索、翻页都交给接口，每次只取一页）
const currentPage = ref(1);
const pageSize = ref(50);

const ROLE_OPTIONS = ['button', 'link', 'input', 'checkbox', 'radio', 'tab', 'select', 'clickable'];
const SOURCE_MAP = {
  '': { label: '人工/历史', type: 'info' },
  ai: { label: 'AI回填', type: 'warning' },
  both: { label: '源码+渲染', type: 'success' },
  render: { label: '仅渲染', type: '' },
  code: { label: '仅源码', type: 'danger' },
};
const sourceInfo = (src) => SOURCE_MAP[src || ''] || { label: src, type: 'info' };
const confidenceColor = (v) => (v >= 80 ? '#67c23a' : v >= 50 ? '#e6a23c' : '#f56c6c');
const DEFAULT_STATE = '__default__';

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
  state: '',
  role: '',
  container: '',
  source: '',
  confidence: 0,
  meta: null,
});

// 选择器标签输入
const selectorInputVisible = ref(false);
const selectorInputValue = ref('');
const selectorInputRef = ref(null);

// 别名标签输入
const aliasInputVisible = ref(false);
const aliasInputValue = ref('');
const aliasInputRef = ref(null);

// 筛选下拉的候选值：列表只有一页数据，候选值单独向后端要（随所选项目变化）
const uniquePages = computed(() => facets.value.pages || []);

const uniqueStates = computed(() =>
  [...new Set((facets.value.states || []).map((v) => v || ''))]
    .sort()
    .map((v) => ({ value: v === '' ? DEFAULT_STATE : v, label: v === '' ? '(默认)' : v }))
);

// 当前筛选条件 → 接口参数。state 的「默认状态」在库里是空串，接口用 __default__ 指代
const buildParams = () => {
  const params = { page_no: currentPage.value, page_size: pageSize.value };
  const search = (searchQuery.value || '').trim();
  if (search) params.search = search;
  if (filterProject.value) params.project = filterProject.value;
  if (filterPage.value) params.page = filterPage.value;
  if (filterState.value) params.state = filterState.value;
  if (filterSource.value) params.source = filterSource.value;
  if (filterRole.value) params.role = filterRole.value;
  return params;
};

let lastQueryKey = ''; // 最近一次已发出的查询；条件没变就不重复请求
let requestSeq = 0; // 只认最后一次请求的结果，慢的旧响应直接丢弃
let searchTimer = null;

// 回到第一页并查询。页码变了由下面的页码监听去查，这里不重复发
const reloadFromFirstPage = () => {
  if (currentPage.value !== 1) {
    currentPage.value = 1;
  } else {
    fetchList();
  }
};

// 筛选条件变化：回到第一页重新查
watch([filterProject, filterPage, filterState, filterSource, filterRole], reloadFromFirstPage);

// 搜索框：停止输入 300 毫秒后再查，避免每敲一个字发一次请求
watch(searchQuery, () => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    searchTimer = null;
    reloadFromFirstPage();
  }, 300);
});

// 翻页、改每页条数
watch([currentPage, pageSize], () => fetchList());

// 换项目后候选的页面 / 状态跟着变
watch(filterProject, () => fetchFacets());

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer);
  requestSeq += 1;
});

// 从页面档案跳到该页面该状态下的元素列表
const viewElements = ({ project, page, state }) => {
  searchQuery.value = '';
  filterSource.value = '';
  filterRole.value = '';
  filterProject.value = project || '';
  filterPage.value = page || '';
  filterState.value = state ? state : DEFAULT_STATE;
  activeTab.value = 'elements';
};

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

// 获取知识库列表（当前页）。force=true 时条件没变也重新查（刷新按钮、增删改之后）
const fetchList = async (force = false) => {
  const params = buildParams();
  const key = JSON.stringify(params);
  if (!force && key === lastQueryKey) return;
  lastQueryKey = key;
  const seq = ++requestSeq;
  loading.value = true;
  try {
    const response = await kbApi.getList(params);
    if (seq !== requestSeq) return;
    if (Array.isArray(response)) {
      // 后端还没升级到支持分页时返回整个数组：只取当前页来渲染，不一次画上千行
      const start = (params.page_no - 1) * params.page_size;
      kbList.value = response.slice(start, start + params.page_size);
      total.value = response.length;
    } else {
      const { items, total: count } = unwrapList(response);
      kbList.value = items;
      total.value = count;
    }
  } catch (error) {
    if (seq !== requestSeq) return;
    lastQueryKey = '';
    if (error?.response?.status === 404 && currentPage.value > 1) {
      // 删掉最后一页仅剩的一条后页码越界：退回第一页（页码监听会重新查）
      currentPage.value = 1;
      return;
    }
    console.error('获取知识库列表失败:', error);
    ElMessage.error('获取知识库列表失败');
  } finally {
    if (seq === requestSeq) loading.value = false;
  }
};

// 页面 / 状态下拉的候选值。接口不存在或出错时保持为空，不影响列表
const fetchFacets = async () => {
  try {
    const res = await kbApi.getFacets(filterProject.value ? { project: filterProject.value } : {});
    facets.value = {
      pages: Array.isArray(res?.pages) ? res.pages : [],
      states: Array.isArray(res?.states) ? res.states : [],
    };
  } catch (error) {
    facets.value = { pages: [], states: [] };
  }
};

// 刷新按钮、增删改之后：列表和候选值都重新取
const refresh = () => {
  fetchList(true);
  fetchFacets();
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
    state: '',
    role: '',
    container: '',
    source: '',
    confidence: 0,
    meta: null,
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
      refresh();
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
    refresh();
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
  fetchList(true);
  fetchFacets();
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
  flex-wrap: wrap;
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

.kb-tabs {
  background: #fff;
  padding: 0 12px;
  border-radius: 4px;
}

.pagination-bar {
  display: flex;
  justify-content: flex-end;
  padding: 10px 16px;
}

.meta-collapse {
  width: 100%;
}

.meta-json {
  margin: 0;
  max-height: 260px;
  overflow: auto;
  font-family: Menlo, Consolas, monospace;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
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
