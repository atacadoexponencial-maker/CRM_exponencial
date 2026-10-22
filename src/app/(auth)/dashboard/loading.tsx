import { Esqueleto } from "@/components/shared/esqueleto"

// B36-04: o esqueleto segue o desenho novo — cabeçalho, faixa de números e os blocos.
export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-7 sm:px-8 lg:px-10" role="status" aria-label="Carregando dashboard">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Esqueleto className="h-4 w-40" />
          <Esqueleto className="h-7 w-56" />
        </div>
        <div className="flex items-center gap-3">
          <Esqueleto className="h-8 w-32" />
          <Esqueleto className="h-8 w-40" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-6 border-y-2 border-t-foreground py-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Esqueleto className="h-7 w-28" />
            <Esqueleto className="h-3 w-24" />
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-8">
        <Esqueleto className="h-56 min-w-0 flex-[3_1_420px] rounded-md" />
        <Esqueleto className="h-56 min-w-0 flex-[2_1_300px] rounded-md" />
      </div>
    </div>
  )
}
