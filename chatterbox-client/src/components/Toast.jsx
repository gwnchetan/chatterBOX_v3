/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import Avatar from './common/Avatar';
import './Toast.css';

const ToastContext = createContext();

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const addToast = useCallback((type, message, duration = 3000) => {
        const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        setToasts((prev) => [...prev, { id, type, message, duration }]);
    }, []);

    const success = useCallback((message, duration) => addToast('success', message, duration), [addToast]);
    const error = useCallback((message, duration) => addToast('error', message, duration), [addToast]);
    const warning = useCallback((message, duration) => addToast('warning', message, duration), [addToast]);
    const info = useCallback((message, duration) => addToast('info', message, duration), [addToast]);

    const contextValue = React.useMemo(() => ({
        addToast, removeToast, success, error, warning, info
    }), [addToast, removeToast, success, error, warning, info]);

    return (
        <ToastContext.Provider value={contextValue}>
            {children}
            <div className="toast-container">
                {toasts.map((toast) => (
                    <ToastItem key={toast.id} {...toast} onRemove={() => removeToast(toast.id)} />
                ))}
            </div>
        </ToastContext.Provider>
    );
};

const ToastItem = ({ id, type, message, duration, onRemove }) => {
    const [isExiting, setIsExiting] = useState(false);
    const isRichMessage = message && typeof message === 'object';
    const toastTitle = isRichMessage ? message.title : '';
    const toastBody = isRichMessage ? message.message : message;
    const toastAvatar = isRichMessage ? message.avatar : '';

    const handleClose = useCallback(() => {
        setIsExiting(true);
        setTimeout(() => {
            onRemove(id);
        }, 300);
    }, [id, onRemove]);

    useEffect(() => {
        if (duration > 0) {
            const timer = setTimeout(handleClose, duration);
            return () => clearTimeout(timer);
        }
        return undefined;
    }, [duration, handleClose]);

    const getIcon = () => {
        switch (type) {
            case 'success':
                return (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 22C17.5 22 22 17.5 22 12C22 6.5 17.5 2 12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M7.75 12L10.58 14.83L16.25 9.17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                );
            case 'error':
                return (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 22C17.5 22 22 17.5 22 12C22 6.5 17.5 2 12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M12 8V13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M11.9946 16H12.0036" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                );
            case 'warning':
                return (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 22C17.5 22 22 17.5 22 12C22 6.5 17.5 2 12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M12 17V17.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M12 7V13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                );
            case 'info':
            default:
                return (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 22C17.5 22 22 17.5 22 12C22 6.5 17.5 2 12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M12 8V13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M11.9946 16H12.0036" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                );
        }
    };

    return (
        <div className={`toast toast-${type} ${isExiting ? 'exit' : ''}`} role="alert">
            <div className={`toast-icon ${toastAvatar ? 'toast-icon--avatar' : ''}`}>
                {toastAvatar ? (
                    <Avatar src={toastAvatar} alt={toastTitle || toastBody || 'User'} size="sm" />
                ) : (
                    getIcon()
                )}
            </div>
            <div className={`toast-content ${toastTitle ? 'toast-content--rich' : ''}`}>
                {toastTitle && <div className="toast-title">{toastTitle}</div>}
                <div className="toast-message">{toastBody}</div>
            </div>
            <button className="toast-close" onClick={handleClose} aria-label="Close">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 18L18 6M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>
        </div>
    );
};
