import React from 'react';
import Navbar from './Navbar';
import MobileNavbar from './MobileNavbar';
import './Layout.css';

const Layout = ({ children, forceCollapsed = false }) => {
    return (
        <div className={`app-layout ${forceCollapsed ? 'collapsed-mode' : ''}`}>
            <div className="layout-navbar">
                <Navbar forceCollapsed={forceCollapsed} />
            </div>

            <main className="layout-content">
                {children}
            </main>

            <div className="layout-mobile-nav">
                <MobileNavbar />
            </div>
        </div>
    );
};

export default Layout;
