# Sistema de Récords Máximos (RM) 🏆

Se ha añadido una nueva funcionalidad que permite a todos los atletas gestionar sus récords máximos (RM) de forma individual.

## 🔧 Configuración Inicial

### Paso 1: Ejecutar el Script SQL

Para habilitar la funcionalidad de RM, debes ejecutar el script SQL en tu base de datos de Supabase:

1. Ve al **SQL Editor** en tu panel de Supabase
2. Ejecuta el archivo `scripts/create-rm-table.sql`
3. El script creará automáticamente:
   - ✅ Tabla `personal_records` con todos los campos necesarios
   - ✅ Políticas RLS para seguridad de datos
   - ✅ Índices para optimizar consultas
   - ✅ Triggers para actualización automática de timestamps
   - ✅ Datos de ejemplo (opcional)

### Paso 2: Verificar la Instalación

Después de ejecutar el script, deberías ver en los logs de Supabase:
```
🎉 ¡SISTEMA DE RM CONFIGURADO EXITOSAMENTE!
📝 Los atletas ya pueden gestionar sus récords máximos
📝 Los masters pueden ver y gestionar todos los RM
```

## 🏋️ Funcionalidades Incluidas

### Para Atletas (rol: athlete)
- ✅ **Ver sus propios RM**: Acceso completo a su historial personal
- ✅ **Añadir nuevos RM**: Formulario intuitivo con ejercicios predefinidos
- ✅ **Editar RM existentes**: Actualizar peso, fecha y notas
- ✅ **Eliminar RM**: Gestión completa de sus registros
- ✅ **Estadísticas personales**: Métricas de progreso y mejoras recientes
- ✅ **Ejercicios populares**: Sugerencias basadas en uso común

### Para Masters (rol: master)
- ✅ **Ver todos los RM**: Acceso completo a registros de todos los atletas
- ✅ **Gestionar RM de cualquier usuario**: Capacidad de editar/eliminar
- ✅ **Supervisión general**: Visión global del progreso de atletas

## 🎯 Características Técnicas

### Seguridad
- **Row Level Security (RLS)** habilitado
- Los atletas solo pueden ver/modificar sus propios RM
- Los masters tienen acceso completo supervisado
- Validaciones de datos en frontend y backend

### Base de Datos
```sql
CREATE TABLE personal_records (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  exercise_name TEXT NOT NULL,
  weight_kg DECIMAL(6,2) NOT NULL,
  date_achieved DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, exercise_name)  -- Un RM por ejercicio por usuario
);
```

### Ejercicios Predefinidos
El sistema incluye ejercicios comunes de CrossFit:
- **Fuerza**: Back Squat, Front Squat, Deadlift, Bench Press
- **Olympic**: Clean, Snatch, Clean & Jerk, Thruster
- **Gymnásticos**: Pull-up, Muscle-up, Handstand Push-up
- **Y muchos más...** + opción de ejercicios personalizados

## 📱 Cómo Usar

### 1. Acceder a RM
- En el menú lateral, hacer clic en **"Mis RM"** (ícono de trofeo 🏆)

### 2. Añadir un Nuevo RM
1. Hacer clic en el botón **"Añadir RM"**
2. Seleccionar ejercicio de la lista o crear uno personalizado
3. Introducir peso en kg (admite decimales: 82.5)
4. Seleccionar fecha del récord
5. Añadir notas opcionales (técnica, cinturón, etc.)
6. Guardar

### 3. Gestionar RM Existentes
- **Editar**: Usar el menú de 3 puntos en cada tarjeta de RM
- **Eliminar**: Confirmación requerida para evitar eliminaciones accidentales
- **Ver estadísticas**: Panel superior con métricas automáticas

## 🔍 Resolución de Problemas

### Error: "La tabla de récords personales no existe"
- **Solución**: Ejecutar el script `create-rm-table.sql` en Supabase

### Error: "Ya tienes un RM registrado para este ejercicio"
- **Explicación**: Solo se permite un RM por ejercicio por usuario
- **Solución**: Editar el RM existente en lugar de crear uno nuevo

### No aparece el enlace "Mis RM" en el menú
- **Verificar**: Que estás logueado como atleta o master
- **Refrescar**: La página o cerrar/abrir sesión

### Error de permisos RLS
- **Verificar**: Que el script SQL se ejecutó completamente
- **Revisar**: Los logs de Supabase para errores en políticas

## 🚀 Características Avanzadas

### Estadísticas Automáticas
- **Total de RM registrados**
- **RM más pesado** (récord absoluto)
- **RM más reciente** (último logro)
- **Mejoras del mes** (últimos 30 días)

### Ejercicios Populares
- El sistema aprende de los ejercicios más usados
- Sugerencias inteligentes en el formulario
- Top 20 ejercicios más populares disponibles

### Búsqueda y Filtrado
- Los RM se ordenan alfabéticamente por ejercicio
- Badges automáticos: "Más reciente", "Más pesado", "Reciente"
- Fechas en formato español

## 📊 Datos de Ejemplo

El script incluye datos de ejemplo para facilitar las pruebas:
- Se crean RM de ejemplo para los primeros 2 atletas registrados
- 10 ejercicios diferentes con pesos aleatorios
- Fechas distribuidas en el último año

## 🔄 Actualizaciones Futuras

El sistema está preparado para futuras mejoras:
- Gráficos de progreso temporal
- Comparativas entre atletas (con permisos)
- Exportación de datos
- Notificaciones de nuevos RM
- Objetivos y metas personales

---

## 💡 Notas Técnicas

- **Precisión de peso**: Hasta 2 decimales (ej: 82.25 kg)
- **Validaciones**: Peso > 0, fecha requerida, ejercicio único por usuario
- **Performance**: Índices optimizados para consultas rápidas
- **Backup**: Los datos se respaldan automáticamente con Supabase

¡La funcionalidad de RM está lista para usar! 🎉 