"use client"

// Protótipo da B16-01: as configurações do catálogo com dados fixos. A disponibilidade do
// endereço é fingida e salvar só confere os campos. A B16-07 troca por actions do servidor.

import { AbasCatalogo } from "../../components/abas-catalogo"
import { FormConfiguracoes } from "../../components/form-configuracoes"
import { CONFIG_EXEMPLO, ENDERECOS_EM_USO, NUMEROS_EXEMPLO } from "../dados-exemplo"
import { FaixaPrototipo, HREFS_PROTOTIPO } from "../compartilhado"

export function PrototipoConfiguracoesClient({ prefixoLink }: { prefixoLink: string }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <FaixaPrototipo>Endereços &quot;loja&quot;, &quot;atacado&quot; e &quot;moda&quot; fingem estar em uso.</FaixaPrototipo>
      <div className="max-w-6xl mx-auto w-full px-4 py-8">
        <h1 className="text-xl font-semibold mb-4">Catálogo</h1>
        <AbasCatalogo ativa="configuracoes" hrefs={HREFS_PROTOTIPO} />
        <FormConfiguracoes
          inicial={CONFIG_EXEMPLO}
          numeros={NUMEROS_EXEMPLO}
          prefixoLink={prefixoLink}
          onVerificarEndereco={async (e) => (ENDERECOS_EM_USO.includes(e) ? "em_uso" : "disponivel")}
          onSalvar={async (c) => ({
            aviso: c.publicado
              ? "Salvo no protótipo. Na versão real, a loja abriria neste link."
              : "Salvo no protótipo: os campos estão certos, mas nada foi gravado.",
          })}
        />
      </div>
    </div>
  )
}
