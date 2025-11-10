const DEFAULT_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

class UnauthorizedError extends HttpError {
    constructor(message = '未授权的访问') {
        super(401, message);
    }
}

export function jsonResponse(body, status = 200, extraHeaders = {}) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            'Content-Type': 'application/json',
            ...DEFAULT_HEADERS,
            ...extraHeaders,
        },
    });
}

export function preflightResponse() {
    return new Response(null, {
        status: 204,
        headers: {
            ...DEFAULT_HEADERS,
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
            'Access-Control-Max-Age': '86400',
        },
    });
}

export function requireAuth(request) {
    const header = request.headers.get('Authorization') || '';
    if (!header.startsWith('Bearer ')) {
        throw new UnauthorizedError('缺少认证信息');
    }

    const token = header.substring(7).trim();
    if (!token) {
        throw new UnauthorizedError('无效的认证信息');
    }

    try {
        const payload = JSON.parse(atob(token));
        if (!payload || !payload.userId) {
            throw new Error();
        }
        return {
            token,
            user: {
                id: payload.userId,
                email: payload.email,
                nickname: payload.nickname,
            },
        };
    } catch (err) {
        throw new UnauthorizedError('无法解析认证信息');
    }
}

export function optionalAuth(request) {
    try {
        return requireAuth(request);
    } catch (_) {
        return null;
    }
}

export { HttpError, UnauthorizedError };

