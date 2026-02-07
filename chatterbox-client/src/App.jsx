import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/common/ProtectedRoute';
import { FeedProvider } from './context/FeedContext';
import './App.css';

// Lazy load pages for performance optimization
const Login = lazy(() => import('./pages/login'));
const Feed = lazy(() => import('./pages/feed'));
const CreatePost = lazy(() => import('./pages/create-post'));
const Profile = lazy(() => import('./pages/profile'));
const Explore = lazy(() => import('./pages/explore'));
const Favorites = lazy(() => import('./pages/favorites'));
const WIP = lazy(() => import('./pages/wip'));
const NotificationsPage = lazy(() => import('./pages/notifications'));
import Chat from './pages/Chat';

import { socketService } from './services/socket.service';

function App() {
  React.useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && localStorage.getItem('token')) {
      socketService.connect();
    }
  }, []);

  return (
    <div className="app-container">
      <FeedProvider>
        <Suspense fallback={
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            backgroundColor: 'var(--color-bg)',
            color: 'var(--color-text-main)',
            fontSize: '1.2rem',
            fontWeight: '500'
          }}>
            Loading...
          </div>
        }>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/feed" element={
              <ProtectedRoute>
                <Feed />
              </ProtectedRoute>
            } />
            <Route path="/create" element={
              <ProtectedRoute>
                <CreatePost />
              </ProtectedRoute>
            } />
            <Route path="/profile/:userId" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="/explore" element={
              <ProtectedRoute>
                <Explore />
              </ProtectedRoute>
            } />
            <Route path="/favorites" element={
              <ProtectedRoute>
                <Favorites />
              </ProtectedRoute>
            } />
            <Route path="/direct" element={
              <ProtectedRoute>
                <WIP title="Direct Messages" />
              </ProtectedRoute>
            } />
            <Route path="/stats" element={
              <ProtectedRoute>
                <WIP title="Statistics" />
              </ProtectedRoute>
            } />
            <Route path="/notifications" element={
              <ProtectedRoute>
                <NotificationsPage />
              </ProtectedRoute>
            } />
            <Route path="/chat" element={
              <ProtectedRoute>
                <Chat />
              </ProtectedRoute>
            } />
            <Route path="/chat/:conversationId" element={
              <ProtectedRoute>
                <Chat />
              </ProtectedRoute>
            } />
          </Routes>
        </Suspense>
      </FeedProvider>
    </div>
  )
}

export default App
