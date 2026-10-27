# B46-09: As abas dos Relatórios ficam no endereço

**Tipo:** Correção
**Página:** Relatórios
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-correcoes-qa-ux.md`
**Origem:** `pre-desenvolvimento/analise-qa/qa-ux-2026-10-27.md`, achado **M-06**
**Gravidade:** Médio

## Descrição

Todas as abas ficam em `/relatorios`: não dá para mandar o link de uma aba, voltar com o navegador nem recarregar nela.

## Pronto quando

Cada aba tem endereço próprio, abre direto pelo link e responde ao Voltar.

## Critérios de aceite

- **CA-B46-22** (automática) — Aba no endereço. Dado a tela Relatórios, quando se abre a aba RFV, então o endereço fica `/relatorios?aba=rfv`, e abrir esse endereço direto mostra a aba RFV
- **CA-B46-23** (manual) — Voltar do navegador volta de aba. Dado a Visão Geral aberta e depois a aba Coorte, quando se aperta Voltar no navegador, então a Visão Geral volta, sem sair dos Relatórios

## Suposições

Nenhuma.

## Perguntas em aberto

Nenhuma.

## Cenários

### Happy Path
1. Na tela Relatórios, clicar em RFV troca a aba e o endereço vira `/relatorios?aba=rfv`, sem recarregar a página (os filtros ficam).
2. Abrir `/relatorios?aba=rfv` direto (link mandado, recarregar) abre a aba RFV.
3. Voltar no navegador volta para a aba anterior.

### Edge Cases
- `?aba=` com valor que não existe, ou sem `aba`: Visão Geral.
- A Visão Geral não leva `aba` no endereço.

### Cenário de Erro
- Sem chamada nova ao servidor: nada novo pode falhar.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B46-22 | automática | `src/test/relatorios-aba-no-endereco.test.tsx` | Clicar em RFV deixa o endereço em `/relatorios?aba=rfv`; com a aba vinda do endereço, a tela abre no RFV |
| CA-B46-23 | manual | roteiro abaixo | O Voltar do navegador volta de aba sem sair dos Relatórios |

### Roteiro manual — CA-B46-23
1. No preview do branch, abra Relatórios na Visão Geral.
2. Clique em Coorte.
3. Aperte Voltar no navegador: a Visão Geral volta, e a página continua em Relatórios.

## Arquivos

- **Criar:** `src/lib/relatorios/abas.ts` — tipo `Aba` e `abaDoEndereco`.
- **Modificar:** `src/app/(auth)/relatorios/components/relatorios-client.tsx` — troca de aba grava no endereço e ouve o Voltar.
- **Modificar:** `src/app/(auth)/relatorios/page.tsx` — lê `?aba=` e abre nela.
- **Criar:** `src/test/relatorios-aba-no-endereco.test.tsx` — testes do CA-B46-22 e do Voltar.

## Checklist

- [x] Aba no endereço e aba inicial pelo endereço
- [x] Voltar do navegador troca a aba
- [x] Teste do CA-B46-22 e testes dos Relatórios passando (L-05), tsc e lint
