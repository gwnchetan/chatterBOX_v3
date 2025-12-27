import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import EmojiPicker from 'emoji-picker-react';
import { useToast } from '../components/Toast';
import { Image, Smile, X, ChevronLeft, ChevronRight, Trash, MapPin, User, Play, Pause, Volume2, VolumeX } from '../components/common/Icons';
import GiphyPicker from '../components/create/GiphyPicker';
import ImageEditor from '../components/create/ImageEditor';
import getCroppedImg from '../utils/cropUtils';
import { validateMediaAddition, validatePostPayload } from '../utils/mediaRules';
import { cloudinaryService } from '../services/cloudinary.service';
import { postsService } from '../services/posts.service';
import './create-post.css';

const VideoPreview = ({ src, crop, zoom, rotation, aspect, percentCrop }) => {
    const videoRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(true);

    const togglePlay = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
                setIsPlaying(false);
            } else {
                videoRef.current.play();
                setIsPlaying(true);
            }
        }
    };

    const toggleMute = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsMuted(!isMuted);
    };

    let objectPosition = 'center';
    if (percentCrop) {
        const x = percentCrop.x + percentCrop.width / 2;
        const y = percentCrop.y + percentCrop.height / 2;
        objectPosition = `${x}% ${y}%`;
    }

    // Apply Edits via CSS
    const videoStyle = {
        transform: `scale(${zoom || 1}) rotate(${rotation || 0}deg)`,
        transformOrigin: 'center',
        objectPosition
    };

    return (
        <div className="custom-video-wrapper" onClick={togglePlay} style={{ aspectRatio: aspect ? `${aspect}` : undefined }}>
            <video
                ref={videoRef}
                src={src}
                className="reel-video"
                style={videoStyle}
                loop
                playsInline
                muted={isMuted}
            />
            {/* Play/Pause Overlay */}
            {!isPlaying && (
                <div className="video-overlay-center">
                    <div className="play-circle">
                        <Play fill="white" size={24} />
                    </div>
                </div>
            )}
            {/* Mute Control */}
            <button className="video-mute-btn" onClick={toggleMute}>
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
        </div>
    );
};

const CreatePost = () => {
    const navigate = useNavigate();
    const toast = useToast();

    // State
    const [caption, setCaption] = useState('');
    const [media, setMedia] = useState([]); // { type, url|file, publicId, provider, previewUrl, cropData... }
    const [isPublishing, setIsPublishing] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showGiphyPicker, setShowGiphyPicker] = useState(false);

    // Editor State
    const [editingIndex, setEditingIndex] = useState(null); // Index of item being edited, or null

    const fileInputRef = useRef(null);

    // Prevent accidental exit
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

    // Handle File Selection (Images/Videos)
    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        let currentDraft = [...media];
        let errorMsg = null;

        files.forEach(file => {
            const type = file.type.startsWith('video/') ? 'video' : 'image';

            // Validate against rules
            const validation = validateMediaAddition(currentDraft, type);
            if (!validation.valid) {
                errorMsg = validation.error;
                return;
            }

            // Add to draft with Initial Crop State
            currentDraft.push({
                type,
                file: file,
                previewUrl: URL.createObjectURL(file),
                provider: 'local',
                // Editor Data (Image Only)
                crop: { x: 0, y: 0 },
                zoom: 1,
                rotation: 0,
                aspect: 4 / 5,
                croppedAreaPixels: null,
                isEdited: false
            });
        });

        if (errorMsg) toast.error(errorMsg);
        setMedia(currentDraft);
        e.target.value = ''; // Reset input
    };

    // Handle Giphy Selection
    const handleGiphySelect = (gif) => {
        const validation = validateMediaAddition(media, 'gif');
        if (!validation.valid) {
            toast.error(validation.error);
            return;
        }

        setMedia(prev => [...prev, {
            type: 'gif',
            url: gif.url,
            previewUrl: gif.previewUrl,
            provider: 'giphy',
            publicId: gif.id
        }]);
        setShowGiphyPicker(false);
    };

    const removeMedia = (index) => {
        setMedia(prev => prev.filter((_, i) => i !== index));
        if (editingIndex === index) setEditingIndex(null);
    };

    // ENTER EDIT MODE
    const handleEditClick = (index) => {
        if (media[index].provider !== 'local') return; // Allow both image and video
        setEditingIndex(index);
    };

    // SAVE EDIT
    const handleEditorSave = (editorState) => {
        // Update the media item with new edit state
        setMedia(prev => {
            const next = [...prev];
            next[editingIndex] = {
                ...next[editingIndex],
                ...editorState,
                isEdited: true
            };
            return next;
        });
        setEditingIndex(null); // Exit mode
    };

    const handleEmojiClick = (emojiData) => {
        setCaption(prev => prev + emojiData.emoji);
        // setShowEmojiPicker(false); // Kept open for multiple selection
    };

    // ATOMIC PUBLISH LOGIC (Updated with Canvas Export)
    const handlePublish = async () => {
        // 1. Final Validation
        if (!caption.trim() && media.length === 0) {
            toast.error('Post must have content or media.');
            return;
        }
        const payloadValidation = validatePostPayload(media);
        if (!payloadValidation.valid) {
            toast.error(payloadValidation.error);
            return;
        }

        setIsPublishing(true);
        const uploadedAssets = []; // Track publicIds for cleanup

        try {
            // 2. Upload Phase
            const finalMediaPayload = [];

            for (const item of media) {
                if (item.provider === 'local') {
                    let fileToUpload = item.file;

                    // CHECK IF EDITED -> EXPORT CANVAS BLOB
                    if (item.type === 'image' && item.isEdited && item.croppedAreaPixels) {
                        try {
                            const { blob } = await getCroppedImg(
                                item.previewUrl,
                                item.croppedAreaPixels,
                                item.rotation
                            );
                            fileToUpload = blob; // SWAP original file for cropped blob
                        } catch (cropErr) {
                            console.error("Crop failed, falling back to original", cropErr);
                            // Fallback to original
                        }
                    }

                    // Upload to Cloudinary
                    try {
                        const uploaded = await cloudinaryService.uploadMedia(fileToUpload);
                        uploadedAssets.push(uploaded.publicId); // TRACK IT
                        finalMediaPayload.push({
                            type: uploaded.type,
                            url: uploaded.url,
                            publicId: uploaded.publicId,
                            // Persist Edit Metadata
                            metadata: item.isEdited ? {
                                zoom: item.zoom,
                                rotation: item.rotation,
                                aspect: item.aspect,
                                crop: item.crop,
                                percentCrop: item.percentCrop
                            } : null
                        });
                    } catch (uploadError) {
                        throw new Error(`Failed to upload ${item.type}: ${uploadError.message}`);
                    }
                } else if (item.provider === 'giphy') {
                    // Pass through
                    finalMediaPayload.push({
                        type: 'gif',
                        url: item.url,
                        provider: 'giphy'
                    });
                }
            }

            // 3. Create Post Phase
            await postsService.createPost({
                content: caption,
                media: finalMediaPayload,
                visibility: 'public'
            });

            // 4. Success
            toast.success('Post published!');
            navigate('/feed');

        } catch (error) {
            console.error('Publish failed:', error);
            toast.error(error.message || 'Failed to publish post.');

            // 5. ATOMIC CLEANUP
            if (uploadedAssets.length > 0) {
                toast.info('Cleaning up uploads...');
                await Promise.allSettled(uploadedAssets.map(id => cloudinaryService.deleteMedia(id)));
            }
        } finally {
            setIsPublishing(false);
        }
    };

    return (
        <div className="create-post-container">
            {/* Header */}
            <div className="create-header">
                {editingIndex !== null ? (
                    // Edit Mode Header
                    <>
                        <button onClick={() => setEditingIndex(null)} className="icon-btn">
                            <ChevronLeft /> Back
                        </button>
                        <h2>Edit Photo</h2>
                        <div style={{ width: 48 }}></div> {/* Spacer */}
                    </>
                ) : (
                    // Normal Mode Header
                    <>
                        <button onClick={() => navigate('/feed')} className="icon-btn">
                            <ChevronLeft />
                        </button>
                        <h2>New Post</h2>
                        <button
                            className="publish-btn mobile-only-share"
                            onClick={handlePublish}
                            disabled={isPublishing || (!caption.trim() && media.length === 0)}
                        >
                            {isPublishing ? '...' : 'Share'}
                        </button>
                        <div className="desktop-header-spacer"></div>
                    </>
                )}
            </div>

            <div className="create-body">
                {/* Media Preview / Editor Area */}
                <div className="media-preview-section">
                    {/* CONDITIONAL RENDER: Editor vs Grid */}
                    {editingIndex !== null ? (
                        <ImageEditor
                            imageSrc={media[editingIndex].type === 'image' ? media[editingIndex].previewUrl : undefined}
                            videoSrc={media[editingIndex].type === 'video' ? media[editingIndex].previewUrl : undefined}
                            initialCrop={media[editingIndex].crop}
                            initialZoom={media[editingIndex].zoom}
                            initialRotate={media[editingIndex].rotation}
                            initialAspect={media[editingIndex].aspect}
                            onCancel={() => setEditingIndex(null)}
                            onSave={handleEditorSave}
                        />
                    ) : (
                        // View Mode
                        media.length === 0 ? (
                            <div className="empty-state">
                                <Image size={64} className="empty-icon-placeholder" />
                                <h3>Drag photos and videos here</h3>
                                <button className="primary-select-btn" onClick={() => fileInputRef.current.click()}>
                                    Select from computer
                                </button>
                            </div>
                        ) : (
                            <div className="preview-grid">
                                {media.map((item, idx) => (
                                    <div key={idx} className="preview-item group">
                                        <button className="remove-btn" onClick={() => removeMedia(idx)}>
                                            <X size={16} />
                                        </button>

                                        {/* Edit / Ratio Overlays (Desktop Hover) */}
                                        {item.provider === 'local' && (
                                            <div className="media-overlays">
                                                <button className="overlay-btn" onClick={() => handleEditClick(idx)} title="Edit">
                                                    Edit
                                                </button>
                                            </div>
                                        )}

                                        {item.type === 'video' ? (
                                            <VideoPreview
                                                src={item.previewUrl}
                                                crop={item.crop}
                                                zoom={item.zoom}
                                                rotation={item.rotation}
                                            />
                                        ) : (
                                            <img
                                                src={item.previewUrl}
                                                alt="preview"
                                            // Apply basic CSS transform preview for un-cropped but rotated images if needed, 
                                            // but since we rely on Editor for WYSIWYG, raw preview is fine until 'Edit' is saved.
                                            // Ideally, we could generate a temp thumbnail blob on save for the preview list 
                                            // but relying on the editor state is enough for MVP.
                                            />
                                        )}
                                        {item.provider === 'giphy' && <span className="badge-gif">GIF</span>}
                                        {item.isEdited && <span className="badge-edited">Edited</span>}
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                </div>

                {/* Content Area - Hidden when editing on Mobile logic? 
                    Actually, in split view (Desktop), we keep it visible. 
                    On mobile, we might want to hide it if we are in 'Edit Mode' purely for space, 
                    but the layout handles stacking. 
                    Let's Disable interaction if editing.
                */}
                <div className={`content-section ${editingIndex !== null ? 'disabled-content' : ''}`}>
                    <div className="content-scroll-area">
                        {/* User Profile Header */}
                        <div className="user-mini-header">
                            <div className="user-avatar-small">
                                <img
                                    src={JSON.parse(localStorage.getItem('user'))?.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"}
                                    alt="user"
                                />
                            </div>
                            <span className="user-username">
                                {JSON.parse(localStorage.getItem('user'))?.username || 'user'}
                            </span>
                        </div>

                        <textarea
                            className="caption-input"
                            placeholder={editingIndex !== null ? "Finish editing to write caption..." : "Write a caption..."}
                            value={caption}
                            onChange={e => setCaption(e.target.value)}
                            disabled={isPublishing || editingIndex !== null}
                            maxLength={2200}
                        />

                        <div className="caption-tools">
                            <button className="emoji-trigger-btn" onClick={() => setShowEmojiPicker(!showEmojiPicker)} disabled={editingIndex !== null}>
                                <Smile size={20} />
                            </button>
                            <span className={`char-count ${caption.length > 2100 ? 'near-limit' : ''}`}>
                                {caption.length}/2,200
                            </span>
                        </div>

                        {/* Metadata Tools List */}
                        <div className={`metadata-tools ${editingIndex !== null ? 'opacity-50' : ''}`}>
                            <div className="tool-item" onClick={() => !editingIndex && fileInputRef.current.click()}>
                                <span>Add Photos/Videos</span>
                                <ChevronRight size={16} className="chevron" />
                            </div>
                            <div className="tool-item">
                                <span>Tag People</span>
                                <User size={16} className="tool-icon" />
                            </div>
                        </div>


                        <input
                            type="file"
                            ref={fileInputRef}
                            hidden
                            multiple
                            accept="image/*,video/*"
                            onChange={handleFileSelect}
                        />
                    </div>

                    {/* Bottom Action Section */}
                    <div className="bottom-action-area">
                        <button
                            className="share-btn-large"
                            onClick={handlePublish}
                            disabled={isPublishing || editingIndex !== null || (!caption.trim() && media.length === 0)}
                        >
                            {isPublishing ? 'Sharing...' : 'Share Post'}
                        </button>
                    </div>

                    {showEmojiPicker && (
                        <div className="emoji-picker-popover">
                            <EmojiPicker
                                onEmojiClick={handleEmojiClick}
                                theme="dark"
                                width="100%"
                                height={300}
                                previewConfig={{ showPreview: false }}
                            />
                        </div>
                    )}
                </div>
            </div>

            {showGiphyPicker && (
                <GiphyPicker
                    onSelect={handleGiphySelect}
                    onClose={() => setShowGiphyPicker(false)}
                />
            )}
        </div>
    );
};

export default CreatePost;
