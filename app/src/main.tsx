import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { ThemeProvider } from 'next-themes'
import './index.css'
import { TRPCProvider } from "@/providers/trpc"
import { AccentProvider } from "@/providers/accent"
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <AccentProvider>
          <TRPCProvider>
            <App />
          </TRPCProvider>
        </AccentProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
