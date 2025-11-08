const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
};

function respond(body, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: corsHeaders,
    });
}

async function hashCode(code, salt) {
    const encoder = new TextEncoder();
    const data = encoder.encode(code + salt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequest(context) {
    const { request, env } = context;

    if (request.method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
        });
    }

    if (request.method !== 'POST') {
        return respond({ error: 'Method not allowed' }, 405);
    }

    try {
        const payload = await request.json();
        const email = String(payload.email || '').trim();
        const code = String(payload.code || '').trim();

        if (!email || !code) return respond({ error: '邮箱或验证码缺失' }, 400);

        const record = await env.china_travel_db
            .prepare('SELECT * FROM verification_codes WHERE email = ? ORDER BY created_at DESC LIMIT 1')
            .bind(email)
            .first();

        if (!record) return respond({ error: '验证码不存在或已过期' }, 400);
        if (new Date(record.expires_at) < new Date()) return respond({ error: '验证码已过期' }, 400);

        const [storedHash, salt] = String(record.code || '').split(':');
        const inputHash = await hashCode(code, salt);
        if (inputHash !== storedHash) return respond({ error: '验证码错误' }, 400);

        await env.china_travel_db
            .prepare('DELETE FROM verification_codes WHERE email = ?')
            .bind(email)
            .run();

        const user = await env.china_travel_db
            .prepare('SELECT * FROM users WHERE email = ?')
            .bind(email)
            .first();

        if (!user) {
            return respond({ success: true, isNewUser: true });
        }

        return respond({
            success: true,
            isNewUser: false,
        });
    } catch (error) {
        return respond({ error: error.message || '服务器错误' }, 500);
    }
}
