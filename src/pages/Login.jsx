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
    <div className="min-h-screen flex items-center justify-center bg-base-200">
      <div className="card w-full max-w-sm bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-2xl justify-center mb-2">
            TouchStone Builders
          </h2>
          <p className="text-center text-base-content/60 text-sm mb-4">
            Sign in to your account
          </p>

          {error && (
            <div className="alert alert-error text-sm py-2">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <label className="form-control w-full">
              <span className="label-text">Email</span>
              <input
                type="email"
                className="input input-bordered w-full"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>

            <label className="form-control w-full">
              <span className="label-text">Password</span>
              <input
                type="password"
                className="input input-bordered w-full"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>

            <button
              type="submit"
              className="btn btn-primary mt-2"
              disabled={submitting}
            >
              {submitting ? <span className="loading loading-spinner" /> : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
