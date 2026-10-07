// Loja despublicada ou endereço que não existe. Sem marca nenhuma: nem do CRM, nem de loja.
export default function LojaIndisponivel() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-2 p-6 text-center" style={{ background: "#ffffff", color: "#111111" }}>
      <p className="text-lg font-semibold">Catálogo indisponível no momento</p>
      <p className="text-sm" style={{ color: "#6b7280" }}>Confira o link com quem enviou ou tente mais tarde.</p>
    </main>
  )
}
