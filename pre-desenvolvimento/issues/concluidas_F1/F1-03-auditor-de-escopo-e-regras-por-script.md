# F1-03: Auditor confere escopo, checklist e regras por script

**Tipo:** Implementação
**Página:** Fluxo de desenvolvimento (auditor, regras do projeto)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-fluxo-com-prova.md`

## Descrição

O auditor passa a conferir também o que hoje o `/revisildo` confere por leitura e um
script confere sozinho: arquivo mexido fora da seção Arquivos, arquivo listado e não
tocado, checklist incompleto e as regras por script do projeto. O CRM ganha a sua lista
de regras, com as quatro iniciais: segredo ou chave de servidor em arquivo que roda no
navegador, edição à mão do arquivo de tipos gerado do banco, edição dos componentes
prontos de interface e uso de variante de tema que nunca ativa. Dá para acrescentar
regra, desligar uma regra em um arquivo com o motivo escrito, e o auditor avisa quando
uma regra não confere nenhum arquivo.

Cobre o módulo 7 da spec e os quatro problemas do catálogo do módulo 6 que ficaram fora
da F1-02.

Depende de F1-02.

## Pronto quando

Em um branch de teste: mexer em um arquivo fora da lista da issue faz o auditor acusar
"arquivo fora da issue"; colocar uma chave de servidor em um componente de tela faz
acusar "regra violada" com arquivo e linha; usar uma variante de tema escuro também;
desligar a regra naquele arquivo com motivo faz o problema sumir e aparecer como exceção
no relatório. Rodado no código atual do CRM, o auditor mostra o que cada regra encontra
hoje.

## O que a pesquisa achou

- O `/revisildo` confere o escopo com `git diff --name-only HEAD`. O auditor usa a mesma
  base (o que mudou desde o último commit), com `git status`, para pegar também arquivo
  novo.
- O CRM de hoje tem 36 usos de `dark:` fora dos componentes prontos. Cobrar o arquivo
  inteiro travaria qualquer issue que encostasse neles; por isso a regra de conteúdo olha
  só as **linhas acrescentadas**.
- `src/integrations/supabase/types.ts` muda de forma legítima quando é gerado de novo
  depois de uma migration (aconteceu no lote do motor, B22). Script não distingue "gerado"
  de "editado à mão"; a regra acusa só quando os tipos mudam **sem migration junto**.
- Acrescentar um componente pronto novo em `src/components/ui/` é legítimo; a regra acusa
  só modificação de componente que já existia.
- `.impeccable/` e `TESTES-PENDENTES.md` ficam soltos na pasta sem commit e apareceriam
  como "fora da issue"; entram na lista `foraDoEscopo`.

## Cenários

### Happy Path
1. `issue <id>` antes do commit: compara os arquivos mexidos com a seção Arquivos, confere
   o Checklist e roda as regras nas linhas acrescentadas dos arquivos mexidos.
2. `regras`: roda todas as regras no projeto inteiro e mostra quantos arquivos cada uma
   confere e quantas ocorrências existem hoje.

### Edge Cases
- Nada mudou desde o último commit: aviso "escopo não conferido", sem travar.
- Issue ainda sem a seção Arquivos: escopo não é conferido.
- Documentos do fluxo (`pre-desenvolvimento/`) e o arquivo da própria issue nunca contam.
- Regra desligada no arquivo com motivo: some o problema e aparece `⚑` no relatório.
- Exceção escrita na issue para `REGRA_VIOLADA` ou `ARQUIVO_FORA_DA_ISSUE`, com o arquivo
  como alvo: cobre todas as ocorrências naquele arquivo.

### Cenário de Erro
- Regra desligada sem motivo: problema "regra desligada sem motivo", que trava.
- Regra que não confere nenhum arquivo: o comando `regras` avisa e sai com 1.
- Fora de um repositório git: escopo e regras não são conferidos, com aviso.

## Banco de Dados

Sem mudança.

## Arquivos

- **Modificar:** `.claude/skills/auditor/scripts/auditor.mjs` — escopo, checklist, regras
  por script e o comando `regras`.
- **Criar:** `.claude/skills/auditor/regras.json` — as quatro regras iniciais do CRM.
- **Modificar:** `.claude/skills/auditor/auditor.json` — lista `foraDoEscopo`.
- **Modificar:** `.claude/skills/auditor/SKILL.md` — problemas novos, comando `regras`,
  como acrescentar e desligar regra.
- **Modificar:** `src/test/auditor.test.mjs` — testes de escopo, checklist e regras.

## Dependências Externas

Nenhuma.

## Checklist

- [x] Escopo: arquivo fora da issue, arquivo não tocado, escopo não conferido
- [x] Checklist incompleto
- [x] Regras de conteúdo (linhas acrescentadas) e regras de arquivo intocável
- [x] Desligar regra no arquivo com motivo; recusar sem motivo
- [x] Comando `regras` e aviso de regra que não confere nenhum arquivo
- [x] `regras.json` com as quatro regras do CRM
- [x] Testes do auditor passando (31)
- [x] Demonstração com o git de verdade: arquivo fora da lista e `dark:` novo acusados
- [x] Rodado no CRM de hoje: 0 segredos no frontend; 36 usos antigos de `dark:`
- [x] `npm run lint` nos arquivos novos
