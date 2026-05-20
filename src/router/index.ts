import { createRouter, createWebHashHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import Login from '../views/login.vue'
import Register from '../views/register.vue'
import Tabs from '../views/Tabs.vue'
import StartTrip from '../views/startTrip.vue'
import Dashboard from '../views/dashboard.vue'
import Ai from '../views/ai.vue'
import Logger from '../views/logger.vue'
import Debug from '../views/debug.vue'
import Settings from '../views/settings.vue'
import EndTrip from '../views/endTrip.vue'

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
    path: '/log',
    name: 'Log',
    component: Logger
  },
  {
    path: '/endTrip',
    name: 'EndTrip',
    component: EndTrip
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
        path: 'debug',
        component: Debug,
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
