import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Yggdrasil   from './pages/Yggdrasil/Yggdrasil'
import Alfheim     from './pages/Alfheim/Alfheim'
import Valhalla    from './pages/Valhalla/Valhalla'
import Midgard     from './pages/Midgard/Midgard'
import ProfilePage from './pages/Profile/ProfilePage'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/"          element={<Yggdrasil />} />
          <Route path="/alfheim/*" element={<Alfheim />} />
          <Route path="/valhalla/*" element={<Valhalla />} />
          <Route path="/midgard/*" element={<Midgard />} />
          <Route path="/profile"   element={<ProfilePage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App