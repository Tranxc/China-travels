import { generateVerificationCode, sendVerificationEmail } from '../services/email.js';

// 哈希函数
async function hashCode(code, salt) {
    const encoder = new TextEncoder();
    const data = encoder.encode(code + salt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 生成随机盐
function generateSalt() {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS 处理
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            }
        });
    }

    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
    };

    try {
        // 发送验证码
        if (path.endsWith('/send-code') && request.method === 'POST') {
            const { email } = await request.json();

            if (!email || !email.includes('@')) {
                return new Response(JSON.stringify({ error: '邮箱格式不正确' }), {
                    status: 400,
                    headers: corsHeaders
                });
            }

            // 生成验证码
            const code = generateVerificationCode();

            // 发送邮件
            const result = await sendVerificationEmail(email, code, env);

            if (result.id) {
                // 生成盐和哈希
                const salt = generateSalt();
                const hashedCode = await hashCode(code, salt);

                // 存储哈希后的验证码到 D1 数据库(10分钟有效)
                const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

                // 先删除该邮箱的旧验证码
                await env.china_travel_db.prepare(
                    'DELETE FROM verification_codes WHERE email = ?'
                ).bind(email).run();

                // 存储新验证码(存储哈希值和盐)
                await env.china_travel_db.prepare(
                    'INSERT INTO verification_codes (email, code, expires_at) VALUES (?, ?, ?)'
                ).bind(email, hashedCode + ':' + salt, expiresAt).run();

                return new Response(JSON.stringify({
                    success: true,
                    message: '验证码已发送到您的邮箱'
                }), {
                    headers: corsHeaders
                });
            } else {
                throw new Error('发送邮件失败');
            }
        }

        // 验证验证码
        if (path.endsWith('/verify') && request.method === 'POST') {
            const { email, code } = await request.json();

            // 查询验证码记录
            const result = await env.china_travel_db.prepare(
                'SELECT * FROM verification_codes WHERE email = ? ORDER BY created_at DESC LIMIT 1'
            ).bind(email).first();

            if (!result) {
                return new Response(JSON.stringify({ error: '验证码不存在或已过期' }), {
                    status: 400,
                    headers: corsHeaders
                });
            }

            // 检查是否过期
            if (new Date(result.expires_at) < new Date()) {
                return new Response(JSON.stringify({ error: '验证码已过期' }), {
                    status: 400,
                    headers: corsHeaders
                });
            }

            // 提取哈希值和盐
            const [hashedCode, salt] = result.code.split(':');
            const inputHash = await hashCode(code, salt);

            // 验证哈希值
            if (inputHash !== hashedCode) {
                return new Response(JSON.stringify({ error: '验证码错误' }), {
                    status: 400,
                    headers: corsHeaders
                });
            }

            // 验证成功,删除已用验证码
            await env.china_travel_db.prepare(
                'DELETE FROM verification_codes WHERE email = ?'
            ).bind(email).run();

            // 检查用户是否存在
            let user = await env.china_travel_db.prepare(
                'SELECT * FROM users WHERE email = ?'
            ).bind(email).first();

            if (!user) {
                // 新用户,返回需要完善信息
                return new Response(JSON.stringify({
                    success: true,
                    isNewUser: true,
                    message: '请完善注册信息'
                }), {
                    headers: corsHeaders
                });
            }

            // 老用户,直接登录
            const token = btoa(JSON.stringify({
                email,
                userId: user.id,
                timestamp: Date.now()
            }));

            return new Response(JSON.stringify({
                success: true,
                isNewUser: false,
                message: '登录成功',
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    nickname: user.nickname
                }
            }), {
                headers: corsHeaders
            });
        }

        // 完成注册
        if (path.endsWith('/complete-register') && request.method === 'POST') {
            const { email, nickname, password } = await request.json();

            if (!email || !nickname || !password) {
                return new Response(JSON.stringify({ error: '信息不完整' }), {
                    status: 400,
                    headers: corsHeaders
                });
            }

            // 生成密码哈希
            const salt = generateSalt();
            const passwordHash = await hashCode(password, salt);

            // 创建用户
            await env.china_travel_db.prepare(
                'INSERT INTO users (email, nickname, password_hash) VALUES (?, ?, ?)'
            ).bind(email, nickname, passwordHash + ':' + salt).run();

            const user = await env.china_travel_db.prepare(
                'SELECT id, email, nickname FROM users WHERE email = ?'
            ).bind(email).first();

            // 生成 token
            const token = btoa(JSON.stringify({
                email,
                userId: user.id,
                timestamp: Date.now()
            }));

            return new Response(JSON.stringify({
                success: true,
                message: '注册成功',
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    nickname: user.nickname
                }
            }), {
                headers: corsHeaders
            });
        }

        return new Response(JSON.stringify({ error: 'Not found' }), {
            status: 404,
            headers: corsHeaders
        });

    } catch (error) {
        console.error('Auth error:', error);
        return new Response(JSON.stringify({
            error: error.message || '服务器错误'
        }), {
            status: 500,
            headers: corsHeaders
        });
    }
}

