import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Profile from './pages/Profile'
import Restaurants from './pages/Restaurants'
import AddRestaurant from './pages/AddRestaurant'
import RestaurantDetail from './pages/RestaurantDetail'
import { ProtectedRoute } from './components/ProtectedRoute'
import { PopcornRain } from './components/PopcornRain'

function App() {
  return (
    <>
      <PopcornRain />
      <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route path="/restaurants" element={<Restaurants />} />
      <Route
        path="/restaurants/new"
        element={
          <ProtectedRoute>
            <AddRestaurant />
          </ProtectedRoute>
        }
      />
      <Route path="/restaurants/:id" element={<RestaurantDetail />} />
      </Routes>
    </>
  )
}

export default App
