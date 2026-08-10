import { LoginScreen } from "@/features/account/LoginScreen";

export const metadata = { title: "로그인 — 굿퀘스천" };

export default function LoginPage() {
  // api는 클라이언트에서 주입한다. 서버 컴포넌트가 메서드를 가진 객체를 prop으로
  // 넘기면 "Functions cannot be passed directly to Client Components"로 터진다.
  return <LoginScreen />;
}
