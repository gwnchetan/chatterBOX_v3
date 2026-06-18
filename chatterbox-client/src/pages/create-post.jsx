import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '../components/Toast';
import { Image, Smile, X, ChevronLeft } from '../components/common/Icons';
import getCroppedImg from '../utils/cropUtils';
import { validateMediaAddition } from '../utils/mediaRules';
import { cloudinaryService } from '../services/cloudinary.service';
import userService from '../services/user.service';
import { getStoredUser } from '../utils/authStorage';
import './create-post.css';



import { useUpload } from '../hooks/useUpload';

const EmojiPicker = lazy(() => import('emoji-picker-react'));
const ImageEditor = lazy(() => import('../components/create/ImageEditor'));
const VideoEditor = lazy(() => import('../components/create/VideoEditor'));

const CreatePost = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const toast = useToast();
    const { startUpload } = useUpload(); // 1. Use Hook

    // State
    const [caption, setCaption] = useState('');
    const [media, setMedia] = useState([]); // [{ type, file, previewUrl, ...metadata }]
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    // Editor State
    const [editingIndex, setEditingIndex] = useState(null);
    const [isVideoEditorOpen, setIsVideoEditorOpen] = useState(false);

    // Refs
    const fileInputRef = useRef(null);

    // Prevent accidental exit - Only if there is media/caption AND no upload started?
    // Actually, once upload starts, we clear this or navigate away efficiently.
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (media.length > 0 || caption.length > 0) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [media, caption]);


    // [SKIP LINES 50-160: Media Handling/Editors Unchanged]

    // --- Background Upload Handler ---
    const handlePublish = async () => {
        if (!caption.trim() && media.length === 0) return;

        // 2. Start Background Upload
        startUpload({
            caption: caption,
            media: media
        });

        // 3. Immediate Exit
        toast.info("Posting in background...");
        navigate('/feed');
    };

    const handlePostAsStory = async () => {
        if (media.length === 0) {
            toast.error("Stories require one image or video");
            return;
        }

        if (media.length > 1) {
            toast.error("Stories only support 1 media item");
            return;
        }

        try {
            toast.info("Uploading story...");
            let mediaUrl = '';
            let mediaType = 'image';

            if (media.length === 1) {
                const item = media[0];
                if (item.provider === 'local') {
                    // Upload to Cloudinary — same as post flow
                    const uploaded = await cloudinaryService.uploadMedia(item.file);
                    mediaUrl = uploaded.url;
                    mediaType = item.type;
                } else {
                    mediaUrl = item.url;
                    mediaType = item.type;
                }
            }

            await userService.uploadStory(mediaUrl, mediaType, caption.trim());

            // Invalidate story feed caches
            queryClient.invalidateQueries({ queryKey: ['storyFeed'] });
            queryClient.invalidateQueries({ queryKey: ['userStories'] });

            toast.success("Story posted!");
            navigate('/feed');
        } catch (err) {
            toast.error("Failed to post story");
            console.error(err);
        }
    };

    // --- Media Handling ---
    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        let currentDraft = [...media];
        let errorMsg = null;

        files.forEach(file => {
            const isVideo = file.type.startsWith('video/');
            const type = isVideo ? 'video' : 'image';

            const validation = validateMediaAddition(currentDraft, type);
            if (!validation.valid) {
                errorMsg = validation.error;
                return;
            }

            const objectUrl = URL.createObjectURL(file);

            // Base Schema for Local Draft
            const newItem = {
                type,
                file: file,
                originalUrl: objectUrl,
                previewUrl: objectUrl,
                provider: 'local',

                // Image Specific Defaults
                crop: { x: 0, y: 0 },
                zoom: 1,
                rotation: 0,
                aspect: 0.8,
                croppedAreaPixels: null,
                isEdited: false,

                // Video Specific Defaults (Phase 2 Strict Schema)
                videoMetadata: isVideo ? {
                    rotate: 0,
                    aspectRatio: "4:5",
                    trim: { start: 0, end: 0 }, // Will be set on load
                    crop: { x: 0, y: 0, w: 1, h: 1 } // Full frame normalized
                } : null
            };

            currentDraft.push(newItem);
        });

        setMedia(currentDraft);

        if (errorMsg) toast.error(errorMsg);
        e.target.value = '';
    };

    const removeMedia = (index) => {
        setMedia(prev => prev.filter((_, i) => i !== index));
        if (editingIndex === index) {
            setEditingIndex(null);
            setIsVideoEditorOpen(false);
        }
    };

    // --- Edit Flow ---
    const handleEditClick = (index) => {
        if (media[index].provider !== 'local') return;

        setEditingIndex(index);

        if (media[index].type === 'video') {
            setIsVideoEditorOpen(true);
        }
    };

    // --- Save Handlers ---
    const handleVideoSave = (metadata, thumbBlob) => {
        setMedia(prev => {
            const n = [...prev];
            const item = n[editingIndex];

            // Update preview URL with the temporary thumbnail blob
            // This is purely for the grid view, not the upload
            const newPreviewUrl = URL.createObjectURL(thumbBlob);

            n[editingIndex] = {
                ...item,
                isEdited: true,
                videoMetadata: metadata,
                previewUrl: newPreviewUrl,
                // We keep the original file untouched
            };
            return n;
        });
        setIsVideoEditorOpen(false);
        setEditingIndex(null);
    };



    const handleBack = () => {
        if (editingIndex !== null) {
            setEditingIndex(null);
            setIsVideoEditorOpen(false);
        } else {
            navigate('/feed');
        }
    };

    return (
        <div className="create-post-container">
            {/* Header */}
            <div className="create-header">
                <button onClick={handleBack} className="icon-btn">
                    <ChevronLeft /> {editingIndex !== null ? "Back" : ""}
                </button>
                <h2>{editingIndex !== null ? "Edit Media" : "New Post"}</h2>

                {/* Right Side Actions */}
                {editingIndex === null ? (
                    <div className="create-header-actions">
                        <button
                            className="publish-btn"
                            onClick={handlePublish}
                            disabled={!caption && media.length === 0}
                        >
                            Share
                        </button>
                        <button
                            className="publish-btn story-publish-btn"
                            onClick={handlePostAsStory}
                            disabled={media.length === 0}
                        >
                            + Story
                        </button>
                    </div>
                ) : (
                    // In Editor Mode, the specific editor handles "Done"
                    <div style={{ width: 60 }}></div>
                )}
            </div>

            {/* Publishing Overlay removed: Upload is now background */}

            <div className="create-body">
                {/* PREVIEW / EDITOR SECTION */}
                <div className={`media-preview-section ${editingIndex !== null ? 'full-width' : ''}`}>
                    {editingIndex !== null ? (
                        // --- EDITOR MODE ---
                        <div className="editor-container">
                            <Suspense fallback={<div className="create-inline-loader">Loading editor...</div>}>
                                {isVideoEditorOpen ? (
                                    <VideoEditor
                                        videoSrc={media[editingIndex].originalUrl}
                                        onSave={handleVideoSave}
                                        onCancel={() => {
                                            setEditingIndex(null);
                                            setIsVideoEditorOpen(false);
                                        }}
                                    />
                                ) : (
                                    <ImageEditor
                                        imageSrc={media[editingIndex].originalUrl || media[editingIndex].previewUrl}
                                        initialCrop={media[editingIndex].crop}
                                        initialZoom={media[editingIndex].zoom}
                                        initialRotate={media[editingIndex].rotation}
                                        initialAspect={media[editingIndex].aspect}
                                        onCancel={() => setEditingIndex(null)}
                                        onSave={async (updates) => {
                                            let newPreviewUrl = media[editingIndex].previewUrl;

                                            if (updates.croppedAreaPixels) {
                                                try {
                                                    const sourceUrl = media[editingIndex].originalUrl || media[editingIndex].previewUrl;
                                                    const { url } = await getCroppedImg(sourceUrl, updates.croppedAreaPixels, updates.rotation);
                                                    newPreviewUrl = url;
                                                } catch (e) {
                                                    console.error("Preview gen failed", e);
                                                }
                                            }

                                            setMedia(prev => {
                                                const n = [...prev];
                                                n[editingIndex] = {
                                                    ...n[editingIndex],
                                                    ...updates,
                                                    isEdited: true,
                                                    previewUrl: newPreviewUrl
                                                };
                                                return n;
                                            });
                                            setEditingIndex(null);
                                        }}
                                    />
                                )}
                            </Suspense>
                        </div>
                    ) : (
                        // --- GRID MODE ---
                        media.length === 0 ? (
                            <div className="empty-state">
                                <Image size={64} className="empty-icon-placeholder" />
                                <h3>Create a new post</h3>
                                <div className="upload-options-row" style={{ display: 'flex', gap: '12px' }}>
                                    <button className="primary-select-btn" onClick={() => fileInputRef.current.click()}>
                                        Select from Device
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="preview-grid">
                                {media.map((item, idx) => (
                                    <div key={idx} className="preview-item group">
                                        <button className="remove-btn" onClick={() => removeMedia(idx)}><X size={16} /></button>

                                        {item.provider === 'local' && (
                                            <button className="edit-btn-float" onClick={() => handleEditClick(idx)}>
                                                Edit
                                            </button>
                                        )}

                                        {/* Video Preview: Live Player with CSS Rotation */}
                                        {item.type === 'video' ? (
                                            <div style={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }}>
                                                <video
                                                    src={item.originalUrl || item.previewUrl}
                                                    muted
                                                    loop
                                                    autoPlay
                                                    playsInline
                                                    style={{
                                                        width: '100%',
                                                        height: '100%',
                                                        objectFit: 'cover',
                                                        transform: item.videoMetadata?.rotate ? `rotate(${item.videoMetadata.rotate}deg)` : 'none',
                                                        // Ensure rotated video covers the box? 
                                                        // Simple rotation might show gaps if aspects differ.
                                                        // For now, this satisfies "Video playing" + "Rotation".
                                                        transformOrigin: 'center'
                                                    }}
                                                />
                                            </div>
                                        ) : (
                                            <img src={item.previewUrl} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        )}
                                    </div>
                                ))}
                                {/* Add More Button */}
                                {media.length < 5 && !media.some(m => m.type === 'video') && (
                                    <button className="add-more-tile" onClick={() => fileInputRef.current.click()}>
                                        +
                                    </button>
                                )}
                            </div>
                        )
                    )}
                </div>

                {/* CONTENT SIDEBAR (Hidden in Edit Mode) */}
                {editingIndex === null && (
                    <div className="content-section">
                        <div className="user-mini-header">
                            <span className="user-username">
                                {getStoredUser()?.username || 'user'}
                            </span>
                        </div>
                        <textarea
                            className="caption-input"
                            placeholder="Write a caption..."
                            value={caption}
                            onChange={e => setCaption(e.target.value)}
                            maxLength={2200}
                        />
                        <div className="caption-tools">
                            <button onClick={() => setShowEmojiPicker(!showEmojiPicker)}><Smile size={20} /></button>
                            <span>{caption.length}/2,200</span>
                        </div>

                        {showEmojiPicker && (
                            <Suspense fallback={<div className="create-inline-loader">Loading emoji picker...</div>}>
                                <div className="emoji-picker-popover">
                                    <EmojiPicker onEmojiClick={(e) => setCaption(c => c + e.emoji)} theme="dark" width="100%" height={300} previewConfig={{ showPreview: false }} />
                                </div>
                            </Suspense>
                        )}

                        <input
                            type="file"
                            ref={fileInputRef}
                            hidden
                            multiple
                            accept="image/*,video/mp4,video/quicktime" // Accepted formats
                            onChange={handleFileSelect}
                        />
                    </div>
                )}
            </div>
        </div >
    );
};

export default CreatePost;
