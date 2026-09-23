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
            <el-button type="success" size="large" @click="openAIAssistant" class="action-btn">
              <el-icon><Plus /></el-icon>
              AI助手
            </el-button>
            <el-button type="primary" size="large" @click="handleAdd" class="action-btn primary">
              <el-icon><Plus /></el-icon>
              新增用例
            </el-button>
            <el-button type="primary" size="large" @click="handleAddNew" class="action-btn primary">
              <el-icon><Plus /></el-icon>
              新增用例(new)
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

          <el-table-column prop="username" label="创建人" min-width="100">
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
                <el-button text size="small" @click.stop="handleEdit(scope.row)" class="action-btn-text">
                  <el-icon><Edit /></el-icon>
                  编辑
                </el-button>
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
                      <el-dropdown-item @click="handleEdit(testcase)">
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

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="60%"
      style="max-height: 80vh; overflow-y: auto"
      @close="closeDialog"
    >
      <el-form ref="formRef" :model="form" label-width="100px" :rules="rules" :validate-on-rule-change="false">
        <el-form-item label="项目" prop="project">
          <el-select v-model="form.project" placeholder="请选择项目">
            <el-option v-for="item in projects" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="用例名称" prop="name">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="用例描述">
          <el-input v-model="form.description" type="textarea" />
        </el-form-item>
        <el-form-item label="测试设备" prop="device">
          <el-select v-model="form.device" placeholder="请选择测试设备" style="width: 100%">
            <el-option label="pc端-chrome" value="chrome" />
            <el-option label="pc端-firefox" value="firefox" />
            <el-option label="H5端-iPhone 12 Pro" value="iPhone 12 Pro" />
          </el-select>
        </el-form-item>
        <!-- <el-form-item label="测试地址">
          <el-input v-model="form.url" type="textarea" />
        </el-form-item> -->

        <el-form-item label="测试步骤">
          <el-timeline>
            <draggable
              v-model="stepsData"
              item-key="id"
              handle=".drag-handle"
              :disabled="isViewMode"
              @start="drag = true"
              @end="drag = false"
            >
              <template #item="{ element: step, index }">
                <el-timeline-item :timestamp="'步骤 ' + (index + 1)" placement="top">
                  <el-card shadow="hover" class="step-card">
                    <div class="step-container">
                      <div class="drag-handle">
                        <el-icon><Rank /></el-icon>
                      </div>
                      <div class="step-inputs">
                        <el-form-item label="操作类型">
                          <el-select
                            v-model="step.action"
                            placeholder="选择操作"
                            class="step-action"
                            :disabled="isViewMode"
                          >
                            <el-option
                              v-for="item in stepTypes"
                              :key="item.value"
                              :label="item.label"
                              :value="item.value"
                            />
                          </el-select>
                        </el-form-item>

                        <el-form-item label="元素定位" v-if="elementLocatorRequired.includes(step.action)">
                          <el-input
                            v-model="step.selector"
                            class="step-selector"
                            placeholder="元素定位"
                            :disabled="isViewMode"
                          />
                        </el-form-item>

                        <el-form-item label="序号" v-if="elementLocatorRequired.includes(step.action) && !isViewMode">
                          <el-input-number
                            v-model="step.nth"
                            type="number"
                            :min="0"
                            placeholder="序号"
                            class="step-nth"
                          />
                        </el-form-item>

                        <el-form-item label="输入内容" v-if="['fill', 'goto'].includes(step.action) && !isViewMode">
                          <el-input v-model="step.value" placeholder="输入内容" class="step-value" />
                        </el-form-item>

                        <el-form-item label="智能定位方式" v-if="isViewMode && step.method_name">
                          <el-text class="mx-1" type="primary">{{ step.method_name }}</el-text>
                        </el-form-item>

                        <el-form-item label="耗时" v-if="isViewMode && step.method_name">
                          <el-text class="mx-1">{{ step.duration + '秒' }} </el-text>
                        </el-form-item>

                        <el-form-item label="失败原因" v-if="isViewMode && step.error">
                          <el-text class="mx-1" type="primary">{{ step.error }}</el-text>
                        </el-form-item>
                        <el-image
                          v-if="isViewMode && step.screenshot"
                          :src="'data:image/png;base64,' + step.screenshot"
                          style="width: 100%; margin-top: 10px; border-radius: 4px"
                          :preview-src-list="['data:image/png;base64,' + step.screenshot]"
                        />
                      </div>
                      <div class="step-actions">
                        <div class="result-details">
                          <el-tag
                            v-if="step.status"
                            :type="step.status === 'success' ? 'success' : 'danger'"
                            class="step-status"
                          >
                            {{ step.status === 'success' ? '成功' : '失败' }}
                          </el-tag>
                        </div>
                        <el-button
                          v-if="!isViewMode"
                          @click="removeStep(index)"
                          type="danger"
                          size="small"
                          class="step-delete"
                        >
                          删除
                        </el-button>
                      </div>
                    </div>
                  </el-card>
                </el-timeline-item>
              </template>
            </draggable>
          </el-timeline>
          <el-button @click="addStep" type="primary" size="small" style="margin-top: 10px" v-if="!isViewMode">
            添加步骤
          </el-button>
          <el-button @click="openAIAssistant" type="success" size="small" style="margin-top: 10px" v-if="!isViewMode"
            >AI助手</el-button
          >
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="submitForm" v-if="!isViewMode">确认</el-button>
      </template>
    </el-dialog>
    <el-dialog v-model="aiDialogVisible" title="AI助手" width="40%">
      <div class="ai-assistant">
        <div class="chat-container">
          <div v-for="(msg, index) in chatHistory" :key="index" class="chat-message">
            <div :class="['message', msg.role]">
              {{ msg.content }}
            </div>
          </div>
        </div>
        <el-input
          v-model="userInput"
          type="textarea"
          placeholder="请输入您的需求，例如：打开百度搜索摄影然后截图"
          @keyup.enter="sendMessage"
        />
      </div>
      <template #footer>
        <el-button @click="aiDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="sendMessage">发送</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, nextTick } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useRouter } from 'vue-router';
import {
  Rank,
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
import { stepTypes, elementLocatorRequired } from '@/utils/stepsConfig';
import draggable from 'vuedraggable';

const router = useRouter();
import { projectApi } from '@/utils/api';

// 原有的数据
const testcases = ref([]);
const dialogVisible = ref(false);
const dialogTitle = ref('');
const isViewMode = ref(false);
const projects = ref([]);
const form = ref({
  id: null,
  project: null,
  name: '',
  description: '',
  url: '',
  device: 'chrome',
  steps: [],
});

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



// 新增用例
const handleAdd = () => {
  dialogTitle.value = '新增用例';
  dialogVisible.value = true;
  // 先清除校验，再重置表单
  nextTick(() => {
    if (formRef.value) {
      formRef.value.clearValidate();
      form.value = {
        id: null,
        project: null,
        name: '',
        description: '',
        url: '',
        device: 'chrome',
        steps: [],
      };
    }
  });
};

// 新增用例（新页面）
const handleAddNew = () => {
  router.push({ name: 'TestCaseEdit' });
};

// 编辑用例（新页面）
const handleEditNew = (testcase) => {
  router.push({ name: 'TestCaseEditWithId', params: { id: testcase.id } });
};



// 运行用例
const handlExecute = async (project) => {
  console.log('运行用例', project);
  await projectApi.runCase(project);
  ElMessage.success('执行成功');
};

// 添加拖拽状态
const drag = ref(false);

// 修改添加步骤函数，添加唯一ID
const addStep = () => {
  form.value.steps.push({
    id: Date.now(), // 添加唯一ID
    action: 'click',
    selector: '',
    nth: 0,
  });
};

// 删除步骤
const removeStep = (index) => {
  form.value.steps.splice(index, 1);
};

// 编辑用例
const handleEdit = (project) => {
  dialogTitle.value = '编辑用例';
  dialogVisible.value = true;
  isViewMode.value = false;
  // 先清除校验，再设置表单数据
  nextTick(() => {
    if (formRef.value) {
      formRef.value.clearValidate();
      form.value = {
        id: project.id,
        project: project.project,
        name: project.name,
        description: project.description,
        url: project.url,
        device: project.device,
        steps: project.steps || [],
      };
    }
  });
};

// 查看执行结果
const handleViewResult = (project) => {
  console.log('查看执行结果', project);
  projectApi
    .getCaseResult(project.id)
    .then((result) => {
      form.value = result;
      console.log('form.value', form.value);
      isViewMode.value = true;
      dialogTitle.value = '查看执行结果';
      dialogVisible.value = true;
    })
    .catch((error) => {
      ElMessage.error('该用例正在running，请稍等！');
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

// 提交表单
const submitForm = async () => {
  try {
    await formRef.value.validate();
    if (form.value.id) {
      console.log('xxx', form.value);
      await projectApi.updateCase(form.value.id, form.value);
      ElMessage.success('更新成功');
    } else {
      await projectApi.createCase(form.value);
      ElMessage.success('新增成功');
    }
    dialogVisible.value = false;
    fetchtestcases();
  } catch (error) {
    ElMessage.error('请填写完整表单');
  }
};

// ai相关的内容
const aiDialogVisible = ref(false);
const chatHistory = ref([]);
const userInput = ref('');

const openAIAssistant = () => {
  aiDialogVisible.value = true;
  chatHistory.value = [];
};

const sendMessage = async () => {
  console.log('AI 开始输出用例');
  const message = userInput.value.trim();
  if (!message) return ElMessage.warning('请输入有效的用例描述');

  userInput.value = '';
  chatHistory.value.push({ role: 'user', content: message });

  try {
    chatHistory.value.push({ role: 'assistant', content: '正在生成用例，请稍等...' });

    const response = await projectApi.chat({ query: message });
    let answer = response.answer?.trim();
    if (!answer) throw new Error('AI返回数据格式错误');

    // 处理 json 前缀或直接返回 JSON
    if (answer.startsWith('json') && answer.endsWith('')) {
      answer = answer.substring(7, answer.length - 3).trim();
    }

    try {
      const steps = JSON.parse(answer);
      if (Array.isArray(steps)) {
        form.value = { ...form.value, steps };
        dialogTitle.value = '新增用例';
        dialogVisible.value = true;
        aiDialogVisible.value = false;
        ElMessage.success('AI用例生成成功');
        return;
      }
    } catch (jsonError) {
      console.log('返回内容不是JSON格式，正常展示');
      // 非JSON格式正常展示
      chatHistory.value.push({ role: 'assistant', content: answer });
    }
  } catch (error) {
    console.error('AI生成用例失败:', error);
    ElMessage.error(`AI生成用例失败: ${error.message}`);
    chatHistory.value.push({ role: 'assistant', content: '抱歉，生成用例时出错，请尝试更明确的描述' });
  }
};

// 添加计算属性来处理不同模式下的数据源
const stepsData = computed({
  get: () => (isViewMode.value ? form.value.result : form.value.steps),
  set: (newValue) => {
    if (isViewMode.value) {
      form.value.result = newValue;
    } else {
      form.value.steps = newValue;
    }
  },
});

// 关闭弹窗时清除校验和重置表单
const closeDialog = () => {
  dialogVisible.value = false;
  isViewMode.value = false;
  nextTick(() => {
    if (formRef.value) {
      formRef.value.clearValidate();
      form.value = {
        id: null,
        project: null,
        name: '',
        description: '',
        url: '',
        device: 'chrome',
        steps: [],
      };
    }
  });
};

onMounted(() => {
  fetchtestcases();
  fetchProjects();
});
</script>

<style scoped>
.case-manager {
  padding: 20px;
  background: #b6bbc236;
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

.filter-select {
  width: 120px;
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
  gap: 8px;
}

.case-title-ellipsis {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  display: block;
}

.case-desc {
  font-size: 12px;
  color: #666;
}

.project-text {
  color: #666;
  font-size: 13px;
  font-weight: 500;
}

.device-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.device-icon {
  color: #666;
  font-size: 14px;
}

.creator-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}

.creator-avatar {
  background: #409eff;
  color: white;
  font-size: 12px;
}

.action-buttons {
  display: flex;
  gap: 4px;
  white-space: nowrap;
  justify-content: center;
}

.action-btn-text {
  padding: 4px 8px;
  font-size: 12px;
  border-radius: 4px;
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
  font-size: 12px;
  font-weight: 500;
  background: #f5f7fa;
  padding: 2px 6px;
  border-radius: 3px;
}

.case-project {
  color: #666;
  font-size: 12px;
  font-weight: 500;
  background: #f0f9ff;
  padding: 2px 6px;
  border-radius: 3px;
  border-left: 2px solid #409eff;
}

/* 卡片视图 */
.cards-container {
  padding: 20px 0;
}

.cases-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.case-card {
  border-radius: 12px;
  border: 1px solid #e8eaed;
  background: #fff;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.case-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #409eff, #67c23a);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.case-card::after {
  content: '';
  position: absolute;
  top: 12px;
  right: 12px;
  width: 8px;
  height: 8px;
  background: #10b981;
  border-radius: 50%;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
  }
  70% {
    box-shadow: 0 0 0 6px rgba(16, 185, 129, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
  }
}

.case-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12);
  border-color: #d0d7de;
}

.case-card:hover::before {
  opacity: 1;
}

.case-card:active {
  transform: translateY(-2px);
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
  padding: 16px 20px 12px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-bottom: 1px solid #f1f5f9;
  position: relative;
}

.case-card-header::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 20px;
  right: 20px;
  height: 1px;
  background: linear-gradient(90deg, transparent, #e2e8f0, transparent);
}

.case-info {
  display: flex;
  gap: 8px;
  align-items: center;
}

.case-id {
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
  background: #e2e8f0;
  padding: 4px 8px;
  border-radius: 6px;
  letter-spacing: 0.5px;
  transition: all 0.2s ease;
}

.case-card:hover .case-id {
  background: #cbd5e1;
  color: #475569;
}

.case-project {
  color: #475569;
  font-size: 12px;
  font-weight: 500;
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  padding: 4px 10px;
  border-radius: 6px;
  border-left: 3px solid #3b82f6;
  position: relative;
  transition: all 0.2s ease;
}

.case-card:hover .case-project {
  background: linear-gradient(135deg, #bfdbfe 0%, #93c5fd 100%);
  color: #1e40af;
}

.case-card-body {
  padding: 20px;
  background: #fff;
  position: relative;
}

.case-card-body .case-title {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 12px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
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
}

/* 步骤卡片 - 紧凑布局 */
.step-card {
  background: #f8f9fa;
  border: 1px solid #e5e6eb;
  border-radius: 6px;
  padding: 8px 10px;
  margin: 4px 0;
}

.step-container {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}

.step-inputs {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.step-inputs > * {
  width: 100%;
}

/* 紧凑的表单项样式 */
.step-inputs :deep(.el-form-item) {
  margin-bottom: 0 !important;
  display: flex !important;
  align-items: center !important;
}

.step-inputs :deep(.el-form-item__label) {
  font-size: 12px !important;
  line-height: 28px !important;
  padding-bottom: 0 !important;
  color: #666 !important;
  height: 28px !important;
  display: flex !important;
  align-items: center !important;
}

.step-inputs :deep(.el-form-item__content) {
  line-height: 28px !important;
  display: flex !important;
  align-items: center !important;
}

.step-inputs :deep(.el-input__wrapper) {
  padding: 4px 8px !important;
  min-height: 28px !important;
}

.step-inputs :deep(.el-select .el-input__wrapper) {
  padding: 4px 8px !important;
  min-height: 28px !important;
}

.step-inputs :deep(.el-input-number) {
  width: 100% !important;
}

.step-inputs :deep(.el-input-number .el-input__wrapper) {
  padding: 4px 8px !important;
  min-height: 28px !important;
}

.step-inputs :deep(.el-textarea .el-textarea__inner) {
  padding: 4px 8px !important;
  min-height: 28px !important;
}

.step-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  min-width: 60px;
}

.step-action,
.step-selector,
.step-nth,
.step-value {
  min-width: 300px;
}

.step-status {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 3px;
  line-height: 1.2;
}

.step-delete {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 3px;
  min-height: 24px;
}

/* 优化时间轴间距 */
:deep(.el-timeline) {
  padding-left: 0;
  width: 60%;
}

:deep(.el-timeline-item) {
  padding-bottom: 8px;
}

:deep(.el-timeline-item__wrapper) {
  padding-left: 20px;
}

:deep(.el-timeline-item__content) {
  width: auto;
  max-width: calc(100% - 20px);
}

:deep(.el-timeline-item__timestamp) {
  font-size: 11px;
  color: #999;
  line-height: 1.2;
}

/* 拖拽手柄优化 */
.drag-handle {
  cursor: move;
  padding: 2px;
  color: #999;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 3px;
}

.drag-handle:hover {
  color: #409eff;
  background: #f0f4ff;
}

/* 查看模式下的文本优化 */
.step-inputs :deep(.el-text) {
  font-size: 12px !important;
  line-height: 1.3 !important;
}

/* 查看模式下的图片优化 */
.step-inputs .el-image {
  margin-top: 6px !important;
  border-radius: 4px;
  max-height: 120px;
  object-fit: contain;
}

/* AI助手 */
.ai-assistant {
  height: 400px;
  display: flex;
  flex-direction: column;
  background: #f8f9fa;
  border-radius: 8px;
  padding: 12px;
}

.chat-container {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 12px;
  padding: 8px;
  background: #fff;
  border-radius: 6px;
  border: 1px solid #e5e6eb;
}

.chat-message {
  margin-bottom: 8px;
}

.message {
  padding: 8px 12px;
  border-radius: 8px;
  max-width: 80%;
  font-size: 13px;
  line-height: 1.4;
}

.message.user {
  background: #409eff;
  color: white;
  margin-left: auto;
}

.message.assistant {
  background: #f0f4ff;
  color: #333;
  margin-right: auto;
}

/* 响应式 */
@media (max-width: 768px) {
  .case-manager {
    padding: 12px;
  }

  .control-container {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .control-left {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .search-section {
    min-width: 100%;
  }

  .filter-section {
    display: flex;
    gap: 8px;
  }

  .filter-select {
    width: 100%;
  }

  .control-right {
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
  }

  .cases-grid {
    grid-template-columns: 1fr;
  }
}
</style>
