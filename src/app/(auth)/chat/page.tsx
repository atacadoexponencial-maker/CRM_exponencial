import { MOCK_CONVERSAS } from "./mock-conversas"
import { FiltrosCaixa } from "./components/filtros-caixa"

export default function ChatPage() {
  return (
    <div className="flex flex-1 overflow-hidden" style={{ height: "calc(100vh - 57px)" }}>
      <aside className="w-80 shrink-0 border-r flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b">
          <h1 className="text-sm font-semibold">Caixa de Entrada</h1>
        </div>
        <FiltrosCaixa conversas={MOCK_CONVERSAS} />
      </aside>

      <main className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        Selecione uma conversa para começar
      </main>
    </div>
  )
}
