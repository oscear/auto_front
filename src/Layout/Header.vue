<template>
  <div class="header">
    <div class="header-left">
      <div class="logo-section">
        <el-icon class="logo-icon"><Monitor /></el-icon>
        <span class="title">管理系统</span>
      </div>
    </div>
    
    <div class="header-right">
      <!-- 操作手册 -->
      <el-button 
        type="primary" 
        size="small"
        class="manual-btn"
        @click="showDocDialog = true"
      >
        <el-icon><Document /></el-icon>
        操作手册
      </el-button>
      
      <el-dialog v-model="showDocDialog" title="操作手册" width="70%">
        <div style="height: 70vh">
          <iframe
            src="https://k34w0rqi63.feishu.cn/docx/CiRed31lJog4UBx0GIqcXcDjnOc"
            style="width: 100%; height: 100%; border: none"
            allowfullscreen
          ></iframe>
        </div>
        <template #footer>
          <el-button type="primary" @click="showDocDialog = false">关闭</el-button>
        </template>
      </el-dialog>

      <!-- 用户信息 -->
      <div class="user-section">
        <el-dropdown trigger="click" @command="handleUserCommand">
          <div class="user-info">
            <el-avatar 
              :size="32" 
              :src="userInfo.avatar"
              class="user-avatar"
            >
              {{ userInfo.name?.charAt(0)?.toUpperCase() }}
            </el-avatar>
            <span class="username">{{ userInfo.name }}</span>
            <el-icon class="dropdown-icon"><ArrowDown /></el-icon>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="profile">
                <el-icon><User /></el-icon>
                个人资料
              </el-dropdown-item>
              <el-dropdown-item command="settings">
                <el-icon><Setting /></el-icon>
                系统设置
              </el-dropdown-item>
              <el-dropdown-item divided command="logout">
                <el-icon><SwitchButton /></el-icon>
                退出登录
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { ref } from 'vue';
import { 
  Monitor, 
  Document, 
  ArrowDown, 
  User, 
  Setting, 
  SwitchButton 
} from '@element-plus/icons-vue';

const router = useRouter();
const userInfo = ref({
  name: JSON.parse(localStorage.getItem('authData'))?.first_name || '未登录用户',
  avatar: ''
});
const showDocDialog = ref(false);

const handleUserCommand = (command) => {
  switch (command) {
    case 'profile':
      // 跳转到个人资料页面
      break;
    case 'settings':
      // 跳转到系统设置页面
      break;
    case 'logout':
      handleLogout();
      break;
  }
};

const handleLogout = () => {
  localStorage.removeItem('authData');
  router.push('/login');
};
</script>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  height: 55px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #ffffff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 1000;
}

.header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
  pointer-events: none;
}

.header-left {
  display: flex;
  align-items: center;
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  font-size: 24px;
  color: #ffffff;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.title {
  font-size: 20px;
  font-weight: 600;
  color: #ffffff;
  letter-spacing: 0.5px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.manual-btn {
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #ffffff;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  font-weight: 500;
}

.manual-btn:hover {
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.user-section {
  position: relative;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.user-info:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.user-avatar {
  border: 2px solid rgba(255, 255, 255, 0.3);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-weight: 600;
  color: #ffffff;
}

.username {
  font-size: 14px;
  font-weight: 500;
  color: #ffffff;
  margin: 0 4px;
}

.dropdown-icon {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  transition: transform 0.3s ease;
}

.user-info:hover .dropdown-icon {
  transform: rotate(180deg);
}

/* 下拉菜单样式优化 */
:deep(.el-dropdown-menu) {
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  border: 1px solid #e5e6eb;
  padding: 8px 0;
}

:deep(.el-dropdown-menu__item) {
  padding: 10px 16px;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
}

:deep(.el-dropdown-menu__item:hover) {
  background: #f0f9ff;
  color: #0369a1;
}

:deep(.el-dropdown-menu__item .el-icon) {
  font-size: 16px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .header {
    padding: 0 16px;
    height: 56px;
  }
  
  .title {
    font-size: 18px;
  }
  
  .logo-icon {
    font-size: 20px;
  }
  
  .header-right {
    gap: 12px;
  }
  
  .manual-btn {
    padding: 6px 12px;
    font-size: 12px;
  }
  
  .username {
    display: none;
  }
  
  .user-info {
    padding: 4px 8px;
  }
}
</style>
