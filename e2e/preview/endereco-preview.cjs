/* eslint-disable @typescript-eslint/no-require-imports */
// Mostra o endereço do preview da Vercel do commit atual (HEAD), esperando o
// build terminar. Usa a credencial que o git já guarda para o GitHub, sem mostrá-la.
// Uso: node e2e/preview/endereco-preview.cjs [sha]

const { execSync } = require("child_process")
const { PROJETO } = require("./comum.cjs")

const REPO = "atacadoexponencial-maker/CRM_exponencial"

function tokenDoGit() {
  const saida = execSync("git credential fill", { cwd: PROJETO, input: "protocol=https\nhost=github.com\n\n" }).toString()
  const linha = saida.split("\n").find((l) => l.startsWith("password="))
  if (!linha) throw new Error("o git não tem credencial do GitHub nesta máquina")
  return linha.slice("password=".length)
}

async function api(caminho, token) {
  const resposta = await fetch(`https://api.github.com/repos/${REPO}${caminho}`, {
    headers: { Authorization: `token ${token}`, Accept: "application/vnd.github+json" },
  })
  if (!resposta.ok) throw new Error(`GitHub respondeu ${resposta.status}`)
  return resposta.json()
}

;(async () => {
  // A API do GitHub só acha o deploy pelo SHA completo
  const sha = execSync(`git rev-parse ${process.argv[2] || "HEAD"}`, { cwd: PROJETO }).toString().trim()
  const token = tokenDoGit()
  for (let tentativa = 0; tentativa < 40; tentativa++) {
    const [deploy] = await api(`/deployments?sha=${sha}`, token)
    if (deploy) {
      const [estado] = await api(`/deployments/${deploy.id}/statuses`, token)
      if (estado && ["success", "failure", "error"].includes(estado.state)) {
        console.log(`${estado.state} ${estado.environment_url ?? ""}`)
        process.exit(estado.state === "success" ? 0 : 1)
      }
    }
    await new Promise((r) => setTimeout(r, 10000))
  }
  console.error("o preview não ficou pronto em 6 minutos")
  process.exit(1)
})().catch((e) => {
  console.error("FALHOU:", e.message)
  process.exit(1)
})
