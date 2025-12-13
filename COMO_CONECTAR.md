# 🔌 Cómo Conectar tu App con Supabase

## 📋 Pasos Rápidos

### 1️⃣ Crear Proyecto en Supabase

1. Ve a [https://supabase.com](https://supabase.com) y crea una cuenta
2. Haz clic en **"New Project"**
3. Completa:
   - **Name**: `prestamos-app`
   - **Database Password**: Crea una contraseña (guárdala)
   - **Region**: Elige la más cercana
4. Espera 2-3 minutos a que se cree

### 2️⃣ Crear la Tabla

1. En Supabase, ve a **"SQL Editor"** (menú lateral)
2. Haz clic en **"New query"**
3. **Copia y pega este código SQL**:

```sql
-- Crear tabla prestamos
CREATE TABLE IF NOT EXISTS prestamos (
  id BIGSERIAL PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índice
CREATE INDEX IF NOT EXISTS idx_prestamos_updated_at ON prestamos(updated_at DESC);

-- Habilitar Row Level Security
ALTER TABLE prestamos ENABLE ROW LEVEL SECURITY;

-- Crear política para permitir todas las operaciones
CREATE POLICY "Allow all operations" ON prestamos
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

4. Haz clic en **"Run"** (o presiona `Ctrl+Enter`)
5. ✅ Verifica que funcionó: Ve a **"Table Editor"** → deberías ver la tabla `prestamos`

### 3️⃣ Obtener las Credenciales

1. En Supabase, ve a **"Settings"** (⚙️) → **"API"**
2. Copia estos dos valores:

   **a) Project URL:**
   - Está en la sección "Project URL"
   - Ejemplo: `https://abcdefghijklmnop.supabase.co`
   - Esta es tu `NEXT_PUBLIC_SUPABASE_URL`

   **b) service_role key:**
   - En "Project API keys", busca `service_role`
   - Haz clic en el ícono 👁️ para verla
   - Copia toda la clave (es larga)
   - Esta es tu `SUPABASE_SERVICE_ROLE_KEY`

   ⚠️ **IMPORTANTE**: Usa la clave `service_role`, NO la `anon`

### 4️⃣ Desplegar en Vercel

#### Opción A: Desde la Web (Más Fácil)

1. Ve a [https://vercel.com](https://vercel.com)
2. Crea cuenta o inicia sesión (puedes usar GitHub)
3. Haz clic en **"Add New..."** → **"Project"**
4. Si tienes el código en GitHub:
   - Conecta tu repositorio
   - Vercel detectará automáticamente la configuración
5. Si NO tienes GitHub:
   - Haz clic en **"Browse"** y sube la carpeta completa del proyecto
   - O arrastra la carpeta al navegador

#### Opción B: Desde la Terminal

```bash
# Instalar Vercel CLI
npm install -g vercel

# En la carpeta del proyecto
vercel login
vercel
```

### 5️⃣ Configurar Variables de Entorno en Vercel

1. En el dashboard de Vercel, ve a tu proyecto
2. Ve a **"Settings"** → **"Environment Variables"**
3. Agrega estas **2 variables**:

   | Name | Value |
   |------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Tu Project URL de Supabase (paso 3a) |
   | `SUPABASE_SERVICE_ROLE_KEY` | Tu service_role key (paso 3b) |

4. Haz clic en **"Save"** para cada una

### 6️⃣ Desplegar

1. Si usaste la web: Haz clic en **"Deploy"**
2. Si usaste terminal: `vercel --prod`
3. Espera 1-2 minutos
4. Copia la URL que te da (ejemplo: `https://tu-proyecto.vercel.app`)

### 7️⃣ Probar

1. Abre la URL de Vercel en tu navegador
2. Agrega un préstamo de prueba
3. Deberías ver una notificación verde: "Datos guardados correctamente"
4. Verifica en Supabase:
   - Ve a **"Table Editor"** → tabla `prestamos`
   - Deberías ver una fila nueva con tu préstamo

---

## ✅ Checklist

- [ ] Proyecto creado en Supabase
- [ ] Tabla `prestamos` creada (SQL ejecutado)
- [ ] Credenciales copiadas (URL y service_role key)
- [ ] Proyecto desplegado en Vercel
- [ ] Variables de entorno configuradas en Vercel
- [ ] Probado y funciona

---

## 🆘 Problemas Comunes

### ❌ Error: "Supabase configuration missing"

**Solución**: Las variables de entorno no están configuradas en Vercel.
- Ve a Vercel → Settings → Environment Variables
- Verifica que ambas variables estén ahí
- Redespliega después de agregarlas

### ❌ Error: "relation does not exist"

**Solución**: La tabla no se creó.
- Ve a Supabase → SQL Editor
- Ejecuta nuevamente el SQL del paso 2
- Verifica en Table Editor que la tabla existe

### ❌ No se guardan los datos

**Solución**: 
1. Abre la consola del navegador (F12)
2. Revisa si hay errores
3. Verifica en Vercel → Functions que las APIs estén desplegadas
4. Verifica que las variables de entorno estén correctas

---

## 📱 Usar desde el Celular

1. Abre la misma URL de Vercel en tu celular
2. Los datos se sincronizan automáticamente
3. Opcional: Agrega a pantalla de inicio:
   - Chrome: Menú (⋮) → "Agregar a pantalla de inicio"
   - Safari: Compartir (□↑) → "Agregar a pantalla de inicio"

---

## 🎉 ¡Listo!

Tu app ahora está conectada a Supabase y funcionando en la nube. Los datos se sincronizan automáticamente entre PC y celular.

**URL de tu app**: `https://tu-proyecto.vercel.app`

---

## 📞 ¿Necesitas Ayuda?

1. Revisa los logs en Vercel → Functions
2. Revisa los logs en Supabase → Logs
3. Abre la consola del navegador (F12) y revisa errores









