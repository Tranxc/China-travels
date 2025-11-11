var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// ../.wrangler/tmp/bundle-MRBR2V/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// api/auth/complete-register.js
var corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json"
};
function respond(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders
  });
}
__name(respond, "respond");
async function hashCode(code, salt) {
  const encoder = new TextEncoder();
  const data = encoder.encode(code + salt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hashCode, "hashCode");
function generateSalt() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}
__name(generateSalt, "generateSalt");
async function onRequest(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  }
  if (request.method !== "POST") {
    return respond({ error: "Method not allowed" }, 405);
  }
  try {
    const payload = await request.json();
    const email = String(payload.email || "").trim();
    const nickname = String(payload.nickname || "").trim();
    const password = String(payload.password || "");
    if (!email || !nickname || !password) return respond({ error: "\u4FE1\u606F\u4E0D\u5B8C\u6574" }, 400);
    const salt = generateSalt();
    const passwordHash = await hashCode(password, salt);
    await env.china_travel_db.prepare("INSERT INTO users (email, nickname, password_hash) VALUES (?, ?, ?)").bind(email, nickname, `${passwordHash}:${salt}`).run();
    const user = await env.china_travel_db.prepare("SELECT id, email, nickname FROM users WHERE email = ?").bind(email).first();
    const token = btoa(JSON.stringify({
      email,
      userId: user.id,
      timestamp: Date.now()
    }));
    return respond({ success: true, token, user });
  } catch (error) {
    return respond({ error: error.message || "\u670D\u52A1\u5668\u9519\u8BEF" }, 500);
  }
}
__name(onRequest, "onRequest");

// api/auth/login.js
var corsHeaders2 = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json"
};
function respond2(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders2
  });
}
__name(respond2, "respond");
async function hashPassword(password, salt) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hashPassword, "hashPassword");
async function onRequest2(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  }
  if (request.method !== "POST") {
    return respond2({ error: "Method not allowed" }, 405);
  }
  try {
    const payload = await request.json();
    const email = String(payload.email || "").trim();
    const password = String(payload.password || "");
    if (!email || !password) {
      return respond2({ error: "\u90AE\u7BB1\u6216\u5BC6\u7801\u7F3A\u5931" }, 400);
    }
    if (password.length < 6) {
      return respond2({ error: "\u5BC6\u7801\u957F\u5EA6\u4E0D\u8DB3" }, 400);
    }
    const user = await env.china_travel_db.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
    if (!user) {
      return respond2({ error: "\u7528\u6237\u4E0D\u5B58\u5728" }, 400);
    }
    const [storedHash, salt] = String(user.password_hash || "").split(":");
    const inputHash = await hashPassword(password, salt);
    if (inputHash !== storedHash) {
      return respond2({ error: "\u5BC6\u7801\u9519\u8BEF" }, 400);
    }
    const token = btoa(JSON.stringify({
      email: user.email,
      userId: user.id,
      timestamp: Date.now()
    }));
    return respond2({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname
      }
    });
  } catch (error) {
    return respond2({ error: error.message || "\u670D\u52A1\u5668\u9519\u8BEF" }, 500);
  }
}
__name(onRequest2, "onRequest");

// services/email.js
async function sendVerificationEmail(email, code, env) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: "noreply@235800.xyz",
      to: email,
      subject: "\u8BD7\u610F\u5C71\u6CB3 - \u90AE\u7BB1\u9A8C\u8BC1\u7801",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #c9a227; text-align: center;">\u8BD7\u610F\u5C71\u6CB3</h2>
          <div style="background: #fdf8e3; padding: 30px; border-radius: 10px; margin: 20px 0;">
            <h3 style="color: #8b4513;">\u60A8\u7684\u9A8C\u8BC1\u7801</h3>
            <p style="font-size: 32px; font-weight: bold; color: #c9a227; text-align: center; letter-spacing: 8px; margin: 30px 0;">
              ${code}
            </p>
            <p style="color: #666; font-size: 14px;">\u9A8C\u8BC1\u7801\u6709\u6548\u671F\u4E3A 10 \u5206\u949F,\u8BF7\u52FF\u6CC4\u9732\u7ED9\u4ED6\u4EBA\u3002</p>
          </div>
          <p style="color: #999; font-size: 12px; text-align: center;">
            \u5982\u679C\u8FD9\u4E0D\u662F\u60A8\u7684\u64CD\u4F5C,\u8BF7\u5FFD\u7565\u6B64\u90AE\u4EF6\u3002
          </p>
        </div>
      `
    })
  });
  return await response.json();
}
__name(sendVerificationEmail, "sendVerificationEmail");
function generateVerificationCode() {
  const array = new Uint8Array(3);
  crypto.getRandomValues(array);
  let code = "";
  for (let i = 0; i < array.length; i++) {
    code += array[i].toString().padStart(3, "0");
  }
  return (parseInt(code.slice(0, 6)) % 9e5 + 1e5).toString();
}
__name(generateVerificationCode, "generateVerificationCode");

// api/auth/send-code.js
var corsHeaders3 = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json"
};
function respond3(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders3
  });
}
__name(respond3, "respond");
async function hashCode2(code, salt) {
  const encoder = new TextEncoder();
  const data = encoder.encode(code + salt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hashCode2, "hashCode");
function generateSalt2() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}
__name(generateSalt2, "generateSalt");
async function onRequest3(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  }
  if (request.method !== "POST") {
    return respond3({ error: "Method not allowed" }, 405);
  }
  try {
    const payload = await request.json();
    const email = String(payload.email || "").trim();
    if (!email || !email.includes("@")) {
      return respond3({ error: "\u90AE\u7BB1\u683C\u5F0F\u4E0D\u6B63\u786E" }, 400);
    }
    const code = generateVerificationCode();
    const result = await sendVerificationEmail(email, code, env);
    if (!result || !result.id) throw new Error("\u53D1\u9001\u90AE\u4EF6\u5931\u8D25");
    const salt = generateSalt2();
    const hashedCode = await hashCode2(code, salt);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1e3).toISOString();
    await env.china_travel_db.prepare("DELETE FROM verification_codes WHERE email = ?").bind(email).run();
    await env.china_travel_db.prepare("INSERT INTO verification_codes (email, code, expires_at) VALUES (?, ?, ?)").bind(email, `${hashedCode}:${salt}`, expiresAt).run();
    return respond3({ success: true });
  } catch (error) {
    return respond3({ error: error.message || "\u670D\u52A1\u5668\u9519\u8BEF" }, 500);
  }
}
__name(onRequest3, "onRequest");

// api/auth/verify.js
var corsHeaders4 = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json"
};
function respond4(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders4
  });
}
__name(respond4, "respond");
async function hashCode3(code, salt) {
  const encoder = new TextEncoder();
  const data = encoder.encode(code + salt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hashCode3, "hashCode");
async function onRequest4(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  }
  if (request.method !== "POST") {
    return respond4({ error: "Method not allowed" }, 405);
  }
  try {
    const payload = await request.json();
    const email = String(payload.email || "").trim();
    const code = String(payload.code || "").trim();
    if (!email || !code) return respond4({ error: "\u90AE\u7BB1\u6216\u9A8C\u8BC1\u7801\u7F3A\u5931" }, 400);
    const record = await env.china_travel_db.prepare("SELECT * FROM verification_codes WHERE email = ? ORDER BY created_at DESC LIMIT 1").bind(email).first();
    if (!record) return respond4({ error: "\u9A8C\u8BC1\u7801\u4E0D\u5B58\u5728\u6216\u5DF2\u8FC7\u671F" }, 400);
    if (new Date(record.expires_at) < /* @__PURE__ */ new Date()) return respond4({ error: "\u9A8C\u8BC1\u7801\u5DF2\u8FC7\u671F" }, 400);
    const [storedHash, salt] = String(record.code || "").split(":");
    const inputHash = await hashCode3(code, salt);
    if (inputHash !== storedHash) return respond4({ error: "\u9A8C\u8BC1\u7801\u9519\u8BEF" }, 400);
    await env.china_travel_db.prepare("DELETE FROM verification_codes WHERE email = ?").bind(email).run();
    const user = await env.china_travel_db.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
    if (!user) {
      return respond4({ success: true, isNewUser: true });
    }
    return respond4({
      success: true,
      isNewUser: false
    });
  } catch (error) {
    return respond4({ error: error.message || "\u670D\u52A1\u5668\u9519\u8BEF" }, 500);
  }
}
__name(onRequest4, "onRequest");

// services/database.js
async function getSceneByIdentifier(db, identifiers = {}) {
  if (!identifiers || typeof identifiers !== "object") return null;
  const {
    sceneId,
    id,
    scene_id: sceneIdFromRecord,
    sceneSlug,
    slug,
    scene,
    name
  } = identifiers;
  const idCandidates = [sceneId, id, sceneIdFromRecord];
  for (const candidate of idCandidates) {
    const numericId = Number(candidate);
    if (!Number.isNaN(numericId) && numericId > 0) {
      const record = await db.prepare("SELECT * FROM scenes WHERE id = ?").bind(numericId).first();
      if (record) return record;
    }
  }
  const textCandidates = [sceneSlug, slug, scene, name];
  for (const candidate of textCandidates) {
    if (candidate === void 0 || candidate === null) continue;
    const normalized = String(candidate).trim();
    if (!normalized) continue;
    const record = await db.prepare(`
            SELECT *
            FROM scenes
            WHERE LOWER(slug) = LOWER(?)
               OR LOWER(name) = LOWER(?)
            LIMIT 1
        `).bind(normalized, normalized).first();
    if (record) return record;
  }
  return null;
}
__name(getSceneByIdentifier, "getSceneByIdentifier");
async function getCommentWithAuthor(db, commentId) {
  return await db.prepare(`
		SELECT c.*, u.nickname, u.email
		FROM comments c
		LEFT JOIN users u ON c.user_id = u.id
		WHERE c.id = ?
	`).bind(commentId).first();
}
__name(getCommentWithAuthor, "getCommentWithAuthor");
function mapCommentRecord(record) {
  if (!record) return null;
  return {
    id: record.id,
    sceneId: record.scene_id,
    parentId: record.parent_id,
    content: record.content,
    status: record.status,
    likes: record.likes_count ?? 0,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    user: {
      id: record.user_id,
      nickname: record.nickname || "\u6E38\u5BA2",
      email: record.email
    },
    replies: []
  };
}
__name(mapCommentRecord, "mapCommentRecord");

// utils/auth.js
var DEFAULT_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};
var HttpError = class extends Error {
  static {
    __name(this, "HttpError");
  }
  constructor(status, message) {
    super(message);
    this.status = status;
  }
};
var UnauthorizedError = class extends HttpError {
  static {
    __name(this, "UnauthorizedError");
  }
  constructor(message = "\u672A\u6388\u6743\u7684\u8BBF\u95EE") {
    super(401, message);
  }
};
function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...DEFAULT_HEADERS,
      ...extraHeaders
    }
  });
}
__name(jsonResponse, "jsonResponse");
function preflightResponse() {
  return new Response(null, {
    status: 204,
    headers: {
      ...DEFAULT_HEADERS,
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      "Access-Control-Max-Age": "86400"
    }
  });
}
__name(preflightResponse, "preflightResponse");
function requireAuth(request) {
  const header = request.headers.get("Authorization") || "";
  if (!header.startsWith("Bearer ")) {
    throw new UnauthorizedError("\u7F3A\u5C11\u8BA4\u8BC1\u4FE1\u606F");
  }
  const token = header.substring(7).trim();
  if (!token) {
    throw new UnauthorizedError("\u65E0\u6548\u7684\u8BA4\u8BC1\u4FE1\u606F");
  }
  try {
    const payload = JSON.parse(atob(token));
    if (!payload || !payload.userId) {
      throw new Error();
    }
    return {
      token,
      user: {
        id: payload.userId,
        email: payload.email,
        nickname: payload.nickname
      }
    };
  } catch (err) {
    throw new UnauthorizedError("\u65E0\u6CD5\u89E3\u6790\u8BA4\u8BC1\u4FE1\u606F");
  }
}
__name(requireAuth, "requireAuth");
function optionalAuth(request) {
  try {
    return requireAuth(request);
  } catch (_) {
    return null;
  }
}
__name(optionalAuth, "optionalAuth");

// api/comment.js
var METHODS = ["GET", "POST", "PUT", "DELETE", "OPTIONS"];
function buildCommentTree(records) {
  const map = /* @__PURE__ */ new Map();
  const roots = [];
  records.forEach((rec) => {
    const node = mapCommentRecord(rec);
    map.set(node.id, node);
  });
  records.forEach((rec) => {
    const node = map.get(rec.id);
    if (!node) return;
    if (rec.parent_id) {
      const parent = map.get(rec.parent_id);
      if (parent) {
        parent.replies.push(node);
      } else {
        roots.push(node);
      }
    } else {
      roots.push(node);
    }
  });
  return roots.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}
__name(buildCommentTree, "buildCommentTree");
async function handleGet(request, env) {
  const { searchParams } = new URL(request.url);
  const sceneId = searchParams.get("sceneId");
  const sceneSlug = searchParams.get("sceneSlug") || searchParams.get("scene");
  const scene = await getSceneByIdentifier(env.china_travel_db, { sceneId, sceneSlug });
  if (!scene) throw new HttpError(404, "\u666F\u70B9\u4E0D\u5B58\u5728");
  const { results } = await env.china_travel_db.prepare(`
		SELECT c.*, u.nickname, u.email
		FROM comments c
		LEFT JOIN users u ON c.user_id = u.id
		WHERE c.scene_id = ? AND c.status != 'deleted'
		ORDER BY c.created_at ASC
	`).bind(scene.id).all();
  const auth = optionalAuth(request);
  let likedMap = /* @__PURE__ */ new Map();
  if (auth) {
    const likeRows = await env.china_travel_db.prepare(`
			SELECT comment_id FROM comment_likes WHERE user_id = ?
		`).bind(auth.user.id).all();
    likedMap = new Map((likeRows.results || []).map((row) => [row.comment_id, true]));
  }
  const tree = buildCommentTree(results || []);
  if (likedMap.size > 0) {
    const markLiked = /* @__PURE__ */ __name((nodes) => {
      nodes.forEach((node) => {
        node.liked = likedMap.has(node.id);
        if (node.replies?.length) markLiked(node.replies);
      });
    }, "markLiked");
    markLiked(tree);
  }
  return jsonResponse({ success: true, comments: tree });
}
__name(handleGet, "handleGet");
async function handleCreate(request, env, user) {
  const payload = await request.json();
  if (!payload || !payload.content) throw new HttpError(400, "\u8BC4\u8BBA\u5185\u5BB9\u4E0D\u80FD\u4E3A\u7A7A");
  const content = String(payload.content).trim();
  if (!content) throw new HttpError(400, "\u8BC4\u8BBA\u5185\u5BB9\u4E0D\u80FD\u4E3A\u7A7A");
  if (content.length > 2e3) throw new HttpError(400, "\u8BC4\u8BBA\u5185\u5BB9\u8FC7\u957F");
  const scene = await getSceneByIdentifier(env.china_travel_db, {
    sceneId: payload.sceneId,
    sceneSlug: payload.sceneSlug || payload.scene
  });
  if (!scene) throw new HttpError(404, "\u666F\u70B9\u4E0D\u5B58\u5728");
  let parentId = payload.parentId || payload.parent_id;
  if (parentId) {
    const parent = await env.china_travel_db.prepare("SELECT id, scene_id FROM comments WHERE id = ?").bind(parentId).first();
    if (!parent || parent.scene_id !== scene.id) {
      throw new HttpError(400, "\u7236\u8BC4\u8BBA\u4E0D\u5B58\u5728\u6216\u4E0D\u5C5E\u4E8E\u8BE5\u666F\u70B9");
    }
  } else {
    parentId = null;
  }
  const insert = await env.china_travel_db.prepare(`
		INSERT INTO comments (user_id, scene_id, parent_id, content)
		VALUES (?, ?, ?, ?)
	`).bind(user.id, scene.id, parentId, content).run();
  if (!insert.success) throw new HttpError(500, insert.error || "\u53D1\u8868\u8BC4\u8BBA\u5931\u8D25");
  const comment = await getCommentWithAuthor(env.china_travel_db, insert.meta?.last_row_id);
  return jsonResponse({ success: true, comment: mapCommentRecord(comment) });
}
__name(handleCreate, "handleCreate");
async function handleUpdate(request, env, user) {
  const payload = await request.json();
  if (!payload) throw new HttpError(400, "\u8BF7\u6C42\u4F53\u4E0D\u80FD\u4E3A\u7A7A");
  const commentId = Number(payload.commentId || payload.id);
  if (!commentId) throw new HttpError(400, "\u7F3A\u5C11\u8BC4\u8BBAID");
  const action = payload.action;
  if (!action) throw new HttpError(400, "\u7F3A\u5C11\u64CD\u4F5C\u7C7B\u578B");
  if (action === "like" || action === "unlike") {
    if (action === "unlike") {
      const del = await env.china_travel_db.prepare("DELETE FROM comment_likes WHERE comment_id = ? AND user_id = ?").bind(commentId, user.id).run();
      if (del.meta?.changes) {
        await env.china_travel_db.prepare(`
					UPDATE comments
					SET likes_count = CASE WHEN likes_count > 0 THEN likes_count - 1 ELSE 0 END
					WHERE id = ?
				`).bind(commentId).run();
      }
    } else {
      const insert = await env.china_travel_db.prepare("INSERT OR IGNORE INTO comment_likes (comment_id, user_id) VALUES (?, ?)").bind(commentId, user.id).run();
      if (insert.meta?.changes) {
        await env.china_travel_db.prepare(`
                    UPDATE comments SET likes_count = likes_count + 1 WHERE id = ?
                `).bind(commentId).run();
      }
    }
    const comment = await env.china_travel_db.prepare("SELECT likes_count FROM comments WHERE id = ?").bind(commentId).first();
    return jsonResponse({ success: true, likes: comment?.likes_count ?? 0 });
  }
  if (action === "report") {
    const reason = String(payload.reason || "").slice(0, 500) || null;
    const insert = await env.china_travel_db.prepare(`
			INSERT INTO comment_reports (comment_id, user_id, reason)
			VALUES (?, ?, ?)
		`).bind(commentId, user.id, reason).run();
    if (!insert.success) throw new HttpError(500, insert.error || "\u4E3E\u62A5\u5931\u8D25");
    return jsonResponse({ success: true, reported: true });
  }
  throw new HttpError(400, "\u4E0D\u652F\u6301\u7684\u64CD\u4F5C\u7C7B\u578B");
}
__name(handleUpdate, "handleUpdate");
async function handleDelete(request, env, user) {
  const { searchParams } = new URL(request.url);
  const commentId = Number(searchParams.get("commentId") || searchParams.get("id"));
  if (!commentId) throw new HttpError(400, "\u7F3A\u5C11\u8BC4\u8BBAID");
  const comment = await env.china_travel_db.prepare("SELECT id, user_id FROM comments WHERE id = ?").bind(commentId).first();
  if (!comment) throw new HttpError(404, "\u8BC4\u8BBA\u4E0D\u5B58\u5728");
  if (comment.user_id !== user.id) throw new HttpError(403, "\u65E0\u6743\u5220\u9664\u8BE5\u8BC4\u8BBA");
  await env.china_travel_db.prepare(`UPDATE comments SET status = 'deleted' WHERE id = ?`).bind(commentId).run();
  return jsonResponse({ success: true, deleted: true });
}
__name(handleDelete, "handleDelete");
async function onRequest5(context) {
  const { request, env } = context;
  if (!METHODS.includes(request.method)) {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }
  if (request.method === "OPTIONS") {
    return preflightResponse();
  }
  try {
    switch (request.method) {
      case "GET":
        return await handleGet(request, env);
      case "POST":
        return await handleCreate(request, env, requireAuth(request).user);
      case "PUT":
        return await handleUpdate(request, env, requireAuth(request).user);
      case "DELETE":
        return await handleDelete(request, env, requireAuth(request).user);
      default:
        return jsonResponse({ error: "Method not allowed" }, 405);
    }
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse({ error: error.message }, error.status);
    }
    return jsonResponse({ error: error?.message || "\u670D\u52A1\u5668\u9519\u8BEF" }, 500);
  }
}
__name(onRequest5, "onRequest");

// api/favorites.js
var METHODS2 = ["GET", "POST", "DELETE", "OPTIONS"];
async function handleGet2(request, env, user) {
  const { searchParams } = new URL(request.url);
  const sceneId = searchParams.get("sceneId");
  const sceneSlug = searchParams.get("sceneSlug") || searchParams.get("scene");
  let sceneRecord = null;
  if (sceneId || sceneSlug) {
    sceneRecord = await getSceneByIdentifier(env.china_travel_db, { sceneId, sceneSlug });
    if (!sceneRecord) {
      throw new HttpError(404, "\u666F\u70B9\u4E0D\u5B58\u5728");
    }
  }
  const query = `
		SELECT f.id, f.scene_id, f.created_at,
			   s.slug, s.name, s.summary, s.cover_url, s.province
		FROM favorites f
		INNER JOIN scenes s ON s.id = f.scene_id
		WHERE f.user_id = ?
		${sceneRecord ? "AND f.scene_id = ?" : ""}
		ORDER BY f.created_at DESC
	`;
  const bindParams = sceneRecord ? [user.id, sceneRecord.id] : [user.id];
  const { results } = await env.china_travel_db.prepare(query).bind(...bindParams).all();
  return jsonResponse({ success: true, favorites: results });
}
__name(handleGet2, "handleGet");
async function resolveScene(env, payload) {
  const { sceneId, sceneSlug, scene } = payload || {};
  const record = await getSceneByIdentifier(env.china_travel_db, {
    sceneId: sceneId ?? payload?.id,
    sceneSlug: sceneSlug ?? scene
  });
  if (!record) {
    throw new HttpError(404, "\u666F\u70B9\u4E0D\u5B58\u5728");
  }
  return record;
}
__name(resolveScene, "resolveScene");
async function handlePost(request, env, user) {
  const payload = await request.json();
  if (!payload) throw new HttpError(400, "\u8BF7\u6C42\u4F53\u4E0D\u80FD\u4E3A\u7A7A");
  const scene = await resolveScene(env, payload);
  const insert = await env.china_travel_db.prepare("INSERT OR IGNORE INTO favorites (user_id, scene_id) VALUES (?, ?)").bind(user.id, scene.id).run();
  if (!insert.success) {
    throw new HttpError(500, insert.error || "\u6536\u85CF\u5931\u8D25");
  }
  const { results } = await env.china_travel_db.prepare(`
		SELECT f.id, f.scene_id, f.created_at,
			   s.slug, s.name, s.summary, s.cover_url, s.province
		FROM favorites f
		INNER JOIN scenes s ON s.id = f.scene_id
		WHERE f.user_id = ? AND f.scene_id = ?
	`).bind(user.id, scene.id).all();
  return jsonResponse({ success: true, favorite: results[0], inserted: insert.meta?.changes > 0 });
}
__name(handlePost, "handlePost");
async function handleDelete2(request, env, user) {
  const payload = await request.json().catch(() => null);
  if (!payload) throw new HttpError(400, "\u8BF7\u6C42\u4F53\u4E0D\u80FD\u4E3A\u7A7A");
  const scene = await resolveScene(env, payload);
  const result = await env.china_travel_db.prepare("DELETE FROM favorites WHERE user_id = ? AND scene_id = ?").bind(user.id, scene.id).run();
  return jsonResponse({ success: true, removed: !!result.meta?.changes });
}
__name(handleDelete2, "handleDelete");
async function onRequest6(context) {
  const { request, env } = context;
  if (!METHODS2.includes(request.method)) {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }
  if (request.method === "OPTIONS") {
    return preflightResponse();
  }
  try {
    const { user } = requireAuth(request);
    switch (request.method) {
      case "GET":
        return await handleGet2(request, env, user);
      case "POST":
        return await handlePost(request, env, user);
      case "DELETE":
        return await handleDelete2(request, env, user);
      default:
        return jsonResponse({ error: "Method not allowed" }, 405);
    }
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse({ error: error.message }, error.status);
    }
    return jsonResponse({ error: error?.message || "\u670D\u52A1\u5668\u9519\u8BEF" }, 500);
  }
}
__name(onRequest6, "onRequest");

// api/scene.js
var METHODS3 = ["GET", "POST", "OPTIONS"];
async function fetchScenes(env, filter = {}) {
  const params = [];
  let whereClause = "";
  if (filter.sceneId || filter.sceneSlug) {
    const scene = await getSceneByIdentifier(env.china_travel_db, filter);
    if (!scene) throw new HttpError(404, "\u666F\u70B9\u4E0D\u5B58\u5728");
    whereClause = "WHERE s.id = ?";
    params.push(scene.id);
  }
  const query = `
		SELECT
			s.id,
			s.slug,
			s.name,
			s.summary,
			s.cover_url,
			s.province,
			s.created_at,
			s.updated_at,
			COALESCE(fav.count, 0) AS favorites_count,
			COALESCE(v.likes, 0) AS likes_count,
			COALESCE(v.dislikes, 0) AS dislikes_count
		FROM scenes s
		LEFT JOIN (
			SELECT scene_id, COUNT(*) AS count
			FROM favorites
			GROUP BY scene_id
		) AS fav ON fav.scene_id = s.id
		LEFT JOIN (
			SELECT scene_id,
				SUM(CASE WHEN vote = 'like' THEN 1 ELSE 0 END) AS likes,
				SUM(CASE WHEN vote = 'dislike' THEN 1 ELSE 0 END) AS dislikes
			FROM scene_votes
			GROUP BY scene_id
		) AS v ON v.scene_id = s.id
		${whereClause}
		ORDER BY s.created_at DESC
	`;
  const { results } = await env.china_travel_db.prepare(query).bind(...params).all();
  return results;
}
__name(fetchScenes, "fetchScenes");
async function handleGet3(request, env) {
  const { searchParams } = new URL(request.url);
  const sceneId = searchParams.get("sceneId");
  const sceneSlug = searchParams.get("sceneSlug") || searchParams.get("scene");
  const scenes = await fetchScenes(env, { sceneId, sceneSlug });
  if (sceneId || sceneSlug) {
    return jsonResponse({ success: true, scene: scenes[0] || null });
  }
  return jsonResponse({ success: true, scenes });
}
__name(handleGet3, "handleGet");
async function handleVote(request, env, user) {
  const payload = await request.json();
  if (!payload) throw new HttpError(400, "\u8BF7\u6C42\u4F53\u4E0D\u80FD\u4E3A\u7A7A");
  const scene = await getSceneByIdentifier(env.china_travel_db, {
    sceneId: payload.sceneId,
    sceneSlug: payload.sceneSlug || payload.scene
  });
  if (!scene) throw new HttpError(404, "\u666F\u70B9\u4E0D\u5B58\u5728");
  const vote = payload.vote;
  if (!["like", "dislike", "clear"].includes(vote)) {
    throw new HttpError(400, "\u65E0\u6548\u7684\u6295\u7968\u7C7B\u578B");
  }
  if (vote === "clear") {
    await env.china_travel_db.prepare("DELETE FROM scene_votes WHERE scene_id = ? AND user_id = ?").bind(scene.id, user.id).run();
  } else {
    await env.china_travel_db.prepare(`
			INSERT INTO scene_votes (scene_id, user_id, vote)
			VALUES (?, ?, ?)
			ON CONFLICT(scene_id, user_id) DO UPDATE SET vote = excluded.vote, updated_at = CURRENT_TIMESTAMP
		`).bind(scene.id, user.id, vote).run();
  }
  const [updated] = await fetchScenes(env, { sceneId: scene.id });
  const current = await env.china_travel_db.prepare("SELECT vote FROM scene_votes WHERE scene_id = ? AND user_id = ?").bind(scene.id, user.id).first();
  return jsonResponse({
    success: true,
    scene: updated,
    currentVote: current?.vote || null
  });
}
__name(handleVote, "handleVote");
async function onRequest7(context) {
  const { request, env } = context;
  if (!METHODS3.includes(request.method)) {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }
  if (request.method === "OPTIONS") {
    return preflightResponse();
  }
  try {
    if (request.method === "GET") {
      const response = await handleGet3(request, env);
      const auth = optionalAuth(request);
      if (auth && response?.headers) {
        response.headers.set("X-User-Id", String(auth.user.id));
      }
      return response;
    }
    if (request.method === "POST") {
      const { user } = requireAuth(request);
      return await handleVote(request, env, user);
    }
    return jsonResponse({ error: "Method not allowed" }, 405);
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse({ error: error.message }, error.status);
    }
    return jsonResponse({ error: error?.message || "\u670D\u52A1\u5668\u9519\u8BEF" }, 500);
  }
}
__name(onRequest7, "onRequest");

// ../.wrangler/tmp/pages-pjUAFG/functionsRoutes-0.6314812338702498.mjs
var routes = [
  {
    routePath: "/api/auth/complete-register",
    mountPath: "/api/auth",
    method: "",
    middlewares: [],
    modules: [onRequest]
  },
  {
    routePath: "/api/auth/login",
    mountPath: "/api/auth",
    method: "",
    middlewares: [],
    modules: [onRequest2]
  },
  {
    routePath: "/api/auth/send-code",
    mountPath: "/api/auth",
    method: "",
    middlewares: [],
    modules: [onRequest3]
  },
  {
    routePath: "/api/auth/verify",
    mountPath: "/api/auth",
    method: "",
    middlewares: [],
    modules: [onRequest4]
  },
  {
    routePath: "/api/comment",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest5]
  },
  {
    routePath: "/api/favorites",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest6]
  },
  {
    routePath: "/api/scene",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest7]
  }
];

// C:/Users/zyx/AppData/Roaming/npm/node_modules/wrangler/node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");

// C:/Users/zyx/AppData/Roaming/npm/node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");

// C:/Users/zyx/AppData/Roaming/npm/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// C:/Users/zyx/AppData/Roaming/npm/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// ../.wrangler/tmp/bundle-MRBR2V/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = pages_template_worker_default;

// C:/Users/zyx/AppData/Roaming/npm/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// ../.wrangler/tmp/bundle-MRBR2V/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=functionsWorker-0.9677165852191083.mjs.map
