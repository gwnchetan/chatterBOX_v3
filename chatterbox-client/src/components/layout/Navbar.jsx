import React, { useState } from 'react';
import './Navbar.css';
import Avatar from '../common/Avatar';
import { Home, Grid, Bookmark, Send, BarChart, Settings, LogOut, User } from '../common/Icons'; // Assuming icons exist

const Navbar = () => {
    // State for active link
    const [activeLink, setActiveLink] = useState('Feed');

    const navItems = [
        { id: 'Feed', icon: <Home />, label: 'Feed' },
        { id: 'Explore', icon: <Grid />, label: 'Explore' },
        { id: 'Favorites', icon: <Bookmark />, label: 'My Favorites' },
        { id: 'Direct', icon: <Send />, label: 'Direct' },
        { id: 'Stats', icon: <BarChart />, label: 'Stats' },
        { id: 'Settings', icon: <Settings />, label: 'Settings' },
    ];

    /**
     * Why we use <li className={active ? 'active' : ''}>
     * The CSS relies on the specific class 'active' to apply the 
     * inverse border-radius curves via pseudo-elements.
     */

    return (
        <nav className="navbar">
            {/* Logo Section */}
            <div className="logo-container">
                <div className="logo-icon">💬</div> {/* Or an SVG */}
                <div className="logo-text">chatterBOX</div>
            </div>

            {/* Navigation Menu */}
            <ul className="nav-menu">
                {/* Profile Item as active example in image? No, let's keep profile separate or in list. 
                    The image has "Profile" as a nav item. Let's add it. 
                */}
                <li
                    className={`nav-item ${activeLink === 'Profile' ? 'active' : ''}`}
                    onClick={() => setActiveLink('Profile')}
                >
                    <a href="#" className="nav-link">
                        <span className="nav-icon"><User /></span>
                        <span className="nav-text">Profile</span>
                    </a>
                </li>

                {navItems.map((item) => (
                    <li
                        key={item.id}
                        className={`nav-item ${activeLink === item.id ? 'active' : ''}`}
                        onClick={() => setActiveLink(item.id)}
                    >
                        <a href="#" className="nav-link">
                            <span className="nav-icon">{item.icon}</span>
                            <span className="nav-text">{item.label}</span>
                        </a>
                    </li>
                ))}
            </ul>

            {/* Footer / User Section */}
            <div className="navbar-footer">
                <div className="user-profile">
                    <div className="nav-icon avatar-icon">
                        <Avatar size="sm" />
                    </div>
                    <div className="user-info">
                        <span className="user-name">Cyndy Lillibridge</span>
                        <span className="user-handle">@cyndyui</span>
                    </div>
                </div>

                <div className="logout-btn">
                    <LogOut />
                    <span>Logout</span>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
