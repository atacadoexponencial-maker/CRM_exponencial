import { Esqueleto } from "@/components/shared/esqueleto"
import { CLASSE_DA_PAGINA } from "@/lib/pagina"

export default function Loading() {
  return (
    <div className={CLASSE_DA_PAGINA} role="status" aria-label="Carregando contatos">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[26px] font-semibold leading-tight tracking-tight">Contatos</h1>
        <Esqueleto className="h-8 w-32" />
      </div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Esqueleto className="h-9 w-64" />
        <Esqueleto className="h-9 w-28" />
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2 mb-5">
        <Esqueleto className="h-6 w-40" />
        <Esqueleto className="h-6 w-32" />
      </div>
      <div className="border rounded-lg overflow-hidden">
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b last:border-b-0">
            <Esqueleto className="h-4 w-1/4" />
            <Esqueleto className="h-4 w-1/6" />
            <Esqueleto className="h-4 w-1/5" />
            <Esqueleto className="h-4 w-16 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}
