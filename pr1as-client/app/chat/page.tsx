import { ChatPage } from "@/components/chat/chat-page"

type ChatSearchParams = Record<string, string | string[] | undefined>

const getParam = (params: ChatSearchParams, key: string) => {
  const value = params[key]
  return Array.isArray(value) ? value[0] : value
}

export default async function ChatRoutePage({
  searchParams,
}: {
  searchParams?: Promise<ChatSearchParams>
}) {
  const params = searchParams ? await searchParams : {}
  const directConversationId =
    getParam(params, "conversation_id") ?? getParam(params, "conversation")
  const groupConversationId =
    getParam(params, "conversation_group_id") ?? getParam(params, "group")

  return (
    <ChatPage
      initialMode={groupConversationId ? "group" : "direct"}
      initialDirectConversationId={directConversationId ?? null}
      initialGroupConversationId={groupConversationId ?? null}
    />
  )
}
