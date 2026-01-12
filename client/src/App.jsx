import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import RestaurantList from './pages/RestaurantList';
import RestaurantDetail from './pages/RestaurantDetail';
import Cart from './pages/Cart';
import Orders from './pages/Orders';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import VendorDashboard from './pages/VendorDashboard';
import DeliveryDashboard from './pages/DeliveryDashboard';
import PrivateRoute from './components/PrivateRoute';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <div className="app">
            <Navbar />
            <main>
              <Routes>
                <Route path="/login" element={<Login />} />

                {/* Protected Routes */}
                <Route path="/" element={
                  <PrivateRoute>
                    <Home />
                  </PrivateRoute>
                } />
                <Route path="/restaurants" element={
                  <PrivateRoute>
                    <RestaurantList />
                  </PrivateRoute>
                } />
                <Route path="/restaurant/:id" element={
                  <PrivateRoute>
                    <RestaurantDetail />
                  </PrivateRoute>
                } />
                <Route path="/cart" element={
                  <PrivateRoute>
                    <Cart />
                  </PrivateRoute>
                } />
                <Route path="/orders" element={
                  <PrivateRoute>
                    <Orders />
                  </PrivateRoute>
                } />
                <Route path="/profile" element={
                  <PrivateRoute>
                    <Profile />
                  </PrivateRoute>
                } />
                <Route path="/admin" element={
                  <PrivateRoute>
                    <AdminDashboard />
                  </PrivateRoute>
                } />
                <Route path="/vendor-dashboard" element={
                  <PrivateRoute>
                    <VendorDashboard />
                  </PrivateRoute>
                } />
                <Route path="/delivery-dashboard" element={
                  <PrivateRoute>
                    <DeliveryDashboard />
                  </PrivateRoute>
                } />
              </Routes>
            </main>
          </div>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
