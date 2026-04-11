import { createRouter, createWebHashHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import Login from '../views/login.vue'
import Register from '../views/register.vue'
import Tabs from '../views/Tabs.vue'
import StartTrip from '../views/startTrip.vue'
import Dashboard from '../views/dashboard.vue'
import Ai from '../views/ai.vue'
import Settings from '../views/settings.vue'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/login'
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
    path: '/tabs',
    component: Tabs,
    children: [
      {
        path: '',
        redirect: '/tabs/dashboard'
      },
      {
        path: 'startTrip',
        component: StartTrip,
      },
      {
        path: 'dashboard',
        component: Dashboard,
      },
      {
        path: 'ai',
        component: Ai,
      },
      {
        path: 'settings',
        component: Settings,
      },
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes
})

export default router
