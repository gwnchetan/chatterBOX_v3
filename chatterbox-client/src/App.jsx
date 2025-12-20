
import { Routes, Route } from 'react-router-dom'
import Login from './pages/login'
import Feed from './pages/feed'
import './App.css'

function App() {
  return (
    <div className="app-container">
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/feed" element={<Feed />} />
      </Routes>
    </div>
  )
}

export default App
