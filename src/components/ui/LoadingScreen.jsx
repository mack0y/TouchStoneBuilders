export default function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4" role="status" aria-label="Loading">
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg animate-pulse">
        <span className="text-white font-bold text-lg">T</span>
      </div>
      <span className="loading loading-spinner loading-lg text-primary"></span>
    </div>
  )
}
