import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jurídico Rápido",
  description: "Cadastro rápido de assistidos e geração automática de documentos."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
