import React from 'react';
import Avatar from '../common/Avatar';
import { Image, MapPin, Smile } from '../common/Icons';

const CreatePostBox = () => {
    return (
        <div className="create-post-box">
            <div className="create-post-header">
                <Avatar size="md" status="online" />
                <textarea
                    className="create-post-input"
                    placeholder="What's on your mind?"
                ></textarea>
            </div>
            <div className="create-post-actions">
                <div className="action-btn-group">
                    <button className="action-btn"><Image /> Photo</button>
                    <button className="action-btn"><MapPin /> Location</button>
                    <button className="action-btn"><Smile /> Feeling</button>
                </div>
                <button className="submit-btn" onClick={() => alert('Post created! (Demo only)')}>Post</button>
            </div>
        </div>
    );
};

export default CreatePostBox;
