import React, { useState, useEffect } from 'react';
import './Navbar.css';
import Avatar from '../common/Avatar';
import BrandLogo from '../common/BrandLogo';
import { Home, Grid, Bookmark, Send, BarChart, Settings, LogOut, User, Plus } from '../common/Icons';
import SettingsModal from '../common/SettingsModal';
import { useNavigate, useLocation } from 'react-router-dom';

const Navbar = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Auto-collapse on tablet (<= 1100px)
    const [isCollapsed, setIsCollapsed] = useState(window.innerWidth <= 1100);
    // Modals
    const [showSettings, setShowSettings] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth <= 1100) {
                setIsCollapsed(true);
            } else {
                setIsCollapsed(false);
            }
        };

        // Check on mount
        handleResize();

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Get user info from localStorage (fallback to default)
    const user = JSON.parse(localStorage.getItem('user')) || { fullname: 'Cyndy Lillibridge', username: 'cyndyui' };

    // Determine active link based on current path
    const getActiveLink = (path) => {
        if (path === '/feed') return 'Feed';
        if (path === '/explore') return 'Explore';
        if (path === '/favorites') return 'Favorites';
        if (path === '/direct') return 'Direct';
        if (path === '/stats') return 'Stats';
        if (path === '/settings') return 'Settings';
        if (path === '/create') return 'Create';

        // Exact match for my profile
        const myId = user.id || user._id;
        if (path === '/profile' || (myId && path === `/profile/${myId}`)) {
            return 'Profile';
        }

        return '';
    };

    const activeLink = getActiveLink(location.pathname);

    const navItems = [
        { id: 'Feed', icon: <Home />, label: 'Feed', path: '/feed' },
        { id: 'Create', icon: <Plus />, label: 'Create', path: '/create' },
        { id: 'Explore', icon: <Grid />, label: 'Explore', path: '/explore' },
        { id: 'Favorites', icon: <Bookmark />, label: 'My Favorites', path: '/favorites' },
        { id: 'Direct', icon: <Send />, label: 'Direct', path: '/direct' },
        { id: 'Stats', icon: <BarChart />, label: 'Stats', path: '/stats' },
        { id: 'Settings', icon: <Settings />, label: 'Settings', path: '/settings' },
    ];

    const handleNavigation = (path) => {
        if (path === '/settings') {
            setShowSettings(true);
            return;
        }
        navigate(path);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/');
    };

    return (
        <nav className={`navbar ${isCollapsed ? 'collapsed' : ''}`}>

            {/* Logo Section */}
            <div className="logo-container" onClick={() => handleNavigation('/feed')}>
                {isCollapsed ? (
                    <div className="brand-icon-only">
                        <span>C</span>
                    </div>
                ) : (
                    <BrandLogo size="2rem" animated={true} />
                )}
            </div>

            {/* Navigation Menu */}
            <ul className="nav-menu">
                <li
                    className={`nav-item ${activeLink === 'Profile' ? 'active' : ''}`}
                    onClick={() => handleNavigation(`/profile/${user.id || user._id}`)}
                >
                    <div className="nav-link">
                        <span className="nav-icon"><User /></span>
                        {!isCollapsed && <span className="nav-text">Profile</span>}
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
                            {!isCollapsed && <span className="nav-text">{item.label}</span>}
                        </div>
                    </li>
                ))}
            </ul>

            {/* Footer / User Section */}
            <div className="navbar-footer">
                <div className="user-profile" onClick={() => handleNavigation('/profile')}>
                    <div className="nav-icon avatar-icon">
                        <Avatar src={user.avatar} size={isCollapsed ? "sm" : "md"} alt={user.fullname} />
                    </div>
                    {!isCollapsed && (
                        <div className="user-info">
                            <span className="user-name">{user.fullname}</span>
                            <span className="user-handle">@{user.username || 'user'}</span>
                        </div>
                    )}
                </div>

                <div className="logout-btn" onClick={handleLogout}>
                    <LogOut />
                    {!isCollapsed && <span>Logout</span>}
                </div>
            </div>

            <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
        </nav>
    );
};

export default Navbar;
