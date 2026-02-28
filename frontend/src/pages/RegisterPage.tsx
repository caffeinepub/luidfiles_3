import { useState } from 'react';
import { useNavigate, Link } from '@tanstack/react-router';
import { Cloud, Eye, EyeOff, Loader2, ArrowLeft, Check } from 'lucide-react';
import { useActor } from '../hooks/useActor';
import { setSessionToken } from '../hooks/useAuth';
import { toast } from 'sonner';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { actor } = useActor();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('Por favor, insira um nome de usuário.');
      return;
    }
    if (username.trim().length < 3) {
      setError('O nome de usuário deve ter pelo menos 3 caracteres.');
      return;
    }
    if (!password) {
      setError('Por favor, insira uma senha.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    if (!actor) {
      setError('Serviço indisponível. Tente novamente.');
      return;
    }

    setIsLoading(true);
    try {
      await actor.registerUser(username.trim(), password);
      const token = await actor.login(username.trim(), password);
      setSessionToken(token);
      toast.success('Conta criada com sucesso! Bem-vindo ao LuidFiles!');
      navigate({ to: '/dashboard' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar conta.';
      if (msg.includes('already taken') || msg.includes('Username')) {
        setError('Este nome de usuário já está em uso. Escolha outro.');
      } else {
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const passwordStrength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3;
  const strengthColors = ['', 'bg-red-500', 'bg-yellow-500', 'bg-neon'];
  const strengthLabels = ['', 'Fraca', 'Média', 'Forte'];

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(oklch(0.88 0.32 142) 1px, transparent 1px), linear-gradient(90deg, oklch(0.88 0.32 142) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }} />
      </div>
      <div className="absolute top-1/4 right-1/4 w-64 h-64 rounded-full bg-neon/5 blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
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

          <h1 className="font-display text-2xl font-bold text-white mb-2">Criar conta grátis</h1>
          <p className="text-gray-400 text-sm mb-2">Ganhe 5 GB de armazenamento gratuito.</p>

          {/* Free plan badge */}
          <div className="inline-flex items-center gap-2 bg-neon/10 border border-neon/30 rounded-full px-3 py-1 mb-6">
            <Check className="w-3 h-3 text-neon" />
            <span className="text-neon text-xs font-medium">5 GB grátis incluídos</span>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 mb-6 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Nome de usuário</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Escolha um nome de usuário"
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
                  placeholder="Crie uma senha segura"
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white placeholder-gray-600 focus:outline-none focus:border-neon/60 focus:ring-1 focus:ring-neon/30 transition-all"
                  autoComplete="new-password"
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
              {password && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex gap-1 flex-1">
                    {[1, 2, 3].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-all ${
                          passwordStrength >= level ? strengthColors[passwordStrength] : 'bg-white/10'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-gray-500">{strengthLabels[passwordStrength]}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Confirmar senha</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha"
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white placeholder-gray-600 focus:outline-none focus:border-neon/60 focus:ring-1 focus:ring-neon/30 transition-all"
                  autoComplete="new-password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-red-400 text-xs mt-1">As senhas não coincidem.</p>
              )}
              {confirmPassword && password === confirmPassword && (
                <p className="text-neon text-xs mt-1 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Senhas coincidem
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-neon text-black font-bold py-3.5 rounded-xl hover:shadow-neon transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Criando conta...
                </>
              ) : (
                'Criar conta grátis'
              )}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            Já tem uma conta?{' '}
            <Link to="/login" className="text-neon hover:underline font-medium">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
