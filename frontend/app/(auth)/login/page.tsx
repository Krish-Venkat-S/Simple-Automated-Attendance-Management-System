import AuthPage from "@/components/Auth";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login",
  description: "Authentication page",
};


export default function Page() {

  return <AuthPage mode={'login'} />;
}