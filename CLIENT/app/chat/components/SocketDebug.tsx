"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, Button, Typography, Space, Tag, Divider } from "antd";
import { ReloadOutlined, CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import { chatSocket } from "@/lib/socket";
import { reconnectSocket } from "@/lib/socket/config";
import styles from "./SocketDebug.module.scss";

const { Text } = Typography;

const getSocketStatus = () => ({
  isConnected: chatSocket.isConnected(),
  socketId: chatSocket.getSocketId(),
  tokenExists:
    typeof window !== "undefined" && Boolean(localStorage.getItem("token")),
});

export const SocketDebug = () => {
  const [socketStatus, setSocketStatus] = useState(getSocketStatus);
  const [lastEvent, setLastEvent] = useState<string>("");
  const [events, setEvents] = useState<string[]>([]);

  const checkSocketStatus = useCallback(() => {
    setSocketStatus(getSocketStatus());
  }, []);

  useEffect(() => {
    const interval = setInterval(checkSocketStatus, 2000);

    const handleConnected = (data: unknown) => {
      const msg = `Connected: ${JSON.stringify(data)}`;
      setLastEvent(msg);
      setEvents((prev) => [msg, ...prev.slice(0, 9)]);
      checkSocketStatus();
    };

    const handleError = (error: { message: string }) => {
      const msg = `Error: ${error.message}`;
      setLastEvent(msg);
      setEvents((prev) => [msg, ...prev.slice(0, 9)]);
      checkSocketStatus();
    };

    const handleNewMessage = (data: { message: { _id: string } }) => {
      const msg = `New Message: ${data.message._id}`;
      setLastEvent(msg);
      setEvents((prev) => [msg, ...prev.slice(0, 9)]);
    };

    const handleUserTyping = (data: { user_id: string }) => {
      const msg = `User Typing: ${data.user_id}`;
      setLastEvent(msg);
      setEvents((prev) => [msg, ...prev.slice(0, 9)]);
    };

    const handleConversationJoined = (data: { conversation_id: string }) => {
      const msg = `Joined: ${data.conversation_id}`;
      setLastEvent(msg);
      setEvents((prev) => [msg, ...prev.slice(0, 9)]);
    };

    chatSocket.onConnected(handleConnected);
    chatSocket.onError(handleError);
    chatSocket.onNewMessage(handleNewMessage);
    chatSocket.onUserTyping(handleUserTyping);
    chatSocket.onConversationJoined(handleConversationJoined);

    return () => {
      clearInterval(interval);
      chatSocket.offConnected?.(handleConnected);
      chatSocket.offError?.(handleError);
      chatSocket.offNewMessage?.(handleNewMessage);
      chatSocket.offUserTyping?.(handleUserTyping);
      chatSocket.offConversationJoined?.(handleConversationJoined);
    };
  }, [checkSocketStatus]);

  const handleReconnect = useCallback(() => {
    reconnectSocket();
    setTimeout(checkSocketStatus, 1000);
  }, [checkSocketStatus]);

  return (
    <Card
      title="Socket Debug Panel"
      size="small"
      className={styles.card}
      extra={
        <Button size="small" icon={<ReloadOutlined />} onClick={handleReconnect}>
          Reconnect
        </Button>
      }
    >
      <Space orientation="vertical" className={styles.spaceFull} size="small">
        <div>
          <Text strong>Connection Status: </Text>
          {socketStatus.isConnected ? (
            <Tag color="green" icon={<CheckCircleOutlined />}>
              Connected
            </Tag>
          ) : (
            <Tag color="red" icon={<CloseCircleOutlined />}>
              Disconnected
            </Tag>
          )}
        </div>

        <div>
          <Text strong>Socket ID: </Text>
          <Text code>{socketStatus.socketId || "N/A"}</Text>
        </div>

        <div>
          <Text strong>Token: </Text>
          {socketStatus.tokenExists ? (
            <Tag color="green">Exists</Tag>
          ) : (
            <Tag color="red">Missing</Tag>
          )}
        </div>

        <Divider className={styles.dividerSpacing} />

        <div>
          <Text strong>Last Event:</Text>
          <div className={styles.lastEventBlock}>
            <Text type="secondary" className={styles.lastEventText}>
              {lastEvent || "No events yet"}
            </Text>
          </div>
        </div>

        <Divider className={styles.dividerSpacing} />

        <div>
          <Text strong>Recent Events:</Text>
          <div className={styles.eventsList}>
            {events.length === 0 ? (
              <Text type="secondary" className={styles.eventText}>
                No events
              </Text>
            ) : (
              events.map((event, index) => (
                <div key={index} className={styles.eventItem}>
                  <Text type="secondary">{event}</Text>
                </div>
              ))
            )}
          </div>
        </div>
      </Space>
    </Card>
  );
};
