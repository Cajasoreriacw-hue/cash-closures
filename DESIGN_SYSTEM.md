# 🎨 Sistema de Diseño Moderno y Minimalista - Monit

## 📋 Paleta de Colores Principal

### Dark Orange (Color Primario)
```css
--dark-orange-50: #fff3e5   /* Fondos muy claros */
--dark-orange-100: #ffe7cc  /* Fondos claros, hover states */
--dark-orange-200: #ffcf99  /* Bordes suaves, estados disabled */
--dark-orange-300: #ffb866  /* Elementos secundarios */
--dark-orange-400: #ffa033  /* Acentos, iconos */
--dark-orange-500: #ff8800  /* Color principal, botones primarios */
--dark-orange-600: #cc6d00  /* Hover en botones primarios */
--dark-orange-700: #995200  /* Texto en fondos claros */
--dark-orange-800: #663600  /* Texto oscuro */
--dark-orange-900: #331b00  /* Texto muy oscuro */
--dark-orange-950: #241300  /* Fondos oscuros */
```

### Grises Neutros
```css
--gray-50: #f9fafb    /* Fondos muy claros */
--gray-100: #f3f4f6   /* Fondos de cards */
--gray-200: #e5e7eb   /* Bordes suaves */
--gray-300: #d1d5db   /* Bordes normales */
--gray-400: #9ca3af   /* Texto placeholder */
--gray-500: #6b7280   /* Texto secundario */
--gray-600: #4b5563   /* Texto normal */
--gray-700: #374151   /* Texto importante */
--gray-800: #1f2937   /* Texto muy oscuro */
--gray-900: #111827   /* Encabezados */
```

## 🎯 Principios de Diseño

### 1. Minimalismo
- Espacios en blanco generosos
- Elementos esenciales solamente
- Jerarquía visual clara
- Sin decoraciones innecesarias

### 2. Modernidad
- Bordes redondeados (rounded-xl, rounded-2xl)
- Sombras suaves (shadow-soft, shadow-soft-lg)
- Gradientes sutiles
- Animaciones fluidas

### 3. Consistencia
- Mismo espaciado en toda la app
- Colores de la paleta únicamente
- Tipografía Poppins en todos lados
- Patrones de interacción uniformes

## 🧩 Componentes Base

### Botones

#### Botón Primario
```html
<button class="px-4 py-2.5 bg-linear-to-r from-dark-orange-500 to-dark-orange-600 
               text-white font-medium rounded-xl shadow-soft hover:shadow-soft-lg 
               hover:from-dark-orange-600 hover:to-dark-orange-700 
               transition-all duration-200 active:scale-95">
  Acción Principal
</button>
```

#### Botón Secundario
```html
<button class="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 
               font-medium rounded-xl shadow-soft hover:bg-gray-50 
               hover:border-dark-orange-200 hover:text-dark-orange-700
               transition-all duration-200">
  Acción Secundaria
</button>
```

#### Botón Fantasma
```html
<button class="px-4 py-2.5 text-dark-orange-600 font-medium rounded-xl 
               hover:bg-dark-orange-50 transition-all duration-200">
  Acción Terciaria
</button>
```

### Cards

#### Card Básica
```html
<div class="bg-white rounded-2xl shadow-soft border border-gray-100 p-6 
            hover:shadow-soft-lg transition-all duration-200">
  <!-- Contenido -->
</div>
```

#### Card con Acento
```html
<div class="bg-linear-to-br from-white to-dark-orange-50/30 
            rounded-2xl shadow-soft border border-dark-orange-100 p-6">
  <!-- Contenido -->
</div>
```

### Inputs

#### Input de Texto
```html
<input type="text" 
       class="w-full px-4 py-2.5 bg-white border border-gray-200 
              rounded-xl focus:outline-none focus:ring-2 
              focus:ring-dark-orange-500/20 focus:border-dark-orange-500
              transition-all duration-200 placeholder:text-gray-400">
```

#### Select
```html
<select class="w-full px-4 py-2.5 bg-white border border-gray-200 
               rounded-xl focus:outline-none focus:ring-2 
               focus:ring-dark-orange-500/20 focus:border-dark-orange-500
               transition-all duration-200">
  <option>Opción 1</option>
</select>
```

### Navegación

#### Nav Item Activo
```html
<a class="px-4 py-2 text-sm font-medium text-dark-orange-700 
          bg-dark-orange-100 rounded-xl shadow-soft">
  Panel
</a>
```

#### Nav Item Inactivo
```html
<a class="px-4 py-2 text-sm font-medium text-gray-600 
          hover:text-dark-orange-600 hover:bg-dark-orange-50 
          rounded-xl transition-all duration-200">
  Cierres
</a>
```

### Badges

#### Badge Primario
```html
<span class="px-3 py-1 bg-dark-orange-100 text-dark-orange-700 
             text-xs font-medium rounded-full">
  Activo
</span>
```

#### Badge Secundario
```html
<span class="px-3 py-1 bg-gray-100 text-gray-700 
             text-xs font-medium rounded-full">
  Pendiente
</span>
```

## 📐 Espaciado

### Sistema de Espaciado
```
xs:  0.25rem (4px)   - Espacios muy pequeños
sm:  0.5rem  (8px)   - Espacios pequeños
md:  1rem    (16px)  - Espacios normales
lg:  1.5rem  (24px)  - Espacios grandes
xl:  2rem    (32px)  - Espacios muy grandes
2xl: 3rem    (48px)  - Secciones
```

### Aplicación
- **Gap entre elementos**: gap-4 (16px)
- **Padding de cards**: p-6 (24px)
- **Margin entre secciones**: mb-8 (32px)
- **Padding de página**: px-6 py-6

## 🎭 Sombras

### Sombras Personalizadas
```css
shadow-soft:    0 2px 8px rgba(255, 136, 0, 0.08)
shadow-soft-lg: 0 4px 16px rgba(255, 136, 0, 0.12)
shadow-soft-xl: 0 8px 24px rgba(255, 136, 0, 0.16)
shadow-glow:    0 0 20px rgba(255, 136, 0, 0.3)
shadow-glow-lg: 0 0 40px rgba(255, 136, 0, 0.4)
```

### Uso
- **Cards normales**: shadow-soft
- **Cards hover**: shadow-soft-lg
- **Modales**: shadow-soft-xl
- **Elementos destacados**: shadow-glow

## 🔄 Animaciones

### Animaciones Predefinidas
```css
animate-fade-in:  Aparición suave (0.3s)
animate-slide-up: Deslizamiento hacia arriba (0.4s)
animate-scale-in: Escala desde 95% (0.3s)
```

### Transiciones
```html
<!-- Transición estándar -->
<div class="transition-all duration-200">

<!-- Transición lenta -->
<div class="transition-all duration-300">

<!-- Hover con escala -->
<button class="hover:scale-105 transition-transform duration-200">
```

## 📱 Responsive

### Breakpoints
```
sm:  640px   - Móviles grandes
md:  768px   - Tablets
lg:  1024px  - Laptops
xl:  1280px  - Desktops
2xl: 1536px  - Pantallas grandes
```

### Patrones Comunes
```html
<!-- Ocultar en móvil -->
<div class="hidden md:block">

<!-- Grid responsive -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

<!-- Padding responsive -->
<div class="px-4 md:px-6 lg:px-8">
```

## 🎨 Gradientes

### Gradientes de Fondo
```html
<!-- Fondo de página -->
<div class="bg-linear-to-br from-gray-50 to-dark-orange-50/30">

<!-- Card con gradiente -->
<div class="bg-linear-to-r from-white to-dark-orange-50/20">

<!-- Botón con gradiente -->
<button class="bg-linear-to-r from-dark-orange-500 to-dark-orange-600">
```

### Gradientes de Texto
```html
<h1 class="bg-linear-to-r from-dark-orange-600 via-dark-orange-500 
           to-dark-orange-600 bg-clip-text text-transparent">
  Título con Gradiente
</h1>
```

## 📊 Tablas

### Tabla Moderna
```html
<div class="overflow-hidden rounded-2xl border border-gray-100 shadow-soft">
  <table class="w-full">
    <thead class="bg-gray-50 border-b border-gray-100">
      <tr>
        <th class="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
          Columna
        </th>
      </tr>
    </thead>
    <tbody class="bg-white divide-y divide-gray-100">
      <tr class="hover:bg-dark-orange-50/30 transition-colors duration-150">
        <td class="px-6 py-4 text-sm text-gray-900">
          Dato
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

## 🎯 Iconografía

### Tamaños de Iconos
```
w-4 h-4   (16px) - Iconos pequeños en botones
w-5 h-5   (20px) - Iconos en navegación
w-6 h-6   (24px) - Iconos en cards
w-8 h-8   (32px) - Iconos destacados
w-12 h-12 (48px) - Iconos grandes
```

### Colores de Iconos
```html
<!-- Icono normal -->
<svg class="w-5 h-5 text-gray-600">

<!-- Icono activo -->
<svg class="w-5 h-5 text-dark-orange-600">

<!-- Icono hover -->
<svg class="w-5 h-5 text-gray-600 group-hover:text-dark-orange-600">
```

## ✅ Checklist de Implementación

### Componentes a Actualizar
- [ ] Navigation Bar (Desktop y Mobile)
- [ ] Dashboard Cards
- [ ] Tablas (Closures, Sobres, Descuadres)
- [ ] Formularios (Registro, Login)
- [ ] Botones en toda la app
- [ ] Modales y Alerts
- [ ] Gráficas (Chart.js)
- [ ] Footer/Bottom Navigation

### Archivos Principales
1. `tailwind.config.cjs` ✅ (Actualizado)
2. `src/routes/+layout.svelte` ⏳ (En progreso)
3. `src/routes/+page.svelte` (Dashboard)
4. `src/routes/closures/+page.svelte`
5. `src/routes/sobres/+page.svelte`
6. `src/routes/registro/+page.svelte`
7. `src/routes/gastos/+page.svelte`
8. `src/routes/descuadres/+page.svelte`
9. `src/routes/login/+page.svelte`

## 🚀 Próximos Pasos

1. **Completar Navigation** - Actualizar mobile nav y bottom nav
2. **Dashboard** - Rediseñar cards con nueva paleta
3. **Tablas** - Aplicar estilos modernos a todas las tablas
4. **Formularios** - Actualizar inputs y selects
5. **Gráficas** - Configurar Chart.js con colores de la paleta
6. **Testing** - Verificar en diferentes dispositivos

---

**Versión**: 1.0.0  
**Fecha**: 2025-12-05  
**Estado**: 🟡 En Implementación
