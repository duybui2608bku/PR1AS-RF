export { conversationRepository } from "./conversation.repository";
export { messageRepository } from "./message.repository";

import { ConversationRepository } from "./conversation.repository";
import { MessageRepository } from "./message.repository";

class ChatRepository {
  private readonly conversations = new ConversationRepository();
  private readonly messages = new MessageRepository();

  // Conversation methods
  findOrCreateConversation = this.conversations.findOrCreateConversation.bind(this.conversations);
  findConversationById = this.conversations.findConversationById.bind(this.conversations);
  getUserConversations = this.conversations.getUserConversations.bind(this.conversations);
  updateConversationLastMessage = this.conversations.updateConversationLastMessage.bind(this.conversations);
  getConversationWithDetails = this.conversations.getConversationWithDetails.bind(this.conversations);
  getUnreadCount = this.conversations.getUnreadCount.bind(this.conversations);
  getConversationUnreadCounts = this.conversations.getConversationUnreadCounts.bind(this.conversations);

  // Message methods
  createMessage = this.messages.createMessage.bind(this.messages);
  getMessages = this.messages.getMessages.bind(this.messages);
  getMessageById = this.messages.getMessageById.bind(this.messages);
  getMessagesByIds = this.messages.getMessagesByIds.bind(this.messages);
  softDeleteMessage = this.messages.softDeleteMessage.bind(this.messages);
  markMessagesAsRead = this.messages.markMessagesAsRead.bind(this.messages);
}

export const chatRepository = new ChatRepository();
export type { ChatRepository };
