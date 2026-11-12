// B54-06 (CA-B54-23): o template deixou de estar aprovado entre a escolha e a confirmação.
// Fica fora do actions.ts porque um arquivo "use server" só pode exportar funções async
// (o Next recusa constante exportada ali), e o teste precisa ler a mesma mensagem.
export const AVISO_TEMPLATE_NAO_APROVADO =
  "O template não está mais aprovado na Meta. Escolha outro ou corrija-o em Configurações > Templates"
