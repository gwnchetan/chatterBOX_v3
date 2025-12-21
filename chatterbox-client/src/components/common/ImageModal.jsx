import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from '../common/Icons';

// Simple Icons override if not available or just use text
const IconLeft = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>;
const IconRight = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>;

const ImageModal = ({ images, initialIndex = 0, onClose }) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);

    const handleNext = (e) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev + 1) % images.length);
    };

    const handlePrev = (e) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    return (
        <div
            className="image-modal-overlay"
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                backgroundColor: 'rgba(0,0,0,0.9)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(5px)'
            }}
        >
            <button
                onClick={onClose}
                style={{
                    position: 'absolute', top: 20, right: 20,
                    background: 'rgba(255,255,255,0.1)', border: 'none',
                    color: 'white', borderRadius: '50%', width: 40, height: 40,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
            >
                <X />
            </button>

            <button
                onClick={handlePrev}
                style={{
                    position: 'absolute', left: 20,
                    background: 'rgba(255,255,255,0.1)', border: 'none',
                    color: 'white', borderRadius: '50%', width: 48, height: 48,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
            >
                <IconLeft />
            </button>

            <div
                className="modal-image-container"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: '90vw', maxHeight: '90vh' }}
            >
                <img
                    src={images[currentIndex]}
                    alt={`Preview ${currentIndex}`}
                    style={{
                        maxWidth: '100%', maxHeight: '90vh',
                        objectFit: 'contain', borderRadius: 8,
                        boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                    }}
                />
            </div>

            <button
                onClick={handleNext}
                style={{
                    position: 'absolute', right: 20,
                    background: 'rgba(255,255,255,0.1)', border: 'none',
                    color: 'white', borderRadius: '50%', width: 48, height: 48,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
            >
                <IconRight />
            </button>

            {images.length > 1 && (
                <div style={{
                    position: 'absolute', bottom: 30, color: 'white',
                    background: 'rgba(0,0,0,0.5)', padding: '5px 12px', borderRadius: 20
                }}>
                    {currentIndex + 1} / {images.length}
                </div>
            )}
        </div>
    );
};

export default ImageModal;
