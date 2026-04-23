import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* Grammarly and similar extensions mutate <body> before React hydrates */}
      <body suppressHydrationWarning>
        <div className="container">{children}</div>
      </body>
    </html>
  );
}

