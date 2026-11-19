# B63-02: Tela de Permissões

**Tipo:** Implementação
**Página:** Configurações › Permissões
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-permissoes-por-cargo.md`

## Descrição

Tela nova em Configurações, só do Admin, em que ele escolhe o que Atendente e Gerente
veem ("Só os atribuídos a ele", "Os dele e os sem dono", "Todos da empresa") e salva.
O Admin aparece numa linha fixa, "Vê tudo da empresa". Depende da B63-01.

## Pronto quando

O Admin abre Configurações › Permissões, vê a opção atual de cada cargo, muda, salva,
e a atendente passa a ver o que ele escolheu. Gerente e Atendente não veem nem salvam
a tela.

## Critérios de aceite

- **CA-B63-01** (automática) — O Admin vê a tela de Permissões com a opção atual de cada cargo. Dado uma empresa com Atendente em "Os dele e os sem dono" e Gerente em "Todos da empresa", quando o Admin abre Configurações › Permissões, então a tela mostra os blocos Atendente e Gerente com essas opções marcadas, e a linha do Admin com "Vê tudo da empresa", sem opção para mudar.
- **CA-B63-02** (automática) — Só o Admin vê e salva as permissões. Dado um Gerente e um Atendente da empresa, quando cada um tenta abrir Configurações › Permissões ou salvar uma escolha, então o item não aparece no menu deles, a tela não abre, e a tentativa de salvar é recusada, sem mudar a escolha guardada.
- **CA-B63-03** (automática) — Salvar muda o que o cargo vê. Dado o Atendente em "Os dele e os sem dono" e uma conversa sem dono na empresa, quando o Admin muda o Atendente para "Só os atribuídos a ele" e salva, então a tela confirma que salvou, e o atendente, ao recarregar o Chat, não vê mais essa conversa.
- **CA-B63-04** (automática) — A escolha de uma empresa não muda outra. Dado duas empresas, a A com Atendente em "Todos da empresa" e a B com Atendente em "Só os atribuídos a ele", quando o Admin da A salva uma mudança, então o atendente da B continua vendo só o que é dele.
- **CA-B63-05** (automática) — Empresa nova nasce com o Atendente fechado na carteira. Dado uma empresa recém-cadastrada, quando o Admin abre a tela de Permissões, então o Atendente está em "Só os atribuídos a ele" e o Gerente em "Todos da empresa".
- **CA-B63-06** (automática) — A tela explica o efeito de "Só os atribuídos a ele". Dado a tela de Permissões aberta, quando o Admin marca "Só os atribuídos a ele" num cargo, então o bloco mostra o aviso de que o lead novo sem dono só aparece para quem vê os sem dono, sugerindo a automação "Atribuir ao time".

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B63-01 | A permissão é por cargo, não por pessoa. | confirmada | Luan, 19/11/2026 |
| SUP-B63-04 | O Admin sempre vê tudo da empresa; a tela não deixa restringir o Admin. | confirmada | Luan, 19/11/2026 |
| SUP-B63-07 | A troca da fila aberta como padrão substitui a decisão da Marcelle de 27/10/2026 (PER-B45-04); a fila aberta fica como opção na tela. | confirmada | Luan, 19/11/2026 |

## Perguntas em aberto

Nenhuma.
