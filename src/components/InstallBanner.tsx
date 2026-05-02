'use client';

import { useEffect, useState } from 'react';
import { Download, X, Share, Smartphone } from 'lucide-react';

const DISMISSED_KEY = 'pwa_install_dismissed';

export default function InstallBanner() {
  const [prompt, setPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Already installed as PWA — don't show
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    // Already dismissed
    if (localStorage.getItem(DISMISSED_KEY)) return;

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const safari = /safari/i.test(navigator.userAgent) && !/chrome/i.test(navigator.userAgent);

    if (ios && safari) {
      setIsIOS(true);
      setVisible(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler as EventListener);
    return () => window.removeEventListener('beforeinstallprompt', handler as EventListener);
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISSED_KEY, '1');
  };

  const install = async () => {
    if (!prompt) return;
    setInstalling(true);
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') dismiss();
    else setInstalling(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 left-3 right-3 z-50 md:hidden no-print">
      <div className="bg-card border border-accent/30 rounded-2xl shadow-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">Instalar no celular</p>
            {isIOS ? (
              <p className="text-xs text-muted mt-0.5 leading-relaxed">
                Toque em{' '}
                <span className="inline-flex items-center gap-0.5 text-accent font-medium">
                  <Share className="w-3 h-3" /> Compartilhar
                </span>
                {' '}e depois <strong>"Adicionar à Tela de Início"</strong>
              </p>
            ) : (
              <p className="text-xs text-muted mt-0.5">
                Adicione à tela inicial para acesso rápido, sem precisar do navegador.
              </p>
            )}
          </div>
          <button
            onClick={dismiss}
            className="p-1 text-subtle hover:text-foreground transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!isIOS && (
          <button
            onClick={install}
            disabled={installing}
            className="mt-3 w-full py-2.5 rounded-xl bg-accent text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-accent/90 disabled:opacity-60 cursor-pointer transition-all"
          >
            <Download className="w-4 h-4" />
            {installing ? 'Instalando...' : 'Instalar app'}
          </button>
        )}
      </div>
    </div>
  );
}
