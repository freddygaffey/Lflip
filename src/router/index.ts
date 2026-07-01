import { createRouter, createWebHashHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
// login is the first screen shown, so keep it eager; everything else is
// lazy-loaded so the initial bundle (and the cold-start black screen) is small
import Login from '../views/login.vue'
const Register = () => import('../views/register.vue')
const Tabs = () => import('../views/Tabs.vue')
const StartTrip = () => import('../views/startTrip.vue')
const Dashboard = () => import('../views/dashboard.vue')
const Ai = () => import('../views/ai.vue')
const Logger = () => import('../views/logger.vue')
const Debug = () => import('../views/debug.vue')
const Settings = () => import('../views/settings.vue')
const EndTrip = () => import('../views/endTrip.vue')
const Marketing = () => import('../views/marketing.vue')
const TripDetail = () => import('../views/tripDetail.vue')
const Welcome = () => import('../views/welcome.vue')

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/marketing',
    name: 'Marketing',
    component: Marketing
  },
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
  {
    path: '/welcome',
    name: 'Welcome',
    component: Welcome
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
        path: 'trip/:id',
        component: TripDetail,
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
