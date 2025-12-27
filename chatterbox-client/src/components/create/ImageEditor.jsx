import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { ZoomIn, RotateCcw, Check, X } from '../common/Icons';

/* Zinc Theme Colors Mapping */
const CROP_BG = "#18181b"; // Surface
const TOOLBAR_BG = "#000000"; // Black
const ACCENT = "#2563EB"; // Blue

const ImageEditor = ({
    imageSrc,
    videoSrc,
    initialCrop,
    initialZoom,
    initialRotate,
    initialAspect,
    onCancel,
    onSave
}) => {
    const [crop, setCrop] = useState(initialCrop || { x: 0, y: 0 });
    const [zoom, setZoom] = useState(initialZoom || 1);
    const [rotation, setRotation] = useState(initialRotate || 0);
    const [aspect, setAspect] = useState(initialAspect || 4 / 5); // Default to portrait
    const [completedCrop, setCompletedCrop] = useState(null);
    const [percentCrop, setPercentCrop] = useState(null); // [NEW] Store percentage crop

    const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
        setCompletedCrop(croppedAreaPixels);
        setPercentCrop(croppedArea);
    }, []);

    const handleSave = () => {
        onSave({
            crop,
            zoom,
            rotation,
            aspect,
            croppedAreaPixels: completedCrop,
            percentCrop // [NEW]
        });
    };

    return (
        <div className="image-editor-container" style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: CROP_BG,
            position: 'relative'
        }}>
            {/* 1. Cropper Area */}
            <div className="cropper-wrapper" style={{
                position: 'relative',
                flex: 1,
                width: '100%',
                background: '#09090b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <Cropper
                    image={imageSrc}
                    video={videoSrc}
                    crop={crop}
                    zoom={zoom}
                    rotation={rotation}
                    aspect={aspect}
                    onCropChange={setCrop}
                    onCropComplete={onCropComplete}
                    onZoomChange={setZoom}
                    onRotationChange={setRotation}
                    showGrid={true}
                    objectFit="contain"
                />
            </div>

            {/* 2. Toolbar */}
            <div className="editor-toolbar" style={{
                height: '140px',
                backgroundColor: TOOLBAR_BG,
                borderTop: '1px solid #27272a',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                zIndex: 50
            }}>
                {/* Sliders Row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ZoomIn size={16} color="#a1a1aa" />
                        <input
                            type="range"
                            value={zoom}
                            min={1}
                            max={3}
                            step={0.1}
                            aria-labelledby="Zoom"
                            onChange={(e) => setZoom(Number(e.target.value))}
                            style={{
                                width: '100%',
                                accentColor: ACCENT,
                                cursor: 'pointer'
                            }}
                        />
                    </div>
                    <button
                        onClick={() => setRotation((prev) => prev - 90)}
                        title="Rotate"
                        style={{
                            background: 'none',
                            border: '1px solid #3f3f46',
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: '#f4f4f5'
                        }}
                    >
                        <RotateCcw size={14} />
                    </button>
                </div>

                {/* Aspect Ratio Row */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                    <RatioBtn
                        label="1:1"
                        active={aspect === 1}
                        onClick={() => setAspect(1)}
                    />
                    <RatioBtn
                        label="4:5"
                        active={aspect === 4 / 5}
                        onClick={() => setAspect(4 / 5)}
                    />
                    <RatioBtn
                        label="16:9"
                        active={aspect === 16 / 9}
                        onClick={() => setAspect(16 / 9)}
                    />
                </div>

                {/* Actions (Mobile view mainly, though desktop has bottom bar) */}
                <div style={{
                    position: 'absolute',
                    bottom: '16px',
                    right: '16px',
                    display: 'flex',
                    gap: '12px'
                }}>
                    {/* Using external controls on desktop parent usually, but good to have here for strict editor mode */}
                </div>
            </div>

            {/* Floating Action Buttons for Save/Cancel inside Editor explicitly */}
            <div style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                display: 'flex',
                gap: '8px',
                zIndex: 60
            }}>
                <button onClick={onCancel} style={{
                    background: 'rgba(0,0,0,0.6)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '36px', height: '36px',
                    color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer'
                }}>
                    <X size={20} />
                </button>
                <button onClick={handleSave} style={{
                    background: ACCENT,
                    border: 'none',
                    borderRadius: '50%',
                    width: '36px', height: '36px',
                    color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer'
                }}>
                    <Check size={20} />
                </button>
            </div>
        </div>
    );
};

const RatioBtn = ({ label, active, onClick }) => (
    <button
        onClick={onClick}
        style={{
            background: 'none',
            border: active ? `1px solid ${ACCENT}` : '1px solid #3f3f46',
            color: active ? ACCENT : '#a1a1aa',
            borderRadius: '20px',
            padding: '4px 12px',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s'
        }}
    >
        {label}
    </button>
);

export default ImageEditor;
