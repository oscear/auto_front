<template>
  <div class="sidebar-container">
    <el-menu
      router
      :default-active="$route.path"
      background-color="transparent"
      text-color="#64748b"
      active-text-color="#0369a1"
      :collapse-transition="false"
      class="sidebar-menu"
    >
    <template v-for="item in menuItems" :key="item.path">
      <el-menu-item v-if="!item.children" :index="item.path">
        <el-icon v-if="Icons[item.meta.icon]" class="menu-icon">
          <component :is="Icons[item.meta.icon]" />
        </el-icon>
        <span class="menu-text">{{ item.meta.title }}</span>
      </el-menu-item>

      <el-sub-menu v-else :index="item.path">
        <template #title>
          <el-icon v-if="Icons[item.meta.icon]" class="menu-icon">
            <component :is="Icons[item.meta.icon]" />
          </el-icon>
          <span class="menu-text">{{ item.meta.title }}</span>
        </template>
        <el-menu-item v-for="child in item.children" :key="child.path" :index="child.path">
          <!-- <el-icon v-if="Icons[child.meta.icon]" class="menu-icon">
            <component :is="Icons[child.meta.icon]" />
          </el-icon> -->
          <span class="submenu-text">{{ child.meta.title }}</span>
        </el-menu-item>
      </el-sub-menu>
    </template>
    </el-menu>
  </div>
</template>

<script setup>
import { menuRoutes } from '../router';
import { ref } from 'vue';
import * as Icons from '@element-plus/icons-vue'; // 引入所有图标

// 递归过滤hidden菜单
function filterHiddenMenus(routes) {
  return routes
    .filter(item => !(item.meta && item.meta.hidden))
    .map(item => ({
      ...item,
      children: item.children ? filterHiddenMenus(item.children) : undefined,
    }));
}

const menuItems = ref(
  filterHiddenMenus(menuRoutes[0].children)
);
</script>

<style scoped>
.sidebar-container {
  width: 200px;
  height: 100%;
  background: linear-gradient(180deg, #fafbfc 0%, #f4f6f8 100%);
  position: relative;
  overflow: hidden;
  border-right: 1px solid #e5e7eb;
}

.sidebar-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(20px);
}

:deep(.el-menu) {
  width: 100%;
  height: 100%;
  border: none;
  position: relative;
  z-index: 1;
  padding: 12px 8px;
}

/* 菜单项基础样式 */
:deep(.el-menu-item) {
  margin: 4px 0;
  border-radius: 10px;
  transition: all 0.3s ease;
  border: 1px solid transparent;
  background: transparent;
  color: #64748b !important;
  height: 48px;
  line-height: 48px;
  position: relative;
}

:deep(.el-menu-item):hover {
  background: rgba(59, 130, 246, 0.08) !important;
  border-color: rgba(59, 130, 246, 0.2);
  transform: translateX(2px);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
  color: #3b82f6 !important;
}

/* 激活状态样式 */
:deep(.el-menu-item.is-active) {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%) !important;
  border-color: #3b82f6;
  color: #ffffff !important;
  font-weight: 600;
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.3);
  transform: translateX(3px);
}



/* 子菜单样式 */
:deep(.el-sub-menu) {
  margin: 4px 0;
}

:deep(.el-sub-menu .el-sub-menu__title) {
  border-radius: 10px;
  transition: all 0.3s ease;
  border: 1px solid transparent;
  background: transparent;
  color: #64748b !important;
  height: 48px;
  line-height: 48px;
  margin: 0;
}

:deep(.el-sub-menu .el-sub-menu__title):hover {
  background: rgba(59, 130, 246, 0.08) !important;
  border-color: rgba(59, 130, 246, 0.2);
  transform: translateX(2px);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
  color: #3b82f6 !important;
}

/* 父级菜单不显示选中状态 */
:deep(.el-sub-menu.is-active .el-sub-menu__title) {
  background: transparent !important;
  border-color: transparent;
  color: #64748b !important;
  font-weight: 500;
}

/* 子菜单项样式 */
:deep(.el-sub-menu .el-menu-item) {
  background: transparent !important;
  border: 1px solid transparent;
  margin: 2px 12px;
  height: 40px;
  line-height: 40px;
  font-size: 13px;
  color: #6b7280 !important;
}

:deep(.el-sub-menu .el-menu-item):hover {
  background: rgba(59, 130, 246, 0.05) !important;
  border-color: rgba(59, 130, 246, 0.1);
  transform: translateX(2px);
  color: #3b82f6 !important;
}

:deep(.el-sub-menu .el-menu-item.is-active) {
  background: rgba(59, 130, 246, 0.1) !important;
  border-color: #3b82f6;
  transform: translateX(3px);
  color: #3b82f6 !important;
  font-weight: 500;
}

/* 图标样式 */
.menu-icon {
  font-size: 18px;
  margin-right: 8px;
  color: inherit;
  transition: all 0.3s ease;
}

.menu-text {
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.submenu-text {
  font-size: 13px;
  font-weight: 400;
  transition: all 0.3s ease;
}

/* 子菜单展开动画 */
:deep(.el-sub-menu .el-menu) {
  background: transparent !important;
  padding: 8px 0;
}

/* 移除默认的选中状态背景 */
:deep(.el-menu-item:not(.is-active):hover) {
  background: rgba(59, 130, 246, 0.08) !important;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .sidebar-container {
    width: 180px;
  }
  
  :deep(.el-menu-item) {
    height: 44px;
    line-height: 44px;
  }
  
  .menu-text {
    font-size: 13px;
  }
  
  .menu-icon {
    font-size: 16px;
  }
}
</style>
