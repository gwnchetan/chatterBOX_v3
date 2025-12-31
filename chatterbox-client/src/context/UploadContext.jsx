import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { cloudinaryService } from '../services/cloudinary.service';
import { postsService } from '../services/posts.service';
import getCroppedImg from '../utils/cropUtils';
import { useToast } from '../components/Toast';

const UploadContext = createContext();

export const useUpload = () => useContext(UploadContext);

export const UploadProvider = ({ children }) => {
    // Queue of upload tasks. 
    // Structure: { id, progress, status: 'pending'|'uploading'|'success'|'error', caption, media, errorMsg }
    const [queue, setQueue] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const toast = useToast();

    // Generate a unique ID for each upload
    const generateId = () => Date.now().toString();

    const startUpload = (payload) => {
        const id = generateId();
        const newUpload = {
            id,
            progress: 0,
            status: 'pending',
            caption: payload.caption,
            media: payload.media, // Raw Draft Media
            thumbnail: payload.media.length > 0 ? payload.media[0].previewUrl : null,
            errorMsg: null
        };

        setQueue(prev => [...prev, newUpload]);
        return id;
    };

    /**
     * PROCESS QUEUE
     * We process one by one to avoid network congestion, or maybe parallel? 
     * For Smoothness: One by one is safer for reliability.
     */
    useEffect(() => {
        const processNext = async () => {
            if (isProcessing) return;

            const nextItem = queue.find(item => item.status === 'pending');
            if (!nextItem) return;

            setIsProcessing(true);
            updateStatus(nextItem.id, 'uploading', 0);

            try {
                // 1. Prepare Media (Heavy Lifting)
                const finalMediaPayload = [];
                const totalItems = nextItem.media.length;

                // We'll approximate progress: 
                // 80% for media uploads, 20% for final create post

                let completedItems = 0;

                for (const item of nextItem.media) {
                    // Calculate weight of this item (portion of the 80% allocation)
                    const itemWeight = 80 / totalItems;
                    const baseProgress = (completedItems / totalItems) * 80;

                    const handleProgress = (percent) => {
                        const fileContribution = (percent / 100) * itemWeight;
                        const currentTotal = baseProgress + fileContribution;
                        updateStatus(nextItem.id, 'uploading', currentTotal);
                    };

                    // Initial partial update
                    updateStatus(nextItem.id, 'uploading', baseProgress);

                    // A. Image Upload
                    if (item.type === 'image' && item.provider === 'local') {
                        let fileToUpload = item.file;
                        if (item.isEdited && item.croppedAreaPixels) {
                            const sourceUrl = item.originalUrl || item.previewUrl;
                            const { blob } = await getCroppedImg(sourceUrl, item.croppedAreaPixels, item.rotation);
                            fileToUpload = blob;
                        }
                        const uploaded = await cloudinaryService.uploadMedia(fileToUpload, handleProgress);
                        finalMediaPayload.push({
                            type: 'image',
                            url: uploaded.url,
                            publicId: uploaded.publicId,
                            metadata: item.isEdited ? { ...item } : null
                        });
                    }
                    // B. Video Upload
                    else if (item.type === 'video' && item.provider === 'local') {
                        const uploaded = await cloudinaryService.uploadMedia(item.file, handleProgress);
                        finalMediaPayload.push({
                            type: 'video',
                            url: uploaded.url,
                            publicId: uploaded.publicId,
                            metadata: item.videoMetadata,
                            width: uploaded.width,
                            height: uploaded.height
                        });
                    }
                    // C. GIF / Existing
                    else {
                        finalMediaPayload.push({ ...item });
                        // Instant progress for non-uploads
                        handleProgress(100);
                    }
                    completedItems++;
                }

                // 2. Create Post
                updateStatus(nextItem.id, 'uploading', 90);

                const newPost = await postsService.createPost({
                    content: nextItem.caption,
                    media: finalMediaPayload,
                    visibility: 'public'
                });

                // BROADCAST SUCCESS for Real-time Feed Update
                window.dispatchEvent(new CustomEvent('post-created', { detail: newPost }));

                updateStatus(nextItem.id, 'success', 100);
                toast.success("Post uploaded successfully!");

                // Remove from queue after short delay? 
                // Or keep it to show "Done"? 
                // Let's keep it for 3s then remove.
                setTimeout(() => {
                    removeUpload(nextItem.id);
                }, 4000);

            } catch (error) {
                console.error("Upload Failed", error);
                updateStatus(nextItem.id, 'error', 0, error.message || "Upload Failed");
                toast.error("Failed to upload post.");
            } finally {
                setIsProcessing(false);
            }
        };

        processNext();
    }, [queue, isProcessing]);


    // Helpers
    const updateStatus = (id, status, progress, errorMsg = null) => {
        setQueue(prev => prev.map(item =>
            item.id === id ? { ...item, status, progress, errorMsg } : item
        ));
    };

    const removeUpload = (id) => {
        setQueue(prev => prev.filter(item => item.id !== id));
    };

    const retryUpload = (id) => {
        setQueue(prev => prev.map(item =>
            item.id === id ? { ...item, status: 'pending', errorMsg: null, progress: 0 } : item
        ));
    };

    return (
        <UploadContext.Provider value={{ startUpload, queue, removeUpload, retryUpload }}>
            {children}
        </UploadContext.Provider>
    );
};
