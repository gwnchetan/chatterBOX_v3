import React from 'react';
import './LogoLoader.css';

const LogoLoader = ({ size = "2rem", text = "Loading..." }) => {
    return (
        <div className="loader-container">
            <div className="brand-loader" style={{ fontSize: size }}>
                <span className="loader-chatter">chatter</span>
                <span className="loader-box">BOX</span>
            </div>
            {text && <span className="loader-text" style={{
                color: 'var(--color-text-muted)',
                fontSize: '0.9rem',
                opacity: 0.8
            }}>{text}</span>}
        </div>
    );
};

export default LogoLoader;
