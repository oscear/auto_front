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
      // ---- 公共：项目与调度（UI、接口共用）----
      {
        path: 'test-management',
        name: 'test-management',
        meta: { title: '项目与调度', icon: 'Setting' },
        children: [
          {
            path: '/project',
            name: 'project',
            meta: { title: '项目管理', icon: 'FolderOpened' },
            component: () => import('../pages/webuitest/ProjectManager.vue'),
          },
          {
            path: '/schedule',
            name: 'sechule',
            meta: { title: '调度任务', icon: 'Timer' },
            component: () => import('../pages/webuitest/sechule.vue'),
          },
        ],
      },
      // ---- UI 自动化 ----
      {
        path: 'ui-automation',
        name: 'ui-automation',
        meta: { title: 'UI 自动化', icon: 'Monitor' },
        children: [
          {
            path: '/ui-case-manage',
            name: 'CaseManage',
            meta: { title: 'UI 用例', icon: 'Monitor' },
            component: () => import('../pages/webuitest/CaseManage.vue'),
          },
          {
            path: '/knowledge-base',
            name: 'KnowledgeBase',
            meta: { title: '元素知识库', icon: 'Collection' },
            component: () => import('../pages/knowledge/KnowledgeBase.vue'),
          },
          {
            path: '/webuitest/edit/:id?',
            name: 'TestCaseEdit',
            component: () => import('@/pages/webuitest/TestCaseEdit.vue'),
            meta: { title: '编辑用例', hidden: true },
          },
        ],
      },
      // ---- 接口自动化 ----
      {
        path: 'api-automation',
        name: 'api-automation',
        meta: { title: '接口自动化', icon: 'Connection' },
        children: [
          {
            path: '/api-case-manage',
            name: 'ApiCaseManage',
            meta: { title: '接口用例', icon: 'Document' },
            component: () => import('@/pages/apitest/ApiCaseManage.vue'),
          },
          {
            path: '/api-scenario-manage',
            name: 'ApiScenarioManage',
            meta: { title: '接口场景', icon: 'Share' },
            component: () => import('@/pages/apitest/ApiScenarioManage.vue'),
          },
          {
            path: '/api-env-manage',
            name: 'ApiEnvManage',
            meta: { title: '环境与变量', icon: 'SetUp' },
            component: () => import('@/pages/apitest/ApiEnvManage.vue'),
          },
          {
            path: '/api-run-list',
            name: 'ApiRunList',
            meta: { title: '执行记录', icon: 'List' },
            component: () => import('@/pages/apitest/ApiRunList.vue'),
          },
          {
            path: '/api-case-edit/:id?',
            name: 'ApiCaseEdit',
            component: () => import('@/pages/apitest/ApiCaseEdit.vue'),
            meta: { title: '编辑接口用例', hidden: true },
          },
          {
            path: '/api-scenario-edit/:id?',
            name: 'ApiScenarioEdit',
            component: () => import('@/pages/apitest/ApiScenarioEdit.vue'),
            meta: { title: '编排接口场景', hidden: true },
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
