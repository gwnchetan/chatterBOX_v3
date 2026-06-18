import React, { useState, useRef } from 'react';
import { useToast } from '../Toast';
import userService from '../../services/user.service';
import { cloudinaryService } from '../../services/cloudinary.service';
import { Camera, X } from '../common/Icons';
import { updateStoredUser } from '../../utils/authStorage';
import './EditProfileModal.css';

const EditProfileModal = ({ profile, isOpen, onClose, onUpdate }) => {
    const [formData, setFormData] = useState({
        fullname: profile.fullname || '',
        bio: profile.bio || '',
        location: profile.location || '',
        website: profile.website || ''
    });

    const [avatar, setAvatar] = useState(profile.avatar);
    const [banner, setBanner] = useState(profile.bannerImage);
    const [uploading, setUploading] = useState(false);
    const toast = useToast();

    const avatarInputRef = useRef();
    const bannerInputRef = useRef();

    if (!isOpen) return null;

    const handleTextChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleImageUpload = async (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        // Simple validation
        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image must be smaller than 5MB");
            return;
        }

        try {
            setUploading(true);
            const { url } = await cloudinaryService.uploadMedia(file);

            if (type === 'avatar') setAvatar(url);
            else setBanner(url);

            toast.success("Image uploaded!");
        } catch (err) {
            console.error("Upload error:", err);
            toast.error(err.message || "Failed to upload image");
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setUploading(true);
            const payload = {
                ...formData,
                avatar,
                bannerImage: banner
            };
            const res = await userService.updateProfile(payload);

            updateStoredUser(res.user);

            onUpdate(res.user);
            toast.success("Profile updated!");
            onClose();
        } catch (err) {
            console.error("Update error:", err);
            toast.error("Failed to update profile");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="edit-modal">
                <div className="modal-header">
                    <button className="close-btn" onClick={onClose}><X size={20} /></button>
                    <h2>Edit Profile</h2>
                    <button
                        className="save-btn"
                        onClick={handleSubmit}
                        disabled={uploading}
                    >
                        {uploading ? 'Saving...' : 'Save'}
                    </button>
                </div>

                <div className="modal-scrollable">
                    {/* Banner Upload */}
                    <div className="banner-edit" onClick={() => bannerInputRef.current.click()}>
                        {banner ? <img src={banner} alt="banner" /> : <div className="banner-placeholder" />}
                        <div className="camera-overlay"><Camera size={24} /></div>
                        <input
                            type="file"
                            hidden
                            ref={bannerInputRef}
                            onChange={(e) => handleImageUpload(e, 'banner')}
                            accept="image/*"
                        />
                    </div>

                    {/* Avatar Upload */}
                    <div className="avatar-edit-container">
                        <div className="avatar-edit" onClick={() => avatarInputRef.current.click()}>
                            <img
                                src={avatar || '/default-avatar.png'}
                                alt="avatar"
                                onError={(e) => { e.target.src = '/default-avatar.png'; }}
                            />
                            <div className="camera-overlay"><Camera size={20} /></div>
                            <input
                                type="file"
                                hidden
                                ref={avatarInputRef}
                                onChange={(e) => handleImageUpload(e, 'avatar')}
                                accept="image/*"
                            />
                        </div>
                    </div>

                    <form className="edit-form">
                        <div className="input-group">
                            <label>Name</label>
                            <input
                                type="text"
                                name="fullname"
                                value={formData.fullname}
                                onChange={handleTextChange}
                                placeholder="Display Name"
                            />
                        </div>

                        <div className="input-group">
                            <label>Bio</label>
                            <textarea
                                name="bio"
                                value={formData.bio}
                                onChange={handleTextChange}
                                placeholder="Tell us about yourself"
                                rows="3"
                            />
                        </div>

                        <div className="input-group">
                            <label>Location</label>
                            <input
                                type="text"
                                name="location"
                                value={formData.location}
                                onChange={handleTextChange}
                                placeholder="Where are you?"
                            />
                        </div>

                        <div className="input-group">
                            <label>Website</label>
                            <input
                                type="text"
                                name="website"
                                value={formData.website}
                                onChange={handleTextChange}
                                placeholder="Your URL"
                            />
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default EditProfileModal;
