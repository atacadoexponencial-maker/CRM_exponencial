import { Esqueleto } from "@/components/shared/esqueleto"
import { CLASSE_DA_PAGINA } from "@/lib/pagina"

export default function Loading() {
  return (
    <div className={CLASSE_DA_PAGINA} role="status" aria-label="Carregando agenda">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-[26px] font-semibold leading-tight tracking-tight">Minha Agenda</h1>
        <Esqueleto className="h-8 w-32" />
      </div>
      <Esqueleto className="h-4 w-64 mb-6" />
      <div className="flex flex-col gap-6">
        {Array.from({ length: 2 }, (_, dia) => (
          <div key={dia}>
            <Esqueleto className="h-4 w-28 mb-3" />
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 }, (_, i) => (
                <Esqueleto key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
