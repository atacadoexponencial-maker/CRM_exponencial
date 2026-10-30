Você vai classificar a tarefa e mandá-la para a marcha certa. Nada mais.

**Tarefa:** $ARGUMENTS

Antes de qualquer coisa, leia o `AGENTS.md` da raiz do projeto: é a página de
princípios, com as regras sempre ativas, a arquitetura, o fluxo e as regras de git.

## Por que este passo existe

O fluxo completo (`/spec` → `/break` → `/plan` → `/execute`) foi feito para
subsistema novo. Aplicado a tudo, ele vira cerimônia: correção de bug vira
quatro issues, ajuste de campo vira documento. A regra que decide:

> Se você ficaria irritada com o agente interpretando o requisito diferente do
> que você quis dizer, escreva a spec. Se daria para consertar no prompt
> seguinte, não escreva.

## O que você deve fazer

1. Leia a tarefa.
2. Olhe o repositório o suficiente para saber se o fluxo que ela muda **já
   existe aqui**. Não é sobre você conhecer esse tipo de app — é sobre o código
   estar no repositório para ser lido.
3. Classifique em uma das três marchas e **diga a classificação em voz alta**,
   com o motivo, antes de qualquer outra coisa. A usuária pode discordar.
4. Siga o caminho da marcha escolhida.

## As três marchas

### Sonda
Pergunta de viabilidade: "dá pra fazer X?", "isso é possível?", "quero saber
se compensa". O resultado é uma **resposta**, não código que fica.

- Apresente em 2–3 frases o que vai testar.
- Investigue do jeito mais barato que ainda dê resposta confiável.
- Relate a conclusão como recomendação. O que foi construído é descartável e
  você diz isso.
- **Sem spec, sem issue, sem plano.**

### Delimitada
Mudança bem definida em código que já existe no repositório: um campo novo, um
endpoint pequeno, uma correção, um ajuste de regra.

- Faça as perguntas que importam, uma por vez.
- Apresente o desenho **no chat**: abordagem, arquivos que serão tocados, como
  vai testar. Alguns parágrafos, não um documento.
- **Pare e espere o sim.** Apresentar e já começar é pular o portão.
- Implemente direto, seguindo as regras de arquitetura do projeto.
- **Sem spec, sem issue, sem plano.**

### Arquitetural
Projeto novo, subsistema novo, mudança que altera como as peças se encaixam ou
mexe em interface da qual outras coisas dependem.

- Aí sim: `/spec` → `/break` → `/plan` → `/execute`, completo.

## Regras

- **Na dúvida entre duas marchas, escolha a mais pesada.** Procurar um rótulo
  para pular trabalho já é o sinal de que a dúvida é real.
- **A catraca é de mão única.** Complexidade escondida que aparece no meio do
  caminho sobe a marcha: pare, diga que subiu, e recomece dali. Nada desce.
- **Toda marcha termina em aprovação antes de implementar.** O que muda com a
  simplicidade é o tamanho do desenho, nunca a existência do portão.
- Conhecer o tipo de aplicação não torna a tarefa delimitada. Se não há fluxo
  existente para mudar, ela é arquitetural.
