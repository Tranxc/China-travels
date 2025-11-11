import { onRequest as __api_auth_complete_register_js_onRequest } from "D:\\China-travels\\functions\\api\\auth\\complete-register.js"
import { onRequest as __api_auth_login_js_onRequest } from "D:\\China-travels\\functions\\api\\auth\\login.js"
import { onRequest as __api_auth_send_code_js_onRequest } from "D:\\China-travels\\functions\\api\\auth\\send-code.js"
import { onRequest as __api_auth_verify_js_onRequest } from "D:\\China-travels\\functions\\api\\auth\\verify.js"
import { onRequest as __api_comment_js_onRequest } from "D:\\China-travels\\functions\\api\\comment.js"
import { onRequest as __api_favorites_js_onRequest } from "D:\\China-travels\\functions\\api\\favorites.js"
import { onRequest as __api_scene_js_onRequest } from "D:\\China-travels\\functions\\api\\scene.js"

export const routes = [
    {
      routePath: "/api/auth/complete-register",
      mountPath: "/api/auth",
      method: "",
      middlewares: [],
      modules: [__api_auth_complete_register_js_onRequest],
    },
  {
      routePath: "/api/auth/login",
      mountPath: "/api/auth",
      method: "",
      middlewares: [],
      modules: [__api_auth_login_js_onRequest],
    },
  {
      routePath: "/api/auth/send-code",
      mountPath: "/api/auth",
      method: "",
      middlewares: [],
      modules: [__api_auth_send_code_js_onRequest],
    },
  {
      routePath: "/api/auth/verify",
      mountPath: "/api/auth",
      method: "",
      middlewares: [],
      modules: [__api_auth_verify_js_onRequest],
    },
  {
      routePath: "/api/comment",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_comment_js_onRequest],
    },
  {
      routePath: "/api/favorites",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_favorites_js_onRequest],
    },
  {
      routePath: "/api/scene",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_scene_js_onRequest],
    },
  ]