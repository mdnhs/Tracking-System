"use client"

import {
  AiBrain01Icon,
  AiChat02Icon,
  Alert02Icon,
  ArrowDown02Icon,
  ArrowUp02Icon,
  Copy01Icon,
  Delete02Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { sendChatMessage } from "@/lib/ai/chat-actions"
import { cn } from "@/lib/utils"

interface ChatMessage {
  role: "user" | "assistant"
  content: string
  at: number
}

const SUGGESTIONS = [
  "How many tasks are overdue right now?",
  "Who has the most open work?",
  "Summarise the latest daily reports.",
  "What are the most common delay reasons?",
]

const MAX_COMPOSER_HEIGHT = 160

// Module scope keeps the impure clock read out of the component render body.
function timestamp(): number {
  return Date.now()
}

export function AiChat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [showJump, setShowJump] = useState(false)
  const [pending, startTransition] = useTransition()
  const listRef = useRef<HTMLDivElement>(null)
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const stickRef = useRef(true)

  function scrollToEnd() {
    const list = listRef.current
    if (!list) return
    list.scrollTop = list.scrollHeight
    stickRef.current = true
    setShowJump(false)
  }

  function onScroll() {
    const list = listRef.current
    if (!list) return
    const nearBottom =
      list.scrollHeight - list.scrollTop - list.clientHeight < 56
    stickRef.current = nearBottom
    setShowJump(!nearBottom)
  }

  useEffect(() => {
    if (stickRef.current) scrollToEnd()
  }, [messages, pending, error, open])

  useEffect(() => {
    const composer = composerRef.current
    if (!composer) return
    composer.style.height = "auto"
    composer.style.height = `${Math.min(composer.scrollHeight, MAX_COMPOSER_HEIGHT)}px`
  }, [input])

  function send(text: string) {
    const content = text.trim()
    if (!content || pending) return
    const next: ChatMessage[] = [
      ...messages,
      { role: "user", content, at: timestamp() },
    ]
    setMessages(next)
    setInput("")
    setError(null)
    stickRef.current = true
    setShowJump(false)
    startTransition(async () => {
      const result = await sendChatMessage({
        messages: next.map(({ role, content }) => ({ role, content })),
      })
      if (!result.ok) {
        setError(result.error ?? "The AI assistant could not reply. Try again.")
        return
      }
      setMessages([
        ...next,
        { role: "assistant", content: result.reply ?? "", at: timestamp() },
      ])
    })
  }

  const hasMessages = messages.length > 0

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            aria-label="Open AI assistant"
          />
        }
      >
        <HugeiconsIcon icon={AiChat02Icon} strokeWidth={2} />
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-md">
        <SheetHeader className="gap-2 border-b pr-12">
          <SheetTitle className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <HugeiconsIcon
                icon={AiChat02Icon}
                strokeWidth={2}
                className="size-4"
              />
            </span>
            AI Assistant
            <Badge variant="info">AI</Badge>
            {hasMessages ? (
              <Button
                variant="ghost"
                size="icon-xs"
                className="ml-auto text-muted-foreground"
                aria-label="Clear conversation"
                onClick={() => {
                  setMessages([])
                  setError(null)
                  setShowJump(false)
                }}
              >
                <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
              </Button>
            ) : null}
          </SheetTitle>
          <SheetDescription>
            Ask about tasks, employees, daily reports and progress. Replies are
            AI-generated from the system data and may be inaccurate — verify
            important details.
          </SheetDescription>
        </SheetHeader>

        <div className="relative min-h-0 flex-1">
          <div
            ref={listRef}
            onScroll={onScroll}
            role="log"
            aria-live="polite"
            aria-label="Chat messages"
            className="flex h-full flex-col gap-5 overflow-y-auto overscroll-contain p-4"
          >
            {!hasMessages && !pending ? (
              <div className="m-auto flex max-w-sm flex-col items-center gap-4 text-center">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <HugeiconsIcon
                    icon={AiChat02Icon}
                    strokeWidth={2}
                    className="size-6"
                  />
                </span>
                <div className="flex flex-col gap-1">
                  <p className="font-heading text-base font-medium">
                    Ask about your tracking data
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Tasks, employees, daily reports and progress — in plain
                    language.
                  </p>
                </div>
                <div className="flex w-full flex-col gap-2">
                  {SUGGESTIONS.map((suggestion) => (
                    <Button
                      key={suggestion}
                      variant="outline"
                      size="sm"
                      className="h-auto justify-start py-2 text-left whitespace-normal"
                      onClick={() => send(suggestion)}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  AI assistant, not a person. It is read-only and cannot change
                  anything. Your question and the relevant data are sent to the
                  AI provider configured in Settings.
                </p>
              </div>
            ) : null}

            {messages.map((message, index) => (
              <ChatBubble key={index} message={message} />
            ))}

            {pending ? <ThinkingBubble /> : null}

            {error ? (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
              >
                <HugeiconsIcon
                  icon={Alert02Icon}
                  strokeWidth={2}
                  className="mt-0.5 size-4 shrink-0"
                />
                {error}
              </div>
            ) : null}
          </div>

          {showJump ? (
            <Button
              variant="outline"
              size="sm"
              className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full shadow-md"
              onClick={scrollToEnd}
            >
              <HugeiconsIcon
                icon={ArrowDown02Icon}
                strokeWidth={2}
                data-icon="inline-start"
              />
              Latest
            </Button>
          ) : null}
        </div>

        <form
          className="border-t p-3"
          onSubmit={(event) => {
            event.preventDefault()
            send(input)
          }}
        >
          <div className="flex items-end gap-2 rounded-xl border bg-background p-2 transition-[color,box-shadow] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
            <Textarea
              ref={composerRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault()
                  send(input)
                }
              }}
              placeholder="Ask about your tracking data…"
              aria-label="Message the AI assistant"
              rows={1}
              className="max-h-40 min-h-9 flex-1 resize-none border-0 bg-transparent py-1.5 shadow-none focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent"
            />
            <Button
              type="submit"
              size="icon"
              className="rounded-full"
              disabled={pending || input.trim() === ""}
              aria-label="Send message"
            >
              <HugeiconsIcon icon={ArrowUp02Icon} strokeWidth={2} />
            </Button>
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Enter to send · Shift + Enter for a new line
          </p>
        </form>
      </SheetContent>
    </Sheet>
  )
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const time = new Date(message.at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })

  if (message.role === "user") {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="max-w-sm rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-sm break-words whitespace-pre-wrap text-primary-foreground">
          {message.content}
        </div>
        <span className="px-1 text-xs text-muted-foreground">{time}</span>
      </div>
    )
  }

  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <HugeiconsIcon
          icon={AiBrain01Icon}
          strokeWidth={2}
          className="size-4"
        />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            AI-generated
          </span>
          <span className="text-xs text-muted-foreground/70">{time}</span>
          <CopyButton text={message.content} />
        </div>
        <div className="rounded-2xl rounded-tl-sm border bg-muted/40 px-3.5 py-2.5 text-sm">
          <Markdown text={message.content} />
        </div>
      </div>
    </div>
  )
}

function ThinkingBubble() {
  return (
    <div className="flex gap-3" role="status">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <HugeiconsIcon
          icon={AiBrain01Icon}
          strokeWidth={2}
          className="size-4"
        />
      </span>
      <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm border bg-muted/40 px-3.5 py-3">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
        <span className="sr-only">AI is thinking</span>
      </div>
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      variant="ghost"
      size="xs"
      className="ml-auto text-muted-foreground"
      aria-label={copied ? "Reply copied" : "Copy reply"}
      onClick={() => {
        navigator.clipboard
          .writeText(text)
          .then(() => setCopied(true))
          .catch(() => setCopied(false))
      }}
    >
      <HugeiconsIcon
        icon={copied ? Tick02Icon : Copy01Icon}
        strokeWidth={2}
        data-icon="inline-start"
      />
      {copied ? "Copied" : "Copy"}
    </Button>
  )
}

type Block =
  { type: "p" | "h"; text: string } | { type: "ul" | "ol"; items: string[] }

function parseBlocks(text: string): Block[] {
  const blocks: Block[] = []
  let list: Extract<Block, { items: string[] }> | null = null
  for (const raw of text.split("\n")) {
    const line = raw.trim()
    const unordered = /^[-*]\s+(.*)$/.exec(line)
    const ordered = /^\d+[.)]\s+(.*)$/.exec(line)
    if (unordered || ordered) {
      const type = ordered ? "ol" : "ul"
      if (!list || list.type !== type) {
        list = { type, items: [] }
        blocks.push(list)
      }
      list.items.push((unordered ?? ordered)![1])
      continue
    }
    list = null
    if (!line) continue
    const heading = /^#{1,6}\s+(.*)$/.exec(line)
    blocks.push(
      heading ? { type: "h", text: heading[1] } : { type: "p", text: line }
    )
  }
  return blocks
}

function renderInline(text: string): ReactNode[] {
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g
  const nodes: ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  let key = 0
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index))
    const token = match[0]
    if (token.startsWith("**")) {
      nodes.push(
        <strong key={key++} className="font-semibold">
          {token.slice(2, -2)}
        </strong>
      )
    } else if (token.startsWith("`")) {
      nodes.push(
        <code
          key={key++}
          className="rounded bg-foreground/10 px-1 py-0.5 font-mono text-xs"
        >
          {token.slice(1, -1)}
        </code>
      )
    } else {
      nodes.push(<em key={key++}>{token.slice(1, -1)}</em>)
    }
    lastIndex = match.index + token.length
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex))
  return nodes
}

function Markdown({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-2">
      {parseBlocks(text).map((block, index) => {
        if ("items" in block) {
          const Tag = block.type
          return (
            <Tag
              key={index}
              className={cn(
                "flex flex-col gap-1 pl-4",
                block.type === "ul" ? "list-disc" : "list-decimal"
              )}
            >
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex} className="marker:text-muted-foreground">
                  {renderInline(item)}
                </li>
              ))}
            </Tag>
          )
        }
        if (block.type === "h") {
          return (
            <p key={index} className="font-semibold">
              {renderInline(block.text)}
            </p>
          )
        }
        return <p key={index}>{renderInline(block.text)}</p>
      })}
    </div>
  )
}
