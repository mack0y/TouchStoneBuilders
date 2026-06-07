export default function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4" role="status" aria-label="Loading">
      <div className="w-10 h-10 rounded-lg bg-[#1e3a5f] flex items-center justify-center">
        <span className="text-white font-bold text-lg">T</span>
      </div>
      <span className="loading loading-spinner loading-lg text-[#1e3a5f]"></span>
    </div>
  )
}
