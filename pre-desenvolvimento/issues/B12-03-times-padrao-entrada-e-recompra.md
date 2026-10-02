# B12-03: Times padrão se chamam Entrada e Recompra

**Tipo:** Implementação
**Página:** Configurações › Times, Cadastro de empresa
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-renomear-funis.md` — seção "Times e Cadastro de empresa"

## Descrição

Renomear os dois times padrão (`is_default = true`) de todas as empresas: "Expansão" →
"Entrada" e "Retenção" → "Recompra", mantendo id e membros. Empresas novas já nascem com
os nomes novos (`src/app/cadastro/actions.ts:71-72`). Times customizados (`is_default =
false`) não são tocados, mesmo que tenham um desses nomes. Testes que conferem os nomes
dos times padrão (cadastro, times, usuários, E2E de cadastro) passam a esperar os nomes
novos.

Hoje (02/10) são 4 empresas com os dois times padrão.

## Pronto quando

No CRM publicado, Configurações › Times de qualquer empresa existente mostra os times
padrão como "Entrada" e "Recompra", com os mesmos membros de antes, ainda bloqueados para
editar e excluir; e uma empresa cadastrada agora nasce com "Entrada" e "Recompra".
