import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { X, Moon, Sun, Lock } from './Icons';
import userService from '../../services/user.service';

const SettingsModal = ({ isOpen, onClose }) => {
    const { theme, setMode } = useTheme();
    const [isPrivate, setIsPrivate] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const fetchSettings = async () => {
                try {
                    const userStr = localStorage.getItem('user');
                    if (userStr) {
                        const user = JSON.parse(userStr);
                        // Fetch fresh profile data
                        const data = await userService.getProfile(user._id || user.id);
                        setIsPrivate(data.user.isPrivate || false);
                    }
                } catch (error) {
                    console.error("Failed to load settings", error);
                }
            };
            fetchSettings();
        }
    }, [isOpen]);

    const togglePrivacy = async () => {
        try {
            setLoading(true);
            const newState = !isPrivate;
            await userService.updateProfile({ isPrivate: newState });
            setIsPrivate(newState);
        } catch (error) {
            console.error("Failed to update privacy", error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content settings-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Settings</h3>
                    <button className="close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="modal-body">
                    <div className="setting-section">
                        <h4>Appearance</h4>
                        <div className="theme-toggle-group">
                            <button
                                className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
                                onClick={() => setMode('light')}
                            >
                                <Sun size={18} />
                                <span>Light Mode</span>
                            </button>
                            <button
                                className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
                                onClick={() => setMode('dark')}
                            >
                                <Moon size={18} />
                                <span>Dark Mode</span>
                            </button>
                        </div>
                    </div>

                    <div className="setting-section" style={{ marginTop: '24px' }}>
                        <h4>Account & Privacy</h4>
                        <div className="privacy-toggle-row">
                            <div className="privacy-info">
                                <div className="privacy-label-row">
                                    <Lock size={18} />
                                    <span className="privacy-label">Private Account</span>
                                </div>
                                <span className="privacy-desc">
                                    Only followers will be able to see your posts and interact with you.
                                </span>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={isPrivate}
                                    onChange={togglePrivacy}
                                    disabled={loading}
                                />
                                <span className="slider round"></span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.7);
                    backdrop-filter: blur(4px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }
                .settings-modal {
                    background: var(--color-surface);
                    width: 400px;
                    max-width: 90%;
                    border-radius: 20px;
                    border: 1px solid var(--color-border);
                    overflow: hidden;
                    animation: modalPop 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
                .modal-header {
                    padding: 16px 20px;
                    border-bottom: 1px solid var(--color-border);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .modal-header h3 {
                    margin: 0;
                    color: var(--color-text-main);
                    font-size: 1.1rem;
                }
                .close-btn {
                    background: transparent;
                    border: none;
                    color: var(--color-text-muted);
                    cursor: pointer;
                    padding: 4px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .close-btn:hover {
                    color: var(--color-text-main);
                }
                .modal-body {
                    padding: 20px;
                }
                .setting-section h4 {
                    margin: 0 0 12px 0;
                    font-size: 0.9rem;
                    text-transform: uppercase;
                    color: var(--color-text-muted);
                    letter-spacing: 0.5px;
                }
                .theme-toggle-group {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                    background: var(--color-bg);
                    padding: 4px;
                    border-radius: 12px;
                }
                .theme-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    padding: 10px;
                    border: none;
                    background: transparent;
                    color: var(--color-text-muted);
                    font-weight: 500;
                    cursor: pointer;
                    border-radius: 10px;
                    transition: all 0.2s;
                }
                .theme-btn:hover {
                    color: var(--color-text-main);
                }
                .theme-btn.active {
                    background: var(--color-surface);
                    color: var(--color-primary);
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    font-weight: 600;
                }
                .privacy-toggle-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: var(--color-bg);
                    padding: 12px;
                    border-radius: 12px;
                }
                .privacy-info {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                .privacy-label-row {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    color: var(--color-text-main);
                    font-weight: 600;
                }
                .privacy-desc {
                    font-size: 0.8rem;
                    color: var(--color-text-muted);
                    max-width: 200px;
                }
                /* Toggle Switch */
                .toggle-switch {
                    position: relative;
                    display: inline-block;
                    width: 50px;
                    height: 28px;
                    flex-shrink: 0;
                }
                .toggle-switch input { 
                    opacity: 0;
                    width: 0;
                    height: 0;
                }
                .slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: var(--color-border);
                    transition: .4s;
                }
                .slider:before {
                    position: absolute;
                    content: "";
                    height: 20px;
                    width: 20px;
                    left: 4px;
                    bottom: 4px;
                    background-color: white; /* Thumb color */
                    transition: .4s;
                }
                input:checked + .slider {
                    background-color: var(--color-primary);
                }
                input:checked + .slider:before {
                    transform: translateX(22px);
                }
                .slider.round {
                    border-radius: 34px;
                }
                .slider.round:before {
                    border-radius: 50%;
                }
                @keyframes modalPop {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default SettingsModal;
