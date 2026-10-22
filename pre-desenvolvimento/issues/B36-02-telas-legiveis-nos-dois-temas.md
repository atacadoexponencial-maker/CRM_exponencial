# B36-02: Telas legíveis nos dois temas

**Tipo:** Implementação
**Página:** Todas (varredura de cores fixas)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-tema-claro-caderno.md`

## Descrição

Trocar toda cor escrita direto no código (texto branco fixo, avisos com texto colorido claro, fundos fixos) por cores que acompanham o tema, para nenhum texto sumir no claro.

## Pronto quando

Qualquer tela, aviso, erro ou confirmação do sistema é legível no claro e no escuro.

## Critérios de aceite

- **CA-B36-10** (automática) — Nenhum texto some no tema claro. Dado o código de todas as telas do sistema, quando se procura cor de texto ou de fundo escrita direto, que não muda com o tema (como texto branco fixo ou texto colorido claro de aviso, que no fundo claro fica ilegível), então não sobra nenhuma, fora as listadas como exceção de propósito (ex.: a loja pública).
- **CA-B36-11** (automática) — Avisos legíveis nos dois temas. Dado um aviso de atenção, um de erro e um de sucesso, quando eles aparecem no claro e no escuro, então o texto de cada um tem contraste de pelo menos 4,5:1 com o próprio fundo.

## Suposições

Nenhuma.

## Perguntas em aberto

Nenhuma.
