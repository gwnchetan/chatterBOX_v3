import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import ConversationList from '../components/chat/ConversationList';
import ChatWindow from '../components/chat/ChatWindow';
import Navbar from '../components/layout/Navbar';
import MobileNavbar from '../components/layout/MobileNavbar';
import '../components/chat/Chat.css';

const Chat = () => {
    const [selectedConvo, setSelectedConvo] = useState(null);
    const [user, setUser] = useState(null);
    const [searchParams] = useSearchParams();
    const autoSelectId = searchParams.get('conversationId');

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem('user'));
        setUser(storedUser);
    }, []);

    if (!user) return <div style={{ padding: 20 }}>Please login to chat</div>;

    // Mobile View helper logic
    const wrapperClass = `chat-page ${selectedConvo ? 'mobile-view-chat' : 'mobile-view-list'}`;

    return (
        <div className="chat-layout">
            <Navbar />
            <main className="chat-center">
                <div className={wrapperClass}>
                    <ConversationList
                        onSelectConversation={setSelectedConvo}
                        selectedId={selectedConvo?._id}
                        user={user}
                        autoSelectId={autoSelectId}
                    />

                    {selectedConvo ? (
                        <ChatWindow
                            conversation={selectedConvo}
                            user={user}
                            onBack={() => setSelectedConvo(null)}
                        />
                    ) : (
                        <div className="no-chat-selected">
                            <div className="no-chat-icon">💬</div>
                            <h2>Select a conversation</h2>
                            <p>Choose a user from the left to start chatting.</p>
                        </div>
                    )}
                </div>
            </main>
            <MobileNavbar />
        </div>
    );
};

export default Chat;
