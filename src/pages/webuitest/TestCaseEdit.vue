<template>
  <div class="test-case-edit-page">
    <!-- ═══ Landing 模式：新建空用例，极简 GPT 风格 ═══ -->
    <div v-if="isLandingMode" class="landing-page">
      <div class="landing-topbar">
        <el-button @click="goBack" text>
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
        <el-select v-model="form.project" placeholder="选择项目" size="default" class="landing-project" filterable>
          <el-option v-for="item in projects" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
      </div>
      <div class="landing-chat">
        <div
          v-if="landingChatHistory.length === 0"
          class="landing-empty"
        >
          <div class="landing-empty-title">告诉 AI 你想测试什么</div>
          <div class="landing-empty-sub">基于项目知识库，AI 会把自然语言拆成可执行的 Playwright 步骤</div>
        </div>
        <div v-else ref="landingMessagesRef" class="landing-messages">
          <div
            v-for="(msg, i) in landingChatHistory"
            :key="i"
            class="landing-msg"
            :class="`landing-msg--${msg.role}`"
          >
            <div class="landing-msg-avatar">{{ msg.role === 'user' ? '你' : 'AI' }}</div>
            <div class="landing-msg-bubble">
              <span class="landing-msg-text">{{ msg.content }}</span>
              <span
                v-if="landingParsing && msg.role === 'assistant' && i === landingChatHistory.length - 1"
                class="landing-stream-caret"
              ></span>
            </div>
          </div>
        </div>

        <div class="landing-input-bar">
          <div class="landing-input-wrap">
            <el-input
              v-model="nlEditingText"
              type="textarea"
              :autosize="{ minRows: 1, maxRows: 6 }"
              placeholder="告诉 AI 你想测试什么…"
              class="landing-textarea"
              :disabled="landingParsing"
              @keydown.enter.ctrl.prevent="handleLandingParse"
              @keydown.enter.meta.prevent="handleLandingParse"
            />
            <el-button
              type="primary"
              circle
              class="landing-send"
              :disabled="landingParsing || !nlEditingText.trim()"
              @click="handleLandingParse"
            >
              <el-icon size="16"><Promotion /></el-icon>
            </el-button>
          </div>
          <div class="landing-hint">
            <span>按 <kbd>Ctrl</kbd> + <kbd>Enter</kbd> 发送</span>
            <span class="hint-sep">·</span>
            <span>不想用 AI？<a class="skip-link" @click="skipLanding = true">跳过，手动创建 →</a></span>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══ 原编辑页（保持原样） ═══ -->
    <template v-else>
      <!-- 顶部导航栏 -->
      <div class="page-header">
        <div class="header-left">
          <el-button @click="goBack" text>
            <el-icon><ArrowLeft /></el-icon>
            返回
          </el-button>
          <div class="page-title">
            <el-icon><Document /></el-icon>
            <span>{{ pageTitle }}</span>
            <el-tag v-if="isViewMode" type="info" size="small" class="view-mode-tag">查看模式</el-tag>
          </div>
        </div>
        <div class="header-actions">
          <el-button v-if="!isViewMode" type="primary" @click="saveTestCase" :loading="saving">
            <el-icon><Check /></el-icon>
            保存用例
          </el-button>
          <el-button v-if="isViewMode" type="primary" @click="runTestCase" :loading="running">
            <el-icon><VideoPlay /></el-icon>
            重新执行
          </el-button>
          <el-button v-if="isViewMode" type="primary" @click="refreshResult" :loading="running">
            <el-icon><VideoPlay /></el-icon>
            刷新结果
          </el-button>
          <el-button v-if="!isViewMode" type="success" @click="previewAndRun" :loading="saving">
            <el-icon><VideoPlay /></el-icon>
            预览并执行
          </el-button>
        </div>
      </div>

      <!-- 主要内容区域 -->
      <div class="main-content">
        <!-- 左侧面板 (30%) -->
        <div class="left-panel">
          <el-tabs v-model="activeTab" class="left-tabs">
            <!-- 基础信息 Tab -->
            <el-tab-pane label="基础信息" name="basic">
              <div class="tab-content">
                <el-form ref="formRef" :model="form" :rules="rules" label-width="100px" :disabled="isViewMode">
                  <el-form-item label="所属项目" prop="project">
                    <el-select v-model="form.project" placeholder="请选择项目" style="width: 100%">
                      <el-option v-for="item in projects" :key="item.id" :label="item.name" :value="item.id" />
                    </el-select>
                  </el-form-item>

                  <el-form-item label="用例名称" prop="name">
                    <el-input v-model="form.name" placeholder="请输入用例名称" />
                  </el-form-item>

                  <el-form-item label="用例描述">
                    <el-input v-model="form.description" type="textarea" :rows="4" placeholder="请输入用例描述" />
                  </el-form-item>

                  <el-form-item label="用例描述">
                    <el-radio-group v-model="form.device_type">
                      <el-radio :value="1">pc</el-radio>
                      <el-radio :value="2">mobile</el-radio>
                    </el-radio-group>
                  </el-form-item>

                  <el-form-item label="测试设备" prop="device">
                    <el-select v-model="form.device" placeholder="请选择测试设备" style="width: 100%">
                      <el-option label="pc端-chrome" value="chrome" />
                      <el-option label="pc端-firefox" value="firefox" />
                      <el-option label="H5端-iPhone 12 Pro" value="iPhone 12 Pro" />
                    </el-select>
                  </el-form-item>

                  <el-form-item label="AItest 兜底自愈">
                    <el-switch v-model="form.enable_ai_heal" />
                    <div class="form-tip">普通步骤失败时自动走 AI 重试并反向更新 selector。默认关闭。</div>
                  </el-form-item>
                </el-form>
              </div>
            </el-tab-pane>

            <!-- 场景步骤 Tab -->
            <el-tab-pane label="场景步骤" name="steps">
              <div class="tab-content">
                <div class="steps-header">
                  <div class="steps-title">测试步骤 ({{ currentSteps.length }})</div>
                  <div class="steps-actions">
                    <el-button
                      size="small"
                      class="view-switcher"
                      :icon="stepsViewMode === 'card' ? View : List"
                      @click="stepsViewMode = stepsViewMode === 'card' ? 'nl' : 'card'"
                    >
                      {{ stepsViewMode === 'card' ? '查看' : '预览' }}
                    </el-button>
                    <el-button
                      v-if="!isViewMode && stepsViewMode === 'card'"
                      type="primary"
                      size="small"
                      @click="addStep"
                    >
                      <el-icon><Plus /></el-icon>
                      {{ activeStepIndex >= 0 ? `在步骤${activeStepIndex + 1}后添加` : '添加步骤' }}
                    </el-button>
                  </div>
                </div>

                <!-- 自然语言模式 -->
                <div v-if="stepsViewMode === 'nl'" class="nl-mode">
                  <el-input
                    v-model="nlEditingText"
                    type="textarea"
                    :autosize="{ minRows: 10, maxRows: 24 }"
                    placeholder="用自然语言描述你的测试步骤，例如：在账号框输入 admin，密码框输入 123456，点击登录按钮"
                    class="nl-mode-textarea"
                    :disabled="isViewMode"
                  />
                  <div class="nl-mode-actions" v-if="!isViewMode">
                    <el-button type="primary" @click="regenerateFromNL">
                      <span v-if="currentSteps.length === 0">用自然语言生成步骤</span>
                      <span v-else>重新生成并覆盖（{{ currentSteps.length }} 个步骤）</span>
                    </el-button>
                  </div>
                </div>

                <!-- 步骤卡片模式 -->
                <div v-else class="steps-list">
                  <div v-if="currentSteps.length === 0" class="empty-steps">
                    <el-empty description="暂无测试步骤，点右上「查看」让 AI 生成，或点「添加步骤」手动创建"></el-empty>
                  </div>

                  <div v-else class="steps-container">
                    <draggable
                      v-model="currentSteps"
                      group="steps"
                      item-key="id"
                      @change="onDragChange"
                      class="draggable-container"
                      :disabled="isViewMode"
                    >
                      <template #item="{ element: step, index }">
                        <div
                          class="step-item"
                          :class="{
                            'step-active': activeStepIndex === index,
                            'step-success': isViewMode && step.status === 'success',
                            'step-failed': isViewMode && step.status === 'failed',
                            'step-running': isViewMode && step.status === 'running',
                            'step-need-fix': !isViewMode && step.needs_manual_fix,
                            'step-low-conf':
                              !isViewMode &&
                              !step.needs_manual_fix &&
                              step.confidence !== undefined &&
                              step.confidence < 0.8 &&
                              step.confidence > 0,
                          }"
                          @click="selectStep(index)"
                        >
                          <div class="step-header">
                            <div class="step-number">步骤 {{ index + 1 }} ：</div>
                            <div class="step-title">
                              <el-tag type="info" size="small">
                                {{ getActionLabel(step.action) }}
                              </el-tag>
                              {{ step.name }}
                              <!-- AI 解析标识 -->
                              <el-tag
                                v-if="!isViewMode && step.needs_manual_fix"
                                type="danger"
                                size="small"
                                class="ai-tag"
                              >
                                需手修
                              </el-tag>
                              <el-tag
                                v-else-if="
                                  !isViewMode &&
                                  step.confidence !== undefined &&
                                  step.confidence < 0.8 &&
                                  step.confidence > 0
                                "
                                type="warning"
                                size="small"
                                class="ai-tag"
                              >
                                低置信 {{ step.confidence }}
                              </el-tag>
                              <el-tag
                                v-else-if="!isViewMode && step.element_name"
                                type="success"
                                size="small"
                                class="ai-tag"
                              >
                                KB #{{ step.element_id }}
                              </el-tag>
                              <el-tag v-if="step.healed" type="primary" size="small" class="ai-tag"> 已自愈 </el-tag>
                              <!-- 查看模式下的状态标识 -->
                              <el-tag
                                v-if="isViewMode && step.status"
                                :type="getStepStatusType(step)"
                                size="small"
                                class="status-tag"
                              >
                                {{ getStepStatusLabel(step.status) }}
                              </el-tag>
                            </div>
                            <div class="step-actions" v-if="!isViewMode">
                              <el-button text size="small" type="primary" @click.stop="duplicateStep(index)">
                                <el-icon><CopyDocument /></el-icon>
                              </el-button>
                              <el-button
                                text
                                size="small"
                                type="danger"
                                @click.stop="removeStep(index)"
                                style="margin-left: 0px"
                              >
                                <el-icon><Delete /></el-icon>
                              </el-button>
                            </div>
                          </div>
                        </div>
                      </template>
                    </draggable>
                  </div>
                </div>
              </div>
            </el-tab-pane>
          </el-tabs>
        </div>

        <!-- 右侧面板 (70%) -->
        <div class="right-panel">
          <div v-if="activeStepIndex === -1" class="no-step-selected">
            <el-empty description="请选择一个步骤进行编辑"> </el-empty>
          </div>

          <div v-else class="step-detail-panel">
            <!-- 上部分：步骤详情 (60%) -->
            <div class="step-detail-section">
              <div class="step-detail-header">
                <div class="step-detail-title">
                  <el-icon><Edit /></el-icon>
                  <span>步骤 {{ activeStepIndex + 1 }} 详情</span>
                  <!-- 查看模式下的执行状态 -->
                  <el-tag
                    v-if="isViewMode && activeStep && activeStep.status"
                    :type="getStepStatusType(activeStep)"
                    size="small"
                    class="detail-status-tag"
                  >
                    {{ getStepStatusLabel(activeStep.status) }}
                  </el-tag>
                </div>
              </div>

              <div class="step-detail-content">
                <div
                  v-if="activeStep && !isViewMode && activeStep.needs_manual_fix && form.enable_ai_heal"
                  class="kb-hint-box kb-hint-warn"
                >
                  <el-icon class="kb-warn-triangle">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M12 3 L22 20 H2 L12 3 Z"
                        fill="currentColor"
                        fill-opacity="0.18"
                        stroke="currentColor"
                        stroke-width="1.8"
                        stroke-linejoin="round"
                      />
                      <path d="M12 10 V14.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                      <circle cx="12" cy="17.2" r="1.1" fill="currentColor" />
                    </svg>
                  </el-icon>
                  <span>AI 未命中知识库，执行时将AI自愈</span>
                </div>
                <div
                  v-else-if="activeStep && !isViewMode && activeStep.needs_manual_fix"
                  class="kb-hint-box kb-hint-warn"
                >
                  <el-icon class="kb-warn-triangle">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M12 3 L22 20 H2 L12 3 Z"
                        fill="currentColor"
                        fill-opacity="0.18"
                        stroke="currentColor"
                        stroke-width="1.8"
                        stroke-linejoin="round"
                      />
                      <path d="M12 10 V14.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                      <circle cx="12" cy="17.2" r="1.1" fill="currentColor" />
                    </svg>
                  </el-icon>
                  <span>AI 未命中知识库建议开启AI自愈</span>
                </div>
                <div v-if="activeStep && !isViewMode && activeStep.healed_at" class="kb-hint-box kb-hint-ok">
                  <el-icon><InfoFilled /></el-icon>
                  <span>上次自愈时间：{{ activeStep.healed_at }}</span>
                </div>

                <el-form v-if="activeStep" :model="activeStep" label-width="120px" :disabled="isViewMode">
                  <el-form-item label="步骤名称">
                    <el-input
                      v-model="activeStep.name"
                      placeholder="为步骤起一个描述性的名称，便于识别和管理"
                      style="width: 50%"
                    />
                  </el-form-item>

                  <el-form-item label="操作类型">
                    <el-select
                      v-model="activeStep.action"
                      placeholder="选择操作"
                      style="width: 50%"
                      @change="updateStepName"
                    >
                      <el-option v-for="item in stepTypes" :key="item.value" :label="item.label" :value="item.value" />
                    </el-select>
                  </el-form-item>

                  <el-form-item label="元素定位" v-if="elementLocatorRequired.includes(activeStep.action)">
                    <el-input v-model="activeStep.selector" placeholder="元素定位" style="width: 50%" />
                    <div class="form-tip">
                      为了保障测试人员易操作性，首选页面文字、placeholder定位，次选CSS选择器、XPath等定位方式
                    </div>
                  </el-form-item>

                  <el-form-item label="序号" v-if="elementLocatorRequired.includes(activeStep.action)">
                    <el-input-number
                      v-model="activeStep.nth"
                      :min="0"
                      placeholder="序号"
                      style="width: 20%"
                      controls-position="right"
                    />
                    <!-- <div class="form-tip">当页面有多个相同元素时，指定第几个元素</div> -->
                  </el-form-item>

                  <!-- <el-form-item label="输入内容" v-if="['fill', 'goto', 'upload_file'].includes(activeStep.action)"> -->
                  <el-form-item label="输入内容" v-if="elementValueRequired.includes(activeStep.action)">
                    <el-input v-model="activeStep.value" placeholder="输入内容" style="width: 50%" />
                    <!-- <div class="form-tip" v-if="activeStep.action === 'goto'">请输入完整的URL地址</div>
                  <div class="form-tip" v-else>请输入要填写的内容</div> -->
                  </el-form-item>

                  <el-form-item label="等待时间" v-if="activeStep.action === 'sleep'">
                    <el-input-number
                      v-model="activeStep.value"
                      :min="0"
                      placeholder="等待时间(秒)"
                      style="width: 20%"
                      controls-position="right"
                    />
                  </el-form-item>

                  <el-form-item label="关联用例" v-if="activeStep.action === 'reference'">
                    <el-select
                      v-model="activeStep.referenceCaseId"
                      placeholder="请选择要引用的用例"
                      style="width: 50%"
                      filterable
                      clearable
                      @change="updateStepName"
                    >
                      <el-option
                        v-for="testcase in testCases"
                        :key="testcase.id"
                        :label="testcase.name"
                        :value="testcase.id"
                      >
                        <div style="display: flex; justify-content: space-between; align-items: center">
                          <span>{{ testcase.name }}</span>
                          <span style="color: #999; font-size: 12px">#{{ testcase.id }}</span>
                        </div>
                      </el-option>
                    </el-select>
                    <div class="form-tip">选择要引用的测试用例，执行时会调用该用例的所有步骤</div>
                  </el-form-item>

                  <el-form-item v-if="activeStep.element_id" label="知识库">
                    <div class="kb-bind-row">
                      <router-link
                        :to="{ path: '/knowledge-base', query: { highlight: activeStep.element_id } }"
                        class="kb-bind-link"
                      >
                        <span class="kb-bind-id">KB #{{ activeStep.element_id }}</span>
                      </router-link>
                      <div
                        v-if="
                          activeStep.confidence !== undefined &&
                          activeStep.confidence !== null &&
                          activeStep.confidence !== ''
                        "
                        class="kb-bind-rate"
                      >
                        <el-rate
                          :model-value="Number(activeStep.confidence) * 5"
                          :max="5"
                          allow-half
                          disabled
                          :colors="['#f56c6c', '#e6a23c', '#67c23a']"
                        />
                        <span class="kb-bind-pct"> {{ activeStep.confidence }}</span>
                      </div>
                    </div>
                  </el-form-item>
                </el-form>
              </div>
            </div>

            <!-- 下部分：多tab区域 (40%) -->
            <div class="step-tabs-section">
              <el-tabs v-model="activeStepTab" class="step-tabs">
                <!-- 查看模式下的执行结果 Tab -->
                <el-tab-pane v-if="isViewMode" label="执行结果" name="result">
                  <div class="tab-content">
                    <div class="result-content">
                      <div class="result-section">
                        <!-- 执行结果内容 -->
                        <div
                          class="result-body"
                          style="
                            padding: 10px;
                            display: flex;
                            flex-direction: column;
                            gap: 16px;
                            align-items: flex-start;
                          "
                        >
                          <div style="display: flex; align-items: center; gap: 12px">
                            <span>状态：</span>
                            <el-tag v-if="activeStep && activeStep.status === 'success'" type="success">成功</el-tag>
                            <el-tag v-else-if="activeStep && activeStep.status === 'failed'" type="danger">失败</el-tag>
                            <el-tag v-else type="info">{{
                              activeStep && activeStep.status ? getStepStatusLabel(activeStep.status) : '未知'
                            }}</el-tag>
                          </div>
                          <div v-if="activeStep && activeStep.duration !== undefined && activeStep.duration !== null">
                            <span>执行时间：{{ activeStep.run_time }} </span>
                          </div>
                          <div v-if="activeStep && activeStep.duration !== undefined && activeStep.duration !== null">
                            <span>耗时：{{ activeStep.duration }} 秒</span>
                          </div>
                          <div v-if="activeStep && activeStep.status === 'success' && activeStep.assertion_message">
                            <span>断言：{{ activeStep.assertion_message }} </span>
                          </div>
                          <div v-if="activeStep && activeStep.status === 'failed'" style="width: 100%">
                            <span style="display: block; margin-bottom: 8px">失败原因：</span>
                            <div
                              style="
                                background: #fef0f0;
                                border: 1px solid #fde2e2;
                                border-radius: 4px;
                                padding: 12px;
                                color: #f56c6c;
                                white-space: pre-wrap;
                                word-break: break-all;
                                line-height: 1.5;
                                font-size: 13px;
                              "
                            >
                              {{ activeStep.error || activeStep.assertion_message }}
                            </div>
                          </div>
                          <div v-if="activeStep && activeStep.screenshot" style="width: 100%">
                            <span style="display: block; margin-bottom: 8px">截图：</span>
                            <div style="display: flex; align-items: center; gap: 12px">
                              <el-image
                                :src="'data:image/png;base64,' + activeStep.screenshot"
                                fit="cover"
                                style="
                                  width: 120px;
                                  height: 80px;
                                  border-radius: 6px;
                                  border: 1px solid #e5e6eb;
                                  cursor: pointer;
                                "
                                :preview-src-list="['data:image/png;base64,' + activeStep.screenshot]"
                                preview-teleported
                              />
                              <div style="color: #666; font-size: 12px">点击缩略图查看大图</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </el-tab-pane>

                <el-tab-pane label="断言" name="assert">
                  <div class="tab-content">
                    <el-form v-if="activeStep" :model="activeStep" label-width="100px" :disabled="isViewMode">
                      <!-- 断言类型选择组件 -->
                      <el-form-item label="断言类型">
                        <el-select
                          v-model="activeStep.assertType"
                          placeholder="选择断言类型"
                          style="width: 100%"
                          clearable
                          @change="updateStepName"
                        >
                          <el-option
                            v-for="item in assertConfig.types"
                            :key="item.value"
                            :label="item.label"
                            :value="item.value"
                          />
                        </el-select>
                      </el-form-item>

                      <!-- 元素定位组件 -->
                      <el-form-item label="元素定位" v-if="assertNeedsSelector.includes(activeStep.assertType)">
                        <el-input
                          v-model="activeStep.assert_selector"
                          placeholder="输入元素定位器（文本、CSS选择器、XPath等）"
                          style="width: 100%"
                        />
                        <div class="form-tip">用于定位需要验证的元素</div>
                      </el-form-item>

                      <!-- 属性名称组件 -->
                      <el-form-item label="属性名称" v-if="assertNeedsAttribute.includes(activeStep.assertType)">
                        <el-input
                          v-model="activeStep.attrName"
                          placeholder="例如：class、id、value、href、src等"
                          style="width: 100%"
                        />
                        <div class="form-tip">要验证的元素属性名称</div>
                      </el-form-item>

                      <!-- 期望值组件 -->
                      <el-form-item label="期望值" v-if="assertNeedsExpected.includes(activeStep.assertType)">
                        <el-input v-model="activeStep.expected" placeholder="请输入期望值" style="width: 100%" />
                      </el-form-item>
                    </el-form>
                  </div>
                </el-tab-pane>
              </el-tabs>
            </div>
          </div>
        </div>
      </div>

      <!-- AI助手对话框 -->
      <el-dialog v-model="aiDialogVisible" width="60%" :show-close="false" class="ai-dialog">
        <template #header>
          <div class="ai-dialog-header">
            <div class="ai-header-left">
              <div class="ai-avatar">
                <el-icon size="18"><MagicStick /></el-icon>
              </div>
              <div class="ai-header-info">
                <div class="ai-title">AI 自然语言解析</div>
                <div class="ai-subtitle">基于项目知识库智能生成结构化测试步骤</div>
              </div>
            </div>
            <el-button text size="small" @click="aiDialogVisible = false" class="ai-close-btn">
              <el-icon><Close /></el-icon>
            </el-button>
          </div>
        </template>

        <div class="ai-assistant">
          <div class="chat-container" ref="chatContainer">
            <div v-if="chatHistory.length === 0" class="welcome-message">
              <div class="welcome-icon">
                <el-icon size="32"><MagicStick /></el-icon>
              </div>
              <div class="welcome-text">
                <h3>AI 自然语言解析</h3>
                <p>基于当前项目的知识库，把自然语言描述转成可直接执行的结构化步骤。执行时不走 AI，保证毫秒级回归。</p>
                <div class="example-suggestions">
                  <div class="suggestion-title">示例提示：</div>
                  <div class="suggestion-items">
                    <el-tag
                      size="small"
                      class="suggestion-tag"
                      @click="useExample('打开百度首页，搜索vue教程，点击第一个结果')"
                    >
                      搜索测试
                    </el-tag>
                    <el-tag
                      size="small"
                      class="suggestion-tag"
                      @click="useExample('登录系统，填写用户名admin，密码123456，点击登录按钮')"
                    >
                      登录测试
                    </el-tag>
                    <el-tag
                      size="small"
                      class="suggestion-tag"
                      @click="useExample('打开购物网站，添加商品到购物车，进行结账流程')"
                    >
                      购物流程
                    </el-tag>
                  </div>
                </div>
              </div>
            </div>

            <div v-for="(msg, index) in chatHistory" :key="index" class="chat-message">
              <div v-if="msg.role === 'user'" class="message-wrapper user-message">
                <div class="message-content user-content">
                  <div class="message-text">{{ msg.content }}</div>
                </div>
                <div class="message-avatar user-avatar">
                  <el-icon size="16"><User /></el-icon>
                </div>
              </div>

              <div v-else class="message-wrapper ai-message">
                <div class="message-avatar ai-avatar">
                  <el-icon size="16"><MagicStick /></el-icon>
                </div>
                <div class="message-content ai-content">
                  <div class="message-text">{{ msg.content }}</div>
                  <div
                    v-if="index === chatHistory.length - 1 && msg.content.includes('正在生成')"
                    class="typing-indicator"
                  >
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="chat-input-area">
            <div class="input-container">
              <el-input
                v-model="userInput"
                type="textarea"
                :autosize="{ minRows: 1, maxRows: 4 }"
                placeholder="请描述您的测试需求，例如：打开百度搜索摄影然后截图"
                class="chat-input"
                @keydown.enter.prevent="handleEnterKey"
              />
              <el-button
                type="primary"
                :disabled="!userInput.trim()"
                @click="sendMessage"
                class="send-button"
                :loading="sending"
              >
                <el-icon v-if="!sending"><Promotion /></el-icon>
                发送
              </el-button>
            </div>
            <div class="input-tips">
              <el-icon size="12"><InfoFilled /></el-icon>
              <span>按 Ctrl+Enter 快速发送，支持多行输入</span>
            </div>
          </div>
        </div>
      </el-dialog>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox, ElLoading } from 'element-plus';
import draggable from 'vuedraggable';
import {
  ArrowLeft,
  Document,
  DocumentAdd,
  Check,
  InfoFilled,
  List,
  Plus,
  MagicStick,
  CopyDocument,
  Delete,
  Edit,
  VideoPlay,
  Warning,
  Picture,
  Close,
  User,
  Promotion,
  View,
} from '@element-plus/icons-vue';
import {
  stepTypes,
  elementLocatorRequired,
  elementValueRequired,
  assertConfig,
  assertNeedsSelector,
  assertNeedsAttribute,
  assertNeedsExpected,
} from '@/utils/stepsConfig';
import { projectApi, parseNaturalLanguageStream } from '@/utils/api';

const route = useRoute();
const router = useRouter();

// 响应式数据
const formRef = ref(null);
const saving = ref(false);
const running = ref(false);
const activeTab = ref('steps'); // 默认选中场景步骤tab
const activeStepIndex = ref(-1);
const activeStepTab = ref('assert'); // 默认选中断言tab
const aiDialogVisible = ref(false);
const chatHistory = ref([]);
const userInput = ref('');
const sending = ref(false);
const chatContainer = ref(null);

const form = ref({
  id: null,
  project: null,
  name: '',
  description: '',
  url: '',
  device: 'chrome',
  steps: [],
  result: [],
  natural_language_text: '',
  enable_ai_heal: false,
});

// 自然语言原文相关
const nlCollapseActive = ref([]); // 折叠面板展开状态
const nlEditingText = ref(''); // 顶部"原文编辑区"的文本
const nlLastParseInfo = ref(null); // {ai_duration_ms, kb_size, warning}
const stepsViewMode = ref('card'); // 'nl' | 'card' — 场景步骤 tab 内部视图切换，默认步骤卡片

// 保存前只剥离"执行态中间产物"（如 status / result / error / duration / run_time / assertion_message），
// 保留 AI / KB 出身字段（element_id / element_name / confidence / needs_manual_fix）
// 以及自愈标记（healed / healed_at），保证这些字段能回传到后端。
const stripAIFields = (steps) => {
  return (steps || []).map((s) => {
    const { status, result, error, duration, run_time, assertion_message, ...clean } = s;
    return clean;
  });
};

const projects = ref([]);
const testCases = ref([]); // 用例列表，用于引用选择

// 计算属性
const isEdit = computed(() => !!route.params.id);
const isViewMode = computed(() => route.query.viewMode === 'true');

// Landing 模式：新建 + 无步骤 + 未点「跳过」 → 显示极简聊天首页
const landingParsing = ref(false);
const skipLanding = ref(false);
const landingChatHistory = ref([]); // [{role:'user'|'assistant', content:string}]
const landingMessagesRef = ref(null);

const scrollLandingToBottom = () => {
  nextTick(() => {
    const el = landingMessagesRef.value;
    if (el) el.scrollTop = el.scrollHeight;
  });
};
const isLandingMode = computed(
  () => !isEdit.value && !isViewMode.value && !skipLanding.value && (form.value.steps?.length || 0) === 0
);

// Landing 页解析入口（流式聊天模式）
const handleLandingParse = async () => {
  const text = (nlEditingText.value || '').trim();
  if (!text) return ElMessage.warning('请输入测试步骤描述');
  if (!form.value.project) return ElMessage.warning('请先选择项目（AI 解析需要项目知识库）');
  if (landingParsing.value) return;

  // 用户消息入历史 + 清空输入 + AI 空气泡占位
  landingChatHistory.value.push({ role: 'user', content: text });
  nlEditingText.value = '';
  landingChatHistory.value.push({ role: 'assistant', content: '' });
  const aiIndex = landingChatHistory.value.length - 1;
  landingParsing.value = true;
  scrollLandingToBottom();

  let done = null;
  try {
    done = await parseNaturalLanguageStream(
      { text, project_id: form.value.project },
      {
        onDelta: (chunk) => {
          const msg = landingChatHistory.value[aiIndex];
          if (msg) msg.content += chunk;
          scrollLandingToBottom();
        },
      }
    );
    if (!done) throw new Error('未收到 done 帧');

    const steps = done.steps || [];
    form.value.steps = steps.map((s) => ({
      ...s,
      id: Date.now() + Math.random(),
      name: s.description || s.action,
      assertType: 'no',
      attrName: '',
      expected: '',
      referenceCaseId: null,
    }));
    form.value.natural_language_text = text;
    nlLastParseInfo.value = {
      ai_duration_ms: done.ai_duration_ms,
      kb_size: done.kb_size,
      warning: done.warning,
    };
    if (steps.length > 0) activeStepIndex.value = 0;

    const needFixCount = steps.filter((s) => s.needs_manual_fix).length;
    if (needFixCount > 0) {
      ElMessage.warning(`已生成 ${steps.length} 个步骤，其中 ${needFixCount} 个需手修`);
    } else {
      ElMessage.success(`已生成 ${steps.length} 个步骤`);
    }
  } catch (error) {
    const errMsg = error.response?.data?.error || error.message || '解析失败';
    const msg = landingChatHistory.value[aiIndex];
    if (msg && !msg.content) msg.content = `⚠️ ${errMsg}`;
    ElMessage.error(`解析失败: ${errMsg}`);
  } finally {
    landingParsing.value = false;
    scrollLandingToBottom();
  }
};

const pageTitle = computed(() => {
  if (isViewMode.value) {
    return '查看测试用例';
  }
  return isEdit.value ? '编辑测试用例' : '新增测试用例';
});

// 表单验证规则
const rules = {
  project: [{ required: true, message: '请选择项目', trigger: 'change' }],
  name: [{ required: true, message: '请输入用例名称', trigger: 'blur' }],
  device: [{ required: true, message: '请选择测试设备', trigger: 'change' }],
};

// 当前显示的步骤列表
const currentSteps = computed({
  get: () => {
    return isViewMode.value ? form.value.result : form.value.steps;
  },
  set: (value) => {
    if (isViewMode.value) {
      form.value.result = value;
    } else {
      form.value.steps = value;
    }
  },
});

// 当前选中的步骤
const activeStep = computed({
  get: () => {
    if (activeStepIndex.value >= 0) {
      const steps = isViewMode.value ? form.value.result : form.value.steps;
      return steps[activeStepIndex.value];
    }
    return null;
  },
  set: (value) => {
    if (activeStepIndex.value >= 0) {
      const steps = isViewMode.value ? form.value.result : form.value.steps;
      steps[activeStepIndex.value] = value;
    }
  },
});

// 获取操作类型标签
const getActionLabel = (action) => {
  const stepType = stepTypes.find((item) => item.value === action);
  return stepType ? stepType.label : action;
};

// 返回上一页
// 返回上一页
const goBack = () => {
  // 使用 router.back() 返回，sessionStorage 会自动保持筛选条件
  router.back();
};

// 添加步骤
const addStep = () => {
  const newStep = {
    id: Date.now() + Math.random(),
    name: getActionLabel('click'),
    action: 'click',
    selector: '',
    value: '', // 默认为空
    nth: 0,
    expected: '',
    assertType: 'no', // 默认断言类型
    attrName: '', // 属性名称
    referenceCaseId: null, // 引用用例ID
  };

  // 如果有选中的步骤，在其后面插入新步骤，否则添加到最后
  if (activeStepIndex.value >= 0) {
    const insertIndex = activeStepIndex.value + 1;
    form.value.steps.splice(insertIndex, 0, newStep);
    activeStepIndex.value = insertIndex; // 选中新添加的步骤
  } else {
    form.value.steps.push(newStep);
    activeStepIndex.value = form.value.steps.length - 1;
  }

  activeTab.value = 'steps'; // 切换到步骤tab
};

// 拖拽变化处理
const onDragChange = (evt) => {
  // 更新当前选中的步骤索引
  if (activeStepIndex.value >= 0) {
    const steps = isViewMode.value ? form.value.result : form.value.steps;
    const movedStep = steps[activeStepIndex.value];
    if (movedStep) {
      // 找到移动后的步骤在新数组中的位置
      const newIndex = steps.findIndex((step) => step.id === movedStep.id);
      if (newIndex !== -1) {
        activeStepIndex.value = newIndex;
      }
    }
  }
};

// 删除步骤
const removeStep = (index) => {
  ElMessageBox.confirm('确定要删除这个步骤吗？', '确认删除', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(() => {
      form.value.steps.splice(index, 1);
      if (activeStepIndex.value === index) {
        activeStepIndex.value = -1;
      } else if (activeStepIndex.value > index) {
        activeStepIndex.value--;
      }
      ElMessage.success('步骤删除成功');
    })
    .catch(() => {
      // 用户取消删除
    });
};

// 选择步骤
const selectStep = (index) => {
  activeStepIndex.value = index;
  activeTab.value = 'steps'; // 切换到步骤tab
  // 查看模式下默认显示执行结果tab
  if (isViewMode.value) {
    activeStepTab.value = 'result';
  }
};

// 复制步骤
const duplicateStep = (index) => {
  const step = form.value.steps[index];
  if (step) {
    const newStep = {
      ...step,
      id: Date.now() + Math.random(),
      name: getActionLabel(step.action),
    };
    const insertIndex = index + 1;
    form.value.steps.splice(insertIndex, 0, newStep);
    activeStepIndex.value = insertIndex; // 选中新复制的步骤
    activeTab.value = 'steps'; // 切换到步骤tab
  }
};

// 保存测试用例
const saveTestCase = async () => {
  try {
    await formRef.value.validate();
    saving.value = true;

    // 保存前只剥离执行态中间产物，AI/KB 出身字段与自愈标记继续回传后端
    const payload = {
      ...form.value,
      steps: stripAIFields(form.value.steps),
      natural_language_text: nlEditingText.value || form.value.natural_language_text || '',
    };

    if (form.value.id) {
      await projectApi.updateCase(form.value.id, payload);
      ElMessage.success('更新成功');
    } else {
      await projectApi.createCase(payload);
      ElMessage.success('新增成功');
    }
  } catch (error) {
    console.log('error is ', error);
    ElMessage.error('请切到基础信息tab,填写必填项内容');
  } finally {
    saving.value = false;
  }
};

// AI助手相关
const openAIAssistant = () => {
  aiDialogVisible.value = true;
  chatHistory.value = [];
};

// 使用示例
const useExample = (example) => {
  userInput.value = example;
};

// 处理键盘事件
const handleEnterKey = (event) => {
  if (event.ctrlKey || event.metaKey) {
    sendMessage();
  }
};

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
  });
};

const sendMessage = async () => {
  const message = userInput.value.trim();
  if (!message) return ElMessage.warning('请输入有效的用例描述');

  if (!form.value.project) {
    return ElMessage.warning('请先在基础信息选择所属项目（AI 解析需要项目知识库）');
  }

  sending.value = true;
  userInput.value = '';
  chatHistory.value.push({ role: 'user', content: message });
  scrollToBottom();

  try {
    chatHistory.value.push({ role: 'assistant', content: '正在基于项目知识库解析，请稍等...' });
    scrollToBottom();

    const response = await projectApi.parseNaturalLanguage({
      text: message,
      project_id: form.value.project,
    });

    // 移除最后一条"正在生成"的消息
    chatHistory.value.pop();

    const steps = response.steps || [];
    const warningText = response.warning ? `⚠️ ${response.warning}` : '';
    const needFixCount = steps.filter((s) => s.needs_manual_fix).length;
    const lowConfCount = steps.filter((s) => !s.needs_manual_fix && (s.confidence ?? 0) < 0.8).length;

    chatHistory.value.push({
      role: 'assistant',
      content: `已解析 ${steps.length} 个步骤 | 知识库候选 ${response.kb_size} 条 | AI 耗时 ${
        response.ai_duration_ms
      } ms${needFixCount ? ` | ⚠️ ${needFixCount} 个需手修` : ''}${
        lowConfCount ? ` | 🟡 ${lowConfCount} 个低置信` : ''
      }${warningText ? ` | ${warningText}` : ''}`,
    });

    // 每个 step 补前端展示所需字段（id 用于拖拽 key，name 用于步骤列表显示）
    form.value.steps = steps.map((s) => ({
      ...s,
      id: Date.now() + Math.random(),
      name: s.description || getActionLabel(s.action),
      assertType: 'no',
      attrName: '',
      expected: '',
      referenceCaseId: null,
    }));
    form.value.natural_language_text = message;
    nlEditingText.value = message;
    nlLastParseInfo.value = {
      ai_duration_ms: response.ai_duration_ms,
      kb_size: response.kb_size,
      warning: response.warning,
    };

    setTimeout(() => {
      aiDialogVisible.value = false;
      ElMessage.success(`解析完成，生成 ${steps.length} 个步骤`);
      if (form.value.steps.length > 0) {
        activeStepIndex.value = 0;
      }
    }, 1200);
  } catch (error) {
    console.error('AI解析失败:', error);
    const errMsg = error.response?.data?.error || error.message || '解析失败';
    ElMessage.error(`解析失败: ${errMsg}`);
    if (chatHistory.value[chatHistory.value.length - 1]?.content.includes('正在')) {
      chatHistory.value.pop();
    }
    chatHistory.value.push({ role: 'assistant', content: `抱歉，解析失败：${errMsg}` });
    scrollToBottom();
  } finally {
    sending.value = false;
  }
};

// 顶部"重新用自然语言生成"按钮
const regenerateFromNL = async () => {
  const text = (nlEditingText.value || '').trim();
  if (!text) return ElMessage.warning('请先在下方输入自然语言描述');
  if (!form.value.project) return ElMessage.warning('请先选择所属项目');

  const currentStepCount = form.value.steps?.length || 0;
  if (currentStepCount > 0) {
    try {
      await ElMessageBox.confirm(
        `这会丢弃当前 ${currentStepCount} 个步骤，改用自然语言重新解析。此操作不可撤销，确定继续？`,
        '确认重新生成',
        { confirmButtonText: '确定覆盖', cancelButtonText: '取消', type: 'warning' }
      );
    } catch {
      return; // 用户取消
    }
  }

  const loading = ElLoading.service({
    lock: true,
    text: 'AI 正在基于知识库解析，请稍候...',
    background: 'rgba(0, 0, 0, 0.4)',
  });
  try {
    const response = await projectApi.parseNaturalLanguage({
      text,
      project_id: form.value.project,
    });
    const steps = response.steps || [];
    form.value.steps = steps.map((s) => ({
      ...s,
      id: Date.now() + Math.random(),
      name: s.description || getActionLabel(s.action),
      assertType: 'no',
      attrName: '',
      expected: '',
      referenceCaseId: null,
    }));
    form.value.natural_language_text = text;
    nlLastParseInfo.value = {
      ai_duration_ms: response.ai_duration_ms,
      kb_size: response.kb_size,
      warning: response.warning,
    };
    if (steps.length > 0) activeStepIndex.value = 0;
    ElMessage.success(`重新生成完成，共 ${steps.length} 个步骤`);
  } catch (error) {
    const errMsg = error.response?.data?.error || error.message || '解析失败';
    ElMessage.error(`解析失败: ${errMsg}`);
  } finally {
    loading.close();
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

// 获取用例列表
const fetchTestCases = async () => {
  try {
    const response = await projectApi.getCases();
    testCases.value = response;
  } catch (error) {
    console.error('获取用例列表失败:', error);
    ElMessage.error('获取用例列表失败');
  }
};

// 获取用例详情
const fetchTestCase = async (id) => {
  try {
    const response = await projectApi.getCase(id);
    form.value = {
      ...response,
      enable_ai_heal: response.enable_ai_heal ?? false,
    };
    nlEditingText.value = response.natural_language_text || '';

    // 设置初始选中的步骤
    const steps = isViewMode.value ? form.value.result : form.value.steps;
    if (steps && steps.length > 0) {
      activeStepIndex.value = 0;
      // 查看模式下默认显示执行结果tab
      if (isViewMode.value) {
        activeStepTab.value = 'result';
      }
    }
  } catch (error) {
    console.error('获取用例详情失败:', error);
    ElMessage.error('获取用例详情失败');
  }
};

// 更新步骤名称
const updateStepName = () => {
  if (activeStep.value) {
    // 根据action类型设置value的默认值
    if (activeStep.value.action === 'sleep') {
      activeStep.value.value = 2; // sleep操作默认值为2
    } else {
      activeStep.value.value = ''; // 其他操作默认值为空
    }

    if (activeStep.value.action === 'reference') {
      // 为引用步骤生成包含关联用例名称的名称
      if (activeStep.value.referenceCaseId) {
        const referencedCase = testCases.value.find((case_) => case_.id === activeStep.value.referenceCaseId);
        activeStep.value.name = `引用: ${referencedCase ? referencedCase.name : '未知用例'}`;
      } else {
        activeStep.value.name = '引用';
      }
    } else {
      activeStep.value.name = getActionLabel(activeStep.value.action);
    }
  }
};

// 获取步骤状态类型
const getStepStatusType = (step) => {
  if (step.status) {
    const typeMap = {
      success: 'success',
      failed: 'error',
      running: 'info',
    };
    return typeMap[step.status] || 'info';
  }
};

// 获取步骤状态标签
const getStepStatusLabel = (status) => {
  const labelMap = {
    success: '成功',
    failed: '失败',
    running: '执行中',
  };
  return labelMap[status] || '未知状态';
};

// 重新执行用例
const runTestCase = async () => {
  try {
    running.value = true;
    await projectApi.runCase({ id: form.value.id });
    ElMessage.success('用例执行成功');
    startPolling();
    // await fetchTestCase(form.value.id);
  } catch (error) {
    console.error('重新执行用例失败:', error);
    ElMessage.error('重新执行用例失败');
    throw error; // 重新抛出错误，让调用者能够处理
  } finally {
    running.value = false;
  }
};

// 刷新结果
const refreshResult = async () => {
  console.log('刷新结果', form);
  await fetchTestCase(form.value.id);
};

// 预览并执行
const previewAndRun = async () => {
  try {
    saving.value = true;
    // 先保存用例
    if (form.value.id) {
      await projectApi.updateCase(form.value.id, form.value);
    } else {
      const newCase = await projectApi.createCase(form.value);
      form.value.id = newCase.id;
    }
    // 跳转到查看模式并自动执行
    router.push({
      name: 'TestCaseEdit',
      params: { id: form.value.id },
      query: { viewMode: 'true', autoRun: 'true' },
    });
  } catch (error) {
    ElMessage.error('保存失败');
  } finally {
    saving.value = false;
  }
};

// 在查看模式下启动轮询
const startPolling = (existingLoading = null) => {
  if (!isViewMode.value) return;

  // 如果传入了现有的loading，先关闭它，然后创建新的
  let loading;
  if (existingLoading) {
    existingLoading.close();
    loading = ElLoading.service({
      lock: true,
      text: '正在执行用例，请稍候...',
      background: 'rgba(0, 0, 0, 0.7)',
    });
  } else {
    loading = ElLoading.service({
      lock: true,
      text: '正在执行用例，请稍候...',
      background: 'rgba(0, 0, 0, 0.7)',
    });
  }

  const poll = async () => {
    try {
      const res = await projectApi.getCase(form.value.id);
      if (res) {
        form.value = { ...res, enable_ai_heal: res.enable_ai_heal ?? false };
        // 如果执行完成，停止轮询
        if (res.result && Array.isArray(res.result) && res.result.length > 0) {
          const allCompleted = res.result.every((step) => step.status && ['success', 'failed'].includes(step.status));
          if (allCompleted) {
            loading.close(); // 关闭loading
            return; // 停止轮询
          }
        }
      }
    } catch (error) {
      console.error('轮询失败:', error);
      loading.close(); // 出错时也要关闭loading
    }
    // 继续轮询
    setTimeout(poll, 2000);
  };

  // 开始轮询
  setTimeout(poll, 1000);
};

// 检查并自动执行
const checkAndAutoRun = () => {
  if (isViewMode.value && route.query.autoRun === 'true') {
    // 立即显示loading，避免没有loading的问题
    const loading = ElLoading.service({
      lock: true,
      text: '正在启动用例执行，请稍候...',
      background: 'rgba(0, 0, 0, 0.7)',
    });

    setTimeout(async () => {
      try {
        running.value = true;
        await projectApi.runCase({ id: form.value.id });
        ElMessage.success('用例执行成功');
        // 稍微延迟一下，然后将现有的loading传递给startPolling
        setTimeout(() => {
          startPolling(loading);
        }, 500);
      } catch (error) {
        console.error('启动用例执行失败:', error);
        loading.close();
        ElMessage.error('启动用例执行失败');
      } finally {
        running.value = false;
        loading.close();
      }
    }, 1000);
  }
};

onMounted(() => {
  fetchProjects();
  fetchTestCases();
  if (route.params.id) {
    fetchTestCase(route.params.id);
    checkAndAutoRun();
  }
});

// 监听路由变化
watch(
  () => route.query,
  (newQuery) => {
    if (newQuery.autoRun === 'true') {
      checkAndAutoRun();
    }
  },
  { immediate: true }
);
</script>

<style scoped>
.test-case-edit-page {
  height: 90vh;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
  overflow: hidden;
}

/* 顶部导航栏 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: #fff;
  border-bottom: 1px solid #e5e6eb;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 16px;
  font-weight: 600;
}

.view-mode-tag {
  margin-left: 6px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

/* 主要内容区域 */
.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
}

/* 左侧面板 */
.left-panel {
  width: 30%;
  background: #fff;
  border-right: 1px solid #e5e6eb;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.left-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.left-tabs :deep(.el-tabs__header) {
  margin: 0;
  padding: 8px 16px 0;
  border-bottom: 1px solid #e5e6eb;
  order: 1;
  flex-shrink: 0;
}

.left-tabs :deep(.el-tabs__content) {
  flex: 1;
  overflow: hidden;
  order: 2;
  min-height: 0;
}

.left-tabs :deep(.el-tab-pane) {
  height: 100%;
  overflow: hidden;
}

.tab-content {
  height: 100%;
  padding: 12px;
  overflow-y: auto;
}

/* 步骤相关样式 */
.steps-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.steps-title {
  font-size: 14px;
  font-weight: 600;
}

.steps-actions {
  display: flex;
  gap: 6px;
}

.steps-list {
  height: calc(100% - 40px);
  overflow-y: auto;
}

.empty-steps {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 120px;
}

.steps-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 4px 0;
}

.draggable-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.step-item {
  background: #fff;
  border: 1px solid #e5e6eb;
  border-radius: 8px;
  padding: 10px 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 2px;
}

.step-item:hover {
  border-color: #409eff;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
  transform: translateY(-1px);
}

.step-item.step-active {
  border-color: #409eff;
  background: #f0f9ff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
}

/* 查看模式下的步骤状态样式 */
.step-item.step-success {
  border-left: 4px solid #67c23a;
  background: #f0f9ff;
}

.step-item.step-failed {
  border-left: 4px solid #f56c6c;
  background: #fef0f0;
}

.step-item.step-running {
  border-left: 4px solid #409eff;
  background: #f0f9ff;
  animation: pulse 2s infinite;
}

/* AI 解析状态：需手修 / 低置信 */
.step-item.step-need-fix {
  border-left: 4px solid #f56c6c;
  background: linear-gradient(90deg, #fef0f0 0%, #ffffff 35%);
}
.step-item.step-low-conf {
  border-left: 4px solid #e6a23c;
  background: linear-gradient(90deg, #fdf6ec 0%, #ffffff 35%);
}

.ai-tag {
  margin-left: 6px;
}

/* 自然语言原文面板 */
.nl-panel {
  background: #fff;
  border-bottom: 1px solid #e5e6eb;
  flex-shrink: 0;
  padding: 0 16px;
}
.nl-collapse {
  border: none !important;
}
.nl-collapse :deep(.el-collapse-item__header) {
  background: transparent;
  border-bottom: none;
  padding: 0;
  height: 42px;
}
.nl-collapse :deep(.el-collapse-item__wrap) {
  border-bottom: none;
  background: transparent;
}
.nl-collapse :deep(.el-collapse-item__content) {
  padding-bottom: 12px;
}
.nl-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #334155;
}
.nl-icon {
  color: #667eea;
}
.nl-hint {
  font-weight: 400;
  font-size: 12px;
  color: #94a3b8;
}
.nl-hint-strong {
  font-weight: 400;
  font-size: 12px;
  color: #667eea;
}
.nl-tag {
  margin-left: auto;
  margin-right: 12px;
}
.nl-body {
  padding: 4px 4px 8px;
}
.nl-textarea :deep(.el-textarea__inner) {
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.6;
}
.nl-actions {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.nl-warn {
  color: #e6a23c;
  font-size: 12px;
}

/* KB 提示框（右侧详情面板顶部） */
.kb-hint-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  background: #f0f4ff;
  border: 1px solid #dbe2ff;
  color: #475569;
  font-size: 13px;
  margin-bottom: 12px;
}
.kb-hint-box.kb-hint-ok {
  background: #f0f9eb;
  border-color: #e1f3d8;
  color: #529b2e;
}
.kb-hint-box.kb-hint-warn {
  background: #fdf6ec;
  border-color: #faecd8;
  color: #b88230;
}
.kb-hint-box .kb-warn-triangle {
  color: #e6a23c;
  font-size: 16px;
  flex-shrink: 0;
}
.kb-hint-box .kb-jump-link {
  margin-left: auto;
  color: #409eff;
  text-decoration: none;
  font-size: 12px;
}
.kb-hint-box .kb-jump-link:hover {
  text-decoration: underline;
}
.kb-hint-box code {
  background: rgba(64, 158, 255, 0.08);
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 12px;
}
/* 关联知识库 · 链接 + 置信进度 */
.kb-bind-row {
  display: flex;
  align-items: center;
  gap: 16px;
  max-width: 520px;
}
.kb-bind-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px;
  border-radius: 4px;
  background: #f5f7fa;
  color: #303133;
  text-decoration: none;
  font-size: 13px;
  line-height: 1.4;
  flex-shrink: 0;
  transition:
    background 0.15s ease,
    color 0.15s ease;
}
.kb-bind-link:hover {
  background: #ecf5ff;
  color: #409eff;
}
.kb-bind-id {
  font-family: Menlo, Consolas, monospace;
  font-size: 12px;
  color: #409eff;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.2px;
}
.kb-bind-name {
  color: inherit;
}
.kb-bind-rate {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.kb-bind-rate :deep(.el-rate__icon) {
  margin-right: 2px;
  font-size: 16px;
}
.kb-bind-pct {
  font-size: 12px;
  color: #909399;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.2px;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(64, 158, 255, 0.4);
  }
  70% {
    box-shadow: 0 0 0 6px rgba(64, 158, 255, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(64, 158, 255, 0);
  }
}

.step-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.step-number {
  font-size: 12px;
  font-weight: 600;
  color: #666;
  min-width: 50px;
  background: #f5f7fa;
  padding: 2px 6px;
  border-radius: 4px;
}

.step-title {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  line-height: 1.4;
}

.status-tag {
  margin-left: auto;
}

.step-actions {
  display: flex;
  gap: 0px;
}

/* 右侧面板 */
.right-panel {
  flex: 1;
  background: #fff;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.no-step-selected {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.step-detail-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.step-detail-section {
  flex: 1;
  padding: 12px;
  border-bottom: 1px solid #e5e6eb;
  overflow-y: auto;
  min-height: 0;
}

.step-detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.step-detail-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
}

.detail-status-tag {
  margin-left: 6px;
}

.step-detail-actions {
  display: flex;
  gap: 6px;
}

.form-tip {
  font-size: 10px;
  color: #999;
  margin-top: 2px;
  line-height: 1.3;
  display: block;
  width: 100%;
}

/* 步骤tabs区域 */
.step-tabs-section {
  height: 45%; /*执行结果高度*/
  border-top: 1px solid #e5e6eb;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.step-tabs {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.step-tabs :deep(.el-tabs__header) {
  margin: 0;
  padding: 0 16px;
  border-bottom: 1px solid #e5e6eb;
  order: 1;
  flex-shrink: 0;
}

.step-tabs :deep(.el-tabs__content) {
  flex: 1;
  overflow: hidden;
  order: 2;
  min-height: 0;
}

.step-tabs :deep(.el-tab-pane) {
  height: 100%;
  overflow: hidden;
}

.step-tabs .tab-content {
  height: 100%;
  padding: 12px;
  overflow-y: auto;
}

/* 执行结果样式 */
.result-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.result-section {
  background: #f8f9fa;
  border: 1px solid #e5e6eb;
  border-radius: 4px;
  overflow: hidden;
}

.result-section-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: #fff;
  border-bottom: 1px solid #e5e6eb;
  font-size: 13px;
  font-weight: 600;
}

.log-content {
  padding: 8px;
  max-height: 120px;
  overflow-y: auto;
}

.log-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.log-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 4px 8px;
  background: #fff;
  border-radius: 3px;
  border-left: 2px solid #e5e6eb;
  font-family: monospace;
  font-size: 11px;
  line-height: 1.3;
}

.log-time {
  color: #999;
  min-width: 120px;
  flex-shrink: 0;
}

.log-level {
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  min-width: 50px;
  text-align: center;
  flex-shrink: 0;
}

.log-info {
  background: #e1f3d8;
  color: #67c23a;
}

.log-warn {
  background: #fdf6ec;
  color: #e6a23c;
}

.log-error {
  background: #fef0f0;
  color: #f56c6c;
}

.log-debug {
  background: #f0f9ff;
  color: #409eff;
}

.log-message {
  flex: 1;
  word-break: break-all;
}

.no-logs {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 80px;
}

.error-content {
  padding: 12px;
}

.error-details {
  margin-top: 10px;
  padding: 10px;
  background: #fff;
  border-radius: 4px;
  border: 1px solid #fde2e2;
}

.error-details pre {
  margin: 0;
  font-family: monospace;
  font-size: 12px;
  line-height: 1.4;
  color: #f56c6c;
  white-space: pre-wrap;
  word-break: break-all;
}

.screenshot-content {
  padding: 12px;
  display: flex;
  justify-content: center;
}

/* AI助手样式 */
.ai-dialog :deep(.el-dialog) {
  border-radius: 12px;
  overflow: hidden;
}

.ai-dialog :deep(.el-dialog__header) {
  padding: 0;
  margin: 0;
}

.ai-dialog :deep(.el-dialog__body) {
  padding: 0;
}

.ai-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.ai-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ai-avatar {
  width: 36px;
  height: 36px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
}

.ai-header-info {
  display: flex;
  flex-direction: column;
}

.ai-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

.ai-subtitle {
  font-size: 12px;
  opacity: 0.8;
  margin: 0;
}

.ai-close-btn {
  color: white !important;
  background: rgba(255, 255, 255, 0.1) !important;
  border: none !important;
  border-radius: 50% !important;
  width: 32px !important;
  height: 32px !important;
  padding: 0 !important;
}

.ai-close-btn:hover {
  background: rgba(255, 255, 255, 0.2) !important;
}

.ai-assistant {
  height: 500px;
  display: flex;
  flex-direction: column;
  background: #f8fafc;
}

.chat-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: #ffffff;
  background-image:
    radial-gradient(circle at 20px 80px, #f1f5f9 1px, transparent 1px),
    radial-gradient(circle at 80px 20px, #f1f5f9 1px, transparent 1px);
  background-size: 100px 100px;
}

.chat-container::-webkit-scrollbar {
  width: 6px;
}

.chat-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.chat-container::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.chat-container::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.welcome-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  color: #64748b;
}

.welcome-icon {
  margin-bottom: 16px;
  color: #667eea;
}

.welcome-text h3 {
  margin: 0 0 8px 0;
  color: #1e293b;
  font-size: 18px;
  font-weight: 600;
}

.welcome-text p {
  margin: 0 0 24px 0;
  color: #64748b;
  font-size: 14px;
  line-height: 1.5;
}

.example-suggestions {
  max-width: 400px;
}

.suggestion-title {
  font-size: 13px;
  color: #64748b;
  margin-bottom: 12px;
  font-weight: 500;
}

.suggestion-items {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.suggestion-tag {
  cursor: pointer;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #475569;
  transition: all 0.2s ease;
}

.suggestion-tag:hover {
  border-color: #667eea;
  background: #f0f4ff;
  color: #667eea;
  transform: translateY(-1px);
}

.chat-message {
  margin-bottom: 16px;
  animation: fadeInUp 0.3s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  max-width: 85%;
}

.user-message {
  margin-left: auto;
  flex-direction: row-reverse;
}

.ai-message {
  margin-right: auto;
}

.message-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-bottom: 4px;
}

.user-avatar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.ai-avatar {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.message-content {
  position: relative;
  border-radius: 18px;
  padding: 12px 16px;
  font-size: 14px;
  line-height: 1.5;
  max-width: 100%;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.user-content {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-bottom-right-radius: 4px;
}

.ai-content {
  background: #ffffff;
  color: #1e293b;
  border: 1px solid #e2e8f0;
  border-bottom-left-radius: 4px;
}

.message-text {
  word-wrap: break-word;
  white-space: pre-wrap;
}

.typing-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #f1f5f9;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #94a3b8;
  animation: typing 1.4s infinite ease-in-out;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%,
  60%,
  100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  30% {
    transform: translateY(-10px);
    opacity: 1;
  }
}

.chat-input-area {
  background: #ffffff;
  border-top: 1px solid #e2e8f0;
  padding: 16px 20px;
}

.input-container {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.chat-input {
  flex: 1;
}

.chat-input :deep(.el-textarea__inner) {
  border-radius: 20px;
  border: 1px solid #e2e8f0;
  padding: 12px 16px;
  font-size: 14px;
  line-height: 1.5;
  resize: none;
  transition: all 0.2s ease;
}

.chat-input :deep(.el-textarea__inner):focus {
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
}

.send-button {
  border-radius: 20px;
  padding: 0 20px;
  height: 40px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  font-weight: 500;
  transition: all 0.2s ease;
}

.send-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.send-button:disabled {
  background: #e2e8f0;
  color: #94a3b8;
  cursor: not-allowed;
}

.input-tips {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  font-size: 12px;
  color: #94a3b8;
}

.input-tips .el-icon {
  color: #cbd5e1;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .left-panel {
    width: 35%;
  }
}

@media (max-width: 768px) {
  .main-content {
    flex-direction: column;
  }

  .left-panel {
    width: 100%;
    height: 40%;
  }

  .right-panel {
    height: 60%;
  }

  .step-detail-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .step-detail-actions {
    width: 100%;
    justify-content: flex-end;
  }
}

/* ═══════════════════════ 场景步骤：自然语言模式 ═══════════════════════ */
.view-switcher {
  margin-right: 4px;
}

.nl-mode {
  padding: 4px 0 8px;
}

.nl-mode-textarea :deep(.el-textarea__inner) {
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.7;
  padding: 12px 14px;
  font-family: inherit;
}

.nl-mode-actions {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.nl-mode-info {
  color: #64748b;
}

/* ═══════════════════════ Landing（极简 GPT 风） ═══════════════════════ */
.landing-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
}

.landing-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-bottom: 1px solid #f1f5f9;
  flex-shrink: 0;
}

.landing-project {
  width: 220px;
}

.hint-sep {
  margin: 0 8px;
  color: #cbd5e1;
}

.skip-link {
  color: #667eea;
  cursor: pointer;
  text-decoration: none;
  transition: color 0.15s;
}

.skip-link:hover {
  color: #4f46e5;
  text-decoration: underline;
}

.landing-chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  position: relative;
}

/* 空态：未发消息时居中显示欢迎语 */
.landing-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 8px;
  padding: 20px;
  color: #64748b;
}
.landing-empty-title {
  font-size: 22px;
  font-weight: 600;
  color: #1e293b;
}
.landing-empty-sub {
  font-size: 13px;
  color: #94a3b8;
}

/* 聊天消息区：flex:1 可滚动 */
.landing-messages {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 24px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: stretch;
}

.landing-msg {
  display: flex;
  gap: 10px;
  max-width: 760px;
  width: 100%;
  margin: 0 auto;
}

.landing-msg--user {
  flex-direction: row-reverse;
}

.landing-msg-avatar {
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}
.landing-msg--user .landing-msg-avatar {
  background: linear-gradient(135deg, #0ea5e9, #06b6d4);
}
.landing-msg--assistant .landing-msg-avatar {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
}

.landing-msg-bubble {
  max-width: calc(100% - 48px);
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 13.5px;
  line-height: 1.7;
  word-break: break-word;
  white-space: pre-wrap;
}
.landing-msg--user .landing-msg-bubble {
  background: #0ea5e9;
  color: #fff;
  border-top-right-radius: 4px;
}
.landing-msg--assistant .landing-msg-bubble {
  background: #f1f5f9;
  color: #1e293b;
  border-top-left-radius: 4px;
  font-family: Menlo, Consolas, monospace;
  font-size: 12.5px;
}

.landing-stream-caret {
  display: inline-block;
  width: 7px;
  height: 14px;
  vertical-align: -2px;
  margin-left: 2px;
  background: #6366f1;
  animation: landing-caret-blink 1s steps(1) infinite;
}
@keyframes landing-caret-blink {
  0%, 50% { opacity: 1; }
  50.01%, 100% { opacity: 0; }
}

/* 输入栏沉底 */
.landing-input-bar {
  flex-shrink: 0;
  padding: 14px 20px 18px;
  background: #fff;
  border-top: 1px solid #f1f5f9;
}

.landing-input-wrap {
  position: relative;
  width: 100%;
  max-width: 760px;
  margin: 0 auto;
  background: #fff;
  border-radius: 18px;
  border: 1px solid #e2e8f0;
  padding: 10px 56px 10px 16px;
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.05);
  transition: all 0.15s;
}

.landing-input-wrap:focus-within {
  border-color: #667eea;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.12);
}

.landing-textarea :deep(.el-textarea__inner) {
  border: none !important;
  box-shadow: none !important;
  padding: 4px 0;
  font-size: 15px;
  line-height: 1.6;
  resize: none;
  background: transparent;
}

.landing-send {
  position: absolute;
  bottom: 6px;
  right: 6px;
  width: 36px;
  height: 36px;
  background: #1e293b;
  border: none;
}

.landing-send:hover:not(:disabled) {
  background: #0f172a;
}

.landing-send:disabled {
  background: #e2e8f0;
  color: #cbd5e1;
}

.landing-hint {
  margin-top: 8px;
  font-size: 12px;
  color: #94a3b8;
  text-align: center;
}

.landing-hint kbd {
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  padding: 1px 6px;
  font-family: monospace;
  font-size: 11px;
  color: #475569;
}
</style>
