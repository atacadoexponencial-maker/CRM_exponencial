import { Esqueleto } from "@/components/shared/esqueleto"

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-7 sm:px-8 lg:px-10" role="status" aria-label="Carregando alertas">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <h1 className="text-[26px] font-semibold leading-tight tracking-tight">Central de Alertas</h1>
        <div className="flex items-center gap-2">
          <Esqueleto className="h-8 w-28" />
        </div>
      </div>
      <Esqueleto className="h-4 w-72 mb-6" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }, (_, i) => (
          <Esqueleto key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    </div>
  )
}
