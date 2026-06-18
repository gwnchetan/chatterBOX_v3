const AUTH_TOKEN_KEY = 'token';
const AUTH_USER_KEY = 'user';

const canUseStorage = () => typeof window !== 'undefined' && !!window.localStorage;

const readJson = (key, fallback = null) => {
    if (!canUseStorage()) return fallback;

    const rawValue = window.localStorage.getItem(key);
    if (!rawValue) return fallback;

    try {
        return JSON.parse(rawValue);
    } catch {
        window.localStorage.removeItem(key);
        return fallback;
    }
};

export const getStoredUser = (fallback = null) => readJson(AUTH_USER_KEY, fallback);

export const getStoredToken = () => {
    if (!canUseStorage()) return null;
    return window.localStorage.getItem(AUTH_TOKEN_KEY);
};

export const getUserId = (user = getStoredUser()) => user?._id || user?.id || null;

export const getAuthSession = () => {
    const user = getStoredUser();
    const token = getStoredToken() || user?.token || null;

    return {
        user,
        token,
        userId: getUserId(user),
        isAuthenticated: Boolean(token)
    };
};

export const saveAuthSession = ({ token, user }) => {
    if (!canUseStorage()) return;

    if (token) {
        window.localStorage.setItem(AUTH_TOKEN_KEY, token);
    }

    if (user) {
        window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    }
};

export const updateStoredUser = (updates) => {
    if (!canUseStorage()) return null;

    const currentUser = getStoredUser({});
    const nextUser = { ...currentUser, ...updates };
    window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(nextUser));
    return nextUser;
};

export const clearStoredAuth = () => {
    if (!canUseStorage()) return;

    window.localStorage.removeItem(AUTH_TOKEN_KEY);
    window.localStorage.removeItem(AUTH_USER_KEY);
};
