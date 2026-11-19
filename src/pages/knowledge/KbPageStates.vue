<template>
  <div class="kb-sub">
    <el-card class="control-card" shadow="never">
      <div class="control-row">
        <el-select v-model="filterProject" placeholder="选择项目" class="sel" clearable @change="fetchList">
          <el-option v-for="p in projects" :key="p.id" :label="p.name" :value="p.id" />
        </el-select>
        <el-input v-model="filterPage" placeholder="页面名称" class="sel" clearable @keyup.enter="fetchList" @clear="fetchList" />
        <el-button circle @click="fetchList"><el-icon><Refresh /></el-icon></el-button>
        <el-tag class="count-tag">{{ list.length }}</el-tag>
      </div>
    </el-card>

    <el-card class="table-card" shadow="never">
      <el-table :data="pagedList" v-loading="loading" class="modern-table" empty-text="暂无数据" style="width: 100%">
        <el-table-column type="expand">
          <template #default="{ row }">
            <div class="detail">
              <div class="detail-item">
                <div class="detail-title">到达步骤</div>
                <pre class="json-block">{{ formatJson(row.reach) }}</pre>
              </div>
              <div class="detail-item">
                <div class="detail-title">源码组件</div>
                <div>{{ row.component || '-' }}</div>
              </div>
              <div class="detail-item">
                <div class="detail-title">盲区列表</div>
                <div v-if="row.blind_spots && row.blind_spots.length">
                  <el-tag v-for="(b, i) in row.blind_spots" :key="i" type="warning" size="small" class="bs-tag">
                    {{ typeof b === 'string' ? b : JSON.stringify(b) }}
                  </el-tag>
                </div>
                <span v-else class="no-data">无</span>
              </div>
              <el-button type="primary" size="small" @click="emit('view-elements', { project: row.project, page: row.page, state: row.state })">
                查看该页面该状态下的元素
              </el-button>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="project_name" label="项目" min-width="100" show-overflow-tooltip />
        <el-table-column prop="page" label="页面" min-width="120" show-overflow-tooltip />
        <el-table-column label="状态" min-width="90" show-overflow-tooltip>
          <template #default="{ row }">{{ row.state || '(默认)' }}</template>
        </el-table-column>
        <el-table-column prop="route" label="路由" min-width="140" show-overflow-tooltip />
        <el-table-column prop="element_count" label="元素数" width="80" align="center" />
        <el-table-column prop="kb_version" label="档案版本" min-width="100" show-overflow-tooltip />
        <el-table-column prop="env" label="采集环境" min-width="100" show-overflow-tooltip />
        <el-table-column label="采集时间" min-width="160">
          <template #default="{ row }">{{ row.captured_at ? new Date(row.captured_at).toLocaleString() : '' }}</template>
        </el-table-column>
      </el-table>
      <div class="pagination-bar">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[20, 50, 100]"
          :total="list.length"
          layout="total, sizes, prev, pager, next"
          background
          small
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Refresh } from '@element-plus/icons-vue';
import { kbPageApi } from '@/utils/api';

defineProps({ projects: { type: Array, default: () => [] } });
const emit = defineEmits(['view-elements']);

const list = ref([]);
const loading = ref(false);
const filterProject = ref('');
const filterPage = ref('');
const currentPage = ref(1);
const pageSize = ref(50);

const pagedList = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return list.value.slice(start, start + pageSize.value);
});

const formatJson = (v) => {
  if (v === null || v === undefined || v === '') return '-';
  if (typeof v === 'string') {
    try {
      return JSON.stringify(JSON.parse(v), null, 2);
    } catch {
      return v;
    }
  }
  return JSON.stringify(v, null, 2);
};

const fetchList = async () => {
  loading.value = true;
  try {
    const params = {};
    if (filterProject.value) params.project = filterProject.value;
    if (filterPage.value) params.page = filterPage.value;
    const res = await kbPageApi.getList(params);
    list.value = Array.isArray(res) ? res : res?.results || [];
    currentPage.value = 1;
  } catch (error) {
    console.error('获取页面档案失败:', error);
    ElMessage.error('获取页面档案失败');
  } finally {
    loading.value = false;
  }
};

onMounted(fetchList);
</script>

<style scoped>
.control-card,
.table-card {
  margin-bottom: 8px;
  border-radius: 4px;
  border: 1px solid #e5e6eb;
  background: #fff;
}
.table-card :deep(.el-card__body) {
  padding: 0;
}
.control-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.sel {
  width: 180px;
}
.count-tag {
  background: #409eff;
  color: #fff;
  border: none;
  border-radius: 10px;
}
.modern-table :deep(.el-table__header th) {
  background: #f8f9fa;
  color: #333;
  font-weight: 600;
  font-size: 13px;
}
.detail {
  padding: 8px 24px;
}
.detail-item {
  margin-bottom: 10px;
}
.detail-title {
  font-weight: 600;
  margin-bottom: 4px;
  color: #333;
}
.json-block {
  margin: 0;
  max-height: 240px;
  overflow: auto;
  font-family: Menlo, Consolas, monospace;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
  background: #f5f7fa;
  padding: 6px 8px;
  border-radius: 4px;
}
.bs-tag {
  margin: 0 4px 4px 0;
}
.no-data {
  color: #909399;
}
.pagination-bar {
  display: flex;
  justify-content: flex-end;
  padding: 10px 16px;
}
</style>
