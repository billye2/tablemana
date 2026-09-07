import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";

export const metadata: Metadata = { title: "Sign in" };

/** Clerk-hosted sign-in (email code or Google). Returns to the URL that sent the visitor here. */
export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-14">
      <SignIn />
    </div>
  );
}
