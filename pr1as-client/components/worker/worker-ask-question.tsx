"use client"

import { useState, type FormEvent } from "react"
import { Loader2, Lock, MessageCircleQuestion } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import {
  useAnswerWorkerQuestion,
  useAskWorkerQuestion,
  useWorkerQuestions,
} from "@/lib/hooks/use-worker-questions"
import { INTL_LOCALE_TAGS, type SupportedLocale } from "@/lib/locale"
import { useAuthStore } from "@/lib/store/auth-store"
import { getErrorMessage } from "@/lib/utils/error-handler"
import type {
  WorkerQuestionView,
  WorkerQuestionVisibility,
} from "@/types/worker-question"

const MIN_QUESTION_LENGTH = 5
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const formatDateTime = (value: string, localeTag: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleString(localeTag, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

type Props = {
  workerId: string
  isOwnProfile: boolean
}

export function WorkerAskQuestion({ workerId, isOwnProfile }: Props) {
  const t = useTranslations("WorkerProfile")
  const locale = useLocale() as SupportedLocale
  const localeTag = INTL_LOCALE_TAGS[locale] ?? "vi-VN"
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  const {
    data,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useWorkerQuestions(workerId)
  const askMutation = useAskWorkerQuestion(workerId)

  const [question, setQuestion] = useState("")
  const [visibility, setVisibility] =
    useState<WorkerQuestionVisibility>("public")
  const [nickname, setNickname] = useState("")
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")

  const questions = data?.pages.flatMap((page) => page.data) ?? []

  const resetForm = () => {
    setQuestion("")
    setVisibility("public")
    setNickname("")
    setEmail("")
    setError("")
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedQuestion = question.trim()
    if (trimmedQuestion.length < MIN_QUESTION_LENGTH) {
      setError(t("askWorker.questionMin"))
      return
    }
    if (!isAuthenticated && !EMAIL_PATTERN.test(email.trim())) {
      setError(t("askWorker.emailInvalid"))
      return
    }

    try {
      await askMutation.mutateAsync({
        worker_id: workerId,
        question: trimmedQuestion,
        visibility,
        ...(isAuthenticated
          ? {}
          : { email: email.trim(), nickname: nickname.trim() || undefined }),
      })
      toast.success(t("askWorker.submitSuccess"))
      resetForm()
    } catch (submitError) {
      toast.error(getErrorMessage(submitError, t("askWorker.submitError")))
    }
  }

  return (
    <Card>
      <CardHeader className="p-4 pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <MessageCircleQuestion className="size-4 text-primary" />
          {t("askWorker.title")}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{t("askWorker.subtitle")}</p>
      </CardHeader>
      <CardContent className="space-y-4 p-4 pt-0">
        {!isOwnProfile ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            {!isAuthenticated ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="ask-nickname" className="text-xs">
                    {t("askWorker.nicknameLabel")}
                  </Label>
                  <Input
                    id="ask-nickname"
                    value={nickname}
                    onChange={(event) => setNickname(event.target.value)}
                    placeholder={t("askWorker.nicknamePlaceholder")}
                    maxLength={60}
                    disabled={askMutation.isPending}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ask-email" className="text-xs">
                    {t("askWorker.emailLabel")} *
                  </Label>
                  <Input
                    id="ask-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder={t("askWorker.emailPlaceholder")}
                    disabled={askMutation.isPending}
                  />
                </div>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="ask-question" className="text-xs">
                {t("askWorker.questionLabel")} *
              </Label>
              <Textarea
                id="ask-question"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder={t("askWorker.questionPlaceholder")}
                aria-invalid={Boolean(error)}
                className="min-h-24"
                disabled={askMutation.isPending}
              />
              <p className="text-xs text-destructive">
                {t("askWorker.privacyNote")}
              </p>
            </div>

            <RadioGroup
              value={visibility}
              onValueChange={(value) =>
                setVisibility(value as WorkerQuestionVisibility)
              }
              className="gap-2 sm:grid-cols-2"
              aria-label={t("askWorker.visibilityLabel")}
            >
              <label
                htmlFor="visibility-public"
                className="flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm has-data-checked:border-primary has-data-checked:bg-primary/5"
              >
                <RadioGroupItem
                  id="visibility-public"
                  value="public"
                  className="mt-0.5"
                />
                <span>
                  <span className="font-medium">
                    {t("askWorker.visibilityPublic")}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {t("askWorker.visibilityPublicHint")}
                  </span>
                </span>
              </label>
              <label
                htmlFor="visibility-private"
                className="flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm has-data-checked:border-primary has-data-checked:bg-primary/5"
              >
                <RadioGroupItem
                  id="visibility-private"
                  value="private"
                  className="mt-0.5"
                />
                <span>
                  <span className="font-medium">
                    {t("askWorker.visibilityPrivate")}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {t("askWorker.visibilityPrivateHint")}
                  </span>
                </span>
              </label>
            </RadioGroup>

            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}

            <Button
              type="submit"
              disabled={askMutation.isPending}
              className="w-full sm:w-auto"
            >
              {askMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              {t("askWorker.submit")}
            </Button>
          </form>
        ) : null}

        <Separator />

        <div className="space-y-3">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {t("askWorker.threadTitle")}
          </p>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">
              {t("askWorker.loading")}
            </p>
          ) : questions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("askWorker.empty")}
            </p>
          ) : (
            <>
              <ul className="space-y-3">
                {questions.map((item) => (
                  <QuestionItem
                    key={item.id}
                    item={item}
                    workerId={workerId}
                    localeTag={localeTag}
                    t={t}
                  />
                ))}
              </ul>
              {hasNextPage ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => void fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : null}
                  {t("askWorker.showMore")}
                </Button>
              ) : null}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

type QuestionItemProps = {
  item: WorkerQuestionView
  workerId: string
  localeTag: string
  t: ReturnType<typeof useTranslations>
}

function QuestionItem({ item, workerId, localeTag, t }: QuestionItemProps) {
  const answerMutation = useAnswerWorkerQuestion(workerId)
  const isEditing = item.is_answered
  const [isFormOpen, setIsFormOpen] = useState(!isEditing)
  const [answer, setAnswer] = useState(item.answer ?? "")

  const handleAnswer = async () => {
    const trimmed = answer.trim()
    if (trimmed.length === 0) return
    try {
      await answerMutation.mutateAsync({ questionId: item.id, answer: trimmed })
      toast.success(
        t(isEditing ? "askWorker.answerUpdateSuccess" : "askWorker.answerSuccess")
      )
      if (isEditing) {
        setIsFormOpen(false)
      } else {
        setAnswer("")
      }
    } catch (answerError) {
      toast.error(getErrorMessage(answerError, t("askWorker.answerError")))
    }
  }

  return (
    <li className="rounded-lg border bg-muted/30 p-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>{formatDateTime(item.created_at, localeTag)}</span>
        {item.visibility === "private" ? (
          <Badge variant="secondary" className="gap-1">
            <Lock className="size-3" />
            {t("askWorker.privateBadge")}
          </Badge>
        ) : null}
        {item.asker_nickname ? (
          <span className="font-medium text-foreground">
            {item.asker_nickname}
          </span>
        ) : null}
      </div>

      <p className="mt-1.5 text-sm whitespace-pre-line text-foreground">
        {item.is_masked ? t("askWorker.maskedQuestion") : item.question}
      </p>

      {item.answer ? (
        <div className="mt-2 rounded-lg bg-background p-3 text-sm">
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            {t("askWorker.workerReply")}
          </p>
          <p className="whitespace-pre-line">{item.answer}</p>
        </div>
      ) : null}

      {item.can_answer ? (
        isFormOpen ? (
          <div className="mt-2 space-y-2">
            <Textarea
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder={t("askWorker.answerPlaceholder")}
              className="min-h-16"
              disabled={answerMutation.isPending}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => void handleAnswer()}
                disabled={answerMutation.isPending || answer.trim().length === 0}
              >
                {answerMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                {t(isEditing ? "askWorker.answerUpdate" : "askWorker.answerSubmit")}
              </Button>
              {isEditing ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setAnswer(item.answer ?? "")
                    setIsFormOpen(false)
                  }}
                  disabled={answerMutation.isPending}
                >
                  {t("askWorker.cancel")}
                </Button>
              ) : null}
            </div>
          </div>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-2"
            onClick={() => setIsFormOpen(true)}
          >
            {t("askWorker.answerEdit")}
          </Button>
        )
      ) : null}
    </li>
  )
}
