"use client";

import { Progress, Typography, Space, CheckCircleOutlined, CloseCircleOutlined } from "antd";
import { useMemo } from "react";

const { Text } = Typography;

export interface PasswordStrengthProps {
  password: string;
  showRequirements?: boolean;
}

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const requirements: PasswordRequirement[] = [
  {
    label: "Ít nhất 8 ký tự",
    test: (pwd) => pwd.length >= 8,
  },
  {
    label: "Có chữ hoa",
    test: (pwd) => /[A-Z]/.test(pwd),
  },
  {
    label: "Có chữ thường",
    test: (pwd) => /[a-z]/.test(pwd),
  },
  {
    label: "Có số",
    test: (pwd) => /[0-9]/.test(pwd),
  },
  {
    label: "Có ký tự đặc biệt (!@#$%^&*)",
    test: (pwd) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd),
  },
];

/**
 * Tính điểm mạnh của password (0-100)
 */
function calculatePasswordStrength(password: string): number {
  if (!password) return 0;

  let strength = 0;

  // Độ dài (tối đa 30 điểm)
  if (password.length >= 8) strength += 10;
  if (password.length >= 12) strength += 10;
  if (password.length >= 16) strength += 10;

  // Các loại ký tự (tối đa 70 điểm)
  if (/[a-z]/.test(password)) strength += 15; // lowercase
  if (/[A-Z]/.test(password)) strength += 15; // uppercase
  if (/[0-9]/.test(password)) strength += 15; // numbers
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength += 15; // special
  if (password.length > 12 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /[0-9]/.test(password) && /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    strength += 10; // bonus cho password phức tạp và dài
  }

  return Math.min(strength, 100);
}

/**
 * Lấy level và màu sắc dựa trên điểm số
 */
function getStrengthLevel(strength: number): {
  level: "weak" | "medium" | "strong";
  color: string;
  label: string;
} {
  if (strength < 40) {
    return { level: "weak", color: "#ff4d4f", label: "Yếu" };
  } else if (strength < 70) {
    return { level: "medium", color: "#faad14", label: "Trung bình" };
  } else {
    return { level: "strong", color: "#52c41a", label: "Mạnh" };
  }
}

export function PasswordStrength({ password, showRequirements = true }: PasswordStrengthProps) {
  const strength = useMemo(() => calculatePasswordStrength(password), [password]);
  const { level, color, label } = useMemo(() => getStrengthLevel(strength), [strength]);

  if (!password) {
    return showRequirements ? (
      <div style={{ marginTop: 8 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Yêu cầu mật khẩu:
        </Text>
        <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
          {requirements.map((req, index) => (
            <li key={index} style={{ fontSize: 12, color: "var(--ant-color-text-secondary)" }}>
              {req.label}
            </li>
          ))}
        </ul>
      </div>
    ) : null;
  }

  const metRequirements = requirements.filter((req) => req.test(password));
  const allRequirementsMet = metRequirements.length === requirements.length;

  return (
    <div style={{ marginTop: 8 }}>
      <Space orientation="vertical" size="small" style={{ width: "100%" }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <Text style={{ fontSize: 12 }}>Độ mạnh mật khẩu:</Text>
            <Text style={{ fontSize: 12, fontWeight: 500, color }}>{label}</Text>
          </div>
          <Progress
            percent={strength}
            showInfo={false}
            strokeColor={color}
            size="small"
            style={{ marginBottom: 0 }}
          />
        </div>

        {showRequirements && (
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Yêu cầu:
            </Text>
            <ul style={{ marginTop: 4, marginBottom: 0, paddingLeft: 20 }}>
              {requirements.map((req, index) => {
                const met = req.test(password);
                return (
                  <li
                    key={index}
                    style={{
                      fontSize: 12,
                      color: met
                        ? "var(--ant-color-success)"
                        : "var(--ant-color-text-secondary)",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    {met ? (
                      <CheckCircleOutlined style={{ color: "var(--ant-color-success)" }} />
                    ) : (
                      <CloseCircleOutlined style={{ color: "var(--ant-color-text-secondary)" }} />
                    )}
                    {req.label}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </Space>
    </div>
  );
}

/**
 * Validate password complexity
 * Trả về true nếu password đáp ứng tất cả requirements
 */
export function validatePasswordComplexity(password: string): boolean {
  return requirements.every((req) => req.test(password));
}

