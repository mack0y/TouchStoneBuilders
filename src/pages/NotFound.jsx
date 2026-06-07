import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4" role="alert">
      <div className="text-center animate-fade-in-up">
        <h1 className="text-8xl font-bold text-slate-200 select-none mb-4">404</h1>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Page not found</h2>
        <p className="text-slate-400 text-sm mb-8 max-w-sm mx-auto">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/" className="btn bg-[#1e3a5f] hover:bg-[#0f2440] text-white border-none">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
