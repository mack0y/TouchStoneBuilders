export default function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]" role="status" aria-label="Loading">
      <span className="loading loading-spinner loading-lg text-primary"></span>
    </div>
  )
}
