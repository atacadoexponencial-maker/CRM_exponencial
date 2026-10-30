# B53-06: Aviso das 24h da Meta só aparece para número da API Oficial

**Tipo:** Implementação
**Página:** Campanhas — editor
**Repositório:** `crm-exponencial`
**Spec:** `docs/specs-arquivadas/spec-correcoes-qa-roteiro-luan.md`

## Descrição

O aviso da janela de 24h da Meta passa a depender do número escolhido para a campanha.

## Pronto quando

Escolher um número do canal direto esconde o aviso; um da API Oficial mostra.

## Critérios de aceite

- **CA-B53-11** (automática) — Aviso das 24h só na API Oficial. Dado o editor da campanha, quando o número escolhido é do canal direto, então o aviso da janela de 24h da Meta não aparece; com número da API Oficial, aparece.

## Suposições

Nenhuma.

## Perguntas em aberto

Nenhuma.

## Cenários

### Happy Path
1. O editor recebe os números conectados da empresa (`numerosParaCampanha`), cada um com `ehCanalDireto` calculado no servidor.
2. Na etapa 2 (Mensagem), o aviso da janela de 24h da Meta aparece só se o número da campanha (`numeroOrigem`) é da API Oficial.
3. Se a pessoa troca o número na etapa 3 e volta à etapa 2, o aviso acompanha o número escolhido.

### Edge Cases
- Um número só conectado: ele já vem escolhido (como hoje) e decide o aviso.
- "Usar o número conectado da empresa" (nenhum número escolhido): se todos os números conectados são do canal direto, o aviso não aparece; se algum é da API Oficial, ou se não há número conectado, aparece (não dá para saber por qual sai, e na dúvida o aviso fica).
- Campanha salva com um número: o número salvo decide.

### Cenário de Erro
- Número salvo que não está mais conectado (não vem na lista): trata como "usar o número da empresa".

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B53-11 | automática | `src/test/campanhas-aviso-24h-tela.test.tsx` | na etapa 2, com número do canal direto escolhido o aviso das 24h não aparece; com número da API Oficial, aparece |

## Banco de Dados

Nenhuma mudança.

## Arquivos

- **Modificar:** `src/app/(auth)/campanhas/[id]/editor-campanha-client.tsx` — o aviso das 24h da etapa 2 só aparece quando o número da campanha é da API Oficial (pelo `ehCanalDireto` que já vem do servidor)
- **Criar:** `src/test/campanhas-aviso-24h-tela.test.tsx` — teste de tela do CA-B53-11

Reuso: `NumeroParaCampanha.ehCanalDireto` (B8-01), o mesmo padrão de mocks de `campanhas-segmentacao-tela.test.tsx`.

## Checklist

- [x] Condicionar o aviso das 24h ao canal do número da campanha
- [x] Teste de tela do CA-B53-11
