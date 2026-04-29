export { conversationRepository } from "./conversation.repository";
export { messageRepository } from "./message.repository";

import { ConversationRepository } from "./conversation.repository";
import { MessageRepository } from "./message.repository";

class ChatRepository extends ConversationRepository {
  readonly messages = new MessageRepository();

  createMessage = this.messages.createMessage.bind(this.messages);
  getMessages = this.messages.getMessages.bind(this.messages);
  getMessageById = this.messages.getMessageById.bind(this.messages);
  markMessagesAsRead = this.messages.markMessagesAsRead.bind(this.messages);
}

export const chatRepository = new ChatRepository();
export type { ChatRepository };
