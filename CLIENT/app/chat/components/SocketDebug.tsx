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
    
    // Listen to socket events
    chatSocket.onConnected((data) => {
      setLastEvent(`Connected: ${JSON.stringify(data)}`);
      setEvents((prev) => [`Connected: ${JSON.stringify(data)}`, ...prev.slice(0, 9)]);
      checkSocketStatus();
    });
    
    chatSocket.onError((error) => {
      setLastEvent(`Error: ${error.message}`);
      setEvents((prev) => [`Error: ${error.message}`, ...prev.slice(0, 9)]);
      checkSocketStatus();
    });
    
    chatSocket.onNewMessage((data) => {
      setLastEvent(`New Message: ${data.message._id}`);
      setEvents((prev) => [`New Message: ${data.message._id}`, ...prev.slice(0, 9)]);
    });
    
    chatSocket.onUserTyping((data) => {
      setLastEvent(`User Typing: ${data.user_id}`);
      setEvents((prev) => [`User Typing: ${data.user_id}`, ...prev.slice(0, 9)]);
    });
    
    chatSocket.onConversationJoined((data) => {
      setLastEvent(`Joined: ${data.conversation_id}`);
      setEvents((prev) => [`Joined: ${data.conversation_id}`, ...prev.slice(0, 9)]);
    });

    return () => {
      clearInterval(interval);
    };
  }, [checkSocketStatus]);

  const handleReconnect = () => {
    reconnectSocket();
    setTimeout(checkSocketStatus, 1000);
  };


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

