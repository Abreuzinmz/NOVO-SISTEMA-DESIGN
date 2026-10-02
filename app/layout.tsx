import type {Metadata} from 'next';
import './globals.css';
import { Sora, Plus_Jakarta_Sans } from 'next/font/google';
import { cn } from "@/lib/utils";
import { StoreProvider } from '@/lib/store';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from 'next-themes';
import { ConfirmDialogProvider } from '@/components/ui/confirm-dialog';

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sora',
  weight: ['300', '400', '500', '600', '700', '800'],
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'Retifica Mendonça - Gestão de O.S.',
  description: 'Sistema completo de gerenciamento de ordens de serviço para Retifica Mendonça.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={cn("font-sans antialiased", sora.variable, plusJakarta.variable)}>
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
              <Toaster position="top-right" richColors />
            </ConfirmDialogProvider>
          </StoreProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
