import { useState } from 'react';
import { useNavigate, Link } from '@tanstack/react-router';
import { Cloud, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import { useActor } from '../hooks/useActor';
import { setSessionToken } from '../hooks/useAuth';
import { toast } from 'sonner';

export default function LoginPage() {
  const navigate = useNavigate();
  const { actor } = useActor();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('Por favor, insira seu nome de usuário.');
      return;
    }
    if (!password) {
      setError('Por favor, insira sua senha.');
      return;
    }
    if (!actor) {
      setError('Serviço indisponível. Tente novamente.');
      return;
    }

    setIsLoading(true);
    try {
      const token = await actor.login(username.trim(), password);
      setSessionToken(token);
      toast.success('Login realizado com sucesso!');
      navigate({ to: '/dashboard' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Credenciais inválidas.';
      setError(msg.includes('Invalid') ? 'Usuário ou senha incorretos.' : msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(oklch(0.88 0.32 142) 1px, transparent 1px), linear-gradient(90deg, oklch(0.88 0.32 142) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }} />
      </div>
      <div className="absolute top-1/3 left-1/4 w-64 h-64 rounded-full bg-neon/5 blur-3xl" />
      <div className="absolute bottom-1/3 right-1/4 w-64 h-64 rounded-full bg-neon/5 blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        {/* Back link */}
        <Link to="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-neon transition-colors mb-8 text-sm">
          <ArrowLeft className="w-4 h-4" />
          Voltar ao início
        </Link>

        <div className="bg-gray-900 border border-white/10 rounded-2xl p-8">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-neon/10 border border-neon/30 flex items-center justify-center">
              <Cloud className="w-6 h-6 text-neon" />
            </div>
            <div>
              <div className="font-display font-bold text-white text-lg">LuidFiles</div>
              <div className="text-gray-500 text-xs">LuidCorporation</div>
            </div>
          </div>

          <h1 className="font-display text-2xl font-bold text-white mb-2">Bem-vindo de volta</h1>
          <p className="text-gray-400 text-sm mb-8">Entre na sua conta para acessar seus arquivos.</p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 mb-6 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Usuário</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Seu nome de usuário"
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-neon/60 focus:ring-1 focus:ring-neon/30 transition-all"
                autoComplete="username"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha"
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white placeholder-gray-600 focus:outline-none focus:border-neon/60 focus:ring-1 focus:ring-neon/30 transition-all"
                  autoComplete="current-password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-neon text-black font-bold py-3.5 rounded-xl hover:shadow-neon transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            Não tem uma conta?{' '}
            <Link to="/register" className="text-neon hover:underline font-medium">
              Criar conta grátis
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
