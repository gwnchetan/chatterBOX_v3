
import { Routes, Route } from 'react-router-dom'
import Login from './pages/login'
import './App.css'

function App() {
  return (
    <div className="app-container">
      <Routes>
        <Route path="/" element={<Login />} />
      </Routes>
    </div>
  )
}

export default App
