import { Esqueleto } from "@/components/shared/esqueleto"

export default function Loading() {
  return (
    <div className="flex flex-col h-full overflow-hidden" role="status" aria-label="Carregando funil">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <Esqueleto className="h-9 w-56 rounded-lg" />
        <div className="flex items-center gap-2">
          <Esqueleto className="h-8 w-32" />
          <Esqueleto className="h-8 w-8" />
        </div>
      </div>
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-3 p-4 h-full items-start">
          {Array.from({ length: 5 }, (_, col) => (
            <div key={col} className="w-72 shrink-0 flex flex-col gap-2">
              <Esqueleto className="h-5 w-32 mb-1" />
              {Array.from({ length: 3 }, (_, card) => (
                <Esqueleto key={card} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
