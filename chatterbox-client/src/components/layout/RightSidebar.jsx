import React from 'react';
import Avatar from '../common/Avatar';

const RightSidebar = () => {
    return (
        <aside className="sidebar-right">
            <div className="right-sidebar-box">
                <div className="section-title">Stories</div>
                <div className="story-list">
                    <div className="story-item">
                        <Avatar size="md" alt="Anatoly" />
                        <div className="story-info">
                            <div className="story-preview">Anatoly Pr...</div>
                            <div className="story-time">2 mins ago</div>
                        </div>
                    </div>
                    <div className="story-item">
                        <Avatar size="md" alt="Lolita" />
                        <div className="story-info">
                            <div className="story-preview">Lolita Earns</div>
                            <div className="story-time">15 mins ago</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="right-sidebar-box">
                <div className="section-title">
                    <span>Friend Requests</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', cursor: 'pointer' }}>See All</span>
                </div>
                <div className="story-list">
                    <div className="story-item">
                        <Avatar size="md" alt="Jane" />
                        <div className="story-info">
                            <div className="story-preview">Jane Smith</div>
                            <div className="story-time">Mutual friend</div>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default RightSidebar;
