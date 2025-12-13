# 📚 Instrucciones Completas de Despliegue

## 🎯 Resumen

Este proyecto ha sido migrado de `localStorage` a **Supabase** como backend, con API REST desplegada en **Vercel**. Ahora los datos se sincronizan automáticamente entre PC y celular.

---

## 📋 Paso 1: Crear Proyecto en Supabase

### 1.1. Crear cuenta y proyecto

1. Ve a [https://supabase.com](https://supabase.com)
2. Crea una cuenta (es gratis)
3. Haz clic en **"New Project"**
4. Completa:
   - **Name**: `prestamos-app` (o el nombre que prefieras)
   - **Database Password**: Crea una contraseña segura (guárdala)
   - **Region**: Elige la más cercana a ti
5. Haz clic en **"Create new project"**
6. Espera 2-3 minutos a que se cree el proyecto

### 1.2. Crear la tabla en Supabase

1. En el panel de Supabase, ve a **"SQL Editor"** (menú lateral izquierdo)
2. Haz clic en **"New query"**
3. Pega este SQL y ejecuta:

```sql
-- Crear tabla prestamos
CREATE TABLE IF NOT EXISTS prestamos (
  id BIGSERIAL PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_prestamos_updated_at ON prestamos(updated_at DESC);

-- Habilitar Row Level Security (RLS) - opcional pero recomendado
ALTER TABLE prestamos ENABLE ROW LEVEL SECURITY;

-- Crear política para permitir todas las operaciones (ajusta según necesites)
CREATE POLICY "Allow all operations" ON prestamos
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

4. Haz clic en **"Run"** o presiona `Ctrl+Enter`
5. Verifica que la tabla se creó correctamente:
   - Ve a **"Table Editor"** en el menú lateral
   - Deberías ver la tabla `prestamos` con las columnas: `id`, `data`, `updated_at`

---

## 🔑 Paso 2: Obtener Credenciales de Supabase

1. En el panel de Supabase, ve a **"Settings"** (⚙️) → **"API"**
2. Encuentra estas dos claves:

   - **Project URL**: 
     - Copia la URL que aparece en "Project URL"
     - Ejemplo: `https://abcdefghijklmnop.supabase.co`
     - Esta es tu `NEXT_PUBLIC_SUPABASE_URL`

   - **service_role key**:
     - En la sección "Project API keys"
     - Busca la clave `service_role` (⚠️ **NO** uses la `anon` key)
     - Haz clic en el ícono de ojo para revelarla
     - Copia esta clave completa
     - Esta es tu `SUPABASE_SERVICE_ROLE_KEY`

3. **⚠️ IMPORTANTE**: 
   - La `service_role` key tiene acceso completo a la base de datos
   - **NUNCA** la expongas en el código del cliente
   - Solo se usa en las funciones serverless de Vercel

---

## 🚀 Paso 3: Desplegar en Vercel

### 3.1. Preparar el proyecto

1. Asegúrate de tener todos los archivos en tu proyecto:
   ```
   prestamos/
   ├── api/
   │   └── prestamos/
   │       ├── get.js
   │       ├── save.js
   │       ├── update.js
   │       └── delete.js
   ├── css/
   │   └── styles.css
   ├── js/
   │   ├── utils.js
   │   ├── storage.js
   │   ├── loans.js
   │   ├── calendar.js
   │   ├── reports.js
   │   ├── payments.js
   │   ├── ui.js
   │   └── main.js
   ├── index.html
   ├── package.json
   ├── vercel.json
   └── .gitignore
   ```

### 3.2. Instalar Vercel CLI (opcional, puedes usar la web)

**Opción A: Usar Vercel Web (Recomendado para principiantes)**

1. Ve a [https://vercel.com](https://vercel.com)
2. Crea una cuenta o inicia sesión con GitHub
3. Haz clic en **"Add New..."** → **"Project"**
4. Conecta tu repositorio de GitHub (o sube los archivos manualmente)
5. Vercel detectará automáticamente la configuración

**Opción B: Usar Vercel CLI**

```bash
# Instalar Vercel CLI globalmente
npm install -g vercel

# En la carpeta del proyecto, ejecutar:
vercel login
vercel
```

### 3.3. Configurar Variables de Entorno en Vercel

1. En el dashboard de Vercel, ve a tu proyecto
2. Ve a **"Settings"** → **"Environment Variables"**
3. Agrega estas dos variables:

   | Name | Value |
   |------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Tu Project URL de Supabase |
   | `SUPABASE_SERVICE_ROLE_KEY` | Tu service_role key de Supabase |

4. Haz clic en **"Save"**

### 3.4. Desplegar

1. Si usas Vercel CLI:
   ```bash
   vercel --prod
   ```

2. Si usas Vercel Web:
   - Haz clic en **"Deploy"**
   - Espera a que termine el despliegue
   - Copia la URL que te da (ejemplo: `https://tu-proyecto.vercel.app`)

---

## ✅ Paso 4: Verificar que Funciona

### 4.1. Probar desde PC

1. Abre la URL de tu proyecto en Vercel (ejemplo: `https://tu-proyecto.vercel.app`)
2. Abre la consola del navegador (F12)
3. Intenta agregar un préstamo
4. Verifica que:
   - Aparece una notificación verde "Datos guardados correctamente"
   - No hay errores en la consola
   - El préstamo aparece en la lista

### 4.2. Verificar en Supabase

1. Ve a Supabase → **"Table Editor"** → tabla `prestamos`
2. Deberías ver una fila nueva con:
   - `id`: Un número automático
   - `data`: Un objeto JSON con tu préstamo
   - `updated_at`: La fecha/hora actual

### 4.3. Probar desde Celular

1. Abre la misma URL en tu celular
2. Agrega o modifica un préstamo
3. Verifica que los cambios se reflejan en ambos dispositivos

---

## 🔧 Solución de Problemas

### Error: "Supabase configuration missing"

**Causa**: Las variables de entorno no están configuradas en Vercel.

**Solución**:
1. Ve a Vercel → Settings → Environment Variables
2. Verifica que ambas variables estén configuradas
3. Redespliega el proyecto después de agregar las variables

### Error: "Database error" o "relation does not exist"

**Causa**: La tabla no se creó correctamente en Supabase.

**Solución**:
1. Ve a Supabase → SQL Editor
2. Ejecuta nuevamente el script SQL del Paso 1.2
3. Verifica en Table Editor que la tabla existe

### Error: "CORS" o "Network error"

**Causa**: Problemas de CORS o la API no está accesible.

**Solución**:
1. Verifica que las funciones API estén desplegadas en Vercel
2. Revisa los logs en Vercel → Functions
3. Asegúrate de que la URL en `storage.js` use `window.location.origin`

### Los datos no se sincronizan entre dispositivos

**Causa**: Puede ser caché del navegador.

**Solución**:
1. Limpia la caché del navegador
2. Recarga la página con Ctrl+F5 (PC) o cierra y abre la app (móvil)
3. Verifica que ambos dispositivos usen la misma URL

---

## 📱 Uso desde Celular

### Opción 1: Agregar a Pantalla de Inicio (PWA)

1. Abre la app en tu navegador móvil
2. En Chrome/Edge: Menú (⋮) → **"Agregar a pantalla de inicio"**
3. En Safari: Compartir (□↑) → **"Agregar a pantalla de inicio"**
4. Ahora tienes un ícono en tu pantalla de inicio como una app nativa

### Opción 2: Usar directamente desde el navegador

1. Guarda la URL como favorito
2. Accede desde cualquier dispositivo con internet

---

## 🔐 Seguridad

### ✅ Buenas Prácticas Implementadas

- ✅ Las claves de Supabase solo se usan en el servidor (Vercel)
- ✅ CORS configurado para permitir peticiones desde cualquier origen
- ✅ Validación de datos en las APIs
- ✅ Manejo de errores robusto

### ⚠️ Recomendaciones Adicionales

1. **No compartas tu `SUPABASE_SERVICE_ROLE_KEY`** públicamente
2. Considera agregar autenticación si necesitas usuarios separados
3. Configura Row Level Security (RLS) en Supabase según tus necesidades

---

## 📊 Estructura de Datos

Cada préstamo se guarda como un objeto JSON completo en el campo `data`:

```json
{
  "id": 1234567890,
  "nombre": "Juan Pérez",
  "monto": 1000000,
  "tasa": 5,
  "tipo": "cuotas_fijas",
  "cuotas": 12,
  "cuotaFija": 85607,
  "fechaPrestamo": "2024-01-15",
  "diaCobro": 15,
  "tabla": [
    {
      "cuota": 1,
      "fechaCobro": "2024-02-15T00:00:00.000Z",
      "cuotaFija": 85607,
      "interes": 50000,
      "abonoCapital": 35607,
      "saldo": 964393,
      "pagada": false,
      "fechaPago": null,
      "multa": 0,
      "multaPagada": false,
      "fechaPagoMulta": null
    }
  ],
  "capitalPendiente": 1000000
}
```

---

## 🆘 Soporte

Si tienes problemas:

1. Revisa los logs en Vercel → Functions
2. Revisa los logs en Supabase → Logs
3. Abre la consola del navegador (F12) y revisa errores
4. Verifica que todas las variables de entorno estén configuradas

---

## ✅ Checklist Final

- [ ] Proyecto creado en Supabase
- [ ] Tabla `prestamos` creada con el SQL
- [ ] Credenciales de Supabase obtenidas
- [ ] Proyecto desplegado en Vercel
- [ ] Variables de entorno configuradas en Vercel
- [ ] Probado desde PC - funciona correctamente
- [ ] Probado desde celular - funciona correctamente
- [ ] Datos se sincronizan entre dispositivos

---

## 🎉 ¡Listo!

Tu aplicación ahora está completamente migrada a Supabase y funcionando en la nube. Los datos se sincronizan automáticamente entre todos tus dispositivos.

**URL de tu app**: `https://tu-proyecto.vercel.app`

¡Disfruta de tu sistema de préstamos sincronizado! 🚀









