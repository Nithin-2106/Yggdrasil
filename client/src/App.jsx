import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Yggdrasil   from './pages/Yggdrasil/Yggdrasil'
import AiAssistant  from './components/AiAssistant/AiAssistant'

// Code-split every realm + Profile — only the visited page's bundle
// loads. Initial bundle stays down to Yggdrasil (the hub) + shared chrome.
const Alfheim     = lazy(() => import('./pages/Alfheim/Alfheim'))
const Valhalla    = lazy(() => import('./pages/Valhalla/Valhalla'))
const Midgard     = lazy(() => import('./pages/Midgard/Midgard'))
const ProfilePage = lazy(() => import('./pages/Profile/ProfilePage'))
const AnalyticsPage = lazy(() => import('./pages/Analytics/AnalyticsPage'))

function RouteLoading() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#080D1A',
      color: '#8899B4',
    }}>
      <div style={{
        fontFamily: '"Cinzel", serif',
        fontSize: '12px',
        letterSpacing: '0.35em',
        textTransform: 'uppercase',
      }}>
        ᛟ Crossing the Bifrost…
      </div>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<RouteLoading />}>
          <Routes>
            <Route path="/"           element={<Yggdrasil />} />
            <Route path="/alfheim/*"  element={<Alfheim />} />
            <Route path="/valhalla/*" element={<Valhalla />} />
            <Route path="/midgard/*"  element={<Midgard />} />
            <Route path="/profile"    element={<ProfilePage />} />
            <Route path="/analytics"  element={<AnalyticsPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
      <AiAssistant />
    </AuthProvider>
  )
}

export default App