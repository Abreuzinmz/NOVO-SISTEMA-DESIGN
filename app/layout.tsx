import type {Metadata} from 'next';
import './globals.css';
import { Inter } from 'next/font/google';
import { cn } from "@/lib/utils";
import { StoreProvider } from '@/lib/store';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from 'next-themes';
import { ConfirmDialogProvider } from '@/components/ui/confirm-dialog';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Retifica Mendonça - Gestão de O.S.',
  description: 'Sistema completo de gerenciamento de ordens de serviço para Retifica Mendonça.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={cn("font-sans antialiased", inter.variable)}>
      <body className="min-h-screen bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={true}
          disableTransitionOnChange={false}
          storageKey="retifica-theme"
        >
          {process.env.NODE_ENV !== 'production' && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 9999,
              background: '#ff4444',
              color: 'white',
              textAlign: 'center',
              fontSize: '12px',
              fontWeight: 'bold',
              padding: '4px',
              pointerEvents: 'none',
            }}>
              ⚠️ AMBIENTE DE TESTE — alterações NÃO afetam dados reais
            </div>
          )}
          <StoreProvider>
            <ConfirmDialogProvider>
              {children}
              <Toaster position="bottom-right" richColors visibleToasts={3} />
            </ConfirmDialogProvider>
          </StoreProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
