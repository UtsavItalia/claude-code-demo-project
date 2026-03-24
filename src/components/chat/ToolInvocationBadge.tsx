"use client";

import { Loader2 } from "lucide-react";

export function getToolLabel(toolName: string, args: any): string {
  const filename = (path: string) => path?.split("/").pop() ?? path;

  if (toolName === "str_replace_editor" && args) {
    switch (args.command) {
      case "create":
        return `Creating ${filename(args.path)}`;
      case "str_replace":
        return `Editing ${filename(args.path)}`;
      case "insert":
        return `Inserting into ${filename(args.path)}`;
      case "view":
        return `Reading ${filename(args.path)}`;
    }
  }

  if (toolName === "file_manager" && args) {
    switch (args.command) {
      case "rename":
        return `Renaming ${filename(args.path)} → ${filename(args.new_path)}`;
      case "delete":
        return `Deleting ${filename(args.path)}`;
    }
  }

  return toolName;
}

interface ToolInvocationBadgeProps {
  toolName: string;
  args: any;
  state: string;
  result: any;
}

export function ToolInvocationBadge({
  toolName,
  args,
  state,
  result,
}: ToolInvocationBadgeProps) {
  const label = getToolLabel(toolName, args);
  const isDone = state === "result" && result;

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs border border-neutral-200">
      {isDone ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600 flex-shrink-0" />
      )}
      <span className="text-neutral-700">{label}</span>
    </div>
  );
}
