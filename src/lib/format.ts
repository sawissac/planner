function pad(n: number): string {
  return n.toString().padStart(2, "0")
}

export function formatDate(ts: number): string {
  const d = new Date(ts)
  const yy = pad(d.getFullYear() % 100)
  const mm = pad(d.getMonth() + 1)
  const dd = pad(d.getDate())
  const h24 = d.getHours()
  const ampm = h24 >= 12 ? "PM" : "AM"
  const h12 = h24 % 12 || 12
  const hh = pad(h12)
  const mi = pad(d.getMinutes())
  return `${yy}/${mm}/${dd} ${hh}:${mi} ${ampm}`
}
