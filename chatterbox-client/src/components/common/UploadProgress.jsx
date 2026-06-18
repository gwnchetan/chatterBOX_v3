import React from 'react';
import { useUpload } from '../../hooks/useUpload';
import { RefreshCw, X, Check, AlertCircle } from './Icons';
import './UploadProgress.css';

const UploadProgress = () => {
    const { queue, removeUpload, retryUpload } = useUpload();

    // Show the "most important" active item
    // Priority: Error > Uploading > Pending > Success
    const activeItem = queue.find(i => i.status === 'error')
        || queue.find(i => i.status === 'uploading')
        || queue.find(i => i.status === 'pending')
        || queue.find(i => i.status === 'success');

    if (!activeItem) return null;

    const { id, status, progress, thumbnail, errorMsg } = activeItem;

    const isError = status === 'error';
    const isSuccess = status === 'success';

    return (
        <div className={`upload-status-bar ${isError ? 'error' : ''} ${isSuccess ? 'success' : ''}`}>
            {/* Thumbnail */}
            <div className="status-thumb">
                {thumbnail ? (
                    <img src={thumbnail} alt="uploading" />
                ) : (
                    <div className="thumb-placeholder" />
                )}
                {/* Status Badge */}
                <div className="status-icon-badge">
                    {isError && <AlertCircle size={12} color="white" />}
                    {isSuccess && <Check size={12} color="white" />}
                    {status === 'uploading' && <div className="spinner-tiny" />}
                </div>
            </div>

            {/* Content */}
            <div className="status-content">
                <div className="status-text-row">
                    <span className="status-title">
                        {isError ? "Upload Failed" : isSuccess ? "Posted!" : "Posting..."}
                    </span>
                    <span className="status-pct">
                        {status === 'pending' ? 'Wait...' : isSuccess ? '' : isError ? '' : `${Math.round(progress)}%`}
                    </span>
                </div>

                {/* Progress Bar */}
                {!isError && !isSuccess && (
                    <div className="status-progress-track">
                        <div
                            className="status-progress-fill"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                )}

                {/* Error Message */}
                {isError && <span className="status-error-msg">{errorMsg || "Tap to retry"}</span>}
            </div>

            {/* Actions */}
            <div className="status-actions">
                {isError ? (
                    <button className="action-retry" onClick={() => retryUpload(id)}>
                        <RefreshCw size={16} />
                    </button>
                ) : null}

                <button className="action-close" onClick={() => removeUpload(id)}>
                    <X size={16} />
                </button>
            </div>
        </div>
    );
};

export default UploadProgress;
