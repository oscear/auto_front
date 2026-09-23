// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import Layout from '../layout/Layout.vue';
import Dashboard from '../pages/Dashboard.vue';
import User from '../pages/User.vue';
import Settings from '../pages/Settings.vue';

export const menuRoutes = [
  {
    path: '/',
    component: Layout,
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: Dashboard,
        meta: { title: '首页', icon: 'House' },
      },
      // {
      //   path: 'system',
      //   name: 'System',
      //   meta: { title: '系统管理', icon: 'Setting' },
      //   children: [
      //     {
      //       path: '/user',
      //       name: 'User',
      //       component: User,
      //       meta: { title: '用户管理', icon: 'House' },
      //     },
      //     {
      //       path: '/settings',
      //       name: 'Settings',
      //       component: Settings,
      //       meta: { title: '系统设置', icon: 'House' },
      //     },
      //   ],
      // },
      {
        path: 'test-management',
        name: 'test-management',
        meta: { title: '测试管理', icon: 'Setting' },
        children: [
          {
            path: '/project',
            name: 'project',
            meta: { title: '项目管理', icon: 'FolderOpened' },
            component: () => import('../pages/webuitest/ProjectManager.vue'),
          },
          {
            path: '/ui-case-manage',
            name: 'CaseManage',
            meta: { title: '用例管理（UI）', icon: 'Monitor' },
            component: () => import('../pages/webuitest/CaseManage.vue'),
          },
          {
            path: '/api-case-manage',
            name: 'ApiCaseManage',
            meta: { title: '用例管理（API）', icon: 'Connection' },
            component: () => import('@/pages/apitest/ApiCaseManage.vue'),
          },
          {
            path: '/schedule',
            name: 'sechule',
            meta: { title: '调度任务', icon: 'Timer' },
            component: () => import('../pages/webuitest/sechule.vue'),
          },
          {
            path: '/webuitest/edit/:id?',
            name: 'TestCaseEdit',
            component: () => import('@/pages/webuitest/TestCaseEdit.vue'),
            meta: { title: '编辑用例', hidden: true },
          },
          {
            path: '/api-case-edit/:id?',
            name: 'ApiCaseEdit',
            component: () => import('@/pages/apitest/ApiCaseEdit.vue'),
            meta: { title: '编辑接口用例', hidden: true },
          },
          {
            path: '/knowledge-base',
            name: 'KnowledgeBase',
            meta: { title: '知识库管理', icon: 'Collection' },
            component: () => import('../pages/knowledge/KnowledgeBase.vue'),
          },
        ],
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('../components/LoginPage.vue'),
      meta: { title: '登录', icon: 'user' },
    },
    {
      path: '/register',
      name: 'Register',
      component: () => import('../pages/Auth/Register.vue'),
      meta: { title: '注册', icon: 'user' },
    },
    ...menuRoutes,
  ],
});

router.beforeEach((to, from, next) => {
  const isAuthenticated = localStorage.getItem('authData');
  if (to.name !== 'Login' && to.name !== 'Register' && !isAuthenticated) {
    next({ name: 'Login' });
  } else {
    next();
  }
});

export default router;
