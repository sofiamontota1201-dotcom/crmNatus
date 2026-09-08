import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { Outfit } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { SessionRefreshProvider } from "@/components/session-refresh-provider"

const outfit = Outfit({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "CRM Natus | Papelería",
  description: "CRM para papelería Natus - Sistema de gestión",
  generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${outfit.className} overflow-x-hidden bg-background text-foreground antialiased`} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          forcedTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <SessionRefreshProvider>
            {children}
          </SessionRefreshProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
