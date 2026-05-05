import { ChatPage } from "@/components/chat/chat-page"

type ChatGroupSearchParams = Record<string, string | string[] | undefined>

const getParam = (params: ChatGroupSearchParams, key: string) => {
  const value = params[key]
  return Array.isArray(value) ? value[0] : value
}

export default async function ChatGroupRoutePage({
  searchParams,
}: {
  searchParams?: Promise<ChatGroupSearchParams>
}) {
  const params = searchParams ? await searchParams : {}
  const groupConversationId =
    getParam(params, "group") ?? getParam(params, "conversation_group_id")

  return (
    <ChatPage
      initialMode="group"
      initialGroupConversationId={groupConversationId ?? null}
    />
  )
}
