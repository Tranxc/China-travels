import { getSceneByIdentifier } from '../services/database.js';
import { HttpError, jsonResponse, optionalAuth, preflightResponse, requireAuth } from '../utils/auth.js';

const METHODS = ['GET', 'POST', 'OPTIONS'];

async function fetchScenes(env, filter = {}) {
    const params = [];
    let whereClause = '';

    if (filter.sceneId || filter.sceneSlug) {
        const scene = await getSceneByIdentifier(env.china_travel_db, filter);
        if (!scene) throw new HttpError(404, '景点不存在');
        whereClause = 'WHERE s.slug = ?';
        params.push(scene.slug);
    }

    const query = `
		SELECT
			s.slug,
			s.name,
			s.summary,
			s.cover_url,
			s.province,
			COALESCE(fav.count, 0) AS favorites_count,
			COALESCE(v.likes, 0) AS likes_count,
			COALESCE(v.dislikes, 0) AS dislikes_count
		FROM scenes s
		LEFT JOIN (
			SELECT scene_slug, COUNT(*) AS count
			FROM favorites
			GROUP BY scene_slug
		) AS fav ON fav.scene_slug = s.slug
		LEFT JOIN (
			SELECT scene_slug,
				SUM(CASE WHEN vote = 'like' THEN 1 ELSE 0 END) AS likes,
				SUM(CASE WHEN vote = 'dislike' THEN 1 ELSE 0 END) AS dislikes
			FROM scene_votes
			GROUP BY scene_slug
		) AS v ON v.scene_slug = s.slug
		${whereClause}
		ORDER BY s.name ASC
	`;

    const { results } = await env.china_travel_db.prepare(query).bind(...params).all();
    return results;
}

async function handleGet(request, env) {
    const { searchParams } = new URL(request.url);
    const sceneId = searchParams.get('sceneId');
    const sceneSlug = searchParams.get('sceneSlug') || searchParams.get('scene');

    const scenes = await fetchScenes(env, { sceneId, sceneSlug });

    if (sceneId || sceneSlug) {
        return jsonResponse({ success: true, scene: scenes[0] || null });
    }
    return jsonResponse({ success: true, scenes });
}

async function handleVote(request, env, user) {
    const payload = await request.json();
    if (!payload) throw new HttpError(400, '请求体不能为空');

    const scene = await getSceneByIdentifier(env.china_travel_db, {
        sceneId: payload.sceneId,
        sceneSlug: payload.sceneSlug || payload.scene,
    });
    if (!scene) throw new HttpError(404, '景点不存在');
    const slug = scene.slug;

    const vote = payload.vote;
    if (!['like', 'dislike', 'clear'].includes(vote)) {
        throw new HttpError(400, '无效的投票类型');
    }

    if (vote === 'clear') {
        await env.china_travel_db
            .prepare('DELETE FROM scene_votes WHERE scene_slug = ? AND user_id = ?')
            .bind(slug, user.id)
            .run();
    } else {
        await env.china_travel_db.prepare(`
			INSERT INTO scene_votes (scene_slug, user_id, vote)
			VALUES (?, ?, ?)
			ON CONFLICT(scene_slug, user_id) DO UPDATE SET vote = excluded.vote, updated_at = CURRENT_TIMESTAMP
		`).bind(slug, user.id, vote).run();
    }

    const [updated] = await fetchScenes(env, { sceneSlug: slug });

    const current = await env.china_travel_db
        .prepare('SELECT vote FROM scene_votes WHERE scene_slug = ? AND user_id = ?')
        .bind(slug, user.id)
        .first();

    return jsonResponse({
        success: true,
        scene: updated,
        currentVote: current?.vote || null,
    });
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
        if (request.method === 'GET') {
            const response = await handleGet(request, env);
            const auth = optionalAuth(request);
            if (auth && response?.headers) {
                response.headers.set('X-User-Id', String(auth.user.id));
            }
            return response;
        }

        if (request.method === 'POST') {
            const { user } = requireAuth(request);
            return await handleVote(request, env, user);
        }

        return jsonResponse({ error: 'Method not allowed' }, 405);
    } catch (error) {
        if (error instanceof HttpError) {
            return jsonResponse({ error: error.message }, error.status);
        }
        return jsonResponse({ error: error?.message || '服务器错误' }, 500);
    }
}
