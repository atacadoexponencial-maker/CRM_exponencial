// B47-12: o contêiner das telas logadas. Antes, cada tela tinha a sua largura (de
// max-w-3xl a max-w-7xl, centralizada), e o título "pulava" de lugar ao navegar.
// Agora todas usam a mesma largura e as mesmas margens; o que precisa ser mais
// estreito (um formulário, a ficha do contato) estreita por dentro.
//
// Chat, Pipeline e o editor de automação ocupam a tela inteira e não usam o contêiner.

export const CLASSE_DA_PAGINA = "mx-auto w-full max-w-6xl px-4 py-7 sm:px-8 lg:px-10"
