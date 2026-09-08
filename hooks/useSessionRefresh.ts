import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Hook para mantener la sesión activa renovando el token cada 25 minutos
 * Evita que expire después de 30 minutos de inactividad
 */
export function useSessionRefresh() {
  useEffect(() => {
    // Renovar sesión cada 25 minutos (antes de que expire a los 30)
    const interval = setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          // Intentar refrescar el token
          const { data, error } = await supabase.auth.refreshSession();
          
          if (error) {
            console.error('Error renovando sesión:', error);
            // Si falla, redirigir a login
            window.location.href = '/login';
          } else if (data.session) {
            console.log('Sesión renovada exitosamente');
          }
        }
      } catch (error) {
        console.error('Error en renovación de sesión:', error);
      }
    }, 25 * 60 * 1000); // 25 minutos

    return () => clearInterval(interval);
  }, []);
}
