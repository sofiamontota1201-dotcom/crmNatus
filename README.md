# SISTEM 2.0

Sistema de gestión de inventario y ventas desarrollado con Next.js 14, TypeScript y Supabase.

## Requisitos Previos

- Node.js 18.x o superior
- pnpm (recomendado) o npm
- Una cuenta en Supabase

## Configuración del Entorno

1. Clona el repositorio:
```bash
git clone [url-del-repositorio]
cd sistem-2.0
```

2. Instala las dependencias:
```bash
pnpm install
```

3. Crea un archivo `.env.local` con las siguientes variables:
```env
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima_de_supabase
UPSTASH_REDIS_REST_URL=tu_url_de_upstash
UPSTASH_REDIS_REST_TOKEN=tu_token_de_upstash
# Facturación Electrónica (DIAN)
API_BASE_URL=https://misfacturas.cenet.ws/IntegrationAPI_2/api
API_USERNAME=tu_usuario_api
API_PASSWORD=tu_contraseña_api
```

## Desarrollo

Para iniciar el servidor de desarrollo:

```bash
pnpm dev
```

## Scripts Disponibles

- `pnpm dev`: Inicia el servidor de desarrollo
- `pnpm build`: Construye la aplicación para producción
- `pnpm start`: Inicia la aplicación en modo producción
- `pnpm lint`: Ejecuta el linter
- `pnpm test`: Ejecuta las pruebas
- `pnpm test:watch`: Ejecuta las pruebas en modo watch
- `pnpm test:coverage`: Ejecuta las pruebas con cobertura
- `pnpm format`: Formatea el código con Prettier

## Estructura del Proyecto

```
sistem-2.0/
├── app/                    # Páginas y rutas de Next.js
├── components/            # Componentes reutilizables
├── hooks/                # Custom hooks
├── lib/                  # Bibliotecas y configuraciones
├── public/              # Archivos estáticos
├── styles/              # Estilos globales
├── types/              # Definiciones de TypeScript
└── utils/              # Utilidades y helpers
```

## Pruebas

El proyecto utiliza Jest y Testing Library para las pruebas. Los archivos de prueba se encuentran en el directorio `__tests__`.

Para ejecutar las pruebas:

```bash
pnpm test
```

## Despliegue

La aplicación está optimizada para ser desplegada en Vercel. Para desplegar:

1. Conecta tu repositorio con Vercel
2. Configura las variables de entorno en el panel de Vercel
3. Despliega

## Contribución

1. Crea un fork del repositorio
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Haz commit de tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

---

**Facturación Electrónica (DIAN)**

- Resumen: Integración con un proveedor de Facturación Electrónica compatible con DIAN mediante API HTTP. La lógica vive en `lib/facturacion-electronica.ts` y se expone a la app vía rutas API de Next.js para mantener credenciales y tokens en el servidor.

**Variables De Entorno**
- `API_BASE_URL`: URL base de la API (ej. `https://misfacturas.cenet.ws/IntegrationAPI_2/api`).
- `API_USERNAME`: usuario de la API (entregado por el proveedor).
- `API_PASSWORD`: contraseña/llave de la API.
- Opcional: `NEXT_PUBLIC_API_BASE_URL` si necesitas exponer la URL al cliente (evitar exponer secretos).

**Rutas Internas (Next.js API Routes)**
- `POST /api/autenticacion/iniciar-sesion`: obtiene token del proveedor.
- `POST /api/facturas/insertar`: envía una factura al proveedor. Body: `{ invoiceData, token }`.
- `POST /api/facturas/estado`: consulta estado de un documento. Body: `{ documentId, token, documentType? }`.

Código relevante:
- `lib/facturacion-electronica.ts`
- `app/api/autenticacion/iniciar-sesion/route.ts`
- `app/api/facturas/insertar/route.ts`
- `app/api/facturas/estado/route.ts`
- Página de prueba: `app/facturacion-electronica/page.tsx`

**Flujo Básico**
- Autenticación: `POST {API_BASE_URL}/login?username=...&password=...` → retorna token. El módulo agrega el header `Authorization: misfacturas {token}` en llamadas posteriores.
- Emisión: `POST {API_BASE_URL}/insertinvoice` con el JSON de la factura (estructura provista por el proveedor/manual).
- Estado: `POST {API_BASE_URL}/GetDocumentStatus` con `DocumentId` y `DocumentType` (ej. `01` para factura).

**Página De Pruebas**
- Ir a `/facturacion-electronica` (menú lateral → “Facturación”).
- Botones: obtener token, enviar factura (editor JSON con ejemplo) y consultar estado por `DocumentId`.
- Requiere variables de entorno configuradas o enviar credenciales en el body de `/api/autenticacion/iniciar-sesion` (para pruebas).

**Checklist Reunión Con Proveedor (Digital/DIAN)**
- Credenciales:
  - Usuario y contraseña de API (staging y producción).
  - Políticas de expiración del token (TTL) y método de renovación.
- Endpoints y ambientes:
  - URL base de QA/staging y producción.
  - Rutas exactas de `login`, `insertinvoice`, `GetDocumentStatus` y cualquier otro (nota crédito, anulación, etc.).
  - Requerimientos de IPs permitidas, CORS y TLS.
- Autorización:
  - Formato de `Authorization` esperado (ej. `misfacturas {token}`).
  - ¿Requiere claves adicionales o encabezados custom?
- Esquema de factura:
  - JSON de ejemplo oficial y campos obligatorios (document type, impuestos, unidades, moneda, prefijo, numeración, CUFE, etc.).
  - Tabla de códigos DIAN relevantes (DocumentType, TaxID, unidades).
  - Reglas de redondeo y precisión (decimales) y validaciones de montos.
  - Reglas de numeración (prefijo, rango, resolución DIAN) y manejo de consecutivos.
- Estado y seguimiento:
  - Valores posibles de estado y tiempos promedio de disponibilidad.
  - ¿Cómo obtener `DocumentId` al emitir? ¿Incluye CUFE/UUID en la respuesta?
- Límites operativos:
  - Rate limits, tamaños máximos de payload, timeouts recomendados, reintentos e idempotencia.
  - SLAs y ventanas de mantenimiento.
- Soporte y certificación:
  - Contacto técnico y canal de soporte.
  - Pasos de certificación/enablement con DIAN (si aplica) y datos de la resolución de numeración.
- Seguridad y cumplimiento:
  - Requisitos de cifrado en tránsito, resguardo de credenciales, y auditoría.

**Pruebas Rápidas (cURL)**
```bash
# 1) Obtener token
curl -s -X POST http://localhost:3000/api/autenticacion/iniciar-sesion \
  -H 'Content-Type: application/json'

# 2) Enviar factura (reemplaza TOKEN y BODY.json)
curl -s -X POST http://localhost:3000/api/facturas/insertar \
  -H 'Content-Type: application/json' \
  -d '{"invoiceData": { ... }, "token": "TOKEN"}'

# 3) Consultar estado
curl -s -X POST http://localhost:3000/api/facturas/estado \
  -H 'Content-Type: application/json' \
  -d '{"documentId": "ID", "token": "TOKEN"}'
```

**Buenas Prácticas**
- Mantener `API_USERNAME` y `API_PASSWORD` solo del lado servidor (no en el cliente).
- Consumir la API externa siempre vía rutas internas (`/api/...`) para no exponer secretos.
- Registrar respuestas/errores con IDs de correlación para trazabilidad.
- Actualizar a Node 20+ (recomendación de `@supabase/supabase-js`).

**Seguridad Aplicada**
- Middleware de autenticación (SSR con Supabase) que protege páginas y APIs.
- Token DIAN almacenado en cookie HttpOnly (`dian_token`) con `SameSite=Strict` y `Secure`.
- Rate limiting en `/api/**` (60 req/min por usuario o IP). Configurar variables de Upstash:
  - `UPSTASH_REDIS_REST_URL`
  - `UPSTASH_REDIS_REST_TOKEN`
- Cabeceras de seguridad: HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, CSP.
- RLS: archivo `docs/sql/rls_policies.sql` con políticas iniciales por tabla (ajusta según tu modelo multi-tenant).

**RLS (Supabase)**
- Ejecuta `docs/sql/rls_policies.sql` en tu proyecto de Supabase (SQL Editor) para habilitar RLS y políticas base.
- Si usas `user_id` en `stocks`, `sells`, `sell_details`, las políticas restringen por usuario. Si no, cambia `USING/CHECK` a `(true)` para permitir a cualquier usuario autenticado.

**Multi‑tenant (user_id) y migraciones**
- Ejecuta `docs/sql/2025-09-13-multi_tenant_user_id.sql` para añadir la columna `user_id` con `DEFAULT auth.uid()` en `stocks`, `sells` y `sell_details`.
- Opcional: descomenta y reemplaza el UUID en el script para backfill de filas existentes.
- Tras esto, mantén las políticas RLS restrictivas (recomendado) y la app asignará automáticamente `user_id` en inserts vía `DEFAULT auth.uid()`.

**Rate limiting**
- Configura Upstash en variables de entorno para activar el limitador (60 req/min):
  - `UPSTASH_REDIS_REST_URL`
  - `UPSTASH_REDIS_REST_TOKEN`
- Prueba con `GET /api/health` (autenticado o no). Al exceder el límite, devolverá 429.


---

**Higiene para Deploy**
- Este repo incluye `.vercelignore` para no subir artefactos ni documentación al build de Vercel.
- `.gitignore` actual cubre `.next/`, `node_modules/`, `.env*`, entre otros.
- Para dejar de trackear archivos ya versionados, ejecuta:

```bash
# eliminar del historial de seguimiento (mantiene archivos locales)
git rm -r --cached .next node_modules .env.local

# si deseas también dejar fuera el PDF u otros
git rm --cached implementation_guide.pdf || true

git add -A && git commit -m "chore: limpiar artefactos de deploy"
```

- Documentación y SQL de soporte movidos a `docs/` y excluidos del deploy:
  - `docs/sql/fix_foreign_key_violation.sql`
  - (Mantén PDFs en repo o muévelos a `docs/` si lo prefieres)
