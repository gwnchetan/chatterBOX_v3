import React from 'react';
import { useNavigate } from 'react-router-dom';
import BrandLogo from '../common/BrandLogo';
import { Grid, User, LogOut, Home } from '../common/Icons';
import Avatar from '../common/Avatar';
import '../layout/Navbar.css'; // Reuse basic navbar styles for consistency

const AdminNavbar = ({ activeView, setView }) => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user')) || {};

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/');
    };

    return (
        <nav className="navbar" style={{ background: '#1a1a2e', borderRight: '1px solid #333' }}>
            {/* Admin Header */}
            <div className="logo-container" style={{ marginBottom: '40px' }}>
                <BrandLogo size="1.8rem" />
                <div style={{
                    fontSize: '0.7rem',
                    color: '#ff4444',
                    letterSpacing: '2px',
                    fontWeight: 'bold',
                    marginTop: '5px',
                    border: '1px solid #ff4444',
                    padding: '2px 6px',
                    borderRadius: '4px'
                }}>
                    ADMIN PANEL
                </div>
            </div>

            {/* Menu */}
            <ul className="nav-menu">
                <li
                    className={`nav-item ${activeView === 'posts' ? 'active' : ''}`}
                    onClick={() => setView('posts')}
                >
                    <div className="nav-link">
                        <span className="nav-icon"><Grid /></span>
                        <span className="nav-text">Manage Posts</span>
                    </div>
                </li>

                <li
                    className={`nav-item ${activeView === 'users' ? 'active' : ''}`}
                    onClick={() => setView('users')}
                >
                    <div className="nav-link">
                        <span className="nav-icon"><User /></span>
                        <span className="nav-text">Manage Users</span>
                    </div>
                </li>

                <div style={{ borderTop: '1px solid #333', margin: '20px 0' }}></div>

                <li
                    className="nav-item"
                    onClick={() => navigate('/feed')}
                >
                    <div className="nav-link" style={{ opacity: 0.7 }}>
                        <span className="nav-icon"><Home /></span>
                        <span className="nav-text">Back to App</span>
                    </div>
                </li>
            </ul>

            {/* Footer */}
            <div className="navbar-footer">
                <div className="user-profile">
                    <div className="nav-icon avatar-icon">
                        <Avatar src={user.avatar} size="sm" alt={user.fullname} />
                    </div>
                    <div className="user-info">
                        <span className="user-name">{user.fullname}</span>
                        <span className="user-handle" style={{ color: '#ff4444' }}>Admin Mode</span>
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

export default AdminNavbar;
