"use client"

import { AbasCatalogo } from "../components/abas-catalogo"
import { FormConfiguracoes, type ConfigCatalogo } from "../components/form-configuracoes"
import { HREFS_CATALOGO } from "../produtos-client"
import { salvarConfiguracoes, verificarEndereco } from "./actions"
import { ALVOS_TOQUE_CELULAR } from "../components/alvos-toque"
import { CLASSE_DA_PAGINA } from "@/lib/pagina"
import { cn } from "@/lib/utils"

export function ConfiguracoesClient({ inicial, prefixoLink }: { inicial: ConfigCatalogo; prefixoLink: string }) {
  return (
    <div className={cn(CLASSE_DA_PAGINA, ALVOS_TOQUE_CELULAR)}>
      <h1 className="text-[26px] font-semibold leading-tight tracking-tight mb-4">Catálogo</h1>
      <AbasCatalogo ativa="configuracoes" hrefs={HREFS_CATALOGO} />
      <FormConfiguracoes
        inicial={inicial}
        prefixoLink={prefixoLink}
        onVerificarEndereco={verificarEndereco}
        onSalvar={salvarConfiguracoes}
      />
    </div>
  )
}
