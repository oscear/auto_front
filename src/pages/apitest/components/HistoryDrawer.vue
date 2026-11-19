<template>
  <!-- 某条用例 / 某个场景的执行历史：上面是最近的执行，点一条在下面看详情 -->
  <el-drawer
    v-model="visible"
    :title="title"
    direction="rtl"
    size="min(860px, 72vw)"
    class="at-pop at-drawer"
    append-to-body
    destroy-on-close
  >
    <div class="at-history">
      <div v-loading="loading" class="at-history__list">
        <div v-if="!loading && !runs.length" class="at-empty at-empty--inline">
          <p class="at-empty__title">还没有执行记录</p>
          <p class="at-empty__desc">
            {{ target?.kind === 'scenario' ? '点「运行」跑一次场景后，这里会留下记录。' : '在工作台点「发送」旁的「运行并记录」，这里会留下记录；单纯「发送」只是调试，不留记录。' }}
          </p>
        </div>
        <div
          v-for="run in runs"
          :key="run.id"
          class="at-history__row"
          :class="{ 'is-active': run.id === currentId }"
          @click="currentId = run.id"
        >
          <span class="at-status at-status--plain" :class="'at-status--' + statusTone(run.status)">
            <i class="at-dot"></i>{{ statusText(run.status) }}
          </span>
          <span class="at-history__time">{{ formatTime(run.started_at || run.created_at) }}</span>
          <span class="at-history__meta">{{ run.passed }}/{{ run.total }} 通过</span>
          <span class="at-history__meta at-mono">{{ formatDuration(run.duration_ms) }}</span>
          <span class="at-history__meta">{{ run.env_name || '未使用环境' }}</span>
          <span class="at-history__meta">{{ triggerText(run.trigger) }}</span>
        </div>
        <div v-if="total > runs.length" class="at-history__more">
          只显示最近 {{ runs.length }} 次，共 {{ total }} 次。
          <button type="button" class="at-link-btn" @click="goAll">到执行记录页看全部</button>
        </div>
      </div>
      <div v-if="currentId" class="at-history__detail">
        <RunFlow :run-id="currentId" />
      </div>
    </div>
  </el-drawer>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { apiTestApi } from '@/utils/apiTestApi';
import RunFlow from './RunFlow.vue';
import { errorMessage, formatDuration, formatTime, statusText, statusTone, triggerText } from '../common';

const router = useRouter();
const visible = ref(false);
const loading = ref(false);
const runs = ref([]);
const total = ref(0);
const currentId = ref(null);
const target = ref(null); // { kind: 'case' | 'scenario', id, name }

const title = computed(() =>
  target.value ? `执行历史 · ${target.value.name || ''}` : '执行历史'
);

const open = async (info) => {
  target.value = info;
  runs.value = [];
  total.value = 0;
  currentId.value = null;
  visible.value = true;
  loading.value = true;
  try {
    const res = await apiTestApi.getRuns({ [info.kind]: info.id, page: 1, page_size: 30 });
    runs.value = res.results || [];
    total.value = res.count || 0;
    if (runs.value.length) currentId.value = runs.value[0].id;
  } catch (error) {
    ElMessage.error(errorMessage(error, '获取执行历史失败'));
  } finally {
    loading.value = false;
  }
};

const goAll = () => {
  visible.value = false;
  router.push({ name: 'ApiRunList', query: { [target.value.kind]: target.value.id } });
};

defineExpose({ open });
</script>
