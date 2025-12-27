import React from 'react';
import styles from './BrandLogo.module.css';

const BrandLogo = ({ size, animated = true, className = '' }) => {
    // Only apply inline fontSize if the prop is provided, otherwise rely on CSS default or inheritance
    const style = size ? { fontSize: size } : {};

    return (
        <h1
            className={`${styles.brandLogo} ${className}`}
            style={style}
        >
            <span className={`${styles.brandText} ${animated ? styles.animateSlide : ''}`}>
                chatter
            </span>
            <span className={`${styles.brandHighlight} ${animated ? styles.animatePop : ''}`}>
                BOX
                <span className={`${styles.underline} ${animated ? styles.animateExpand : ''}`}></span>
            </span>
        </h1>
    );
};

export default BrandLogo;
