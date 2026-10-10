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
