import React from 'react';
import Avatar from '../common/Avatar';
import { Home, Grid, Bookmark, Send, BarChart, Settings, Check } from '../common/Icons';

const Sidebar = () => {
    return (
        <aside className="sidebar-left">
            <div className="profile-card">
                <Avatar size="lg" status="online" />
                <h3>Cyndy Lillibridge <Check style={{ width: 16, color: 'var(--color-primary)' }} /></h3>
                <p>Torrance, CA, United States</p>

                <div className="profile-stats">
                    <div className="stat-item">
                        <span className="stat-value">368</span>
                        <span className="stat-label">Posts</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-value">184.3K</span>
                        <span className="stat-label">Followers</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-value">1.04M</span>
                        <span className="stat-label">Following</span>
                    </div>
                </div>
            </div>

            <nav className="sidebar-nav">
                <div className={`sidebar-item sidebar-item--active`}>
                    <span className="sidebar-item__icon"><Home /></span>
                    <span className="sidebar-item__label">Feed</span>
                </div>
                <div className="sidebar-item">
                    <span className="sidebar-item__icon"><Grid /></span>
                    <span className="sidebar-item__label">Explore</span>
                </div>
                <div className="sidebar-item">
                    <span className="sidebar-item__icon"><Bookmark /></span>
                    <span className="sidebar-item__label">My favorites</span>
                </div>
                <div className="sidebar-item">
                    <span className="sidebar-item__icon"><Send /></span>
                    <span className="sidebar-item__label">Direct</span>
                </div>
                <div className="sidebar-item">
                    <span className="sidebar-item__icon"><BarChart /></span>
                    <span className="sidebar-item__label">Stats</span>
                </div>
                <div className="sidebar-item">
                    <span className="sidebar-item__icon"><Settings /></span>
                    <span className="sidebar-item__label">Settings</span>
                </div>
            </nav>

            <div className="contacts-section">
                <div className="section-header">Contacts</div>
                <div className="contact-list">
                    <div className="contact-item">
                        <Avatar size="sm" alt="Julie Mendez" status="online" />
                        <div>
                            <div className="contact-name">Julie Mendez</div>
                            <div className="contact-location">Memphis, TN, US</div>
                        </div>
                    </div>
                    <div className="contact-item">
                        <Avatar size="sm" alt="Marian Montgomery" status="online" />
                        <div>
                            <div className="contact-name">Marian Montgomery</div>
                            <div className="contact-location">Newark, NJ, US</div>
                        </div>
                    </div>
                    <div className="contact-item">
                        <Avatar size="sm" alt="Joyce Reid" status="offline" />
                        <div>
                            <div className="contact-name">Joyce Reid</div>
                            <div className="contact-location">Fort Worth, TX, US</div>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
