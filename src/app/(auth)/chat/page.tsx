import { MOCK_CONVERSAS } from "./mock-conversas"
import { MOCK_MENSAGENS } from "./mock-mensagens"
import { ChatLayout } from "./components/chat-layout"

export default function ChatPage() {
  return <ChatLayout conversas={MOCK_CONVERSAS} mensagens={MOCK_MENSAGENS} />
}
