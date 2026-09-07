import type { Metadata } from "next";
import { SignUp } from "@clerk/nextjs";

export const metadata: Metadata = { title: "Create your account" };

/** New owners land on /start afterwards to build their first restaurant. */
export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-14">
      <SignUp />
    </div>
  );
}
