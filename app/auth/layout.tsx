'use client';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-vaks-light-primary dark:bg-vaks-dark-primary">
      {children}
    </div>
  );
}
