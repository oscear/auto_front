<template>
  <div class="apitest-page">
    <!-- 操作和筛选区域 -->
    <el-card class="control-card" shadow="never">
      <div class="control-container">
        <div class="control-left">
          <el-select v-model="filterProject" placeholder="筛选项目" class="filter-select" clearable @change="fetchEnvs">
            <el-option v-for="project in projects" :key="project.id" :label="project.name" :value="project.id" />
          </el-select>
        </div>
        <div class="control-right">
          <el-tooltip content="刷新数据" placement="top">
            <el-button circle @click="fetchEnvs" class="refresh-btn">
              <el-icon><Refresh /></el-icon>
            </el-button>
          </el-tooltip>
          <el-button type="primary" size="large" @click="handleAdd" class="action-btn primary">
            <el-icon><Plus /></el-icon>
            新增环境
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 环境列表 -->
    <el-card class="table-card" shadow="never">
      <template #header>
        <div class="table-header">
          <div class="table-title">
            <el-icon><List /></el-icon>
            <span>接口环境</span>
            <el-tag class="count-tag">{{ envs.length }}</el-tag>
          </div>
        </div>
      </template>
      <el-table v-loading="loading" :data="envs" style="width: 100%" class="modern-table" empty-text="还没有环境，点右上角新增">
        <el-table-column prop="name" label="环境名称" min-width="160">
          <template #default="scope">
            <span class="row-title">{{ scope.row.name }}</span>
            <el-tag v-if="scope.row.is_default" size="small" type="success" effect="light" style="margin-left: 8px">默认</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="project_name" label="所属项目" min-width="120" />
        <el-table-column prop="base_url" label="基础地址" min-width="260" show-overflow-tooltip>
          <template #default="scope">
            <span class="mono">{{ scope.row.base_url || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="变量" min-width="200" show-overflow-tooltip>
          <template #default="scope">
            <span v-if="keysOf(scope.row.variables).length" class="mono">{{ keysOf(scope.row.variables).join(', ') }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="默认请求头" min-width="160" show-overflow-tooltip>
          <template #default="scope">
            <span v-if="keysOf(scope.row.headers).length" class="mono">{{ keysOf(scope.row.headers).join(', ') }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="更新时间" min-width="160" align="center">
          <template #default="scope">{{ formatTime(scope.row.updated_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="210" align="center" fixed="right">
          <template #default="scope">
            <div class="action-buttons">
              <el-button text size="small" class="action-btn-text" @click="handleEdit(scope.row)">
                <el-icon><Edit /></el-icon>编辑
              </el-button>
              <el-button text size="small" class="action-btn-text" @click="handleCopy(scope.row)">
                <el-icon><CopyDocument /></el-icon>复制
              </el-button>
              <el-button text size="small" class="action-btn-text danger" @click="handleDelete(scope.row)">
                <el-icon><Delete /></el-icon>删除
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增 / 编辑 -->
    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑环境' : '新增环境'" width="820px" top="6vh">
      <el-form :model="form" label-width="100px">
        <el-form-item label="所属项目" required>
          <el-select v-model="form.project" placeholder="选择项目" style="width: 260px" :disabled="!!form.id">
            <el-option v-for="project in projects" :key="project.id" :label="project.name" :value="project.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="环境名称" required>
          <el-input v-model="form.name" placeholder="如 测试环境 / 灰度环境" style="width: 260px" />
          <el-checkbox v-model="form.is_default" style="margin-left: 20px">设为项目默认环境</el-checkbox>
        </el-form-item>
        <el-form-item label="基础地址">
          <el-input v-model="form.base_url" placeholder="如 https://test.example.com/api，用例里的相对地址会拼在它后面" />
        </el-form-item>
        <el-form-item label="环境变量">
          <div class="full">
            <KvEditor
              v-model="form.variables"
              key-label="变量名"
              value-label="值"
              key-placeholder="如 username"
              value-placeholder="值"
              add-text="添加变量"
              empty-text="没有变量"
            />
            <div class="form-tip">用例里用 {{ '{' + '{变量名}' + '}' }} 引用。每个项目同一时间只有一个默认环境。</div>
          </div>
        </el-form-item>
        <el-form-item label="默认请求头">
          <div class="full">
            <KvEditor
              v-model="form.headers"
              key-placeholder="如 la517-authsign"
              add-text="添加请求头"
              empty-text="没有默认请求头"
            />
            <div class="form-tip">这个环境下的每个请求都会带上；用例里同名的请求头优先。</div>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { CopyDocument, Delete, Edit, List, Plus, Refresh } from '@element-plus/icons-vue';
import { apiTestApi } from '@/utils/apiTestApi';
import KvEditor from './components/KvEditor.vue';
import { errorMessage, formatTime, objectToRows, rowsToObject } from './common';
import './apitest.css';

const projects = ref([]);
const envs = ref([]);
const loading = ref(false);
const filterProject = ref('');
const dialogVisible = ref(false);
const saving = ref(false);

const emptyForm = () => ({ id: null, project: '', name: '', base_url: '', is_default: false, variables: [], headers: [] });
const form = ref(emptyForm());

const keysOf = (obj) => Object.keys(obj || {});

const fetchProjects = async () => {
  try {
    projects.value = await apiTestApi.getProjects();
  } catch (error) {
    ElMessage.error(errorMessage(error, '获取项目列表失败'));
  }
};

const fetchEnvs = async () => {
  loading.value = true;
  try {
    envs.value = await apiTestApi.getEnvironments(filterProject.value ? { project: filterProject.value } : {});
  } catch (error) {
    ElMessage.error(errorMessage(error, '获取环境列表失败'));
  } finally {
    loading.value = false;
  }
};

const handleAdd = () => {
  form.value = { ...emptyForm(), project: filterProject.value || '' };
  dialogVisible.value = true;
};

const fill = (env) => ({
  id: env.id,
  project: env.project,
  name: env.name,
  base_url: env.base_url || '',
  is_default: !!env.is_default,
  variables: objectToRows(env.variables),
  headers: objectToRows(env.headers),
});

const handleEdit = (env) => {
  form.value = fill(env);
  dialogVisible.value = true;
};

const handleCopy = (env) => {
  form.value = { ...fill(env), id: null, name: `${env.name} 副本`, is_default: false };
  dialogVisible.value = true;
};

const handleSave = async () => {
  if (!form.value.project) {
    ElMessage.error('请选择所属项目');
    return;
  }
  if (!form.value.name.trim()) {
    ElMessage.error('请输入环境名称');
    return;
  }
  const payload = {
    project: form.value.project,
    name: form.value.name.trim(),
    base_url: form.value.base_url.trim(),
    is_default: form.value.is_default,
    variables: rowsToObject(form.value.variables),
    headers: rowsToObject(form.value.headers),
  };
  saving.value = true;
  try {
    if (form.value.id) {
      await apiTestApi.updateEnvironment(form.value.id, payload);
      ElMessage.success('环境已更新');
    } else {
      await apiTestApi.createEnvironment(payload);
      ElMessage.success('环境已创建');
    }
    dialogVisible.value = false;
    fetchEnvs();
  } catch (error) {
    ElMessage.error(errorMessage(error, '保存失败'));
  } finally {
    saving.value = false;
  }
};

const handleDelete = (env) => {
  ElMessageBox.confirm(`确认删除环境「${env.name}」吗？用到它的场景会变成未指定环境，历史执行记录保留。`, '提示', {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(async () => {
      try {
        await apiTestApi.deleteEnvironment(env.id);
        ElMessage.success('删除成功');
        fetchEnvs();
      } catch (error) {
        ElMessage.error(errorMessage(error, '删除失败'));
      }
    })
    .catch(() => {});
};

onMounted(() => {
  fetchProjects();
  fetchEnvs();
});
</script>

<style scoped>
.full {
  width: 100%;
}
</style>
