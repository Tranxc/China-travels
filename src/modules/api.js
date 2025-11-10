import { API_BASE, getAuthToken } from './auth.js';

export class ApiError extends Error {
    constructor(message, { status, code, payload } = {}) {
        super(message || '请求失败');
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
        this.payload = payload;
    }
}

function ensureLeadingSlash(path) {
    if (!path) return '/';
    return path.startsWith('/') ? path : `/${path}`;
}

function toQueryString(params = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return;
        searchParams.set(key, value);
    });
    const query = searchParams.toString();
    return query ? `?${query}` : '';
}

function normalizeSceneIdentifier(identifier = {}) {
    if (typeof identifier === 'string') {
        return { sceneSlug: identifier };
    }
    const result = {};
    if (identifier.sceneId) result.sceneId = identifier.sceneId;
    if (identifier.sceneSlug) {
        result.sceneSlug = identifier.sceneSlug;
    } else if (identifier.scene) {
        result.scene = identifier.scene;
    } else if (identifier.slug) {
        result.sceneSlug = identifier.slug;
    }
    return result;
}

export async function apiRequest(path, options = {}) {
    const {
        method = 'GET',
        body,
        headers = {},
        requireAuth = false,
        signal,
    } = options;

    const token = getAuthToken();
    if (requireAuth && !token) {
        throw new ApiError('未登录或会话已过期', { status: 401, code: 'AUTH_REQUIRED' });
    }

    const requestHeaders = new Headers(headers);
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

    if (!isFormData && body !== undefined && body !== null && !requestHeaders.has('Content-Type')) {
        requestHeaders.set('Content-Type', 'application/json');
    }

    if (token) {
        requestHeaders.set('Authorization', `Bearer ${token}`);
    }

    const requestInit = {
        method,
        headers: requestHeaders,
        signal,
    };

    if (body !== undefined && body !== null) {
        requestInit.body = isFormData || typeof body === 'string' ? body : JSON.stringify(body);
    }

    const target = `${API_BASE}${ensureLeadingSlash(path)}`;
    const response = await fetch(target, requestInit);
    const rawText = await response.text();
    let payload = null;
    if (rawText) {
        try {
            payload = JSON.parse(rawText);
        } catch (error) {
            payload = null;
        }
    }

    if (!response.ok) {
        throw new ApiError(payload?.error || response.statusText || '请求失败', {
            status: response.status,
            code: response.status === 401 ? 'AUTH_REQUIRED' : payload?.code,
            payload,
        });
    }

    return payload;
}

export async function fetchSceneList() {
    const data = await apiRequest('/api/scene');
    return data?.scenes || [];
}

export async function fetchScene(identifier) {
    const params = normalizeSceneIdentifier(identifier);
    const hasParams = Object.keys(params).length > 0;
    const url = `/api/scene${toQueryString(params)}`;
    const data = await apiRequest(url);
    if (hasParams) {
        return data?.scene || null;
    }
    return data?.scenes || [];
}

export async function submitSceneVote(identifier, vote) {
    const params = normalizeSceneIdentifier(identifier);
    const data = await apiRequest('/api/scene', {
        method: 'POST',
        requireAuth: true,
        body: { ...params, vote },
    });
    return data;
}

export async function fetchFavorites() {
    const data = await apiRequest('/api/favorites', {
        method: 'GET',
        requireAuth: true,
    });
    return data?.favorites || [];
}

export async function addFavorite(identifier) {
    const params = normalizeSceneIdentifier(identifier);
    const data = await apiRequest('/api/favorites', {
        method: 'POST',
        requireAuth: true,
        body: params,
    });
    return data?.favorite || null;
}

export async function removeFavorite(identifier) {
    const params = normalizeSceneIdentifier(identifier);
    return apiRequest('/api/favorites', {
        method: 'DELETE',
        requireAuth: true,
        body: params,
    });
}

export async function fetchComments(identifier) {
    const params = normalizeSceneIdentifier(identifier);
    const url = `/api/comment${toQueryString(params)}`;
    const data = await apiRequest(url);
    return data?.comments || [];
}

export async function createComment(identifier, content, parentId) {
    const params = normalizeSceneIdentifier(identifier);
    const body = { ...params, content };
    if (parentId) body.parentId = parentId;
    const data = await apiRequest('/api/comment', {
        method: 'POST',
        requireAuth: true,
        body,
    });
    return data?.comment || null;
}

export async function likeComment(commentId) {
    return apiRequest('/api/comment', {
        method: 'PUT',
        requireAuth: true,
        body: { commentId, action: 'like' },
    });
}

export async function unlikeComment(commentId) {
    return apiRequest('/api/comment', {
        method: 'PUT',
        requireAuth: true,
        body: { commentId, action: 'unlike' },
    });
}

export async function reportComment(commentId, reason) {
    return apiRequest('/api/comment', {
        method: 'PUT',
        requireAuth: true,
        body: { commentId, action: 'report', reason },
    });
}

export async function deleteComment(commentId) {
    const url = `/api/comment${toQueryString({ commentId })}`;
    return apiRequest(url, {
        method: 'DELETE',
        requireAuth: true,
    });
}
