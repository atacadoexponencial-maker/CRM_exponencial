// B35-01: números da aba Carteiras, cálculo puro. Lead = contato sem venda; Base = com
// venda; Ativo = card da Recompra em etapa ativa; Inativo = base menos ativos.

export type ContatoDaCarteira = {
  id: string
  atendenteId: string | null
  temCompra: boolean
  ativo: boolean
}

export type Vendedor = { id: string; nome: string }

export type NumerosDaCarteira = { leads: number; base: number; ativos: number; inativos: number }

export type CarteiraDoVendedor = Vendedor & NumerosDaCarteira & { total: number }

export type PainelDeCarteiras = {
  total: NumerosDaCarteira
  comCarteira: NumerosDaCarteira
  semCarteira: NumerosDaCarteira
  vendedores: CarteiraDoVendedor[]
  semVendedor: { total: number; comCompra: number; leads: number }
}

export function numerosDe(contatos: ContatoDaCarteira[]): NumerosDaCarteira {
  const base = contatos.filter((c) => c.temCompra)
  const ativos = base.filter((c) => c.ativo).length
  return { leads: contatos.length - base.length, base: base.length, ativos, inativos: base.length - ativos }
}

export function calcularPainelDeCarteiras(contatos: ContatoDaCarteira[], vendedores: Vendedor[]): PainelDeCarteiras {
  const com = contatos.filter((c) => c.atendenteId !== null)
  const sem = contatos.filter((c) => c.atendenteId === null)
  const semNumeros = numerosDe(sem)
  return {
    total: numerosDe(contatos),
    comCarteira: numerosDe(com),
    semCarteira: semNumeros,
    vendedores: vendedores.map((v) => {
      const dele = contatos.filter((c) => c.atendenteId === v.id)
      return { ...v, ...numerosDe(dele), total: dele.length }
    }),
    semVendedor: { total: sem.length, comCompra: semNumeros.base, leads: semNumeros.leads },
  }
}
