import React from 'react';
import Avatar from '../common/Avatar';
import { UserPlus, MoreHorizontal } from '../common/Icons';

const RightSidebar = () => {
    return (
        <aside className="sidebar-right">
            <div className="right-section">
                <div className="right-section-header">
                    <div className="right-title">Requests <span className="badge-count">2</span></div>
                </div>

                <div className="request-list">
                    <div className="request-item">
                        <Avatar size="md" alt="Lauralee" />
                        <div className="request-info">
                            <span className="req-name">Lauralee Quintero</span>
                            <span className="req-action">wants to add you to friends</span>
                            <div className="req-buttons">
                                <span className="btn-accept">Accept</span>
                                <span className="btn-decline">Decline</span>
                            </div>
                        </div>
                    </div>
                    <div className="request-item">
                        <Avatar size="md" alt="Brittni" />
                        <div className="request-info">
                            <span className="req-name">Brittni Lando</span>
                            <span className="req-action">wants to add you to friends</span>
                            <div className="req-buttons">
                                <span className="btn-accept">Accept</span>
                                <span className="btn-decline">Decline</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="right-section">
                <div className="right-section-header">
                    <div className="right-title">Suggestions for you</div>
                </div>
                <div className="suggestion-list">
                    <div className="suggestion-item">
                        <Avatar size="md" alt="Chantal" />
                        <div className="suggestion-info">
                            <span className="req-name">Chantal Shelburne</span>
                            <span className="req-action">Memphis, TN, US</span>
                        </div>
                        <div className="follow-btn-icon"><UserPlus style={{ width: 18 }} /></div>
                    </div>
                    <div className="suggestion-item">
                        <Avatar size="md" alt="Marci" />
                        <div className="suggestion-info">
                            <span className="req-name">Marci Senter</span>
                            <span className="req-action">Newark, NJ, US</span>
                        </div>
                        <div className="follow-btn-icon"><UserPlus style={{ width: 18 }} /></div>
                    </div>
                    <div className="suggestion-item">
                        <Avatar size="md" alt="Janetta" />
                        <div className="suggestion-info">
                            <span className="req-name">Janetta Rotolo</span>
                            <span className="req-action">Fort Worth, TX, US</span>
                        </div>
                        <div className="follow-btn-icon"><UserPlus style={{ width: 18 }} /></div>
                    </div>
                    <div className="suggestion-item">
                        <Avatar size="md" alt="Tyra" />
                        <div className="suggestion-info">
                            <span className="req-name">Tyra Dhillon</span>
                            <span className="req-action">Springfield, MA, US</span>
                        </div>
                        <div className="follow-btn-icon"><UserPlus style={{ width: 18 }} /></div>
                    </div>

                    <div style={{ marginTop: '1rem', color: 'var(--color-primary)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                        View All
                    </div>
                </div>
            </div>

            <div className="active-now-card">
                <div className="active-avatars-stack">
                    {/* Just visuals */}
                    <Avatar size="sm" />
                    <Avatar size="sm" />
                    <Avatar size="sm" />
                    <Avatar size="sm" />
                </div>
                <div className="active-stats">
                    <h3>184.3K <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--color-text-muted)' }}>Followers</span></h3>
                    <p>Active now on your profile</p>
                </div>
            </div>

            <div className="footer-links">
                About · Accessibility · Help Center <br />
                Privacy and Terms · Advertising <br />
                Business Services
            </div>
        </aside>
    );
};

export default RightSidebar;
