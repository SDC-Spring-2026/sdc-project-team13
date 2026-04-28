import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var m = document.cookie.match(/(?:^|; )cache_theme=([^;]+)/);
                  var theme = m ? decodeURIComponent(m[1]) : 'system';
                  var root = document.documentElement;
                  var isDark = theme === 'dark' || (theme === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
                  if (isDark) root.classList.add('dark'); else root.classList.remove('dark');
                } catch (e) {}
              })();
            `
          }}
        />
      </head>
      {/* Grammarly and similar extensions mutate <body> before React hydrates */}
      <body suppressHydrationWarning className="min-h-dvh antialiased">
        {children}
      </body>
    </html>
  );
}

