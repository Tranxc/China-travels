export async function getSceneByIdentifier(db, identifiers = {}) {
    if (!identifiers || typeof identifiers !== 'object') return null;

    const {
        sceneId,
        id,
        scene_id: sceneIdFromRecord,
        sceneSlug,
        slug,
        scene,
        name,
    } = identifiers;

    const idCandidates = [sceneId, id, sceneIdFromRecord];
    for (const candidate of idCandidates) {
        const numericId = Number(candidate);
        if (!Number.isNaN(numericId) && numericId > 0) {
            const record = await db.prepare('SELECT * FROM scenes WHERE id = ?').bind(numericId).first();
            if (record) return record;
        }
    }

    const textCandidates = [sceneSlug, slug, scene, name];
    for (const candidate of textCandidates) {
        if (candidate === undefined || candidate === null) continue;
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

export async function getCommentWithAuthor(db, commentId) {
    return await db.prepare(`
		SELECT c.*, u.nickname, u.email
		FROM comments c
		LEFT JOIN users u ON c.user_id = u.id
		WHERE c.id = ?
	`).bind(commentId).first();
}

export function mapCommentRecord(record) {
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
            nickname: record.nickname || '游客',
            email: record.email,
        },
        replies: [],
    };
}
