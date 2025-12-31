import React, { useRef, useEffect, useState, useMemo } from 'react';
import { buildVideoUrl } from '../../utils/cloudinaryUtils';
import { Volume2, VolumeX, Play } from '../common/Icons';

/**
 * Smart Video Player for Feed
 * 
 * Features:
 * 1. Generates URL from Normalized Intent Metadata (v3).
 * 2. Uses IntersectionObserver for auto-play/pause.
 * 3. Handles Mute/Unmute.
 */
const VideoPlayer = ({ media }) => {
    const videoRef = useRef(null);
    const containerRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [hasInteraction, setHasInteraction] = useState(false);

    // 1. Build URLs (Memoized for performance)
    const { videoUrl, posterUrl, aspectRatio } = useMemo(() => {
        if (!media || !media.metadata) return { videoUrl: '', posterUrl: '', aspectRatio: '4/5' };

        const { width, height, metadata } = media;

        // Safety check for width/height
        const w = width || 1920;
        const h = height || 1080;

        const vUrl = buildVideoUrl({
            publicId: media.publicId,
            ...metadata
        }, w, h, 'mp4');

        const pUrl = buildVideoUrl({
            publicId: media.publicId,
            ...metadata
        }, w, h, 'jpg');

        // Determine CSS Aspect Ratio
        let ar = '4/5'; // Default
        if (metadata.aspectRatio) {
            ar = metadata.aspectRatio.replace(':', '/');
        }

        return { videoUrl: vUrl, posterUrl: pUrl, aspectRatio: ar };
    }, [media]);


    // 2. Intersection Observer for Auto-Play
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    // Only auto-play if we haven't manually paused? 
                    // For feed, usually "if visible -> play" is standard policy.
                    video.play().catch(() => {
                        // Autoplay blocked (low power or unmuted entitlement issues)
                        setIsPlaying(false);
                    });
                    setIsPlaying(true);
                } else {
                    video.pause();
                    setIsPlaying(false);
                }
            },
            { threshold: 0.75 } // 75% visible to play (Stricter for mobile)
        );

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => {
            observer.disconnect();
        };
    }, [videoUrl]);

    // 3. Handlers
    const togglePlay = (e) => {
        e.stopPropagation();
        const video = videoRef.current;
        if (video.paused) {
            video.play();
            setIsPlaying(true);
        } else {
            video.pause();
            setIsPlaying(false);
        }
        setHasInteraction(true);
    };

    const toggleMute = (e) => {
        e.stopPropagation();
        setIsMuted(!isMuted);
    };

    if (!videoUrl) return null;

    return (
        <div
            ref={containerRef}
            className="feed-video-container"
            style={{ aspectRatio: aspectRatio }}
            onClick={togglePlay}
        >
            <video
                ref={videoRef}
                src={videoUrl}
                poster={posterUrl}
                className="feed-video"
                loop
                muted={isMuted}
                playsInline
                preload="metadata" // Save data
            />

            {/* Mute Toggle (Always visible if playing, or fade out?) */}
            <button className="mute-btn" onClick={toggleMute}>
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>

            {/* Play Overlay (Only when paused) */}
            {!isPlaying && (
                <div className="play-overlay">
                    <Play size={48} fill="white" />
                </div>
            )}

            <style>{`
                .feed-video-container {
                    position: relative;
                    width: 100%;
                    background: black;
                    overflow: hidden;
                    border-radius: 8px; /* Maintain feed aesthetics */
                    cursor: pointer;
                    margin-top: 12px;
                }
                .feed-video {
                    width: 100%;
                    height: 100%;
                    object-fit: cover; /* Ensure no black bars if AR matches */
                    display: block;
                }
                .mute-btn {
                    position: absolute;
                    bottom: 12px;
                    right: 12px;
                    background: rgba(0, 0, 0, 0.6);
                    border: none;
                    border-radius: 50%;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    cursor: pointer;
                    z-index: 10;
                    transition: background 0.2s;
                }
                .mute-btn:hover {
                    background: rgba(0, 0, 0, 0.8);
                }
                .play-overlay {
                    position: absolute;
                    inset: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(0, 0, 0, 0.2);
                    pointer-events: none; /* Let clicks pass to container */
                }
            `}</style>
        </div>
    );
};

export default VideoPlayer;
