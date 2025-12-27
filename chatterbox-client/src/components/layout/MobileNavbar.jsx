import React, { useState } from 'react';
import './MobileNavbar.css';
import { Home, Search, MessageSquare, User, Plus } from '../common/Icons';
import { useNavigate, useLocation } from 'react-router-dom';

const MobileNavbar = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Simple helper to check active
    const isActive = (path) => location.pathname === path;

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
                    className={`mobile-nav-item ${isActive('/create') ? 'active' : ''}`}
                    onClick={() => navigate('/create')}
                >
                    <div className="icon-wrapper center-action">
                        <Plus size={24} />
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
                    className={`mobile-nav-item ${isActive('/direct') ? 'active' : ''}`}
                    onClick={() => navigate('/direct')}
                >
                    <div className="icon-wrapper">
                        <MessageSquare size={24} />
                    </div>
                </button>

                <button
                    className={`mobile-nav-item ${isActive('/profile') ? 'active' : ''}`}
                    onClick={() => navigate('/profile')}
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
