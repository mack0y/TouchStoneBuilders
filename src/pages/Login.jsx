import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm mx-4 animate-fade-in-up">
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
          <div className="p-8">
            {/* Brand header */}
            <div className="flex flex-col items-center mb-8">
              <div className="w-16 h-16 rounded-lg mb-4 overflow-hidden">
                <img src={`${import.meta.env.BASE_URL}logo.jpg`} alt="TSB" className="w-full h-full object-cover" />
              </div>
              <h1 className="text-xl font-bold text-slate-800">
                TouchStone Builders
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Sign in to your account
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4 animate-scale-in" role="alert">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <label className="form-control w-full">
                <span className="label-text text-sm font-medium text-slate-700">Email</span>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className="input input-bordered w-full mt-1"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </label>

              <label className="form-control w-full">
                <span className="label-text text-sm font-medium text-slate-700">Password</span>
                <input
                  type="password"
                  id="password"
                  name="password"
                  className="input input-bordered w-full mt-1"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </label>

              <button
                type="submit"
                className="btn bg-[#1e3a5f] hover:bg-[#0f2440] text-white border-none w-full mt-2"
                disabled={submitting}
              >
                {submitting ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : 'Sign In'}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Inventory Management System
        </p>
      </div>
    </div>
  )
}
