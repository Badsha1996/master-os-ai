import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: () => import("../views/HomeView.vue"),
    },
    {
      path: "/command",
      name: "command",
      component: () => import("../views/GlobalInput-proto.vue"),
    },
  ],
});

export default router;
