import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import HomePage from '../views/HomePage.vue'
import Login from '../views/login.vue'
import Register from '../views/register.vue'
import Dashboard from '@/views/dashboard.vue';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/home'
  },
  {
    path: '/home',
    name: 'Home',
    component: HomePage
  },
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
  {
    path: '/register',
    name: 'Register',
    component: Register
  },
  {
    path: '/tabs/',
    component: Tabs,
    children: [
      {
        path: '',
        redirect: 'startTrip'
      },
      {
        path: 'startTrip',
        component: startTrip,
      },,
      {
        path: 'dashboard',
        component: dashboard,
      },
      {
        path: 'ai',
        component: ai,
      },
      {
        path: 'settings',
        component: settings,
      },
      
    ]
  }
  {
    path: "/dashboard",
    name: "Dashboard",
    component: Dashboard
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router
