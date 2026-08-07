import { Routes, Route, Outlet } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Profile from './pages/Profile'
import Restaurants from './pages/Restaurants'
import AddRestaurant from './pages/AddRestaurant'
import RestaurantDetail from './pages/RestaurantDetail'
import AdminReports from './pages/AdminReports'
import { ProtectedRoute } from './components/ProtectedRoute'
import { PopcornRain } from './components/PopcornRain'
import { Navbar } from './components/Navbar'

/** Shell shared by every page except the focused login screen. */
function SiteLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}

function App() {
  return (
    <>
      <PopcornRain />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<SiteLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/restaurants" element={<Restaurants />} />
          <Route path="/restaurants/:id" element={<RestaurantDetail />} />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurants/new"
            element={
              <ProtectedRoute>
                <AddRestaurant />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <ProtectedRoute>
                <AdminReports />
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
    </>
  )
}

export default App
