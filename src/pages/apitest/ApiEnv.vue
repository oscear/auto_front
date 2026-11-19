<template>
  <!-- 环境与变量：左边按项目列环境，右边编辑基础地址、变量、默认请求头 -->
  <div class="at-root">
    <aside class="at-side at-panel">
      <div class="at-side__head">
        <span class="at-side__title">环境</span>
        <span class="at-side__count">{{ envs.length }}</span>
        <span class="at-flex-1"></span>
        <button type="button" class="at-icon-btn" title="刷新" @click="fetchEnvs"><el-icon><Refresh /></el-icon></button>
      </div>
      <div class="at-side__tools">
        <el-select v-model="filterProject" placeholder="全部项目" popper-class="at-pop" @change="onFilterProject">
          <el-option label="全部项目" value="" />
          <el-option v-for="p in projects" :key="p.id" :label="p.name" :value="p.id" />
        </el-select>
        <div class="at-side__actions">
          <el-button type="primary" :icon="Plus" data-test="new-env" @click="newEnv()">新建环境</el-button>
        </div>
      </div>
      <div v-loading="listLoading" class="at-side__list">
        <div v-if="hasDraft && !currentId" class="at-srow is-active">
          <div class="at-srow__line">
            <span class="at-srow__name">{{ form.name || '未保存的新环境' }}</span>
            <i class="at-dot at-dot--dirty" title="还没保存"></i>
          </div>
          <div class="at-srow__sub at-mono">{{ form.base_url || '还没填基础地址' }}</div>
        </div>
        <template v-for="group in groups" :key="group.key">
          <div class="at-group at-group--static">
            <el-icon class="at-group__icon"><FolderOpened /></el-icon>
            <span class="at-group__name">{{ group.name }}</span>
            <span class="at-group__count">{{ group.envs.length }}</span>
            <button type="button" class="at-icon-btn at-group__add" title="在这个项目下新建环境" @click.stop="newEnv(group.key)">
              <el-icon><Plus /></el-icon>
            </button>
          </div>
          <div
            v-for="item in group.envs"
            :key="item.id"
            class="at-srow"
            :class="{ 'is-active': item.id === currentId }"
            :data-env-id="item.id"
            @click="openEnv(item.id)"
          >
            <div class="at-srow__line">
              <span class="at-srow__name" :title="item.name">{{ item.name }}</span>
              <span v-if="item.is_default" class="at-badge at-badge--primary">默认</span>
            </div>
            <div class="at-srow__sub at-mono" :title="item.base_url">{{ item.base_url || '未设基础地址' }}</div>
          </div>
        </template>
        <div v-if="!listLoading && !groups.length && !(hasDraft && !currentId)" class="at-empty at-empty--side">
          <p class="at-empty__title">还没有环境</p>
          <p class="at-empty__desc">环境保存一套基础地址和变量，比如「测试环境」「预发环境」。</p>
        </div>
      </div>
    </aside>

    <section class="at-main">
      <div v-if="!hasDraft" class="at-panel at-empty at-empty--page">
        <div class="at-empty__art"><el-icon><SetUp /></el-icon></div>
        <p class="at-empty__title">用环境管理基础地址和变量</p>
        <p class="at-empty__desc">
          用例里写相对地址（如 <code>/v1/orders</code>）和 <code v-pre>{{变量}}</code>，发送时选哪个环境，就拼哪个环境的基础地址、用哪个环境的变量值。同一批用例不用改就能在多个环境跑。
        </p>
        <div class="at-empty__actions">
          <el-button type="primary" :icon="Plus" @click="newEnv()">新建环境</el-button>
        </div>
      </div>

      <div v-else class="at-panel at-env">
        <div class="at-meta">
          <input ref="nameInput" v-model="form.name" class="at-meta__name" placeholder="环境名称，如 测试环境" maxlength="100" data-test="env-name" />
          <span v-if="form.is_default" class="at-badge at-badge--primary">项目默认环境</span>
          <span class="at-flex-1"></span>
          <el-button v-if="currentId" :icon="CopyDocument" @click="copyEnv">复制</el-button>
          <el-button v-if="currentId" :icon="Delete" class="at-btn-danger" @click="removeEnv">删除</el-button>
          <el-button type="primary" :loading="saving" data-test="env-save" @click="save">
            保存<i v-if="dirty" class="at-dot at-dot--dirty at-dot--on-primary" title="有未保存的改动"></i>
          </el-button>
        </div>

        <div class="at-env__body">
          <div class="at-env__basic">
            <label class="at-field">
              <span>所属项目</span>
              <el-select v-model="form.project" placeholder="选择项目" popper-class="at-pop" data-test="env-project">
                <el-option v-for="p in projects" :key="p.id" :label="p.name" :value="p.id" />
              </el-select>
            </label>
            <label class="at-field at-field--grow">
              <span>基础地址</span>
              <el-input v-model="form.base_url" class="at-mono-input" placeholder="https://api.test.example.com（用例里的相对地址会拼在它后面）" data-test="env-base-url" />
            </label>
            <label class="at-field at-field--xs" title="同一个项目只有一个默认环境；发送和运行时没指定环境就用它">
              <span>设为默认</span>
              <el-switch v-model="form.is_default" data-test="env-default" />
            </label>
          </div>

          <div class="at-env__section">
            <div class="at-sub-title">
              变量<span class="at-tab__badge">{{ kvCount(form.variables) }}</span>
              <span class="at-sub-title__note">在地址、请求头、请求体、断言里用 <code v-pre>{{变量名}}</code> 引用。键名像密码、令牌的值默认遮住。</span>
            </div>
            <KvTable v-model="form.variables" key-label="变量名" value-label="值" key-placeholder="变量名，如 token" value-placeholder="值" mask-secrets data-test="env-vars" />
          </div>

          <div class="at-env__section">
            <div class="at-sub-title">
              默认请求头<span class="at-tab__badge">{{ kvCount(form.headers) }}</span>
              <span class="at-sub-title__note">用这个环境发的每个请求都会带上；用例里写了同名请求头时以用例为准。</span>
            </div>
            <KvTable v-model="form.headers" key-label="请求头" value-label="值" key-placeholder="如 Authorization" mask-secrets data-test="env-headers" />
          </div>

          <p v-if="currentEnv" class="at-env__foot">最近修改：{{ formatTime(currentEnv.updated_at) }}</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { CopyDocument, Delete, FolderOpened, Plus, Refresh, SetUp } from '@element-plus/icons-vue';
import { apiTestApi } from '@/utils/apiTestApi';
import KvTable from './components/KvTable.vue';
import { errorMessage, formatTime, kvCount, loadPref, objectToRows, rowsToObject, savePref } from './common';
import './apitest.css';

const route = useRoute();
const router = useRouter();

const projects = ref([]);
const envs = ref([]);
const listLoading = ref(false);
const queryProject = route.query.project ? Number(route.query.project) : null;
const filterProject = ref(queryProject || loadPref('env.project', ''));

const projectName = (id) => projects.value.find((p) => p.id === id)?.name || '';
const groups = computed(() => {
  const map = new Map();
  envs.value.forEach((item) => {
    if (filterProject.value !== '' && item.project !== filterProject.value) return;
    if (!map.has(item.project)) {
      map.set(item.project, { key: item.project, name: item.project_name || projectName(item.project), envs: [] });
    }
    map.get(item.project).envs.push(item);
  });
  return [...map.values()];
});
const onFilterProject = () => savePref('env.project', filterProject.value);

const fetchProjects = async () => {
  try {
    projects.value = await apiTestApi.getProjects();
    if (filterProject.value !== '' && !projects.value.some((p) => p.id === filterProject.value)) {
      filterProject.value = '';
      onFilterProject();
    }
  } catch (error) {
    ElMessage.error(errorMessage(error, '获取项目列表失败'));
  }
};
const fetchEnvs = async () => {
  listLoading.value = true;
  try {
    envs.value = await apiTestApi.getEnvironments();
  } catch (error) {
    ElMessage.error(errorMessage(error, '获取环境列表失败'));
  } finally {
    listLoading.value = false;
  }
};

// ------------------------------------------------------------------ 编辑
const hasDraft = ref(false);
const currentId = ref(null);
const saving = ref(false);
const nameInput = ref(null);
const form = reactive({ project: '', name: '', base_url: '', is_default: false, variables: [], headers: [] });
const currentEnv = computed(() => envs.value.find((e) => e.id === currentId.value) || null);

const collect = () => ({
  project: form.project || null,
  name: (form.name || '').trim(),
  base_url: (form.base_url || '').trim(),
  is_default: form.is_default,
  variables: rowsToObject(form.variables),
  headers: rowsToObject(form.headers),
});
const savedSnapshot = ref('');
const snapshot = () => JSON.stringify(collect());
const dirty = computed(() => hasDraft.value && snapshot() !== savedSnapshot.value);
const markClean = () => {
  savedSnapshot.value = snapshot();
};

const fill = (env) => {
  form.project = env.project ?? '';
  form.name = env.name || '';
  form.base_url = env.base_url || '';
  form.is_default = !!env.is_default;
  form.variables = objectToRows(env.variables);
  form.headers = objectToRows(env.headers);
};

const save = async () => {
  if (!form.name.trim()) {
    ElMessage.error('给环境起个名字');
    nameInput.value?.focus();
    return false;
  }
  if (!form.project) {
    ElMessage.error('选一下所属项目');
    return false;
  }
  saving.value = true;
  try {
    if (currentId.value) {
      await apiTestApi.updateEnvironment(currentId.value, collect());
    } else {
      const created = await apiTestApi.createEnvironment(collect());
      currentId.value = created.id;
    }
    markClean();
    ElMessage.success('环境已保存');
    fetchEnvs();
    return true;
  } catch (error) {
    ElMessage.error(errorMessage(error, '保存失败'));
    return false;
  } finally {
    saving.value = false;
  }
};

const confirmLeave = async () => {
  if (!dirty.value) return true;
  try {
    await ElMessageBox.confirm(`「${form.name || '未命名环境'}」有未保存的改动。`, '离开前要保存吗', {
      confirmButtonText: '保存',
      cancelButtonText: '不保存',
      distinguishCancelAndClose: true,
      type: 'warning',
      customClass: 'at-pop',
    });
    return await save();
  } catch (action) {
    return action === 'cancel';
  }
};

const newEnv = async (projectId) => {
  if (!(await confirmLeave())) return;
  currentId.value = null;
  fill({
    project: projectId || (filterProject.value !== '' ? filterProject.value : projects.value.length === 1 ? projects.value[0].id : ''),
  });
  hasDraft.value = true;
  markClean();
  setTimeout(() => nameInput.value?.focus(), 50);
};

const openEnv = async (id) => {
  if (id === currentId.value) return;
  if (!(await confirmLeave())) return;
  const env = envs.value.find((e) => e.id === id);
  if (!env) return;
  currentId.value = id;
  fill(env);
  hasDraft.value = true;
  markClean();
};

const copyEnv = async () => {
  if (!(await confirmLeave())) return;
  const src = currentEnv.value;
  if (!src) return;
  currentId.value = null;
  fill({ ...src, name: `${src.name} 副本`, is_default: false });
  // 副本还没保存：让「保存」亮起来
  savedSnapshot.value = '';
  ElMessage.info('已生成副本，改好后点保存');
  setTimeout(() => nameInput.value?.focus(), 50);
};

const removeEnv = async () => {
  const env = currentEnv.value;
  if (!env) return;
  try {
    await ElMessageBox.confirm(`确认删除环境「${env.name}」吗？用到它的场景会变成未指定环境，历史执行记录保留。`, '删除环境', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
      confirmButtonClass: 'el-button--danger',
      customClass: 'at-pop',
    });
  } catch {
    return;
  }
  try {
    await apiTestApi.deleteEnvironment(env.id);
    ElMessage.success('已删除');
    hasDraft.value = false;
    currentId.value = null;
    fetchEnvs();
  } catch (error) {
    ElMessage.error(errorMessage(error, '删除失败'));
  }
};

onBeforeRouteLeave(async () => (await confirmLeave()) || false);

const onKeydown = (event) => {
  if (hasDraft.value && (event.ctrlKey || event.metaKey) && (event.key === 's' || event.key === 'S')) {
    event.preventDefault();
    save();
  }
};

onMounted(async () => {
  document.addEventListener('keydown', onKeydown);
  fetchProjects();
  await fetchEnvs();
  // 带 ?env=ID 进来直接打开；否则默认打开第一个，省一次点击
  const wanted = route.query.env ? Number(route.query.env) : groups.value[0]?.envs[0]?.id;
  if (wanted) openEnv(wanted);
  if (route.query.env || route.query.project) router.replace({ path: route.path });
});
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown));
</script>
