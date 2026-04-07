import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff, Lock, Mail, UserRound } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mascot } from "@/components/Mascot";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/providers/AuthProvider";

type Mode = "signin" | "signup";

type LocationState = {
  from?: {
    pathname?: string;
  };
};

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<Mode>("signin");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectTo = (location.state as LocationState | null)?.from?.pathname || "/";
  const isValidEmail = email.includes("@") && email.includes(".");
  const isPasswordStrong = password.length >= 6;
  const isNicknameValid = mode === "signin" || nickname.trim().length >= 2;
  const passwordsMatch = mode === "signin" || confirmPassword === password;

  const isFormValid =
    mode === "signin"
      ? isValidEmail && password.length > 0
      : isValidEmail && isPasswordStrong && passwordsMatch && isNicknameValid;

  const handleSubmit = async () => {
    if (!isFormValid || isSubmitting) return;
    setIsSubmitting(true);

    if (mode === "signin") {
      const { error } = await signIn(email.trim(), password);
      setIsSubmitting(false);

      if (error) {
        toast({
          title: "Nao foi possivel entrar",
          description: error,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Login realizado!",
        description: "Bem-vindo de volta.",
      });
      navigate(redirectTo, { replace: true });
      return;
    }

    const { error } = await signUp(email.trim(), password, nickname.trim());
    setIsSubmitting(false);

    if (error) {
      toast({
        title: "Nao foi possivel criar conta",
        description: error,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Conta criada com sucesso!",
      description: "Cadastro concluido. Vamos comecar.",
    });
    navigate("/", { replace: true });
  };

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    await handleSubmit();
  };

  return (
    <div className="relative min-h-dvh overflow-x-hidden overflow-y-auto bg-gradient-hero">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_14%,hsl(var(--primary)/0.28),transparent_32%),radial-gradient(circle_at_86%_12%,hsl(var(--primary)/0.2),transparent_28%),radial-gradient(circle_at_80%_88%,hsl(var(--primary)/0.14),transparent_30%)]" />
      <div className="relative mx-auto flex min-h-dvh w-full max-w-sm flex-col px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[34px] border border-primary/30 bg-card px-5 py-5 shadow-gold"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-foreground/70">AZA Finance</p>
              <h1 className="mt-1 text-[27px] font-black leading-[1.02] text-foreground">
                {mode === "signin" ? "Volte pro controle" : "Crie sua conta"}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {mode === "signin"
                  ? "Abra o app e siga seu progresso diario."
                  : "Seu treino financeiro comeca agora."}
              </p>
            </div>
            <Mascot mood="happy" size="sm" showBubble={false} animated={false} className="shrink-0 scale-[1.4]" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mt-4 rounded-[34px] border border-border bg-card px-5 py-5 shadow-aza-lg"
        >
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-muted p-1.5">
              <button
                type="button"
                onClick={() => setMode("signin")}
                className={`h-11 rounded-xl text-sm font-black transition-all ${
                  mode === "signin"
                    ? "bg-gradient-gold text-primary-foreground shadow-gold"
                    : "bg-card text-muted-foreground"
                }`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={`h-11 rounded-xl text-sm font-black transition-all ${
                  mode === "signup"
                    ? "bg-gradient-gold text-primary-foreground shadow-gold"
                    : "bg-card text-muted-foreground"
                }`}
              >
                Cadastrar
              </button>
            </div>

            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wide text-foreground/70">Apelido</Label>
                <div className="relative">
                  <UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={nickname}
                    onChange={(event) => setNickname(event.target.value)}
                    placeholder="Como voce quer ser chamado?"
                    className="h-12 rounded-2xl border-input bg-background pl-9 text-[15px] text-foreground placeholder:text-muted-foreground focus-visible:ring-primary focus-visible:ring-offset-0"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-wide text-foreground/70">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="voce@email.com"
                  className="h-12 rounded-2xl border-input bg-background pl-9 text-[15px] text-foreground placeholder:text-muted-foreground focus-visible:ring-primary focus-visible:ring-offset-0"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-wide text-foreground/70">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Minimo de 6 caracteres"
                  className="h-12 rounded-2xl border-input bg-background pl-9 pr-10 text-[15px] text-foreground placeholder:text-muted-foreground focus-visible:ring-primary focus-visible:ring-offset-0"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wide text-foreground/70">Confirmar senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Repita sua senha"
                    className="h-12 rounded-2xl border-input bg-background pl-9 text-[15px] text-foreground placeholder:text-muted-foreground focus-visible:ring-primary focus-visible:ring-offset-0"
                  />
                </div>
              </div>
            )}

            {mode === "signup" && confirmPassword.length > 0 && !passwordsMatch && (
              <p className="text-xs font-bold text-destructive">As senhas nao conferem.</p>
            )}

            <Button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className="h-12 w-full rounded-2xl border border-primary/30 bg-gradient-gold text-base font-black text-primary-foreground shadow-gold hover:opacity-95 active:translate-y-[1px]"
            >
              {isSubmitting ? (
                mode === "signin" ? (
                  "Entrando..."
                ) : (
                  "Criando conta..."
                )
              ) : (
                <span className="inline-flex items-center gap-2">
                  {mode === "signin" ? "Entrar na conta" : "Criar conta"}
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>
        </motion.div>

        <p className="mt-4 px-2 text-center text-[11px] font-semibold text-muted-foreground">
          Ao continuar, voce concorda com os termos de uso da AZA Finance.
        </p>
      </div>
    </div>
  );
}
