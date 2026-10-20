import { redirect } from "next/navigation"

// QA M25 (06/10): a raiz mostrava a página padrão do Next.js, com links da Vercel.
// A landing (B22/B24) fica para depois; até lá, a raiz leva ao login, e quem já
// está logado segue de lá para o app.
export default function Home() {
  redirect("/login")
}
