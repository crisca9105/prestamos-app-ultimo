# Gestión de Préstamos - Sistema con Supabase

Sistema web para gestionar préstamos con funcionalidades de calendario, reportes y seguimiento de pagos. **Migrado completamente a Supabase** para sincronización automática entre dispositivos.

## 🚀 Características

- ✅ Gestión de préstamos con cuotas fijas o solo interés
- ✅ Calendario interactivo con fechas de cobro
- ✅ Reportes mensuales y proyecciones
- ✅ Pago de cuotas con excedente y recálculo automático
- ✅ Multas del 10% con desplazamiento de cuotas
- ✅ Exportación a CSV
- ✅ Búsqueda de clientes
- ✅ Edición de fechas de préstamo y cobro
- ✅ **Sincronización en tiempo real entre PC y móvil** (Supabase)
- ✅ **Backend real con API REST** (Vercel Serverless Functions)

## 📁 Estructura del Proyecto

```
prestamos/
├── api/
│   └── prestamos/
│       ├── get.js          # API: Obtener todos los préstamos
│       ├── save.js         # API: Guardar todos los préstamos
│       ├── update.js       # API: Actualizar un préstamo
│       └── delete.js       # API: Eliminar un préstamo
├── css/
│   └── styles.css         # Estilos CSS
├── js/
│   ├── utils.js           # Funciones de utilidad
│   ├── storage.js         # Gestión de datos con Supabase (API REST)
│   ├── loans.js           # Lógica de préstamos
│   ├── calendar.js         # Funcionalidad del calendario
│   ├── reports.js         # Generación de reportes
│   ├── payments.js         # Gestión de pagos y excedentes
│   ├── ui.js              # Renderizado de la interfaz
│   └── main.js            # Inicialización
├── index.html             # Archivo HTML principal
├── package.json           # Dependencias del proyecto
├── vercel.json           # Configuración de Vercel
├── .gitignore            # Archivos ignorados por Git
├── INSTRUCCIONES.md      # 📚 Guía completa de despliegue
└── README.md             # Este archivo
```

## 🛠️ Tecnologías

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Supabase (PostgreSQL)
- **API**: Vercel Serverless Functions
- **Despliegue**: Vercel

## 📋 Requisitos Previos

1. Cuenta en [Supabase](https://supabase.com) (gratis)
2. Cuenta en [Vercel](https://vercel.com) (gratis)
3. Node.js 18+ (solo para desarrollo local)

## 🚀 Inicio Rápido

### 1. Configurar Supabase

1. Crea un proyecto en [Supabase](https://supabase.com)
2. Ejecuta el SQL para crear la tabla (ver `INSTRUCCIONES.md`)
3. Obtén tus credenciales (URL y service_role key)

### 2. Desplegar en Vercel

1. Conecta tu repositorio a Vercel
2. Configura las variables de entorno:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Despliega

### 3. ¡Listo!

Abre la URL de Vercel y comienza a usar la app.

**📚 Para instrucciones detalladas, consulta [INSTRUCCIONES.md](./INSTRUCCIONES.md)**

## 📱 Uso

1. Abre la aplicación en tu navegador (PC o móvil)
2. Agrega préstamos usando el formulario
3. Los datos se guardan automáticamente en Supabase
4. Accede desde cualquier dispositivo - los datos están sincronizados

## 🔧 Desarrollo Local

```bash
# Instalar dependencias
npm install

# Ejecutar en modo desarrollo (requiere Vercel CLI)
vercel dev
```

## 📊 Estructura de Datos

Los préstamos se almacenan en Supabase en la tabla `prestamos`:

- `id`: Identificador único (auto-generado)
- `data`: Objeto JSON completo con toda la información del préstamo
- `updated_at`: Timestamp de última actualización

## 🔐 Seguridad

- ✅ Las claves de Supabase solo se usan en el servidor (Vercel)
- ✅ CORS configurado correctamente
- ✅ Validación de datos en las APIs
- ✅ Manejo de errores robusto

## 📝 Notas

- El proyecto usa **Supabase** como base de datos (no localStorage)
- Las APIs están desplegadas como **Serverless Functions** en Vercel
- Los datos se sincronizan automáticamente entre todos los dispositivos
- Compatible con PC, tablet y móvil (responsive design)

## 🆘 Soporte

Si tienes problemas, consulta:
1. [INSTRUCCIONES.md](./INSTRUCCIONES.md) - Guía completa paso a paso
2. Logs en Vercel → Functions
3. Logs en Supabase → Logs
4. Consola del navegador (F12)

## 📄 Licencia

Este proyecto es de uso personal.

---

**Desarrollado con ❤️ usando Supabase y Vercel**
