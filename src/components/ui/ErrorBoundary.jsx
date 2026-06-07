import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info.componentStack)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-20 px-4" role="alert">
          <div className="card bg-base-100 border border-base-200/80 max-w-md w-full card-hover">
            <div className="card-body items-center text-center p-8">
              <div className="w-16 h-16 rounded-2xl bg-error/10 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-error" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold">Something went wrong</h2>
              <p className="text-base-content/50 text-sm mt-2">
                {this.state.error?.message || 'An unexpected error occurred.'}
              </p>
              <div className="flex gap-2 mt-6">
                <button className="btn btn-ghost btn-sm" onClick={() => window.location.reload()}>
                  Reload Page
                </button>
                <button className="btn btn-primary btn-sm shadow-sm" onClick={this.handleReset}>
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
