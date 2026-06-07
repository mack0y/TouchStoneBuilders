import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import AppLayout from './components/layout/AppLayout'
import LoadingScreen from './components/ui/LoadingScreen'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import NotFound from './pages/NotFound'
import PlaceholderPage from './pages/PlaceholderPage'
import Products from './pages/Products'
import Categories from './pages/Categories'
import Customers from './pages/Customers'
import Suppliers from './pages/Suppliers'
import Sales from './pages/Sales'
import SaleNew from './pages/SaleNew'
import SaleDetail from './pages/SaleDetail'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  return children
}

function AdminRoute({ children }) {
  const { user, isAdmin, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/" replace />
  return children
}

function GuestRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (user) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />

          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="products" element={<Products />} />
            <Route path="categories" element={<Categories />} />
            <Route path="sales" element={<Sales />} />
            <Route path="sales/new" element={<SaleNew />} />
            <Route path="sales/:id" element={<SaleDetail />} />
            <Route path="purchases" element={<PlaceholderPage title="Purchases" description="Record incoming stock and purchases" />} />
            <Route path="customers" element={<Customers />} />

            <Route path="suppliers" element={<AdminRoute><Suppliers /></AdminRoute>} />
            <Route path="reports" element={<AdminRoute><PlaceholderPage title="Reports" description="Sales, inventory, and profit reports" /></AdminRoute>} />
            <Route path="users" element={<AdminRoute><PlaceholderPage title="Users" description="Manage staff accounts and permissions" /></AdminRoute>} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
