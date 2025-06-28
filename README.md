# CrossFit Trainer App

Una aplicación móvil para programar entrenamientos de CrossFit usando Next.js, shadcn/ui, Tailwind CSS y Supabase.

## Características

- 📅 Calendario semanal con navegación
- 🏋️ Sistema de bloques de entrenamiento (A, B, C, etc.)
- 📱 Diseño móvil optimizado
- 💾 Persistencia de datos con Supabase
- ⚡ Interfaz moderna y rápida

## Tecnologías

- **Frontend**: Next.js 14, React, TypeScript
- **UI**: shadcn/ui, Tailwind CSS
- **Base de datos**: Supabase (PostgreSQL)
- **Iconos**: Lucide React

## Configuración

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar Supabase

1. Crea un proyecto en [Supabase](https://supabase.com)
2. Ve a Settings > API para obtener tus credenciales
3. Crea un archivo `.env.local` en la raíz del proyecto:

```env
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima_de_supabase
```

### 3. Configurar la base de datos

1. Ve al SQL Editor en tu proyecto de Supabase
2. Ejecuta el contenido del archivo `supabase-setup.sql`

### 4. Ejecutar la aplicación

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## Estructura del proyecto

```
src/
├── app/
│   ├── add/           # Página para añadir entrenamientos
│   ├── globals.css    # Estilos globales
│   ├── layout.tsx     # Layout principal
│   └── page.tsx       # Página principal
├── components/
│   └── ui/            # Componentes de shadcn/ui
└── lib/
    └── supabase.ts    # Configuración y funciones de Supabase
```

## Uso

### Añadir un entrenamiento

1. Selecciona una fecha en el calendario
2. Toca "Añadir Entrenamiento"
3. Completa los bloques con:
   - **Letra**: Identificador del bloque (A, B, C, etc.)
   - **Título**: Nombre del entrenamiento
   - **Descripción**: Detalles del entrenamiento
   - **Notas**: Información adicional (opcional)
4. Guarda el entrenamiento

### Ver entrenamientos

- Los entrenamientos se muestran en la página principal
- Cada día muestra el número de entrenamientos programados
- Toca un día para ver los entrenamientos detallados

## Estructura de datos

### Tabla `workouts`

```sql
CREATE TABLE workouts (
  id UUID PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE,
  date DATE,
  blocks JSONB
);
```

### Estructura de bloques

```typescript
type Block = {
  id: string
  letter: string      // A, B, C, etc.
  title: string       // Nombre del entrenamiento
  description: string // Descripción detallada
  notes: string       // Notas adicionales
}
```

## Desarrollo

### Comandos disponibles

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Construir para producción
npm run start        # Servidor de producción
npm run lint         # Verificar código
```

### Personalización

- **Colores**: Modifica `tailwind.config.js` para cambiar el tema
- **Componentes**: Los componentes de UI están en `src/components/ui/`
- **Estilos**: Los estilos globales están en `src/app/globals.css`

## Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request

## Licencia

MIT
