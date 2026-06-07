import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { ToastProvider } from './hooks/useToast'
import ErrorBoundary from './components/ui/ErrorBoundary'
import AppLayout from './components/layout/AppLayout'
import LoadingScreen from './components/ui/LoadingScreen'

const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const NotFound = lazy(() => import('./pages/NotFound'))
const Products = lazy(() => import('./pages/Products'))
const Categories = lazy(() => import('./pages/Categories'))
const Customers = lazy(() => import('./pages/Customers'))
const Suppliers = lazy(() => import('./pages/Suppliers'))
const Sales = lazy(() => import('./pages/Sales'))
const SaleNew = lazy(() => import('./pages/SaleNew'))
const SaleDetail = lazy(() => import('./pages/SaleDetail'))
const Reports = lazy(() => import('./pages/Reports'))
const Inventory = lazy(() => import('./pages/Inventory'))
const Users = lazy(() => import('./pages/Users'))

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

function RedirectHandler() {
  const navigate = useNavigate()
  useEffect(() => {
    const redirect = sessionStorage.getItem('redirect')
    if (redirect) {
      sessionStorage.removeItem('redirect')
      const path = redirect.replace('/TouchStoneBuilders', '') || '/'
      navigate(path, { replace: true })
    }
  }, [navigate])
  return null
}

function GuestRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (user) return <Navigate to="/" replace />
  return children
}

function PageSuspense({ children }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingScreen />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  )
}

export default function App() {
  return (
    <BrowserRouter basename="/TouchStoneBuilders">
      <RedirectHandler />
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<GuestRoute><PageSuspense><Login /></PageSuspense></GuestRoute>} />

            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route index element={<PageSuspense><Dashboard /></PageSuspense>} />
              <Route path="products" element={<PageSuspense><Products /></PageSuspense>} />
              <Route path="categories" element={<PageSuspense><Categories /></PageSuspense>} />
              <Route path="sales" element={<PageSuspense><Sales /></PageSuspense>} />
              <Route path="sales/new" element={<PageSuspense><SaleNew /></PageSuspense>} />
              <Route path="sales/:id" element={<PageSuspense><SaleDetail /></PageSuspense>} />

              <Route path="customers" element={<PageSuspense><Customers /></PageSuspense>} />
              <Route path="inventory" element={<PageSuspense><Inventory /></PageSuspense>} />

              <Route path="suppliers" element={<AdminRoute><PageSuspense><Suppliers /></PageSuspense></AdminRoute>} />
              <Route path="reports" element={<AdminRoute><PageSuspense><Reports /></PageSuspense></AdminRoute>} />
              <Route path="users" element={<AdminRoute><PageSuspense><Users /></PageSuspense></AdminRoute>} />
            </Route>

            <Route path="*" element={<PageSuspense><NotFound /></PageSuspense>} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
