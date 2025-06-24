// This file is no longer needed as its logic has been consolidated into the root layout
// and the (main) route group has been removed to simplify routing.
export default function RedundantLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
