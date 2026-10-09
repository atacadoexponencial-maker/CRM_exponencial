import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Termos de Serviço — Atacado Exp",
  description: "Termos de serviço do Atacado Exp, produto da SETE ADS LTDA.",
}

export default function TermosDeServicoPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-16 text-sm text-gray-800">
        <Link href="/" className="inline-block mb-8 font-semibold text-gray-900 hover:underline">
          Atacado Exp
        </Link>
        <h1 className="text-2xl font-semibold mb-2">Termos de Serviço</h1>
        <p className="text-gray-500 mb-10">Última atualização: 9 de outubro de 2026</p>

        <section className="mb-8">
          <p>
            O <strong>Atacado Exp</strong> é prestado pela <strong>SETE ADS LTDA</strong>, CNPJ
            22.987.352/0001-15, com sede na Rua Carlos Roberto de Melo, 475, Pavimento 11, Sala 05,
            Parque Gabriel, Hortolândia/SP, CEP 13186-604 (&quot;Sete Ads&quot;). Ao acessar ou usar a
            plataforma, você concorda com estes Termos de Serviço. Leia-os com atenção antes de usá-la.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-semibold mb-3">1. Descrição do serviço</h2>
          <p>
            O Atacado Exp é uma plataforma de gestão de relacionamento com clientes (CRM) para
            atacadistas que vendem pelo WhatsApp. A plataforma oferece caixa de entrada das conversas,
            funis de Entrada e Recompra, contatos, sequências e agenda de follow-up, campanhas,
            automações, catálogo com loja e painel de resultados, por meio da integração com a API
            Oficial do WhatsApp Business, da Meta.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-semibold mb-3">2. Elegibilidade</h2>
          <p>
            Para usar a plataforma, você deve ser maior de 18 anos, representar uma empresa
            legalmente constituída e ter autoridade para vincular essa empresa a estes termos. O
            cadastro de pessoa física não é permitido.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-semibold mb-3">3. Uso da API do WhatsApp Business</h2>
          <p className="mb-2">
            A integração com o WhatsApp é feita pela{" "}
            <strong>API do WhatsApp Business da Meta Platforms, Inc.</strong> Ao conectar um número à
            plataforma, você declara que:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>É o legítimo proprietário ou responsável pelo número de WhatsApp conectado</li>
            <li>
              Tem o consentimento (opt-in) dos contatos antes de enviar modelos de mensagem e campanhas
              a eles
            </li>
            <li>Cumprirá as{" "}
              <a
                href="https://www.whatsapp.com/legal/business-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                Políticas Comerciais do WhatsApp
              </a>
              {" "}e os Termos da API da Meta
            </li>
            <li>Não usará a plataforma para spam, mensagens em massa não autorizadas ou conteúdo proibido</li>
          </ul>
          <p className="mt-2">
            Os custos das mensagens cobrados pela Meta são do cliente e são pagos direto na conta do
            WhatsApp Business dele. A Meta pode limitar ou bloquear um número por baixa qualidade ou por
            descumprimento das políticas dela, sem responsabilidade da Sete Ads.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-semibold mb-3">4. Responsabilidades do usuário</h2>
          <p className="mb-2">Você é responsável por:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Manter a confidencialidade das credenciais de acesso da sua conta</li>
            <li>Todas as atividades realizadas na conta da sua empresa</li>
            <li>Garantir que os dados dos seus contatos foram obtidos de forma lícita e com consentimento adequado</li>
            <li>Cumprir a legislação de proteção de dados aplicável (LGPD e demais normas vigentes)</li>
            <li>Não compartilhar acesso à plataforma com pessoas não autorizadas</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-semibold mb-3">5. Dados</h2>
          <p>
            O tratamento de dados na plataforma segue a{" "}
            <Link href="/politica-de-privacidade" className="text-blue-600 underline">
              Política de Privacidade
            </Link>
            . Para os dados dos seus contatos e das suas conversas, a sua empresa é a controladora, e a
            Sete Ads atua como operadora, tratando os dados só para prestar o serviço.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-semibold mb-3">6. Propriedade intelectual</h2>
          <p>
            Todo o código, design, marca e conteúdo do Atacado Exp são de propriedade exclusiva da
            Sete Ads. É vedada a reprodução, distribuição ou criação de obras derivadas sem
            autorização expressa por escrito.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-semibold mb-3">7. Limitação de responsabilidade</h2>
          <p className="mb-2">
            A Sete Ads não se responsabiliza por:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Interrupções ou indisponibilidades da API do WhatsApp Business causadas pela Meta</li>
            <li>Perda de dados decorrente de uso indevido ou violação de segurança por parte do usuário</li>
            <li>Danos indiretos, incidentais ou consequentes resultantes do uso da plataforma</li>
            <li>Mudanças nas políticas da Meta que afetem o funcionamento da integração</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-semibold mb-3">8. Suspensão e encerramento</h2>
          <p>
            Reservamo-nos o direito de suspender ou encerrar o acesso de qualquer empresa que
            viole estes termos, sem aviso prévio e sem direito a reembolso. O usuário pode pedir
            o encerramento da conta a qualquer momento pelo e-mail de contato abaixo.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-semibold mb-3">9. Alterações nos termos</h2>
          <p>
            Podemos atualizar estes termos periodicamente. Avisaremos os usuários sobre mudanças
            relevantes por e-mail ou dentro da plataforma. O uso continuado após as alterações
            implica aceitação da nova versão.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-semibold mb-3">10. Lei aplicável e foro</h2>
          <p>
            Estes termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro
            da comarca de Hortolândia/SP para resolver qualquer litígio, salvo disposição legal em
            contrário.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold mb-3">11. Contato</h2>
          <p>
            Em caso de dúvidas ou pedidos relacionados a estes termos, entre em contato:
          </p>
          <p className="mt-2">
            <strong>SETE ADS LTDA</strong>
            <br />
            <a
              href="mailto:atacadoexponencial@gmail.com"
              className="text-blue-600 underline"
            >
              atacadoexponencial@gmail.com
            </a>
          </p>
        </section>
      </div>
    </main>
  )
}
