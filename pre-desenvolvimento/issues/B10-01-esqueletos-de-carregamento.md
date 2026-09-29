# B10-01: Clique no menu responde na hora com esqueleto da página

**Tipo:** Implementação
**Página:** Área logada (todas as páginas do menu)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-navegacao-fluida.md`

## Descrição

Dar a cada rota da área logada um estado de carregamento: um esqueleto genérico
para a área toda e esqueletos próprios para Chat, Pipeline (Expansão e
Retenção), Dashboard, Alertas, Contatos e Agenda, com o mesmo título e a mesma
estrutura de blocos da página real. O menu lateral continua visível e marca o
item destino como ativo no clique.

Cobre os comportamentos de "Área logada": trocar a tela imediatamente para o
esqueleto, menu visível e clicável durante a carga, item ativo no clique,
substituição sem piscar, preparo ao passar o mouse, clique duplo sem dois
carregamentos, F5 e Voltar com a mesma resposta, esqueleto até o conteúdo
chegar, e ir ao login uma única vez quando a sessão expirou.

## Pronto quando

No CRM publicado, clicar em qualquer item do menu troca a tela na hora para um
esqueleto com o título certo, o item do menu já aparece marcado, e o conteúdo
real entra no lugar sem salto de layout. Nenhuma página fica congelada na tela
antiga enquanto carrega.
