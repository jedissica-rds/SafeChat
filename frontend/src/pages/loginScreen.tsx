
import { useAuth } from "../hooks/useAuth";
import { Brand } from "../components/Brand";
import { Icon } from "../components/Icon";

type LoginScreenProps = {
  onLogin: () => void;
};

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const {
    mode,
    user,
    password,
    confirm,
    showPassword,
    submitting,
    error,
    setUser,
    setPassword,
    setConfirm,
    setShowPassword,
    switchMode,
    submit,
  } = useAuth(onLogin);

  return (
    <main className="login-page">
      <span className="flower flower-one">
        <Icon name="flower" size={66} />
      </span>

      <span className="flower flower-two">
        <Icon name="flower" size={44} />
      </span>

      <section className="login-card">
        <Brand />

        <div className="tabs" role="tablist" aria-label="Acesso">
          <button
            className={mode === "login" ? "active" : ""}
            type="button"
            role="tab"
            aria-selected={mode === "login"}
            onClick={() => switchMode("login")}
          >
            Entrar
          </button>

          <button
            className={mode === "signup" ? "active" : ""}
            type="button"
            role="tab"
            aria-selected={mode === "signup"}
            onClick={() => switchMode("signup")}
          >
            Criar conta
          </button>
        </div>

        <form onSubmit={submit}>
          <label className="field-label" htmlFor="usuario">
            Usuário
          </label>

          <div className="field">
            <span className="field-icon">@</span>

            <input
              id="usuario"
              value={user}
              onChange={(event) => setUser(event.target.value)}
              placeholder="seu.usuario"
              autoComplete="username"
              disabled={submitting}
            />
          </div>

          <label className="field-label" htmlFor="senha">
            Senha
          </label>

          <div className="field">
            <span className="field-icon">
              <Icon name="key" size={18} />
            </span>

            <input
              id="senha"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Digite sua senha"
              autoComplete={
                mode === "login"
                  ? "current-password"
                  : "new-password"
              }
              disabled={submitting}
            />

            <button
              className="icon-button"
              type="button"
              onClick={() =>
                setShowPassword((current) => !current)
              }
              aria-label={
                showPassword ? "Ocultar senha" : "Mostrar senha"
              }
            >
              <Icon
                name={showPassword ? "eyeOff" : "eye"}
                size={19}
              />
            </button>
          </div>

          {mode === "signup" && (
            <>
              <label className="field-label" htmlFor="confirmar">
                Confirmar senha
              </label>

              <div className="field">
                <span className="field-icon">
                  <Icon name="lock" size={18} />
                </span>

                <input
                  id="confirmar"
                  type={showPassword ? "text" : "password"}
                  value={confirm}
                  onChange={(event) =>
                    setConfirm(event.target.value)
                  }
                  placeholder="Repita sua senha"
                  autoComplete="new-password"
                  disabled={submitting}
                />
              </div>
            </>
          )}

          <button
            className="primary-button"
            type="submit"
            disabled={submitting}
          >
            {submitting
              ? "Aguardando resposta…"
              : mode === "login"
                ? "Entrar"
                : "Criar conta"}
          </button>

          {error && (
            <p className="server-error" role="alert">
              {error}
            </p>
          )}
        </form>

        <p className="privacy-note">
          <Icon name="lock" size={15} />
          Sua senha nunca sai do seu dispositivo
        </p>
      </section>
    </main>
  );
}
