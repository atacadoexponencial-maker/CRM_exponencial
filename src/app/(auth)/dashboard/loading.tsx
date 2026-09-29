import { Esqueleto } from "@/components/shared/esqueleto"

export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto w-full px-4 py-8" role="status" aria-label="Carregando dashboard">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <div className="flex items-center gap-3">
          <Esqueleto className="h-8 w-32" />
          <Esqueleto className="h-8 w-40" />
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {Array.from({ length: 4 }, (_, i) => (
          <Esqueleto key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
      <Esqueleto className="h-64 w-full rounded-lg" />
    </div>
  )
}
