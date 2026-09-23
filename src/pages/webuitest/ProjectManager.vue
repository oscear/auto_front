<template>
  <div class="project-manager">
    <el-card>
      <div class="header">
        <h2>项目管理</h2>
        <el-button type="primary" @click="handleAdd">新增项目</el-button>
      </div>

      <el-table :data="projects" style="width: 100%" border>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="项目名称" />
        <el-table-column prop="description" label="项目描述" />
        <!-- <el-table-column label="环境变量" width="300">
          <template #default="scope">
            <div v-if="scope.row.environment_vars" class="env-vars-display">
              <el-tag
                v-for="(value, key) in scope.row.environment_vars"
                :key="key"
                class="env-tag"
                effect="plain"
              >
                <span class="env-key">{{ key }}</span>
                <el-divider direction="vertical" />
                <span class="env-value">{{ value }}</span>
              </el-tag>
            </div>
            <span v-else class="no-env">暂无环境变量</span>
          </template>
        </el-table-column> -->
        <el-table-column prop="username" label="创建人" />
        <el-table-column prop="created_at" label="创建时间" :formatter="formatDate" />
        <el-table-column prop="updated_at" label="更新时间" :formatter="formatDate" />
        <el-table-column label="操作" width="180">
          <template #default="scope">
            <el-button size="small" @click="handleEdit(scope.row)">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增/编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="60%">
      <el-form :model="form" label-width="120px">
        <el-form-item label="项目名称">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="项目描述">
          <el-input v-model="form.description" type="textarea" />
        </el-form-item>
        <el-form-item label="环境变量">
          <div class="env-vars-editor">
            <div class="env-vars-header">
              <span class="title">环境变量配置</span>
              <el-button type="primary" size="small" @click="addEnvVar">
                <el-icon><Plus /></el-icon>添加变量
              </el-button>
            </div>
            <div class="env-vars-list">
              <div v-for="(item, index) in envVarsList" :key="index" class="env-var-row">
                <el-input
                  v-model="item.key"
                  placeholder="请输入变量名"
                  class="env-input"
                  :class="{ 'is-error': !isValidKey(item.key) }"
                >
                  <template #prefix>
                    <el-icon><Key /></el-icon>
                  </template>
                </el-input>
                <el-input v-model="item.value" placeholder="请输入变量值" class="env-input">
                  <template #prefix>
                    <el-icon><Document /></el-icon>
                  </template>
                </el-input>
                <el-button type="danger" :icon="Delete" circle @click="removeEnvVar(index)" class="delete-btn" />
              </div>
              <div v-if="envVarsList.length === 0" class="empty-tip">
                <el-empty description="暂无环境变量" :image-size="60" />
              </div>
            </div>
          </div>
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
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { projectApi } from '@/utils/api';
import { Plus, Delete, Key, Document } from '@element-plus/icons-vue';

const projects = ref([]);
const dialogVisible = ref(false);
const dialogTitle = ref('');
const form = ref({
  id: null,
  name: '',
  description: '',
  environment_vars: {},
});

const envVarsList = ref([]);

// 格式化日期
const formatDate = (row, column) => {
  const date = new Date(row[column.property]);
  return date.toLocaleString();
};

// 环境变量列表转换为对象
const envVarsListToObject = () => {
  const obj = {};
  envVarsList.value.forEach((item) => {
    if (item.key && item.value) {
      obj[item.key] = item.value;
    }
  });
  return obj;
};

// 环境变量对象转换为列表
const envVarsObjectToList = (obj) => {
  return Object.entries(obj || {}).map(([key, value]) => ({ key, value }));
};

// 添加环境变量
const addEnvVar = () => {
  envVarsList.value.push({ key: '', value: '' });
};

// 删除环境变量
const removeEnvVar = (index) => {
  envVarsList.value.splice(index, 1);
};

// 验证环境变量键名
const isValidKey = (key) => {
  if (!key) return true;
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key);
};

// 获取项目列表
const fetchProjects = async () => {
  try {
    const response = await projectApi.getProjects();
    console.log('获取到的项目列表:', response.data);
    projects.value = response;
  } catch (error) {
    ElMessage.error('获取项目列表失败');
  }
};

// 新增项目
const handleAdd = () => {
  form.value = { id: null, name: '', description: '', environment_vars: {} };
  envVarsList.value = [];
  dialogTitle.value = '新增项目';
  dialogVisible.value = true;
};

// 编辑项目
const handleEdit = (project) => {
  form.value = { ...project };
  envVarsList.value = envVarsObjectToList(project.environment_vars);
  dialogTitle.value = '编辑项目';
  dialogVisible.value = true;
};

// 删除项目
const handleDelete = (project) => {
  ElMessageBox.confirm('确认删除该项目吗？', '提示', {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(async () => {
    try {
      await projectApi.deleteProject(project.id);
      ElMessage.success('删除成功');
      fetchProjects();
    } catch (error) {
      ElMessage.error('删除失败');
    }
  });
};

// 提交表单
const submitForm = async () => {
  try {
    form.value.environment_vars = envVarsListToObject();
    if (form.value.id) {
      await projectApi.updateProject(form.value.id, form.value);
      ElMessage.success('更新成功');
    } else {
      await projectApi.createProject(form.value);
      ElMessage.success('新增成功');
    }
    dialogVisible.value = false;
    fetchProjects();
  } catch (error) {
    ElMessage.error('操作失败');
  }
};

onMounted(() => {
  fetchProjects();
});
</script>

<style scoped>
.project-manager {
  padding: 20px;
  background: #b6bbc236;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

/* 环境变量展示样式 */
.env-vars-display {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 4px 0;
}

.env-tag {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 4px;
  background-color: #f5f7fa;
  border: 1px solid #e4e7ed;
}

.env-key {
  color: #409eff;
  font-weight: 500;
}

.env-value {
  color: #606266;
}

.no-env {
  color: #909399;
  font-style: italic;
}

/* 环境变量编辑器样式 */
.env-vars-editor {
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  background-color: #fff;
}

.env-vars-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e4e7ed;
  background-color: #f5f7fa;
}

.env-vars-header .title {
  font-size: 14px;
  font-weight: 500;
  color: #606266;
}

.env-vars-list {
  padding: 16px;
  min-height: 100px;
}

.env-var-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  padding: 8px;
  border-radius: 4px;
  background-color: #fafafa;
  transition: all 0.3s;
}

.env-var-row:hover {
  background-color: #f0f2f5;
}

.env-input {
  flex: 1;
}

.env-input.is-error :deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px #f56c6c inset;
}

.delete-btn {
  flex-shrink: 0;
}

.empty-tip {
  padding: 20px 0;
  text-align: center;
}

:deep(.el-dialog__body) {
  padding: 20px;
}

:deep(.el-form-item__label) {
  font-weight: 500;
}
</style>
