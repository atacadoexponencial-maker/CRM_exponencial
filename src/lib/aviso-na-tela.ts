// B46-04: confirmação curta de que algo foi salvo ("Produto salvo"), a mesma em
// todas as telas. Quem salva chama `avisar`; o `AvisosNaTela`, no layout das telas
// logadas, mostra. Fica no layout para sobreviver à troca de página depois de salvar.

type Ouvinte = (texto: string) => void

const ouvintes = new Set<Ouvinte>()

export function avisar(texto: string): void {
  for (const ouvir of ouvintes) ouvir(texto)
}

export function ouvirAvisos(ouvir: Ouvinte): () => void {
  ouvintes.add(ouvir)
  return () => {
    ouvintes.delete(ouvir)
  }
}
