import SetupGate from "@/components/SetupGate";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <SetupGate>{children}</SetupGate>;
}
