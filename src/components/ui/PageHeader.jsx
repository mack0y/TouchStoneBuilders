export default function PageHeader({ title, description, actions }) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6">
      <div>
        <h1 className="text-2xl font-bold truncate">{title}</h1>
        {description && <p className="text-base-content/60 text-sm mt-1">{description}</p>}
      </div>
      {actions && <div className="flex gap-2 shrink-0">{actions}</div>}
    </div>
  )
}
