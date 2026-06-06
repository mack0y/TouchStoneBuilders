import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20" role="alert">
      <h1 className="text-7xl font-bold text-base-content/10">404</h1>
      <p className="text-base-content/50 mt-4 text-lg">Page not found</p>
      <p className="text-base-content/40 text-sm mt-1">The page you are looking for does not exist.</p>
      <Link to="/" className="btn btn-primary mt-8">Back to Dashboard</Link>
    </div>
  )
}
