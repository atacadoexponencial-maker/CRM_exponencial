// Peças do protótipo do catálogo que ainda fica no ar (pedidos) até a B16-10.

export const HREFS_PROTOTIPO = {
  produtos: "/catalogo",
  aparencia: "/catalogo/aparencia",
  configuracoes: "/catalogo/configuracoes",
  pedidos: "/catalogo/prototipo/pedidos",
}

export function FaixaPrototipo({ children }: { children?: React.ReactNode }) {
  return (
    <div className="border-b border-amber-500/30 bg-amber-500/15 px-4 py-2 text-sm text-amber-200">
      <strong>Protótipo do catálogo:</strong> dados de exemplo, nada é gravado. Recarregar a página volta ao início.{" "}
      {children}
    </div>
  )
}
