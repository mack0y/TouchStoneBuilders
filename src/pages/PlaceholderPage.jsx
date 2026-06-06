import PageHeader from '../components/ui/PageHeader'

export default function PlaceholderPage({ title, description }) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body items-center py-16 text-base-content/40">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-16 h-16 mb-4 opacity-50" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.54 3.297m0 0a8.25 8.25 0 0 1-.524 1.489" />
          </svg>
          <p className="text-lg font-medium">Coming soon</p>
          <p className="text-sm mt-1">This feature is under development</p>
        </div>
      </div>
    </div>
  )
}
