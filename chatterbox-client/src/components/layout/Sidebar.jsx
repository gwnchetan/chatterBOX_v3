import React from 'react';
import SidebarItem from './SidebarItem';
import Avatar from '../common/Avatar';
import { Home, MessageSquare, Users, LogOut } from '../common/Icons';

const Sidebar = () => {
    const activeTab = 'feed';

    return (
        <aside className="sidebar-left">
            <div className="sidebar-profile">
                <Avatar size="lg" alt="Bogdan Nikitin" status="online" />
                <h3>Bogdan Nikitin</h3>
                <p>@nikitinteam</p>
            </div>

            <nav className="sidebar-nav">
                <SidebarItem
                    icon={<Home />}
                    label="News Feed"
                    active={activeTab === 'feed'}
                />
                <SidebarItem
                    icon={<MessageSquare />}
                    label="Messages"
                    badge="6"
                />
                <SidebarItem
                    icon={<Users />}
                    label="Friends"
                    badge="3"
                />

                <div style={{ marginTop: 'auto' }}>
                    <SidebarItem
                        icon={<LogOut />}
                        label="Logout"
                        onClick={() => {
                            localStorage.removeItem('token');
                            localStorage.removeItem('user');
                            window.location.href = '/';
                        }}
                    />
                </div>
            </nav>
        </aside>
    );
};

export default Sidebar;
