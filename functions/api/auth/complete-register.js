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

function generateSalt() {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
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
        const nickname = String(payload.nickname || '').trim();
        const password = String(payload.password || '');

        if (!email || !nickname || !password) return respond({ error: '信息不完整' }, 400);

        const salt = generateSalt();
        const passwordHash = await hashCode(password, salt);

        await env.china_travel_db
            .prepare('INSERT INTO users (email, nickname, password_hash) VALUES (?, ?, ?)')
            .bind(email, nickname, `${passwordHash}:${salt}`)
            .run();

        const user = await env.china_travel_db
            .prepare('SELECT id, email, nickname FROM users WHERE email = ?')
            .bind(email)
            .first();

        const token = btoa(JSON.stringify({
            email,
            userId: user.id,
            timestamp: Date.now(),
        }));

        return respond({ success: true, token, user });
    } catch (error) {
        return respond({ error: error.message || '服务器错误' }, 500);
    }
}
