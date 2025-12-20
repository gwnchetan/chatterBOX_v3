import React from 'react';

const SidebarItem = ({ icon, label, active, badge, onClick }) => {
    return (
        <div
            className={`sidebar-item ${active ? 'sidebar-item--active' : ''}`}
            onClick={onClick}
        >
            <span className="sidebar-item__icon">{icon}</span>
            <span className="sidebar-item__label">{label}</span>
            {badge && <span className="sidebar-item__badge">{badge}</span>}
        </div>
    );
};

export default SidebarItem;
