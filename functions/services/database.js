export async function getSceneByIdentifier(db, { sceneId, sceneSlug }) {
    if (!sceneId && !sceneSlug) return null;

    if (sceneId) {
        const numericId = Number(sceneId);
        if (Number.isNaN(numericId)) return null;
        const record = await db.prepare('SELECT * FROM scenes WHERE id = ?').bind(numericId).first();
        if (record) return record;
    }

    if (sceneSlug) {
        return await db.prepare('SELECT * FROM scenes WHERE slug = ?').bind(sceneSlug).first();
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
