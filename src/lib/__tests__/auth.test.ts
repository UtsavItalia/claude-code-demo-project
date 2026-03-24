// @vitest-environment node
import { test, expect, vi, beforeEach } from "vitest";
import { SignJWT } from "jose";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

const mockCookieStore = {
  set: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

// Must import after mocks are registered
const { createSession, getSession, deleteSession, verifySession } =
  await import("../auth");

const JWT_SECRET = new TextEncoder().encode("development-secret-key");

async function makeToken(payload: object, expiresAt: Date | string = "7d") {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresAt)
    .setIssuedAt()
    .sign(JWT_SECRET);
}

const PAST = new Date(0); // unix epoch — always expired

beforeEach(() => {
  vi.clearAllMocks();
});

// --- createSession ---

test("createSession sets auth-token cookie with correct name", async () => {
  await createSession("user-1", "user@example.com");

  expect(mockCookieStore.set).toHaveBeenCalledOnce();
  const [name] = mockCookieStore.set.mock.calls[0];
  expect(name).toBe("auth-token");
});

test("createSession sets httpOnly cookie", async () => {
  await createSession("user-1", "user@example.com");

  const [, , options] = mockCookieStore.set.mock.calls[0];
  expect(options.httpOnly).toBe(true);
});

test("createSession sets sameSite lax", async () => {
  await createSession("user-1", "user@example.com");

  const [, , options] = mockCookieStore.set.mock.calls[0];
  expect(options.sameSite).toBe("lax");
});

test("createSession sets path to /", async () => {
  await createSession("user-1", "user@example.com");

  const [, , options] = mockCookieStore.set.mock.calls[0];
  expect(options.path).toBe("/");
});

test("createSession sets expiry ~7 days from now", async () => {
  const before = Date.now();
  await createSession("user-1", "user@example.com");
  const after = Date.now();

  const [, , options] = mockCookieStore.set.mock.calls[0];
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const expiresMs = options.expires.getTime();

  expect(expiresMs).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
  expect(expiresMs).toBeLessThanOrEqual(after + sevenDaysMs + 1000);
});

test("createSession token is a valid JWT containing userId and email", async () => {
  await createSession("user-42", "test@example.com");

  const [, token] = mockCookieStore.set.mock.calls[0];
  const { jwtVerify } = await import("jose");
  const { payload } = await jwtVerify(token, JWT_SECRET);

  expect(payload.userId).toBe("user-42");
  expect(payload.email).toBe("test@example.com");
});

// --- getSession ---

test("getSession returns null when no cookie present", async () => {
  mockCookieStore.get.mockReturnValue(undefined);

  const session = await getSession();
  expect(session).toBeNull();
});

test("getSession returns session payload for valid token", async () => {
  const token = await makeToken({
    userId: "user-1",
    email: "user@example.com",
    expiresAt: new Date(),
  });
  mockCookieStore.get.mockReturnValue({ value: token });

  const session = await getSession();

  expect(session).not.toBeNull();
  expect(session?.userId).toBe("user-1");
  expect(session?.email).toBe("user@example.com");
});

test("getSession returns null for expired token", async () => {
  const token = await makeToken(
    { userId: "user-1", email: "user@example.com", expiresAt: new Date() },
    PAST
  );
  mockCookieStore.get.mockReturnValue({ value: token });

  const session = await getSession();
  expect(session).toBeNull();
});

test("getSession returns null for tampered token", async () => {
  mockCookieStore.get.mockReturnValue({ value: "not.a.valid.jwt" });

  const session = await getSession();
  expect(session).toBeNull();
});

// --- deleteSession ---

test("deleteSession deletes the auth-token cookie", async () => {
  await deleteSession();

  expect(mockCookieStore.delete).toHaveBeenCalledOnce();
  expect(mockCookieStore.delete).toHaveBeenCalledWith("auth-token");
});

// --- verifySession ---

test("verifySession returns null when no cookie in request", async () => {
  const request = new NextRequest("http://localhost/");

  const session = await verifySession(request);
  expect(session).toBeNull();
});

test("verifySession returns session payload for valid token in request", async () => {
  const token = await makeToken({
    userId: "user-99",
    email: "verify@example.com",
    expiresAt: new Date(),
  });
  const request = new NextRequest("http://localhost/", {
    headers: { cookie: `auth-token=${token}` },
  });

  const session = await verifySession(request);

  expect(session).not.toBeNull();
  expect(session?.userId).toBe("user-99");
  expect(session?.email).toBe("verify@example.com");
});

test("verifySession returns null for expired token in request", async () => {
  const token = await makeToken(
    { userId: "user-1", email: "user@example.com", expiresAt: new Date() },
    PAST
  );
  const request = new NextRequest("http://localhost/", {
    headers: { cookie: `auth-token=${token}` },
  });

  const session = await verifySession(request);
  expect(session).toBeNull();
});

test("verifySession returns null for tampered token in request", async () => {
  const request = new NextRequest("http://localhost/", {
    headers: { cookie: "auth-token=bad.token.here" },
  });

  const session = await verifySession(request);
  expect(session).toBeNull();
});

test("verifySession ignores other cookies and reads only auth-token", async () => {
  const token = await makeToken({
    userId: "user-1",
    email: "user@example.com",
    expiresAt: new Date(),
  });
  const request = new NextRequest("http://localhost/", {
    headers: { cookie: `other-cookie=abc; auth-token=${token}; another=xyz` },
  });

  const session = await verifySession(request);
  expect(session?.userId).toBe("user-1");
});
