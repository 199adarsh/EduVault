"use client";

import React from "react";
import {
  Copy,
  Flag,
  MoreHorizontal,
  MoreVertical,
  Reply,
  Trash2,
  UserMinus2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const DEMO_USER = {
  id: "user-123",
  name: "You",
  avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64&fit=crop&crop=faces",
};

type StatusType = "online" | "dnd" | "offline";
const DEMO_OTHER = {
  id: "user-456",
  name: "EduVault AI",
  avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=64&h=64&fit=crop&crop=faces",
  status: "online" as StatusType,
};

const STATUS_COLORS: Record<StatusType, string> = {
  online: "bg-emerald-500",
  dnd: "bg-rose-500",
  offline: "bg-slate-400",
};

function StatusBadge({ status }: { status: StatusType }) {
  return (
    <span
      aria-label={status}
      className={cn(
        "inline-block size-2.5 rounded-full border-2 border-background",
        STATUS_COLORS[status] || STATUS_COLORS.online
      )}
      title={status.charAt(0).toUpperCase() + status.slice(1)}
    />
  );
}

function UserActionsMenu({ onClear }: { onClear?: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label="User actions"
          className="border-muted-foreground/30 size-8"
          size="icon"
          type="button"
          variant="outline"
        >
          <MoreVertical
            aria-hidden="true"
            className="size-4"
            focusable="false"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-36 rounded-lg bg-popover p-1 shadow-xl">
        <div className="flex flex-col gap-1">
          {onClear && (
            <Button
              onClick={onClear}
              className="w-full justify-start gap-2 rounded bg-transparent text-destructive hover:bg-accent"
              size="sm"
              type="button"
              variant="ghost"
            >
              <Trash2 aria-hidden="true" className="size-4" focusable="false" />
              <span className="font-medium text-xs">Clear Conversation</span>
            </Button>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MessageActions({ isMe, onCopy }: { isMe: boolean; onCopy?: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label="Message actions"
          className="size-6 rounded bg-background hover:bg-accent p-0"
          size="icon"
          type="button"
          variant="ghost"
        >
          <MoreHorizontal
            aria-hidden="true"
            className="size-3.5"
            focusable="false"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="center"
        className="w-32 rounded-lg bg-popover p-1 shadow-xl"
      >
        <div className="flex flex-col gap-1">
          <Button
            onClick={onCopy}
            aria-label="Copy"
            className="w-full justify-start gap-2 rounded px-2 py-1 text-xs"
            size="sm"
            type="button"
            variant="ghost"
          >
            <Copy aria-hidden="true" className="size-3" focusable="false" />
            <span>Copy</span>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export interface MessageItem {
  id?: string | number;
  role?: string;
  text?: string;
  content?: string;
  time?: string;
  sender?: {
    id: string;
    name: string;
    avatar: string;
  };
}

export default function MessageConversation({
  className,
  messages = [],
  currentUser = DEMO_USER,
  peerUser = DEMO_OTHER,
  onClear,
  onCopyMessage,
}: {
  className?: string;
  messages?: MessageItem[];
  currentUser?: typeof DEMO_USER;
  peerUser?: typeof DEMO_OTHER;
  onClear?: () => void;
  onCopyMessage?: (text: string) => void;
}) {
  return (
    <Card
      className={cn(
        "mx-auto flex h-full min-h-0 w-full grow flex-col overflow-hidden shadow-none border-0",
        className
      )}
    >
      <CardHeader className="sticky top-0 z-10 flex flex-row items-center justify-between gap-2 border-b bg-background px-4 py-2.5">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="size-8">
              <AvatarImage alt={peerUser.name} src={peerUser.avatar} />
              <AvatarFallback>{peerUser.name[0]}</AvatarFallback>
            </Avatar>
          </div>
          <div className="flex flex-col">
            <div className="font-semibold text-sm text-foreground">{peerUser.name}</div>
            <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
              <StatusBadge status={peerUser.status} /> {peerUser.status}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <UserActionsMenu onClear={onClear} />
        </div>
      </CardHeader>

      <CardContent className="min-h-0 flex-1 p-0">
        <ScrollArea
          aria-label="Conversation transcript"
          className="flex h-full max-h-full flex-col gap-4 bg-background p-4"
          role="log"
        >
          {messages.map((msg, idx) => {
            const isMe = msg.role === "user" || msg.sender?.id === currentUser.id;
            const sender = isMe ? currentUser : peerUser;
            const textContent = msg.text || msg.content || "";
            return (
              <div
                className={cn(
                  "group my-3 flex gap-2",
                  isMe ? "justify-end" : "justify-start"
                )}
                key={msg.id || idx}
              >
                <div
                  className={cn(
                    "flex max-w-[85%] items-start gap-2.5",
                    isMe ? "flex-row-reverse" : undefined
                  )}
                >
                  <Avatar className="size-7 shrink-0">
                    <AvatarImage
                      alt={sender.name}
                      src={sender.avatar}
                    />
                    <AvatarFallback>{sender.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div
                      className={cn(
                        "rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed",
                        isMe
                          ? "bg-primary text-primary-foreground rounded-tr-xs"
                          : "bg-muted text-foreground border border-border rounded-tl-xs"
                      )}
                    >
                      {textContent}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <time
                        aria-label={`Sent at ${msg.time || "now"}`}
                        className="text-muted-foreground text-[10px]"
                      >
                        {msg.time || "Just now"}
                      </time>
                      <div className="opacity-0 transition-opacity group-hover:opacity-100">
                        <MessageActions isMe={isMe} onCopy={() => onCopyMessage?.(textContent)} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

