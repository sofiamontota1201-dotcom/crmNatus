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

    // Renovar sesión cada 25 minutos (antes de que expire a los 30)
    const interval = setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session && session.refresh_token) {
          // Intentar refrescar el token solo si existe
          const { data, error } = await supabase.auth.refreshSession();
          
          if (error) {
            console.warn('⚠️ No se pudo renovar sesión:', error.message);
          } else if (data.session) {
            console.log('✅ Sesión renovada exitosamente');
          }
        }
      } catch (error) {
        // Silenciar errores cuando no hay sesión
        if (error instanceof Error && !error.message.includes('refresh_token_not_found')) {
          console.error('Error en renovación de sesión:', error);
        }
      }
    }, 25 * 60 * 1000); // 25 minutos

    // También renovar cuando el usuario interactúa con la página
    let activityTimeout: NodeJS.Timeout;
    const handleActivity = async () => {
      clearTimeout(activityTimeout);
      activityTimeout = setTimeout(async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session && session.refresh_token) {
            await supabase.auth.refreshSession();
          }
        } catch (error) {
          // Silenciar errores cuando no hay sesión
          if (error instanceof Error && !error.message.includes('refresh_token_not_found')) {
            console.error('Error renovando sesión en actividad:', error);
          }
        }
      }, 1000); // Esperar 1 segundo después de la última actividad
    };

    // Escuchar eventos de actividad del usuario
    window.addEventListener('mousedown', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('touchstart', handleActivity);

    return () => {
      clearInterval(interval);
      clearTimeout(activityTimeout);
      window.removeEventListener('mousedown', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
    };
  }, [shouldRefresh]);

  return <>{children}</>;
}
