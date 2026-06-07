import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4" role="alert">
      <div className="text-center animate-fade-in-up">
        <div className="relative inline-block mb-6">
          <h1 className="text-8xl font-bold bg-gradient-to-br from-primary/20 to-secondary/20 bg-clip-text text-transparent select-none">404</h1>
        </div>
        <h2 className="text-xl font-bold mb-2">Page not found</h2>
        <p className="text-base-content/40 text-sm mb-8 max-w-sm mx-auto">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/" className="btn btn-primary shadow-md hover:shadow-lg transition-shadow">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
