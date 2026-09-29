import { Esqueleto } from "@/components/shared/esqueleto"

export default function Loading() {
  return (
    <div
      className="flex flex-1 overflow-hidden"
      style={{ height: "calc(100vh - 57px)" }}
      role="status"
      aria-label="Carregando conversas"
    >
      <aside className="w-80 shrink-0 border-r flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h1 className="text-sm font-semibold">Caixa de Entrada</h1>
          <Esqueleto className="h-6 w-6 rounded-full" />
        </div>
        <div className="px-3 py-2 border-b">
          <Esqueleto className="h-8 w-full" />
        </div>
        <div className="flex flex-col">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 border-b">
              <Esqueleto className="h-10 w-10 rounded-full shrink-0" />
              <div className="flex-1 flex flex-col gap-2">
                <Esqueleto className="h-3.5 w-2/3" />
                <Esqueleto className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1" />
        <div className="px-4 py-3 border-t">
          <Esqueleto className="h-10 w-full rounded-lg" />
        </div>
      </main>
    </div>
  )
}
