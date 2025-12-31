import React, { useRef, useEffect, useState } from 'react';

/**
 * A lightweight Slider for trimming video start/end times.
 * Supports dual handles.
 */
const VideoTrimSlider = ({ duration, startTime, endTime, onChange }) => {
    const trackRef = useRef(null);
    const [isDragging, setIsDragging] = useState(null); // 'start' | 'end' | null

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const getPercentage = (time) => {
        return (time / duration) * 100;
    };

    const handleMouseDown = (type) => (e) => {
        e.preventDefault();
        setIsDragging(type);
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDragging || !trackRef.current) return;

            const rect = trackRef.current.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            let percentage = (clickX / rect.width) * 100;
            percentage = Math.max(0, Math.min(100, percentage));

            const newTime = (percentage / 100) * duration;

            if (isDragging === 'start') {
                // Constraint: Start cannot pass End - 1s
                const maxStart = endTime - 1;
                const safeStart = Math.min(newTime, maxStart);
                onChange(safeStart, endTime);
            } else {
                // Constraint: End cannot result in < 1s duration
                const minEnd = startTime + 1;
                const safeEnd = Math.max(newTime, minEnd);
                onChange(startTime, safeEnd);
            }
        };

        const handleMouseUp = () => {
            setIsDragging(null);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, duration, startTime, endTime, onChange]);

    return (
        <div className="trim-slider-container" style={{ padding: '10px 0', userSelect: 'none' }}>
            <div
                className="trim-track"
                ref={trackRef}
                style={{
                    position: 'relative',
                    height: '40px',
                    background: '#333',
                    borderRadius: '6px',
                    cursor: 'pointer'
                }}
            >
                {/* Active Range Highlight */}
                <div
                    style={{
                        position: 'absolute',
                        left: `${getPercentage(startTime)}%`,
                        width: `${getPercentage(endTime - startTime)}%`,
                        top: 0, bottom: 0,
                        background: 'rgba(57, 160, 255, 0.3)',
                        borderTop: '2px solid #39a0ff',
                        borderBottom: '2px solid #39a0ff'
                    }}
                />

                {/* Handle Start */}
                <div
                    onMouseDown={handleMouseDown('start')}
                    style={{
                        position: 'absolute',
                        left: `${getPercentage(startTime)}%`,
                        top: 0, bottom: 0,
                        width: '12px',
                        background: '#39a0ff',
                        transform: 'translateX(-50%)',
                        cursor: 'ew-resize',
                        zIndex: 10,
                        borderTopLeftRadius: '4px',
                        borderBottomLeftRadius: '4px'
                    }}
                >
                    <span style={{
                        position: 'absolute', top: '-25px', left: '50%',
                        transform: 'translateX(-50%)', fontSize: '10px', color: '#fff'
                    }}>
                        {formatTime(startTime)}
                    </span>
                </div>

                {/* Handle End */}
                <div
                    onMouseDown={handleMouseDown('end')}
                    style={{
                        position: 'absolute',
                        left: `${getPercentage(endTime)}%`,
                        top: 0, bottom: 0,
                        width: '12px',
                        background: '#39a0ff',
                        transform: 'translateX(-50%)',
                        cursor: 'ew-resize',
                        zIndex: 10,
                        borderTopRightRadius: '4px',
                        borderBottomRightRadius: '4px'
                    }}
                >
                    <span style={{
                        position: 'absolute', top: '-25px', left: '50%',
                        transform: 'translateX(-50%)', fontSize: '10px', color: '#fff'
                    }}>
                        {formatTime(endTime)}
                    </span>
                </div>
            </div>
            <div style={{ textAlign: 'center', marginTop: '6px', fontSize: '12px', color: '#888' }}>
                Duration: {Math.max(0, endTime - startTime).toFixed(1)}s / {formatTime(duration)}
            </div>
        </div>
    );
};

export default VideoTrimSlider;
