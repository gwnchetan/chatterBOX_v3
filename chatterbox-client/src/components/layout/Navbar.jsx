import React, { useState, useEffect } from 'react';
import './Navbar.css';
import Avatar from '../common/Avatar';
import { Home, Grid, Bookmark, Send, BarChart, Settings, LogOut, User } from '../common/Icons';
import { useNavigate, useLocation } from 'react-router-dom';

const Navbar = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Determine active link based on current path
    const getActiveLink = (path) => {
        if (path === '/feed') return 'Feed';
        if (path === '/explore') return 'Explore';
        if (path === '/favorites') return 'Favorites';
        if (path === '/direct') return 'Direct';
        if (path === '/stats') return 'Stats';
        if (path === '/settings') return 'Settings';
        if (path === '/profile') return 'Profile';
        return 'Feed'; // Default
    };

    const activeLink = getActiveLink(location.pathname);

    const navItems = [
        { id: 'Feed', icon: <Home />, label: 'Feed', path: '/feed' },
        { id: 'Explore', icon: <Grid />, label: 'Explore', path: '/explore' },
        { id: 'Favorites', icon: <Bookmark />, label: 'My Favorites', path: '/favorites' },
        { id: 'Direct', icon: <Send />, label: 'Direct', path: '/direct' },
        { id: 'Stats', icon: <BarChart />, label: 'Stats', path: '/stats' },
        { id: 'Settings', icon: <Settings />, label: 'Settings', path: '/settings' },
    ];

    const handleNavigation = (path) => {
        navigate(path);
    };

    const handleLogout = () => {
        // Clear auth data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Redirect to login
        navigate('/');
    };

    // Get user info from localStorage (fallback to default)
    const user = JSON.parse(localStorage.getItem('user')) || { fullname: 'Cyndy Lillibridge', username: 'cyndyui' };

    return (
        <nav className="navbar">
            {/* Logo Section */}
            <div className="logo-container">
                <div className="logo-icon">💬</div>
                <div className="logo-text">chatterBOX</div>
            </div>

            {/* Navigation Menu */}
            <ul className="nav-menu">
                <li
                    className={`nav-item ${activeLink === 'Profile' ? 'active' : ''}`}
                    onClick={() => handleNavigation('/profile')}
                >
                    <div className="nav-link">
                        <span className="nav-icon"><User /></span>
                        <span className="nav-text">Profile</span>
                    </div>
                </li>

                {navItems.map((item) => (
                    <li
                        key={item.id}
                        className={`nav-item ${activeLink === item.id ? 'active' : ''}`}
                        onClick={() => handleNavigation(item.path)}
                    >
                        <div className="nav-link">
                            <span className="nav-icon">{item.icon}</span>
                            <span className="nav-text">{item.label}</span>
                        </div>
                    </li>
                ))}
            </ul>

            {/* Footer / User Section */}
            <div className="navbar-footer">
                <div className="user-profile" onClick={() => handleNavigation('/profile')}>
                    <div className="nav-icon avatar-icon">
                        <Avatar size="sm" alt={user.fullname} />
                    </div>
                    <div className="user-info">
                        <span className="user-name">{user.fullname}</span>
                        <span className="user-handle">@{user.username || 'user'}</span>
                    </div>
                </div>

                <div className="logout-btn" onClick={handleLogout}>
                    <LogOut />
                    <span>Logout</span>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
