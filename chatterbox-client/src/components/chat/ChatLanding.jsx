const ChatLanding = () => {
    return (
        <div className="chat-window-empty">
            <div className="empty-state-content">
                <div className="empty-icon-wrapper">
                    <div className="brand-logo-large">
                        <span>C</span>
                    </div>
                </div>
                <h2 className="empty-title">Your Messages</h2>
                <p className="empty-subtitle">Send private photos and messages to a friend or group.</p>
                <button className="btn-start-new" onClick={() => {
                    document.querySelector('.conversation-search input')?.focus();
                }}>
                    Send Message
                </button>
            </div>
        </div>
    );
};

export default ChatLanding;
