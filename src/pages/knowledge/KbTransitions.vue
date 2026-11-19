<template>
  <div class="kb-sub">
    <el-card class="control-card" shadow="never">
      <div class="control-row">
        <el-select v-model="filterProject" placeholder="选择项目" class="sel" clearable @change="reload">
          <el-option v-for="p in projects" :key="p.id" :label="p.name" :value="p.id" />
        </el-select>
        <el-input v-model="filterFromPage" placeholder="起始页面" class="sel" clearable @keyup.enter="reload" @clear="reload" />
        <el-button circle @click="fetchList()"><el-icon><Refresh /></el-icon></el-button>
        <el-tag class="count-tag">{{ total }}</el-tag>
      </div>
    </el-card>

    <el-card class="table-card" shadow="never">
      <el-table :data="list" v-loading="loading" class="modern-table" empty-text="暂无数据" style="width: 100%">
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
          :total="total"
          layout="total, sizes, prev, pager, next"
          background
          small
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
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

// 后端分页：list 只放当前页，total 是筛选后的总条数
const total = ref(0);
let requestSeq = 0; // 只认最后一次请求的结果

const fetchList = async () => {
  const seq = ++requestSeq;
  loading.value = true;
  try {
    // 页码参数是 page
    const params = { page: currentPage.value, page_size: pageSize.value };
    if (filterProject.value) params.project = filterProject.value;
    if (filterFromPage.value) params.from_page = filterFromPage.value;
    const res = await kbTransitionApi.getList(params);
    if (seq !== requestSeq) return;
    if (Array.isArray(res)) {
      // 后端还没升级到支持分页时返回整个数组：只取当前页来渲染
      const start = (currentPage.value - 1) * pageSize.value;
      list.value = res.slice(start, start + pageSize.value);
      total.value = res.length;
    } else {
      list.value = Array.isArray(res?.results) ? res.results : [];
      total.value = Number(res?.count ?? list.value.length);
    }
  } catch (error) {
    if (seq !== requestSeq) return;
    if (error?.response?.status === 404 && currentPage.value > 1) {
      currentPage.value = 1; // 页码越界：退回第一页（页码监听会重新查）
      return;
    }
    console.error('获取页面跳转失败:', error);
    ElMessage.error('获取页面跳转失败');
  } finally {
    if (seq === requestSeq) loading.value = false;
  }
};

// 筛选条件变了：回到第一页再查。页码变了由下面的监听去查，这里不重复发
const reload = () => {
  if (currentPage.value !== 1) {
    currentPage.value = 1;
  } else {
    fetchList();
  }
};

watch([currentPage, pageSize], () => fetchList());

onMounted(() => fetchList());
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
