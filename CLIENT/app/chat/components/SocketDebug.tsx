"use client";

import { useState, useEffect } from "react";
import { Card, Button, Typography, Space, Tag, Divider } from "antd";
import { ReloadOutlined, CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import { chatSocket } from "@/lib/socket";
import { reconnectSocket } from "@/lib/socket/config";

const { Text, Title } = Typography;

export const SocketDebug = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [socketId, setSocketId] = useState<string | null>(null);
  const [tokenExists, setTokenExists] = useState(false);
  const [lastEvent, setLastEvent] = useState<string>("");
  const [events, setEvents] = useState<string[]>([]);

  const checkSocketStatus = () => {
    const connected = chatSocket.isConnected();
    setIsConnected(connected);
    
    const token = localStorage.getItem("token");
    setTokenExists(!!token);
    
    // Get socket ID using the new method
    const id = chatSocket.getSocketId();
    setSocketId(id);
  };

  useEffect(() => {
    checkSocketStatus();
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
  }, []);

  const handleReconnect = () => {
    reconnectSocket();
    setTimeout(checkSocketStatus, 1000);
  };


  return (
    <Card
      title="Socket Debug Panel"
      size="small"
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        width: 400,
        maxHeight: 600,
        overflow: "auto",
        zIndex: 1000,
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      }}
      extra={
        <Button size="small" icon={<ReloadOutlined />} onClick={handleReconnect}>
          Reconnect
        </Button>
      }
    >
      <Space direction="vertical" style={{ width: "100%" }} size="small">
        <div>
          <Text strong>Connection Status: </Text>
          {isConnected ? (
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
          <Text code>{socketId || "N/A"}</Text>
        </div>

        <div>
          <Text strong>Token: </Text>
          {tokenExists ? (
            <Tag color="green">Exists</Tag>
          ) : (
            <Tag color="red">Missing</Tag>
          )}
        </div>

        <Divider style={{ margin: "8px 0" }} />

        <div>
          <Text strong>Last Event:</Text>
          <div style={{ marginTop: 4 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {lastEvent || "No events yet"}
            </Text>
          </div>
        </div>

        <Divider style={{ margin: "8px 0" }} />

        <div>
          <Text strong>Recent Events:</Text>
          <div
            style={{
              marginTop: 4,
              maxHeight: 150,
              overflow: "auto",
              backgroundColor: "#f5f5f5",
              padding: 8,
              borderRadius: 4,
            }}
          >
            {events.length === 0 ? (
              <Text type="secondary" style={{ fontSize: 12 }}>
                No events
              </Text>
            ) : (
              events.map((event, index) => (
                <div key={index} style={{ fontSize: 11, marginBottom: 4 }}>
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

