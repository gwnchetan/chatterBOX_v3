import React, { useState, useRef } from 'react';
import Avatar from '../common/Avatar';
import { Folder, Image, Smile } from '../common/Icons';
import { postsService } from '../../services/posts.service';
import { cloudinaryService } from '../../services/cloudinary.service';
import { useToast } from '../Toast';

const CreatePostDock = ({ onPostCreated }) => {
    const user = JSON.parse(localStorage.getItem('user')) || { fullname: 'User', username: 'user' };
    const [content, setContent] = useState('');
    const [mediaFiles, setMediaFiles] = useState([]); // Array of { file, previewUrl }
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);
    const toast = useToast();

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        if (files.length + mediaFiles.length > 4) {
            toast.error('Maximum 4 files allowed.');
            return;
        }

        const newFiles = files.map(file => ({
            file,
            previewUrl: URL.createObjectURL(file)
        }));

        setMediaFiles([...mediaFiles, ...newFiles]);
    };

    const handleRemoveMedia = (index) => {
        const newFiles = [...mediaFiles];
        URL.revokeObjectURL(newFiles[index].previewUrl);
        newFiles.splice(index, 1);
        setMediaFiles(newFiles);
    };

    const handlePost = async () => {
        if (!content.trim() && mediaFiles.length === 0) return;

        try {
            setIsUploading(true);
            const uploadedMedia = [];

            // 1. Upload Media Step
            if (mediaFiles.length > 0) {
                // Upload all files concurrently
                const uploadPromises = mediaFiles.map(item => cloudinaryService.uploadMedia(item.file));
                const results = await Promise.all(uploadPromises);
                uploadedMedia.push(...results);
            }

            // 2. Create Post Step
            const postData = {
                content,
                media: uploadedMedia,
                visibility: 'public' // Default for now
            };

            const newPost = await postsService.createPost(postData);

            // 3. Cleanup & Notify
            setContent('');
            setMediaFiles([]);
            if (onPostCreated) onPostCreated(newPost);

        } catch (error) {
            console.error('Failed to create post:', error);
            alert('Failed to post. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="create-post-wrapper">
            <div className="create-post-dock">
                <div className="dock-top">
                    <Avatar size="sm" alt={user.fullname} />
                    <input
                        type="text"
                        className="dock-input"
                        placeholder="Share something..."
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        disabled={isUploading}
                    />
                </div>

                {/* Media Previews */}
                {mediaFiles.length > 0 && (
                    <div className="dock-previews" style={{ display: 'flex', gap: '8px', padding: '0 16px', overflowX: 'auto' }}>
                        {mediaFiles.map((item, index) => (
                            <div key={index} style={{ position: 'relative' }}>
                                <img
                                    src={item.previewUrl}
                                    alt="preview"
                                    style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px' }}
                                />
                                <button
                                    onClick={() => handleRemoveMedia(index)}
                                    style={{
                                        position: 'absolute', top: -5, right: -5,
                                        background: 'rgba(0,0,0,0.5)', color: '#fff',
                                        border: 'none', borderRadius: '50%', width: '18px', height: '18px',
                                        cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}
                                >
                                    &times;
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="dock-bottom">
                    <div className="dock-actions">
                        <button className="dock-action-item" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                            <Image size={18} /> Image
                        </button>
                        {/* Hidden File Input */}
                        <input
                            type="file"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            multiple
                            accept="image/*,video/*"
                            onChange={handleFileSelect}
                        />

                        <button className="dock-action-item" disabled={isUploading}><Folder size={18} /> File</button>
                        <button className="dock-action-item" disabled={isUploading}><Smile size={18} /> Emoji</button>
                    </div>
                    <button
                        className="dock-send-btn"
                        onClick={handlePost}
                        disabled={isUploading || (!content.trim() && mediaFiles.length === 0)}
                    >
                        {isUploading ? 'Sending...' : 'Send'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreatePostDock;
