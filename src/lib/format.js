export const peso = (n) =>
  `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`

export const dateFmt = (iso, options = { dateStyle: 'medium', timeStyle: 'short' }) =>
  new Date(iso).toLocaleString('en-PH', options)
