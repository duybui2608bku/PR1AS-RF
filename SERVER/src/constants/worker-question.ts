export enum WorkerQuestionVisibility {
  PUBLIC = "public",
  PRIVATE = "private",
}

export const WORKER_QUESTION_LIMITS = {
  MIN_QUESTION_LENGTH: 5,
  MAX_QUESTION_LENGTH: 1000,
  MIN_ANSWER_LENGTH: 1,
  MAX_ANSWER_LENGTH: 2000,
  MAX_NICKNAME_LENGTH: 60,
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 50,
} as const;

export const WORKER_QUESTION_MESSAGES = {
  QUESTION_CREATED: "Đã gửi câu hỏi thành công",
  QUESTIONS_FETCHED: "Lấy danh sách câu hỏi thành công",
  QUESTION_ANSWERED: "Đã trả lời câu hỏi thành công",
  QUESTION_NOT_FOUND: "Không tìm thấy câu hỏi",
  WORKER_NOT_FOUND: "Không tìm thấy người thực hiện",
  EMAIL_REQUIRED: "Email là bắt buộc",
  CANNOT_ASK_SELF: "Bạn không thể tự hỏi chính mình",
  ALREADY_ANSWERED: "Câu hỏi này đã được trả lời",
  UNAUTHORIZED_ANSWER: "Bạn không có quyền trả lời câu hỏi này",
} as const;

export const WORKER_QUESTION_MASK = "***";
