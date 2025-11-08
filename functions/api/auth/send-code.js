import { generateVerificationCode, sendVerificationEmail } from '../../services/email.js';

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

        if (!email || !email.includes('@')) {
            return respond({ error: '邮箱格式不正确' }, 400);
        }

        const code = generateVerificationCode();
        const result = await sendVerificationEmail(email, code, env);
        if (!result || !result.id) throw new Error('发送邮件失败');

        const salt = generateSalt();
        const hashedCode = await hashCode(code, salt);
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

        await env.china_travel_db
            .prepare('DELETE FROM verification_codes WHERE email = ?')
            .bind(email)
            .run();

        await env.china_travel_db
            .prepare('INSERT INTO verification_codes (email, code, expires_at) VALUES (?, ?, ?)')
            .bind(email, `${hashedCode}:${salt}`, expiresAt)
            .run();

        return respond({ success: true });
    } catch (error) {
        return respond({ error: error.message || '服务器错误' }, 500);
    }
}
