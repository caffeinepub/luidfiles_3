import { useEffect, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Cloud, Shield, Zap, Globe, ArrowRight, Check, ChevronDown } from 'lucide-react';

function useIntersectionObserver(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isVisible };
}

function AnimatedSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const { ref, isVisible } = useIntersectionObserver();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}
    >
      {children}
    </div>
  );
}

const features = [
  {
    icon: Cloud,
    title: 'Armazenamento Centralizado',
    description: 'Todos os seus arquivos em um único banco de dados seguro. Acesse de qualquer dispositivo, a qualquer hora.',
    delay: 'delay-100',
  },
  {
    icon: Zap,
    title: 'Upload Inteligente',
    description: 'Tecnologia de chunked uploading para arquivos de qualquer tamanho. Sem erros, sem limites.',
    delay: 'delay-200',
  },
  {
    icon: Globe,
    title: 'Compartilhamento Global',
    description: 'Gere links públicos únicos. Qualquer pessoa no mundo pode baixar seus arquivos sem precisar de conta.',
    delay: 'delay-300',
  },
  {
    icon: Shield,
    title: 'Segurança Total',
    description: 'Sistema de autenticação próprio com hierarquia de permissões. Seus dados, suas regras.',
    delay: 'delay-400',
  },
];

const plans = [
  { label: '5 GB', desc: 'Gratuito para sempre' },
  { label: 'Sync', desc: 'Entre todos os dispositivos' },
  { label: '∞', desc: 'Tipos de arquivo' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Header */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100' : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center">
              <Cloud className="w-5 h-5 text-neon" />
            </div>
            <span className="font-display font-bold text-xl text-gray-900">LuidFiles</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Recursos</a>
            <a href="#plans" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Planos</a>
          </nav>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate({ to: '/login' })}
              className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors px-3 py-1.5"
            >
              Entrar
            </button>
            <button
              onClick={() => navigate({ to: '/register' })}
              className="text-sm font-semibold bg-black text-neon px-4 py-2 rounded-lg hover:bg-gray-900 transition-all hover:shadow-neon-sm"
            >
              Começar Grátis
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black">
        {/* Background */}
        <div className="absolute inset-0">
          <img
            src="/assets/generated/hero-bg.dim_1440x800.png"
            alt=""
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black" />
        </div>

        {/* Animated grid lines */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'linear-gradient(oklch(0.88 0.32 142) 1px, transparent 1px), linear-gradient(90deg, oklch(0.88 0.32 142) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }} />
        </div>

        {/* Floating orbs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-neon/5 blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-neon/5 blur-3xl animate-pulse delay-1000" />

        <div className="relative z-10 text-center px-4 sm:px-6 max-w-5xl mx-auto pt-16">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-neon/10 border border-neon/30 rounded-full px-4 py-1.5 mb-8 animate-fade-in">
            <div className="w-2 h-2 rounded-full bg-neon animate-pulse" />
            <span className="text-neon text-sm font-medium">Plataforma de Nuvem da LuidCorporation</span>
          </div>

          {/* Main heading */}
          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 animate-slide-up leading-tight">
            Seus arquivos,{' '}
            <span className="text-neon neon-glow-text">em qualquer lugar</span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-300 mb-4 animate-slide-up delay-100 max-w-2xl mx-auto">
            Armazenamento em nuvem robusto, global e independente. Faça upload de arquivos de qualquer tamanho e acesse de qualquer dispositivo.
          </p>

          {/* 5GB badge */}
          <div className="inline-flex items-center gap-2 bg-neon text-black font-bold px-6 py-2 rounded-full mb-10 animate-slide-up delay-200 shadow-neon">
            <Check className="w-4 h-4" />
            <span>5 GB Grátis para sempre</span>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up delay-300">
            <button
              onClick={() => navigate({ to: '/register' })}
              className="group flex items-center justify-center gap-2 bg-neon text-black font-bold text-lg px-8 py-4 rounded-xl hover:shadow-neon-lg transition-all duration-300 hover:scale-105"
            >
              Começar Agora
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => navigate({ to: '/login' })}
              className="flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm text-white font-semibold text-lg px-8 py-4 rounded-xl border border-white/20 hover:bg-white/20 transition-all duration-300"
            >
              Já tenho uma conta
            </button>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-8 mt-16 animate-fade-in delay-500">
            {plans.map((p) => (
              <div key={p.label} className="text-center">
                <div className="font-display text-3xl font-bold text-neon neon-glow-text">{p.label}</div>
                <div className="text-gray-400 text-sm mt-1">{p.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-6 h-6 text-neon/60" />
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
              Tudo que você precisa,{' '}
              <span className="text-neon">em um só lugar</span>
            </h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">
              A LuidFiles foi construída para ser a solução definitiva de armazenamento em nuvem.
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <AnimatedSection key={feature.title}>
                <div className="group p-6 rounded-2xl border border-gray-100 hover:border-neon/40 hover:shadow-neon-sm transition-all duration-300 bg-white h-full">
                  <div className="w-12 h-12 rounded-xl bg-black flex items-center justify-center mb-4 group-hover:shadow-neon-sm transition-all">
                    <feature.icon className="w-6 h-6 text-neon" />
                  </div>
                  <h3 className="font-display font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{feature.description}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Plans Section */}
      <section id="plans" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
              Simples e <span className="text-neon">transparente</span>
            </h2>
            <p className="text-gray-500 text-lg">Comece grátis. Sem cartão de crédito.</p>
          </AnimatedSection>

          <AnimatedSection>
            <div className="max-w-md mx-auto">
              <div className="relative bg-black rounded-3xl p-8 text-white overflow-hidden">
                {/* Glow effect */}
                <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-neon/10 blur-3xl" />
                <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-neon/10 blur-3xl" />

                <div className="relative z-10">
                  <div className="inline-flex items-center gap-2 bg-neon/20 border border-neon/30 rounded-full px-3 py-1 mb-6">
                    <div className="w-2 h-2 rounded-full bg-neon" />
                    <span className="text-neon text-xs font-semibold">PLANO GRATUITO</span>
                  </div>

                  <div className="flex items-end gap-2 mb-2">
                    <span className="font-display text-6xl font-bold text-neon">R$0</span>
                    <span className="text-gray-400 mb-2">/mês</span>
                  </div>
                  <p className="text-gray-400 mb-8">Para sempre. Sem surpresas.</p>

                  <ul className="space-y-3 mb-8">
                    {[
                      '5 GB de armazenamento',
                      'Upload de qualquer tamanho',
                      'Sincronização entre dispositivos',
                      'Links de compartilhamento público',
                      'Suporte a todos os tipos de arquivo',
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-neon/20 flex items-center justify-center flex-shrink-0">
                          <Check className="w-3 h-3 text-neon" />
                        </div>
                        <span className="text-gray-300 text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => navigate({ to: '/register' })}
                    className="w-full bg-neon text-black font-bold py-4 rounded-xl hover:shadow-neon transition-all duration-300 hover:scale-105"
                  >
                    Criar conta grátis
                  </button>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-black relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: 'linear-gradient(oklch(0.88 0.32 142) 1px, transparent 1px), linear-gradient(90deg, oklch(0.88 0.32 142) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }} />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <AnimatedSection>
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-white mb-6">
              Pronto para começar?
            </h2>
            <p className="text-gray-400 text-lg mb-10">
              Junte-se à LuidCorporation e tenha seus arquivos sempre disponíveis.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate({ to: '/register' })}
                className="group flex items-center justify-center gap-2 bg-neon text-black font-bold text-lg px-8 py-4 rounded-xl hover:shadow-neon-lg transition-all duration-300 hover:scale-105"
              >
                Começar Agora — É Grátis
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => navigate({ to: '/login' })}
                className="flex items-center justify-center gap-2 bg-white/10 text-white font-semibold text-lg px-8 py-4 rounded-xl border border-white/20 hover:bg-white/20 transition-all"
              >
                Já tenho uma conta
              </button>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black border-t border-white/10 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-neon/10 border border-neon/30 flex items-center justify-center">
                <Cloud className="w-5 h-5 text-neon" />
              </div>
              <div>
                <div className="font-display font-bold text-white">LuidFiles</div>
                <div className="text-gray-500 text-xs">by LuidCorporation</div>
              </div>
            </div>
            <div className="text-center text-gray-500 text-sm">
              © {new Date().getFullYear()} LuidCorporation. Todos os direitos reservados.
            </div>
            <div className="text-gray-600 text-sm">
              Built with{' '}
              <span className="text-neon">♥</span>{' '}
              using{' '}
              <a
                href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname || 'luidfiles')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-neon hover:underline"
              >
                caffeine.ai
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
