// This layout is no longer needed as the logic has been moved to the root layout.
// It is kept to avoid breaking the build process and to preserve the route group.
export default function MainAppLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
