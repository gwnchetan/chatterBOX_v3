import React from 'react';

const Avatar = ({ src, alt, size = 'md', className = '', status }) => {
    return (
        <div className={`avatar avatar--${size} ${className}`}>
            <img
                src={src || `https://ui-avatars.com/api/?name=${alt || 'User'}&background=random`}
                alt={alt || "Avatar"}
                className="avatar__img"
            />
            {status && <span className={`avatar__status avatar__status--${status}`}></span>}
        </div>
    );
};

export default Avatar;
