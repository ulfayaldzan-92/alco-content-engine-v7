import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/lib/theme-provider';
import { LicenseProvider } from '@/lib/license/license-context';
import { LicenseGate } from '@/components/license/LicenseGate';

export const metadata: Metadata = {
  title: 'ALCO Content Engine v2',
  description: 'Premium brand-aware content planning and calendar engine powered by Aladzan Corpora',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-primary selection:text-primary-foreground" suppressHydrationWarning>
        <ThemeProvider>
          <LicenseProvider>
            <LicenseGate>
              {children}
            </LicenseGate>
          </LicenseProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

