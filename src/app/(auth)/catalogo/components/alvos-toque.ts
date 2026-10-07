// Check-up de UX: no celular, os controles do catálogo ganham área de toque de 44px.
// Vai na raiz de cada tela do catálogo; no computador nada muda e o resto do CRM fica igual.
export const ALVOS_TOQUE_CELULAR = [
  "max-md:[&_[data-slot=button]]:min-h-11",
  "max-md:[&_[data-slot=button]]:min-w-11",
  "max-md:[&_[data-slot=input]]:h-11",
  "max-md:[&_select]:h-11",
  "max-md:[&_input[type=checkbox]]:size-5",
  "max-md:[&_input[type=radio]]:size-5",
  "max-md:[&_label:has(input[type=checkbox])]:min-h-11",
  "max-md:[&_label:has(input[type=radio])]:min-h-11",
].join(" ")
