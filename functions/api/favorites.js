import { getSceneByIdentifier } from '../services/database.js';
import { HttpError, jsonResponse, preflightResponse, requireAuth } from '../utils/auth.js';

const METHODS = ['GET', 'POST', 'DELETE', 'OPTIONS'];

async function handleGet(request, env, user) {
    const { searchParams } = new URL(request.url);
    const sceneId = searchParams.get('sceneId');
    const sceneSlug = searchParams.get('sceneSlug') || searchParams.get('scene');

    let sceneRecord = null;
    if (sceneId || sceneSlug) {
        sceneRecord = await getSceneByIdentifier(env.china_travel_db, { sceneId, sceneSlug });
        if (!sceneRecord) {
            throw new HttpError(404, '景点不存在');
        }
    }

    const query = `
		SELECT f.id, f.scene_slug, f.created_at,
			   s.slug, s.name, s.summary, s.cover_url, s.province
		FROM favorites f
		INNER JOIN scenes s ON s.slug = f.scene_slug
		WHERE f.user_id = ?
		${sceneRecord ? 'AND f.scene_slug = ?' : ''}
		ORDER BY f.created_at DESC
	`;

    const bindParams = sceneRecord ? [user.id, sceneRecord.slug] : [user.id];
    const { results } = await env.china_travel_db.prepare(query).bind(...bindParams).all();

    return jsonResponse({ success: true, favorites: results });
}

async function resolveScene(env, payload) {
    const { sceneId, sceneSlug, scene } = payload || {};
    const record = await getSceneByIdentifier(env.china_travel_db, {
        sceneId: sceneId ?? payload?.id,
        sceneSlug: sceneSlug ?? scene,
    });
    if (!record) {
        throw new HttpError(404, '景点不存在');
    }
    return record;
}

async function handlePost(request, env, user) {
    const payload = await request.json();
    if (!payload) throw new HttpError(400, '请求体不能为空');

    const scene = await resolveScene(env, payload);

    const insert = await env.china_travel_db
        .prepare('INSERT OR IGNORE INTO favorites (user_id, scene_slug) VALUES (?, ?)')
        .bind(user.id, scene.slug)
        .run();

    if (!insert.success) {
        throw new HttpError(500, insert.error || '收藏失败');
    }

    const { results } = await env.china_travel_db.prepare(`
		SELECT f.id, f.scene_slug, f.created_at,
			   s.slug, s.name, s.summary, s.cover_url, s.province
		FROM favorites f
		INNER JOIN scenes s ON s.slug = f.scene_slug
		WHERE f.user_id = ? AND f.scene_slug = ?
	`).bind(user.id, scene.slug).all();

    return jsonResponse({ success: true, favorite: results[0], inserted: insert.meta?.changes > 0 });
}

async function handleDelete(request, env, user) {
    const payload = await request.json().catch(() => null);
    if (!payload) throw new HttpError(400, '请求体不能为空');

    const scene = await resolveScene(env, payload);

    const result = await env.china_travel_db
        .prepare('DELETE FROM favorites WHERE user_id = ? AND scene_slug = ?')
        .bind(user.id, scene.slug)
        .run();

    return jsonResponse({ success: true, removed: !!result.meta?.changes });
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
        const { user } = requireAuth(request);

        switch (request.method) {
            case 'GET':
                return await handleGet(request, env, user);
            case 'POST':
                return await handlePost(request, env, user);
            case 'DELETE':
                return await handleDelete(request, env, user);
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
