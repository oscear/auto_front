<template>
  <!-- 选环境 → 执行 → 看结果，用例列表和场景页共用 -->
  <el-dialog v-model="dialogVisible" :title="dialogTitle" width="460px" :close-on-click-modal="!running">
    <el-form label-width="80px">
      <el-form-item label="执行环境">
        <el-select v-model="envId" placeholder="选择环境" style="width: 100%" :loading="envLoading">
          <el-option :label="defaultOptionLabel" :value="0" />
          <el-option v-for="env in envs" :key="env.id" :label="envLabel(env)" :value="env.id" />
        </el-select>
        <div class="launch-tip">
          <template v-if="!envs.length && !envLoading">这个项目还没有环境，用例里写的是完整地址时可以直接执行。</template>
          <template v-else>相对地址会拼上环境的基础地址，环境变量可在用例里用 {{ '{' + '{变量名}' + '}' }} 引用。</template>
        </div>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button :disabled="running" @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="running" @click="confirm">
        {{ running ? '执行中…' : '开始执行' }}
      </el-button>
    </template>
  </el-dialog>

  <el-drawer v-model="drawerVisible" title="执行结果" size="62%" destroy-on-close>
    <RunDetail :run-id="shownRunId" :data="shownRun" />
  </el-drawer>
</template>

<script setup>
import { computed, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { apiTestApi } from '@/utils/apiTestApi';
import RunDetail from './RunDetail.vue';
import { errorMessage, statusText } from '../common';

const emit = defineEmits(['done']);

const dialogVisible = ref(false);
const drawerVisible = ref(false);
const running = ref(false);
const envLoading = ref(false);
const envs = ref([]);
const envId = ref(0);
const target = ref(null); // { kind: 'case' | 'scenario', id, name, projectId, envId }
const shownRun = ref(null);
const shownRunId = ref(null);

const dialogTitle = computed(() =>
  target.value ? `执行${target.value.kind === 'scenario' ? '场景' : '用例'}：${target.value.name || ''}` : '执行'
);
const defaultOptionLabel = computed(() => {
  if (target.value?.kind === 'scenario' && target.value.envId) return '按场景设置的环境';
  return envs.value.some((e) => e.is_default) ? '项目默认环境' : '不使用环境';
});
const envLabel = (env) => `${env.name}${env.is_default ? '（默认）' : ''}${env.base_url ? ' · ' + env.base_url : ''}`;

// 打开「选环境并执行」
const open = async (info) => {
  target.value = info;
  envId.value = 0;
  envs.value = [];
  dialogVisible.value = true;
  if (!info.projectId) return;
  envLoading.value = true;
  try {
    envs.value = await apiTestApi.getEnvironments({ project: info.projectId });
  } catch (error) {
    ElMessage.error(errorMessage(error, '获取环境列表失败'));
  } finally {
    envLoading.value = false;
  }
};

const confirm = async () => {
  if (!target.value) return;
  running.value = true;
  const payload = envId.value ? { env_id: envId.value } : {};
  try {
    const run =
      target.value.kind === 'scenario'
        ? await apiTestApi.runScenario(target.value.id, payload)
        : await apiTestApi.runApiCase(target.value.id, payload);
    dialogVisible.value = false;
    shownRun.value = run;
    shownRunId.value = null;
    drawerVisible.value = true;
    if (run.status === 'passed') ElMessage.success('执行通过');
    else ElMessage.warning(`执行结果：${statusText(run.status)}`);
    emit('done', run);
  } catch (error) {
    ElMessage.error(errorMessage(error, '执行失败'));
  } finally {
    running.value = false;
  }
};

// 直接看某次执行记录
const showRun = (runId) => {
  shownRun.value = null;
  shownRunId.value = runId;
  drawerVisible.value = true;
};

defineExpose({ open, showRun });
</script>

<style scoped>
.launch-tip { margin-top: 6px; font-size: 12px; color: #94a3b8; line-height: 1.5; }
</style>
