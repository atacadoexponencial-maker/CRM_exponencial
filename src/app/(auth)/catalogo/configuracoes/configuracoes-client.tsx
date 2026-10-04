"use client"

import { AbasCatalogo } from "../components/abas-catalogo"
import { FormConfiguracoes, type ConfigCatalogo, type NumeroConectado } from "../components/form-configuracoes"
import { HREFS_CATALOGO } from "../produtos-client"
import { salvarConfiguracoes, verificarEndereco } from "./actions"

export function ConfiguracoesClient({ inicial, numeros, prefixoLink }: { inicial: ConfigCatalogo; numeros: NumeroConectado[]; prefixoLink: string }) {
  return (
    <div className="max-w-6xl mx-auto w-full px-4 py-8">
      <h1 className="text-xl font-semibold mb-4">Catálogo</h1>
      <AbasCatalogo ativa="configuracoes" hrefs={HREFS_CATALOGO} />
      <FormConfiguracoes
        inicial={inicial}
        numeros={numeros}
        prefixoLink={prefixoLink}
        onVerificarEndereco={verificarEndereco}
        onSalvar={salvarConfiguracoes}
      />
    </div>
  )
}
