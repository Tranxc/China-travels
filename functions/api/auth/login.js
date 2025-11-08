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

async function hashPassword(password, salt) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + salt);
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
        const password = String(payload.password || '');

        if (!email || !password) {
            return respond({ error: '邮箱或密码缺失' }, 400);
        }

        if (password.length < 6) {
            return respond({ error: '密码长度不足' }, 400);
        }

        // 查询用户
        const user = await env.china_travel_db
            .prepare('SELECT * FROM users WHERE email = ?')
            .bind(email)
            .first();

        if (!user) {
            return respond({ error: '用户不存在' }, 400);
        }

        // 验证密码
        const [storedHash, salt] = String(user.password_hash || '').split(':');
        const inputHash = await hashPassword(password, salt);

        if (inputHash !== storedHash) {
            return respond({ error: '密码错误' }, 400);
        }

        // 生成token
        const token = btoa(JSON.stringify({
            email: user.email,
            userId: user.id,
            timestamp: Date.now(),
        }));

        return respond({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                nickname: user.nickname,
            },
        });
    } catch (error) {
        return respond({ error: error.message || '服务器错误' }, 500);
    }
}
