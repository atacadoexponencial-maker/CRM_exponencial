# B43-02: Condição "Perfil RFV" nas automações

**Tipo:** Implementação
**Página:** Configurações → Automações (editor e motor)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-automacao-por-perfil-rfv.md`

## Descrição

O editor de automações ganha a condição "Perfil RFV é um destes" (um ou mais perfis ou "Sem compras", saídas sim e não), avaliada pelo perfil da hora, com qualquer gatilho.

## Pronto quando

Uma automação "Mensagem recebida → Perfil RFV é Campeão?" separa os Campeões dos outros contatos e segue pela saída certa.

## Critérios de aceite

- **CA-B43-15** (automática) — Montar a condição "Perfil RFV". Dado uma automação com qualquer gatilho, quando a pessoa acrescenta a condição "Perfil RFV", marca Campeão e Clientes Fiéis e salva, então a condição fica gravada com os dois perfis e aparece igual ao abrir de novo.
- **CA-B43-22** (automática) — A condição "Perfil RFV" usa o perfil da hora. Dado uma automação "Mensagem recebida → Perfil RFV é Campeão? sim: tag 'vip-atendimento'", e dois contatos, um Campeão e um Hibernando, que mandam mensagem, quando a automação roda, então só o Campeão recebe a tag "vip-atendimento".

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B43-05 | "Vindo de" e a condição "Perfil RFV" oferecem também a opção "Sem compras". O "Vindo de" não deixa marcar um perfil que também está no destino. | confirmada | Marcelle, 24/10/2026 (aprovação da spec). |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B43-02 | O perfil mostrado no contato, na lista e no chat, e usado na condição, é o da hora ou o da conferência do dia? | respondida | Sempre o da hora, igual a Relatórios. Marcelle, 24/10/2026. |

## Cenários

### Happy Path
1. No editor, numa condição, a pessoa escolhe o atributo "Perfil RFV". O operador é "é um destes", e o valor é uma lista de caixas: os onze perfis (com ícone) e "Sem compras".
2. Ela marca Campeão e Clientes Fiéis. O valor fica `campeao,fieis`, e a frase do bloco diz `perfil rfv é um destes "🏆 Campeão, 💎 Clientes Fiéis"`.
3. Ao salvar, o servidor confere que todo perfil marcado existe. Ao abrir de novo, as duas caixas estão marcadas.
4. Quando a automação roda, o motor calcula o perfil da hora do contato (base da empresa inteira) e segue por "sim" se ele está num dos marcados; senão, por "não".

### Edge Cases
- Contato sem compra: só passa se "Sem compras" estiver marcado.
- Evento sem contato: a condição não vale, como as outras condições de contato.
- Nenhuma caixa marcada: o bloco fica com pendência ("complete as verificações"), como os outros valores vazios.

### Cenário de Erro
- Perfil que não existe no valor (chamada direta ao servidor): salvar é recusado com "Um perfil RFV escolhido numa condição não existe. Escolha de novo."
- Erro do banco ao calcular o perfil sobe e encerra a regra, como nas outras verificações.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B43-15 | automática | `src/test/automacao-condicao-perfil-rfv-tela.test.tsx` | marcar Campeão e Clientes Fiéis grava `campeao,fieis`; reaberto, as duas caixas estão marcadas |
| CA-B43-15 | automática | `src/test/automacao-condicao-perfil-rfv.integration.test.ts` | `salvarRegra` grava a condição com os dois perfis, lida de volta igual; perfil inexistente é recusado |
| CA-B43-22 | automática | `src/test/automacao-condicao-perfil-rfv.integration.test.ts` | com "Mensagem recebida → Perfil RFV é Campeão? sim: tag", só o Campeão fica com a tag |

## Banco de Dados

- Função nova `public.perfis_rfv_do_workspace(p_workspace uuid)` → `(contact_id, perfil)`: o cálculo que estava em `perfis_rfv_da_empresa`, por empresa, só para o service role (o motor roda sem usuário logado; a B43-03 também usa).
- `public.perfis_rfv_da_empresa()` passa a chamar a nova com a empresa de quem chama e continua filtrando por `pode_ver_contato`. Mesmo resultado.

## Arquivos

- **Criar:** `supabase/migrations/20261024000003_perfis_rfv_por_empresa.sql` — função por empresa; `perfis_rfv_da_empresa` passa a usá-la
- **Modificar:** `src/integrations/supabase/types.ts` — tipos regenerados
- **Modificar:** `src/lib/fluxo-automacao.ts` — verificação `perfil_rfv` (disponível depois de Classificação) e `SEM_COMPRAS`
- **Modificar:** `src/lib/automacoes/verificacoes.ts` — `perfilRfvVale`, pelo perfil da hora
- **Modificar:** `src/lib/automacoes/referencias.ts` — recolhe os perfis das condições
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/actions.ts` — recusa perfil inexistente ao salvar
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/catalogo.ts` — `VERIFICACOES.perfil_rfv`, valor `opcoes_varias` e fonte `perfisRfv`
- **Criar:** `src/app/(auth)/configuracoes/automacoes/components/campo-varias.tsx` — lista de caixas de marcar (a B43-03 usa no gatilho)
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/painel-bloco.tsx` — caixas de marcar para `opcoes_varias`
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/frases-fluxo.ts` — frase com os nomes marcados
- **Criar:** `src/test/automacao-condicao-perfil-rfv-tela.test.tsx` — editor
- **Criar:** `src/test/automacao-condicao-perfil-rfv.integration.test.ts` — salvar e motor no banco de verdade

Reuso: `PERFIS`/`PERFIL_POR_ID` de `src/lib/relatorios/rfv.ts`; montagem de `src/test/funis-nas-automacoes.integration.test.ts`; `processarAutomacoes` de `src/lib/automacoes/index.ts`.

## Checklist

- [x] Migration aplicada (`db push`) e tipos regenerados
- [x] Verificação `perfil_rfv` no tipo, na lista disponível e no motor
- [x] Conferência ao salvar
- [x] Editor com caixas de marcar e frase do bloco
- [x] Testes da tabela Prova passando; tsc e lint limpos; testes do editor e do motor rodados
