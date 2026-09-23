<template>
  <div class="schedule-container">
    <h3>定时任务管理2</h3>

    <div class="action-buttons">
      <el-button type="primary" @click="showDialog = true">
        <el-icon><Plus /></el-icon> 新增任务
      </el-button>
    </div>

    <el-table :data="tasks" style="width: 100%" border>
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="name" label="任务名称" />
      <el-table-column prop="schedule" label="定时规则" />
      <el-table-column prop="feishu_webhook" label="飞书地址" />
      <el-table-column prop="last_run" label="上次运行" />
      <el-table-column prop="next_run" label="下次运行" />
      <el-table-column label="操作" width="300">
        <template #default="scope">
          <el-button size="small" @click="handleEdit(scope.row)">编辑</el-button>
          <el-button size="small" :type="scope.row.is_active ? 'info' : 'success'" @click="handleStart(scope.row)">
            {{ scope.row.is_active ? '关闭' : '启动' }}
          </el-button>
          <el-button size="small" @click="handleRun(scope.row)">运行</el-button>
          <el-button size="small" type="danger" @click="handleDelete(scope.row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 新增/编辑对话框 -->
    <el-dialog v-model="showDialog" :title="dialogTitle" width="50%">
      <el-form :model="form" label-width="120px">
        <el-form-item label="任务名称" required>
          <el-input v-model="form.name" />
        </el-form-item>

        <el-form-item label="定时规则" required>
          <el-input v-model="form.schedule" placeholder="例如：0 0 * * *">
            <template #append>
              <el-button @click="showCronDialog = true">
                <el-icon><MagicStick /></el-icon> 图形选择
              </el-button>
            </template>
          </el-input>
          <div class="cron-help">
            <a href="https://crontab.guru/" target="_blank" rel="noopener noreferrer">点击这里生成Cron表达式</a>
          </div>
        </el-form-item>

        <!-- 新增cron表达式选择对话框 -->
        <el-dialog v-model="showCronDialog" title="选择定时规则" width="600px">
          <div class="cron-selector">
            <el-tabs v-model="activeTab">
              <el-tab-pane label="分钟" name="minute">
                <el-radio-group v-model="cron.minute">
                  <el-radio label="*">每分钟</el-radio>
                  <el-radio v-for="n in 60" :key="n" :label="n - 1">{{ n - 1 }}</el-radio>
                </el-radio-group>
              </el-tab-pane>
              <el-tab-pane label="小时" name="hour">
                <el-radio-group v-model="cron.hour">
                  <el-radio label="*">每小时</el-radio>
                  <el-radio v-for="n in 24" :key="n" :label="n - 1">{{ n - 1 }}</el-radio>
                </el-radio-group>
              </el-tab-pane>
              <el-tab-pane label="日" name="day">
                <el-radio-group v-model="cron.day">
                  <el-radio label="*">每天</el-radio>
                  <el-radio v-for="n in 31" :key="n" :label="n">{{ n }}</el-radio>
                </el-radio-group>
              </el-tab-pane>
              <el-tab-pane label="月" name="month">
                <el-radio-group v-model="cron.month">
                  <el-radio label="*">每月</el-radio>
                  <el-radio v-for="n in 12" :key="n" :label="n">{{ n }}</el-radio>
                </el-radio-group>
              </el-tab-pane>
              <el-tab-pane label="星期" name="week">
                <el-radio-group v-model="cron.week">
                  <el-radio label="*">每天</el-radio>
                  <el-radio
                    v-for="(day, index) in ['日', '一', '二', '三', '四', '五', '六']"
                    :key="index"
                    :label="index"
                    >{{ '星期' + day }}</el-radio
                  >
                </el-radio-group>
              </el-tab-pane>
            </el-tabs>
            <div class="preview">
              <h4>预览表达式：{{ cronExpression }}</h4>
            </div>
          </div>
          <template #footer>
            <el-button @click="showCronDialog = false">取消</el-button>
            <el-button type="primary" @click="applyCronExpression">应用</el-button>
          </template>
        </el-dialog>
        <!-- 或者https://www.iamwawa.cn/crontab.html -->

        <el-form-item label="测试用例" required>
          <el-select v-model="form.test_cases" placeholder="请选择测试用例" multiple filterable clearable>
            <el-option v-for="item in testCases" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>

        <el-form-item label="飞书Webhook">
          <el-input v-model="form.feishu_webhook" type="textarea" rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" @click="submitForm">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Rank, Plus, MagicStick, Star } from '@element-plus/icons-vue';
import { projectApi } from '@/utils/api';

const tasks = ref([]);
const testCases = ref([]);
const showDialog = ref(false);
const isEditMode = ref(false);
const showCronDialog = ref(false);
const activeTab = ref('minute');
const cron = ref({
  minute: '*',
  hour: '*',
  day: '*',
  month: '*',
  week: '*',
});

const cronExpression = computed(() => {
  return `${cron.value.minute} ${cron.value.hour} ${cron.value.day} ${cron.value.month} ${cron.value.week}`;
});

const applyCronExpression = () => {
  form.value.schedule = cronExpression.value;
  showCronDialog.value = false;
};
const form = ref({
  id: null,
  name: '',
  schedule: '',
  test_cases: [],
  feishu_webhook: '',
});

const dialogTitle = computed(() => (isEditMode.value ? '编辑任务' : '新增任务'));

const fetchTasks = async () => {
  try {
    const response = await projectApi.getTasks();
    tasks.value = response;
  } catch (error) {
    console.error('获取任务列表失败:', error);
    ElMessage.error('获取任务列表失败');
  }
};

const fetchTestCases = async () => {
  try {
    const response = await projectApi.getCases();
    testCases.value = response;
  } catch (error) {
    console.error('获取用例列表失败:', error);
  }
};

const handleEdit = (task) => {
  isEditMode.value = true;
  form.value = { ...task };
  showDialog.value = true;
};

const handleDelete = async (task) => {
  try {
    await ElMessageBox.confirm('确认删除该任务吗?', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });
    await projectApi.deleteTask(task.id);
    ElMessage.success('删除成功');
    fetchTasks();
  } catch (error) {
    console.error('删除失败:', error);
  }
};

const submitForm = async () => {
  try {
    if (isEditMode.value) {
      await projectApi.updateTask(form.value.id, form.value);
      ElMessage.success('更新成功');
    } else {
      await projectApi.createTask(form.value);
      ElMessage.success('新增成功');
    }
    showDialog.value = false;
    fetchTasks();
  } catch (error) {
    console.error('操作失败:', error);
    ElMessage.error('操作失败');
  }
};

const handleStart = async (task) => {
  try {
    const action = task.is_active ? 'stop' : 'start';
    const res = await projectApi.StartTask({
      task_id: task.id,
      action: action,
    });
    ElMessage.success(res.message);
    fetchTasks();
  } catch (error) {
    console.error('操作失败:', error);
    ElMessage.error('操作失败');
  }
};

const handleRun = async (task) => {
  try {
    const res = await projectApi.runTask({ task_id: task.id });
    console.log(res);
    ElMessage.success(res.message);
    fetchTasks(); // 刷新任务列表
  } catch (error) {
    console.error('执行任务失败:', error);
    if (error !== 'cancel') {
      ElMessage.error('执行任务失败');
    }
  }
};

onMounted(() => {
  fetchTasks();
  fetchTestCases();
});
</script>

<style scoped>
.schedule-container {
  padding: 20px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.action-buttons {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 20px;
  gap: 10px;
}

.el-table {
  margin-top: 20px;
}

.el-table :deep(.cell) {
  padding: 0 12px;
}

.el-table :deep(th) {
  background-color: #f5f7fa;
  color: #909399;
  font-weight: 600;
}

.el-table :deep(tr:hover) {
  background-color: #f5f7fa;
}

.el-dialog {
  border-radius: 8px;
}

.el-form-item {
  margin-bottom: 22px;
}
.cron-selector {
  padding: 10px;
}
.cron-selector .el-radio-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.cron-selector .el-radio {
  margin-right: 0;
  width: 80px;
}
.preview {
  margin-top: 20px;
  padding: 10px;
  background: #f5f7fa;
  border-radius: 4px;
}
</style>
