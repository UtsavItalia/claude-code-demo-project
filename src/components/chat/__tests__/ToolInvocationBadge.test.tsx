import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { getToolLabel, ToolInvocationBadge } from "../ToolInvocationBadge";

afterEach(() => {
  cleanup();
});

// --- getToolLabel unit tests ---

test("getToolLabel: str_replace_editor create", () => {
  expect(getToolLabel("str_replace_editor", { command: "create", path: "/App.jsx" })).toBe("Creating App.jsx");
});

test("getToolLabel: str_replace_editor create strips nested path", () => {
  expect(getToolLabel("str_replace_editor", { command: "create", path: "/src/components/Button.tsx" })).toBe("Creating Button.tsx");
});

test("getToolLabel: str_replace_editor str_replace", () => {
  expect(getToolLabel("str_replace_editor", { command: "str_replace", path: "/Card.tsx" })).toBe("Editing Card.tsx");
});

test("getToolLabel: str_replace_editor insert", () => {
  expect(getToolLabel("str_replace_editor", { command: "insert", path: "/styles.css" })).toBe("Inserting into styles.css");
});

test("getToolLabel: str_replace_editor view", () => {
  expect(getToolLabel("str_replace_editor", { command: "view", path: "/index.jsx" })).toBe("Reading index.jsx");
});

test("getToolLabel: file_manager rename", () => {
  expect(getToolLabel("file_manager", { command: "rename", path: "/Foo.jsx", new_path: "/Bar.jsx" })).toBe("Renaming Foo.jsx → Bar.jsx");
});

test("getToolLabel: file_manager delete", () => {
  expect(getToolLabel("file_manager", { command: "delete", path: "/unused.tsx" })).toBe("Deleting unused.tsx");
});

test("getToolLabel: unknown tool returns bare tool name", () => {
  expect(getToolLabel("some_other_tool", {})).toBe("some_other_tool");
});

test("getToolLabel: path with no slashes returns as-is", () => {
  expect(getToolLabel("str_replace_editor", { command: "create", path: "App.jsx" })).toBe("Creating App.jsx");
});

// --- ToolInvocationBadge render tests ---

test("ToolInvocationBadge pending state shows spinner and label", () => {
  render(
    <ToolInvocationBadge
      toolName="str_replace_editor"
      args={{ command: "create", path: "/App.jsx" }}
      state="call"
      result={undefined}
    />
  );

  expect(screen.getByText("Creating App.jsx")).toBeDefined();
  // Spinner has animate-spin class
  const spinner = document.querySelector(".animate-spin");
  expect(spinner).not.toBeNull();
  // No green dot
  const greenDot = document.querySelector(".bg-emerald-500");
  expect(greenDot).toBeNull();
});

test("ToolInvocationBadge completed state shows green dot and label", () => {
  render(
    <ToolInvocationBadge
      toolName="str_replace_editor"
      args={{ command: "create", path: "/App.jsx" }}
      state="result"
      result="Success"
    />
  );

  expect(screen.getByText("Creating App.jsx")).toBeDefined();
  const greenDot = document.querySelector(".bg-emerald-500");
  expect(greenDot).not.toBeNull();
  // No spinner
  const spinner = document.querySelector(".animate-spin");
  expect(spinner).toBeNull();
});

test("ToolInvocationBadge result state with no result shows spinner", () => {
  render(
    <ToolInvocationBadge
      toolName="str_replace_editor"
      args={{ command: "str_replace", path: "/Card.tsx" }}
      state="result"
      result={undefined}
    />
  );

  expect(screen.getByText("Editing Card.tsx")).toBeDefined();
  const spinner = document.querySelector(".animate-spin");
  expect(spinner).not.toBeNull();
});

test("ToolInvocationBadge falls back to tool name for unknown tool", () => {
  render(
    <ToolInvocationBadge
      toolName="unknown_tool"
      args={{}}
      state="call"
      result={undefined}
    />
  );

  expect(screen.getByText("unknown_tool")).toBeDefined();
});
