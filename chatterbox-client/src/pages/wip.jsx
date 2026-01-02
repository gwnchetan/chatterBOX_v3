import React from 'react';
import Navbar from '../components/layout/Navbar';
import MobileNavbar from '../components/layout/MobileNavbar';
import { AlertTriangle } from '../components/common/Icons';

const WIP = ({ title = "Work in Progress" }) => {
    return (
        <div className="wip-layout" style={{
            display: 'flex',
            minHeight: '100vh',
            backgroundColor: 'var(--color-bg)'
        }}>
            <Navbar />
            <div className="wip-page" style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                textAlign: 'center',
                color: 'var(--color-text-muted)'
            }}>
                <div style={{
                    padding: '30px',
                    background: 'var(--color-surface)',
                    borderRadius: '20px',
                    boxShadow: 'var(--shadow-lg)',
                    maxWidth: '400px',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '20px'
                }}>
                    <div style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        background: 'var(--color-primary-alpha)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--color-primary)'
                    }}>
                        <AlertTriangle size={40} />
                    </div>

                    <h1 style={{
                        margin: 0,
                        color: 'var(--color-text-main)',
                        fontSize: '1.8rem'
                    }}>{title}</h1>

                    <p style={{ margin: 0, lineHeight: 1.6 }}>
                        This feature is currently under development. Check back soon for updates!
                    </p>
                </div>
            </div>
            <MobileNavbar />
        </div>
    );
};

export default WIP;
