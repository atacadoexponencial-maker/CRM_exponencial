import { Esqueleto } from "@/components/shared/esqueleto"
import { CLASSE_DA_PAGINA } from "@/lib/pagina"

export default function Loading() {
  return (
    <div className={CLASSE_DA_PAGINA} role="status" aria-label="Carregando relatórios">
      <h1 className="text-xl font-semibold mb-4">Relatórios</h1>
      <div className="flex gap-2 border-b mb-6">
        {Array.from({ length: 5 }, (_, i) => (
          <Esqueleto key={i} className="h-8 w-28 mb-2" />
        ))}
      </div>
      <Esqueleto className="h-16 w-full rounded-lg mb-6" />
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {Array.from({ length: 10 }, (_, i) => (
          <Esqueleto key={i} className="h-28 w-full rounded-lg" />
        ))}
      </div>
    </div>
  )
}
