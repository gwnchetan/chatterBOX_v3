import React, { useState } from 'react';
import './MobileNavbar.css';
import { Home, Search, Bell, User, Plus } from '../common/Icons';
import { useNavigate, useLocation } from 'react-router-dom';

const MobileNavbar = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Simple helper to check active
    const isActive = (path) => location.pathname === path;

    const isProfileActive = () => {
        const user = JSON.parse(localStorage.getItem('user'));
        const myId = user ? (user.id || user._id) : null;
        return location.pathname === '/profile' || (myId && location.pathname === `/profile/${myId}`);
    };

    return (
        <div className="mobile-navbar">
            <div className="mobile-nav-container">
                <button
                    className={`mobile-nav-item ${isActive('/feed') ? 'active' : ''}`}
                    onClick={() => navigate('/feed')}
                >
                    <div className="icon-wrapper">
                        <Home size={24} />
                    </div>
                </button>

                <button
                    className={`mobile-nav-item ${isActive('/explore') ? 'active' : ''}`}
                    onClick={() => navigate('/explore')}
                >
                    <div className="icon-wrapper">
                        <Search size={24} />
                    </div>
                </button>

                <button
                    className={`mobile-nav-item ${isActive('/create') ? 'active' : ''}`}
                    onClick={() => navigate('/create')}
                >
                    <div className="icon-wrapper center-action">
                        <Plus size={24} />
                    </div>
                </button>

                <button
                    className={`mobile-nav-item ${isActive('/notifications') ? 'active' : ''}`}
                    onClick={() => navigate('/notifications')}
                >
                    <div className="icon-wrapper">
                        <Bell size={24} />
                    </div>
                </button>

                <button
                    className={`mobile-nav-item ${isProfileActive() ? 'active' : ''}`}
                    onClick={() => {
                        const user = JSON.parse(localStorage.getItem('user')) || {};
                        navigate(`/profile/${user.id || user._id}`);
                    }}
                >
                    <div className="icon-wrapper">
                        <User size={24} />
                    </div>
                </button>
            </div>
        </div>
    );
};

export default MobileNavbar;
