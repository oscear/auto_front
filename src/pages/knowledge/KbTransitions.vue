<template>
  <div class="kb-sub">
    <el-card class="control-card" shadow="never">
      <div class="control-row">
        <el-select v-model="filterProject" placeholder="选择项目" class="sel" clearable @change="fetchList">
          <el-option v-for="p in projects" :key="p.id" :label="p.name" :value="p.id" />
        </el-select>
        <el-input v-model="filterFromPage" placeholder="起始页面" class="sel" clearable @keyup.enter="fetchList" @clear="fetchList" />
        <el-button circle @click="fetchList"><el-icon><Refresh /></el-icon></el-button>
        <el-tag class="count-tag">{{ list.length }}</el-tag>
      </div>
    </el-card>

    <el-card class="table-card" shadow="never">
      <el-table :data="pagedList" v-loading="loading" class="modern-table" empty-text="暂无数据" style="width: 100%">
        <el-table-column prop="from_page" label="起始页面" min-width="140" show-overflow-tooltip />
        <el-table-column label="动作" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="arrow">→</span> {{ row.action }} <span class="arrow">→</span>
          </template>
        </el-table-column>
        <el-table-column prop="to_page" label="到达页面" min-width="140" show-overflow-tooltip />
        <el-table-column prop="source" label="来源" min-width="100" show-overflow-tooltip />
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
import { kbTransitionApi } from '@/utils/api';

defineProps({ projects: { type: Array, default: () => [] } });

const list = ref([]);
const loading = ref(false);
const filterProject = ref('');
const filterFromPage = ref('');
const currentPage = ref(1);
const pageSize = ref(50);

const pagedList = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return list.value.slice(start, start + pageSize.value);
});

const fetchList = async () => {
  loading.value = true;
  try {
    const params = {};
    if (filterProject.value) params.project = filterProject.value;
    if (filterFromPage.value) params.from_page = filterFromPage.value;
    const res = await kbTransitionApi.getList(params);
    list.value = Array.isArray(res) ? res : res?.results || [];
    currentPage.value = 1;
  } catch (error) {
    console.error('获取页面跳转失败:', error);
    ElMessage.error('获取页面跳转失败');
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
.arrow {
  color: #909399;
}
.pagination-bar {
  display: flex;
  justify-content: flex-end;
  padding: 10px 16px;
}
</style>
