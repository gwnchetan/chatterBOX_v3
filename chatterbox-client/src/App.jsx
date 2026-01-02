
import { Routes, Route } from 'react-router-dom'
import Login from './pages/login'
import Feed from './pages/feed'
import CreatePost from './pages/create-post'
import Profile from './pages/profile'
import Explore from './pages/explore'
import Favorites from './pages/favorites'
import WIP from './pages/wip'
import './App.css'
import ProtectedRoute from './components/common/ProtectedRoute';



function App() {
  return (
    <div className="app-container">
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
      </Routes>
    </div>
  )
}

export default App
