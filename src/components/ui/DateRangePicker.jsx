import { useState, useEffect } from 'react'

export default function DateRangePicker({ 
  startDate, 
  endDate, 
  onChange, 
  maxDate = new Date().toISOString().split('T')[0],
  presets = true 
}) {
  const [localStart, setLocalStart] = useState(startDate || '')
  const [localEnd, setLocalEnd] = useState(endDate || '')

  useEffect(() => {
    setLocalStart(startDate || '')
    setLocalEnd(endDate || '')
  }, [startDate, endDate])

  function handleStartChange(e) {
    const value = e.target.value
    setLocalStart(value)
    onChange({ startDate: value || null, endDate: localEnd || null })
  }

  function handleEndChange(e) {
    const value = e.target.value
    setLocalEnd(value)
    onChange({ startDate: localStart || null, endDate: value || null })
  }

  function applyPreset(days) {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - days)
    const startStr = start.toISOString().split('T')[0]
    const endStr = end.toISOString().split('T')[0]
    setLocalStart(startStr)
    setLocalEnd(endStr)
    onChange({ startDate: startStr, endDate: endStr })
  }

  function clearDates() {
    setLocalStart('')
    setLocalEnd('')
    onChange({ startDate: null, endDate: null })
  }

  return (
    <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-end flex-wrap">
      <label className="form-control w-full sm:w-48">
        <span className="label-text text-xs">From</span>
        <input
          type="date"
          className="input input-bordered input-sm"
          value={localStart}
          max={localEnd || maxDate}
          onChange={handleStartChange}
        />
      </label>
      <label className="form-control w-full sm:w-48">
        <span className="label-text text-xs">To</span>
        <input
          type="date"
          className="input input-bordered input-sm"
          value={localEnd}
          min={localStart || undefined}
          max={maxDate}
          onChange={handleEndChange}
        />
      </label>

      {presets && (
        <div className="flex gap-1 flex-wrap">
          <button type="button" className="btn btn-ghost btn-xs" onClick={() => applyPreset(0)}>Today</button>
          <button type="button" className="btn btn-ghost btn-xs" onClick={() => applyPreset(6)}>Last 7 days</button>
          <button type="button" className="btn btn-ghost btn-xs" onClick={() => applyPreset(29)}>Last 30 days</button>
          <button type="button" className="btn btn-ghost btn-xs" onClick={() => applyPreset(89)}>Last 90 days</button>
        </div>
      )}

      {(localStart || localEnd) && (
        <button type="button" className="btn btn-soft btn-xs" onClick={clearDates}>Clear</button>
      )}
    </div>
  )
}