<template>
  <!-- 一次请求的结果：摘要行 + 响应体 / 响应头 / 断言结果 / 提取变量 / 实际请求。工作台、场景运行结果、执行记录共用 -->
  <div class="at-resp" :class="{ 'at-resp--embedded': embedded }">
    <div class="at-resp__bar">
      <div class="at-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.name"
          type="button"
          class="at-tab"
          :class="{ 'is-active': activeTab === tab.name }"
          :disabled="!result"
          @click="activeTab = tab.name"
        >
          {{ tab.label }}
          <span v-if="tab.badge !== ''" class="at-tab__badge" :class="tab.tone">{{ tab.badge }}</span>
        </button>
      </div>
      <div v-if="loading" class="at-resp__summary">
        <span class="at-spinner"></span>
        <span class="at-resp__live">发送中 <b class="at-mono">{{ (elapsedMs / 1000).toFixed(1) }} s</b></span>
      </div>
      <div v-else-if="result" class="at-resp__summary">
        <span v-if="hasResponse" class="at-http" :class="'at-http--' + httpClass(response.status_code)">
          {{ response.status_code }} {{ response.reason || '' }}
        </span>
        <span v-else class="at-http at-http--err">未收到响应</span>
        <span class="at-resp__metric" title="耗时"><el-icon><Timer /></el-icon>{{ formatDuration(durationMs) }}</span>
        <span v-if="hasResponse" class="at-resp__metric" title="响应体大小">
          <el-icon><Files /></el-icon>{{ formatSize(response.size) }}
        </span>
        <span
          v-if="assertions.length"
          class="at-resp__metric at-resp__assert"
          :class="failedCount ? 'is-fail' : 'is-pass'"
          title="断言通过数 / 总数"
          @click="activeTab = 'assertions'"
        >
          <el-icon><component :is="failedCount ? CircleCloseFilled : CircleCheckFilled" /></el-icon>
          断言 {{ assertions.length - failedCount }}/{{ assertions.length }}
        </span>
        <span v-else-if="result.status === 'skipped'" class="at-resp__metric">已跳过</span>
      </div>
    </div>

    <div class="at-resp__body">
      <!-- 发送中 -->
      <div v-if="loading" class="at-empty at-empty--inline">
        <span class="at-spinner at-spinner--lg"></span>
        <p class="at-empty__title">正在发送请求…</p>
        <p class="at-empty__desc">已等待 {{ (elapsedMs / 1000).toFixed(1) }} 秒，由平台服务端代发，不受浏览器跨域限制</p>
      </div>

      <!-- 没发送过 -->
      <slot v-else-if="!result" name="empty">
        <div class="at-empty at-empty--inline">
          <p class="at-empty__title">还没有响应</p>
        </div>
      </slot>

      <template v-else>
        <div v-if="result.error" class="at-resp__error">
          <el-icon><WarningFilled /></el-icon><span>{{ result.error }}</span>
        </div>

        <!-- 响应体 -->
        <div v-show="activeTab === 'body'" class="at-resp__pane">
          <template v-if="hasBody">
            <div class="at-resp__tools">
              <div v-if="isJson" class="at-seg at-seg--sm">
                <button type="button" :class="{ 'is-active': bodyView === 'tree' }" @click="bodyView = 'tree'">美化</button>
                <button type="button" :class="{ 'is-active': bodyView === 'raw' }" @click="bodyView = 'raw'">原文</button>
              </div>
              <span v-else class="at-resp__type">{{ contentType || '文本' }}</span>
              <template v-if="isJson && bodyView === 'tree'">
                <button type="button" class="at-link-btn" @click="broadcast(true)">全部展开</button>
                <button type="button" class="at-link-btn" @click="broadcast(false)">全部折叠</button>
              </template>
              <span v-if="response.truncated" class="at-resp__trunc">响应超过 200KB，只保存了前 200KB</span>
              <span class="at-flex-1"></span>
              <button type="button" class="at-link-btn" @click="copy(bodyText)">
                <el-icon><CopyDocument /></el-icon>复制
              </button>
            </div>
            <div class="at-resp__scroll">
              <div v-if="isJson && bodyView === 'tree'" class="at-json at-mono">
                <JsonNode :value="bodyJson" />
              </div>
              <pre v-else class="at-code at-mono">{{ bodyText }}</pre>
            </div>
          </template>
          <div v-else class="at-hint at-hint--center">{{ hasResponse ? '响应体为空' : '请求没有发成功，没有响应体' }}</div>
        </div>

        <!-- 响应头 -->
        <div v-show="activeTab === 'headers'" class="at-resp__pane">
          <div class="at-resp__scroll">
            <div v-if="headerList.length" class="at-dl">
              <template v-for="item in headerList" :key="item[0]">
                <span class="at-dl__k at-mono">{{ item[0] }}</span>
                <span class="at-dl__v at-mono">{{ item[1] }}</span>
              </template>
            </div>
            <div v-else class="at-hint at-hint--center">没有响应头</div>
          </div>
        </div>

        <!-- 断言结果 -->
        <div v-show="activeTab === 'assertions'" class="at-resp__pane">
          <div class="at-resp__scroll">
            <div v-if="assertions.length" class="at-asserts">
              <div v-for="(item, index) in assertions" :key="index" class="at-assert" :class="item.passed ? 'is-pass' : 'is-fail'">
                <el-icon class="at-assert__icon">
                  <component :is="item.passed ? CircleCheckFilled : CircleCloseFilled" />
                </el-icon>
                <div class="at-assert__main">
                  <div class="at-assert__title">
                    {{ ASSERT_TYPE_TEXT[item.type] || item.type }}
                    <code v-if="item.expr" class="at-mono">{{ item.expr }}</code>
                    <span class="at-assert__op">{{ ASSERT_OP_TEXT[item.op] || item.op }}</span>
                  </div>
                  <div class="at-assert__values">
                    <span class="at-assert__label">期望</span>
                    <code class="at-mono">{{ noExpected(item) ? '—' : inline(item.expected) }}</code>
                    <span class="at-assert__label">实际</span>
                    <code class="at-mono" :class="{ 'is-bad': !item.passed }">{{ inline(item.actual) }}</code>
                  </div>
                  <div v-if="item.message" class="at-assert__msg">{{ item.message }}</div>
                </div>
              </div>
            </div>
            <div v-else class="at-hint at-hint--center">这次请求没有断言</div>
          </div>
        </div>

        <!-- 提取到的变量 -->
        <div v-show="activeTab === 'extracted'" class="at-resp__pane">
          <div class="at-resp__scroll">
            <div v-if="extractedList.length" class="at-dl">
              <template v-for="item in extractedList" :key="item[0]">
                <span class="at-dl__k at-mono at-var">{{ item[0] }}</span>
                <span class="at-dl__v at-mono">{{ inline(item[1]) }}</span>
              </template>
            </div>
            <div v-else class="at-hint at-hint--center">这次请求没有提取到变量</div>
          </div>
        </div>

        <!-- 实际发出的请求 -->
        <div v-show="activeTab === 'request'" class="at-resp__pane">
          <div class="at-resp__scroll">
            <div class="at-req-line">
              <span :class="methodClass(request.method)">{{ request.method || '-' }}</span>
              <span class="at-mono at-req-line__url">{{ request.url || '-' }}</span>
            </div>
            <template v-if="reqHeaderList.length">
              <div class="at-sub-title">请求头<span class="at-sub-title__note">敏感值已打码</span></div>
              <div class="at-dl">
                <template v-for="item in reqHeaderList" :key="item[0]">
                  <span class="at-dl__k at-mono">{{ item[0] }}</span>
                  <span class="at-dl__v at-mono">{{ item[1] }}</span>
                </template>
              </div>
            </template>
            <template v-if="hasReqBody">
              <div class="at-sub-title">请求体<span class="at-sub-title__note">{{ request.body_type }}</span></div>
              <pre class="at-code at-mono">{{ pretty(request.body) }}</pre>
            </template>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, provide, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import {
  CircleCheckFilled, CircleCloseFilled, CopyDocument, Files, Timer, WarningFilled,
} from '@element-plus/icons-vue';
import JsonNode from './JsonNode.vue';
import {
  ASSERT_OP_TEXT, ASSERT_TYPE_TEXT, copyText, formatDuration, formatSize, httpClass, inline, methodClass, pretty,
} from '../common';

const props = defineProps({
  // { status, duration_ms, request, response, assertions, extracted, error }
  result: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  elapsedMs: { type: Number, default: 0 },
  // 嵌在步骤卡片里时用：高度随内容，不撑满
  embedded: { type: Boolean, default: false },
});

const activeTab = ref('body');
const bodyView = ref('tree');

const request = computed(() => props.result?.request || {});
const response = computed(() => props.result?.response || {});
const assertions = computed(() => props.result?.assertions || []);
const failedCount = computed(() => assertions.value.filter((a) => !a.passed).length);
const hasResponse = computed(
  () => response.value.status_code !== undefined && response.value.status_code !== null
);
const durationMs = computed(() => props.result?.duration_ms ?? response.value.elapsed_ms);
const headerList = computed(() => Object.entries(response.value.headers || {}));
const reqHeaderList = computed(() => Object.entries(request.value.headers || {}));
const extractedList = computed(() => Object.entries(props.result?.extracted || {}));
const hasReqBody = computed(() => {
  const body = request.value.body;
  return body !== null && body !== undefined && body !== '';
});
const contentType = computed(() => {
  const hit = headerList.value.find(([k]) => k.toLowerCase() === 'content-type');
  return hit ? String(hit[1]).split(';')[0] : '';
});

// 响应体：对象直接当 JSON；字符串能解析成对象/数组的也当 JSON
const bodyJson = computed(() => {
  const body = response.value.body;
  if (body !== null && typeof body === 'object') return body;
  if (typeof body === 'string') {
    const text = body.trim();
    if (text.startsWith('{') || text.startsWith('[')) {
      try {
        return JSON.parse(text);
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
});
const isJson = computed(() => bodyJson.value !== undefined);
const hasBody = computed(() => {
  const body = response.value.body;
  return hasResponse.value && body !== null && body !== undefined && body !== '';
});
const bodyText = computed(() => {
  if (isJson.value && bodyView.value === 'tree') return JSON.stringify(bodyJson.value, null, 2);
  return pretty(response.value.body);
});

const tabs = computed(() => [
  { name: 'body', label: '响应体', badge: '' },
  { name: 'headers', label: '响应头', badge: headerList.value.length || '' },
  {
    name: 'assertions',
    label: '断言结果',
    badge: assertions.value.length ? `${assertions.value.length - failedCount.value}/${assertions.value.length}` : '',
    tone: failedCount.value ? 'is-fail' : 'is-pass',
  },
  { name: 'extracted', label: '提取变量', badge: extractedList.value.length || '' },
  { name: 'request', label: '实际请求', badge: '' },
]);

const noExpected = (item) => item.op === 'exists' || item.op === 'not_exists' || (item.type === 'regex' && item.op === 'matches');

// 新结果进来：有断言没过就停在断言页，没收到响应就看实际请求
watch(
  () => props.result,
  (value) => {
    if (!value) return;
    bodyView.value = 'tree';
    if (failedCount.value > 0) activeTab.value = 'assertions';
    else if (!hasResponse.value) activeTab.value = 'request';
    else activeTab.value = 'body';
  },
  { immediate: true }
);

const signal = ref({ tick: 0, open: true });
provide('atJsonSignal', signal);
const broadcast = (open) => {
  signal.value = { tick: signal.value.tick + 1, open };
};

const copy = async (text) => {
  if (await copyText(text)) ElMessage.success('已复制');
  else ElMessage.error('复制失败');
};
</script>
