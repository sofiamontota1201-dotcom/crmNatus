'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export function SessionRefreshProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Don't run session refresh on login page or public routes
  const shouldRefresh = !pathname?.startsWith('/login');

  useEffect(() => {
    if (!shouldRefresh) return;

    // Revisar cada 5 min; solo refrescar si la sesión expira en <10 min.
    // supabase-js ya auto-refresca antes de expirar; esto es una red de seguridad
    // barata (0 red en el caso normal, getSession es lectura local de cookie).
    const interval = setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        const expiresAtMs = (session?.expires_at ?? 0) * 1000;
        const expiresSoon = session && expiresAtMs - Date.now() < 10 * 60 * 1000;

        if (expiresSoon) {
          const { error } = await supabase.auth.refreshSession();
          if (error) {
            console.warn('⚠️ No se pudo renovar sesión:', error.message);
          }
        }
      } catch (error) {
        // Silenciar errores cuando no hay sesión
        if (error instanceof Error && !error.message.includes('refresh_token_not_found')) {
          console.error('Error en renovación de sesión:', error);
        }
      }
    }, 5 * 60 * 1000); // 5 minutos

    return () => clearInterval(interval);
  }, [shouldRefresh]);

  return <>{children}</>;
}
