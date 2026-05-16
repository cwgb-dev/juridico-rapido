import { CadastroAssistidoForm } from "@/components/cadastro-assistido-form";

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="border-b border-border pb-4">
          <h1 className="text-2xl font-semibold tracking-normal text-foreground sm:text-3xl">
            Gestão Jurídica Web
          </h1>
        </header>
        <CadastroAssistidoForm />
      </div>
    </main>
  );
}
