import React, { useRef, useEffect } from 'react';
import Avatar from '../common/Avatar';
import { Check, X } from '../common/Icons';

const RightSidebar = () => {
    const scrollContainerRef = useRef(null);

    const stories = [
        { id: 1, user: "Anatoly Pr...", img: "https://images.unsplash.com/photo-1542202229-7d93c33f5d07?auto=format&fit=crop&q=80&w=300", avatar: "https://i.pravatar.cc/150?u=a" },
        { id: 2, user: "Lolita Earns", img: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&q=80&w=300", avatar: "https://i.pravatar.cc/150?u=b" },
        { id: 3, user: "Mike T.", img: "https://images.unsplash.com/photo-1549419163-71887e1f4095?auto=format&fit=crop&q=80&w=300", avatar: "https://i.pravatar.cc/150?u=c" },
        { id: 4, user: "Sarah J.", img: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&q=80&w=300", avatar: "https://i.pravatar.cc/150?u=d" },
    ];

    const requests = [
        { id: 1, name: "Tyrell Barrows", text: "wants to add you to friends", avatar: "https://i.pravatar.cc/150?u=8" },
        { id: 2, name: "Selena Gomez", text: "wants to add you to friends", avatar: "https://i.pravatar.cc/150?u=9" },
        { id: 3, name: "John Doe", text: "wants to add you to friends", avatar: "https://i.pravatar.cc/150?u=10" },
        { id: 4, name: "Jane Smith", text: "wants to add you to friends", avatar: "https://i.pravatar.cc/150?u=11" },
        { id: 5, name: "Mike Johnson", text: "wants to add you to friends", avatar: "https://i.pravatar.cc/150?u=12" },
    ];

    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const handleWheel = (e) => {
            if (e.deltaY !== 0) {
                e.preventDefault();
                container.scrollLeft += e.deltaY;
            }
        };

        container.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            container.removeEventListener('wheel', handleWheel);
        };
    }, []);

    return (
        <aside className="sidebar-right">
            {/* Partition 1: Stories */}
            <div className="rs-partition partition-stories">
                <h3 className="partition-title">Stories</h3>
                <div className="stories-scroll-container" ref={scrollContainerRef}>
                    {/* Add Story Card */}
                    <div className="story-card add-story-card">
                        <div className="story-bg-placeholder"></div>
                        <div className="add-story-btn">
                            <span>+</span>
                        </div>
                        <span className="story-username-overlay">Add Story</span>
                    </div>

                    {stories.map(story => (
                        <div key={story.id} className="story-card">
                            <img src={story.img} alt="" className="story-bg" />
                            {/* Avatar floating top */}
                            <div className="story-avatar-top">
                                <Avatar src={story.avatar} size="sm" />
                            </div>
                            {/* Name floating bottom */}
                            <span className="story-username-overlay">{story.user}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Partition 2: Requests */}
            <div className="rs-partition partition-requests">
                <div className="partition-header">
                    <h3 className="right-title">REQUESTS</h3>
                    <span className="badge-count">{requests.length}</span>
                </div>

                <div className="requests-list">
                    {requests.map(req => (
                        <div key={req.id} className="request-card">
                            <div className="req-top">
                                <Avatar src={req.avatar} size="xs" />
                                <div className="req-text">
                                    <span className="req-name">{req.name}</span>
                                    <span className="req-desc">{req.text}</span>
                                </div>
                            </div>
                            <div className="req-actions">
                                <button className="btn-req-icon btn-accept" title="Accept">
                                    <Check size={18} />
                                </button>
                                <button className="btn-req-icon btn-decline" title="Decline">
                                    <X size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="rs-partition">
                <h3>Partition 3</h3>
            </div>
        </aside>
    );
};

export default RightSidebar;
