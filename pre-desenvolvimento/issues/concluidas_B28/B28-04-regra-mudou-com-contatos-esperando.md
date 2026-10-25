# B28-04: Regra desativada, excluída ou editada com contatos esperando

**Tipo:** Implementação
**Página:** Automações (lista e editor)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-espera-e-fim-das-sequencias.md`

## Descrição

Desativar ou excluir a regra cancela as esperas dela; editar mantém quem espera num bloco
que continua no fluxo e cancela quem espera num bloco apagado. Antes de cada uma dessas
mudanças, o admin vê quantos contatos estão esperando e confirma.

## Pronto quando

No preview, com contatos esperando numa regra, desativar, excluir ou apagar o bloco de
espera mostra o aviso com o número de contatos e, confirmado, deixa as execuções canceladas
no histórico com o motivo; trocar a ação depois do bloco mantém a espera, e a ação nova
roda quando ela acaba.

## Critérios de aceite

- **CA-B28-18** (automática) — Desativar ou excluir cancela as esperas, depois de confirmar. Dado uma regra com 2 contatos esperando, quando o admin desativa ou exclui a regra e confirma o aviso "2 contatos estão esperando nesta regra", então as duas execuções ficam canceladas no histórico ("regra desativada" ou "regra excluída") e nenhuma ação delas roda depois.
- **CA-B28-19** (automática) — Editar mantém quem espera num bloco que continua. Dado um contato esperando num bloco "esperar" de uma regra, quando o admin troca a ação depois do bloco e salva, então o contato continua esperando e, quando a espera acaba, roda a ação nova.
- **CA-B28-20** (automática) — Editar cancela quem espera num bloco apagado. Dado um contato esperando num bloco "esperar", quando o admin apaga esse bloco, confirma o aviso e salva, então a execução fica cancelada no histórico ("o bloco de espera saiu da regra").

## Suposições

Nenhuma.

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B28-06 | O que acontece com quem espera quando a regra muda? | respondida | Desativar e excluir cancelam; editar mantém quem espera num bloco que continua (Luan, 20/10/2026). |

## Cenários

### Happy Path
1. Na lista, o admin pausa uma regra. A tela pergunta ao servidor quantos contatos estão esperando nela (`contarEsperasDaRegra`). Com 1 ou mais, abre o aviso "2 contatos estão esperando nesta regra. Pausar cancela essas esperas", com "Pausar e cancelar" e "Voltar".
2. Confirmado, `alternarRegra(id, false)` pausa a regra e cancela as esperas dela, com "Cancelada: a regra foi desativada".
3. Excluir: o diálogo que já existe ganha a mesma linha quando há contatos esperando; confirmado, `excluirRegra` cancela as esperas com "Cancelada: a regra foi excluída".
4. No editor, ao salvar uma regra que já existe, o editor pergunta quantos contatos esperam num bloco "esperar" que não está mais no fluxo (`contarEsperasQueSaem`). Com 1 ou mais, abre o aviso "1 contato está esperando num bloco que você apagou. Salvar cancela essa espera". Confirmado, `salvarRegra` grava e cancela essas esperas com "Cancelada: o bloco de espera saiu da regra".
5. Quem espera num bloco que continua no fluxo segue esperando; quando a espera acaba, o motor segue o fluxo gravado na hora (o novo).

### Edge Cases
- Nenhum contato esperando: nada de aviso, a ação é a de sempre.
- Ativar a regra não pergunta nada.
- Regra nova (ainda sem id) não tem espera: o editor não pergunta.
- O servidor cancela mesmo que o pedido venha por fora da tela: o aviso é para o admin saber o que vai acontecer, e não a regra de quem cancela.
- Bloco que continua no fluxo, mas deixou de ser "esperar": conta como bloco apagado.
- Uma espera que está seguindo naquele instante (pega pelo relógio ou por uma mensagem) termina como seguiu; só as que ainda estão esperando são canceladas.

### Cenário de Erro
- Erro ao contar: a tela segue sem o aviso, e o servidor cancela do mesmo jeito.
- Erro ao cancelar depois de pausar, excluir ou salvar: a mudança da regra vale. A espera é cancelada quando for seguir, pelo mesmo motivo (B28-02: regra desativada, excluída ou sem o bloco).

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B28-18 | automática | `src/test/automacoes-regra-com-esperas.test.tsx` | com 2 esperando, pausar e excluir mostram "2 contatos estão esperando nesta regra" e só seguem depois de confirmar; o servidor cancela as duas, com "regra desativada" ou "regra excluída" |
| CA-B28-19 | automática | `src/test/automacoes-regra-com-esperas.test.tsx` | salvar trocando a ação depois do bloco não cancela a espera, e o relógio segue pela ação nova |
| CA-B28-20 | automática | `src/test/automacoes-regra-com-esperas.test.tsx` | apagar o bloco e salvar pede confirmação e cancela a espera com "o bloco de espera saiu da regra" |

## Banco de Dados

Sem migration.

## Arquivos

- **Criar:** `src/test/automacoes-regra-com-esperas.test.tsx` — CA-B28-18 a 20
- **Modificar:** `src/lib/automacoes/esperas.ts` — as esperas de uma regra e o cancelamento delas
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/actions.ts` — contar e cancelar ao pausar, excluir e salvar
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/lista-regras.tsx` — aviso ao pausar e ao excluir
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/lista-client.tsx` — passa a contagem para a lista
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/editor-fluxo.tsx` — aviso antes de salvar
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/[id]/editor-client.tsx` — passa a contagem para o editor

## Checklist

- [x] Esperas da regra e cancelamento em `esperas.ts`
- [x] Pausar, excluir e salvar cancelam no servidor
- [x] Contagens no servidor
- [x] Aviso na lista (pausar e excluir) e no editor (salvar)
- [x] Testes CA-B28-18, 19 e 20
