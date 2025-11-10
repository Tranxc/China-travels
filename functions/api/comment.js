import { getCommentWithAuthor, getSceneByIdentifier, mapCommentRecord } from '../services/database.js';
import { HttpError, jsonResponse, optionalAuth, preflightResponse, requireAuth } from '../utils/auth.js';

const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];

function buildCommentTree(records) {
    const map = new Map();
    const roots = [];

    records.forEach(rec => {
        const node = mapCommentRecord(rec);
        map.set(node.id, node);
    });

    records.forEach(rec => {
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

async function handleGet(request, env) {
    const { searchParams } = new URL(request.url);
    const sceneId = searchParams.get('sceneId');
    const sceneSlug = searchParams.get('sceneSlug') || searchParams.get('scene');

    const scene = await getSceneByIdentifier(env.china_travel_db, { sceneId, sceneSlug });
    if (!scene) throw new HttpError(404, '景点不存在');

    const { results } = await env.china_travel_db.prepare(`
		SELECT c.*, u.nickname, u.email
		FROM comments c
		LEFT JOIN users u ON c.user_id = u.id
		WHERE c.scene_id = ? AND c.status != 'deleted'
		ORDER BY c.created_at ASC
	`).bind(scene.id).all();

    const auth = optionalAuth(request);
    let likedMap = new Map();
    if (auth) {
        const likeRows = await env.china_travel_db.prepare(`
			SELECT comment_id FROM comment_likes WHERE user_id = ?
		`).bind(auth.user.id).all();
        likedMap = new Map((likeRows.results || []).map(row => [row.comment_id, true]));
    }

    const tree = buildCommentTree(results || []);
    if (likedMap.size > 0) {
        const markLiked = nodes => {
            nodes.forEach(node => {
                node.liked = likedMap.has(node.id);
                if (node.replies?.length) markLiked(node.replies);
            });
        };
        markLiked(tree);
    }

    return jsonResponse({ success: true, comments: tree });
}

async function handleCreate(request, env, user) {
    const payload = await request.json();
    if (!payload || !payload.content) throw new HttpError(400, '评论内容不能为空');

    const content = String(payload.content).trim();
    if (!content) throw new HttpError(400, '评论内容不能为空');
    if (content.length > 2000) throw new HttpError(400, '评论内容过长');

    const scene = await getSceneByIdentifier(env.china_travel_db, {
        sceneId: payload.sceneId,
        sceneSlug: payload.sceneSlug || payload.scene,
    });
    if (!scene) throw new HttpError(404, '景点不存在');

    let parentId = payload.parentId || payload.parent_id;
    if (parentId) {
        const parent = await env.china_travel_db.prepare('SELECT id, scene_id FROM comments WHERE id = ?').bind(parentId).first();
        if (!parent || parent.scene_id !== scene.id) {
            throw new HttpError(400, '父评论不存在或不属于该景点');
        }
    } else {
        parentId = null;
    }

    const insert = await env.china_travel_db.prepare(`
		INSERT INTO comments (user_id, scene_id, parent_id, content)
		VALUES (?, ?, ?, ?)
	`).bind(user.id, scene.id, parentId, content).run();

    if (!insert.success) throw new HttpError(500, insert.error || '发表评论失败');

    const comment = await getCommentWithAuthor(env.china_travel_db, insert.meta?.last_row_id);
    return jsonResponse({ success: true, comment: mapCommentRecord(comment) });
}

async function handleUpdate(request, env, user) {
    const payload = await request.json();
    if (!payload) throw new HttpError(400, '请求体不能为空');

    const commentId = Number(payload.commentId || payload.id);
    if (!commentId) throw new HttpError(400, '缺少评论ID');

    const action = payload.action;
    if (!action) throw new HttpError(400, '缺少操作类型');

    if (action === 'like' || action === 'unlike') {
        if (action === 'unlike') {
            const del = await env.china_travel_db
                .prepare('DELETE FROM comment_likes WHERE comment_id = ? AND user_id = ?')
                .bind(commentId, user.id)
                .run();

            if (del.meta?.changes) {
                await env.china_travel_db.prepare(`
					UPDATE comments
					SET likes_count = CASE WHEN likes_count > 0 THEN likes_count - 1 ELSE 0 END
					WHERE id = ?
				`).bind(commentId).run();
            }
        } else {
            const insert = await env.china_travel_db
                .prepare('INSERT OR IGNORE INTO comment_likes (comment_id, user_id) VALUES (?, ?)')
                .bind(commentId, user.id)
                .run();

            if (insert.meta?.changes) {
                await env.china_travel_db.prepare(`
                    UPDATE comments SET likes_count = likes_count + 1 WHERE id = ?
                `).bind(commentId).run();
            }
        }

        const comment = await env.china_travel_db
            .prepare('SELECT likes_count FROM comments WHERE id = ?')
            .bind(commentId)
            .first();
        return jsonResponse({ success: true, likes: comment?.likes_count ?? 0 });
    }

    if (action === 'report') {
        const reason = String(payload.reason || '').slice(0, 500) || null;
        const insert = await env.china_travel_db.prepare(`
			INSERT INTO comment_reports (comment_id, user_id, reason)
			VALUES (?, ?, ?)
		`).bind(commentId, user.id, reason).run();
        if (!insert.success) throw new HttpError(500, insert.error || '举报失败');
        return jsonResponse({ success: true, reported: true });
    }

    throw new HttpError(400, '不支持的操作类型');
}

async function handleDelete(request, env, user) {
    const { searchParams } = new URL(request.url);
    const commentId = Number(searchParams.get('commentId') || searchParams.get('id'));
    if (!commentId) throw new HttpError(400, '缺少评论ID');

    const comment = await env.china_travel_db
        .prepare('SELECT id, user_id FROM comments WHERE id = ?')
        .bind(commentId)
        .first();

    if (!comment) throw new HttpError(404, '评论不存在');
    if (comment.user_id !== user.id) throw new HttpError(403, '无权删除该评论');

    await env.china_travel_db
        .prepare(`UPDATE comments SET status = 'deleted' WHERE id = ?`)
        .bind(commentId)
        .run();

    return jsonResponse({ success: true, deleted: true });
}

export async function onRequest(context) {
    const { request, env } = context;

    if (!METHODS.includes(request.method)) {
        return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    if (request.method === 'OPTIONS') {
        return preflightResponse();
    }

    try {
        switch (request.method) {
            case 'GET':
                return await handleGet(request, env);
            case 'POST':
                return await handleCreate(request, env, requireAuth(request).user);
            case 'PUT':
                return await handleUpdate(request, env, requireAuth(request).user);
            case 'DELETE':
                return await handleDelete(request, env, requireAuth(request).user);
            default:
                return jsonResponse({ error: 'Method not allowed' }, 405);
        }
    } catch (error) {
        if (error instanceof HttpError) {
            return jsonResponse({ error: error.message }, error.status);
        }
        return jsonResponse({ error: error?.message || '服务器错误' }, 500);
    }
}
