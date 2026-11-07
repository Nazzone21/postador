import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { AuthForm } from "../auth-form";

export default async function SignupPage() {
  if (await getUser()) redirect("/painel");
  return <AuthForm mode="signup" />;
}
