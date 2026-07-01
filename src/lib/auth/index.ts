import { DEMO_MODE, DEMO_USER } from "@/lib/demo";

export type User = {
  id: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
};

export type AuthResult =
  | { ok: true; user: User }
  | { ok: false; response: Response };

export function requireAuth(..._args: unknown[]): AuthResult {
  if (DEMO_MODE) {
    return { ok: true, user: DEMO_USER };
  }
  // In non-demo mode, require authentication via a simple cookie/session check
  // For now, always return demo user (extend later with real auth)
  return { ok: true, user: DEMO_USER };
}
