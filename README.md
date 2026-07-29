# Sitios de viaje

Diario de viajes compartido: guarda restaurantes, monumentos, rutas y cualquier rincón que no quieras olvidar, con su ubicación en un mapa.

## Funcionalidades

### Cuentas y permisos
- Registro e inicio de sesión clásico (email + contraseña), sin enlaces mágicos.
- Puedes iniciar sesión indistintamente con tu **email o tu nombre de usuario**.
- Nombre de usuario y email son únicos por cuenta.
- Cada persona ve todos los lugares añadidos por cualquiera, pero solo puede editar o borrar los suyos propios.

### Gestión de lugares
- Alta de lugares con: nombre, tipo, país, ciudad, nota personal y ubicación.
- Tipos disponibles (lista fija): Restaurante, Monumento, Plaza, Mirador, Museo, Naturaleza, Alojamiento, Rutas, Otro.
- País y ciudad se escriben en **mayúsculas automáticamente** para evitar duplicados por mayúsculas/minúsculas al filtrar (ej. "ESPAÑA" vs "españa").
- Autocompletado (`datalist`) de país/ciudad sugiriendo los valores ya usados anteriormente, sin bloquear la entrada de uno nuevo.
- Botón **Editar** en cada tarjeta (visible solo si el lugar es tuyo) que abre un modal con todos los campos, incluida la ubicación.
- Botón **Eliminar** con el mismo control de permisos.
- Cada tarjeta muestra quién añadió el lugar (o "Añadido por ti" si es tuyo).

### Ubicación
Tres formas de fijar dónde está un lugar, combinables entre sí:
1. **Usar mi ubicación actual** (geolocalización del navegador/móvil).
2. **Buscador de dirección o nombre del sitio** (geocodificación vía Nominatim/OpenStreetMap).
3. **Tocar directamente sobre un mapa** (marcador arrastrable para ajustar a mano).

Al fijar una ubicación por cualquiera de las tres vías, se guarda automáticamente la **dirección legible** (geocodificación inversa), visible tanto en la tarjeta de la lista como en el popup del mapa.

### Navegación
- Tres pestañas: **Lista** (filtros + tarjetas), **Crear lugar** (formulario de alta) y **Mapa**.
- Filtros por país, ciudad, tipo y buscador de texto libre por nombre.
- Al hacer clic en el nombre de un lugar en la Lista, te lleva directo a la pestaña Mapa centrado en ese punto, con su popup abierto.
- El mapa usa Leaflet + OpenStreetMap (gratuito, sin API key).

## Stack técnico

- Frontend estático: HTML, CSS y JavaScript vanilla (sin build tools ni frameworks).
- Backend: [Supabase](https://supabase.com) (Postgres + Auth + API REST vía `@supabase/supabase-js`).
- Mapas: [Leaflet.js](https://leafletjs.com/) + tiles de OpenStreetMap.
- Geocodificación (directa e inversa): [Nominatim](https://nominatim.org/) (OpenStreetMap), gratuito y sin API key.

## Puesta en marcha

### 1. Crear el proyecto de Supabase
Crea un proyecto nuevo en [supabase.com](https://supabase.com).

### 2. Ejecutar las migraciones SQL en orden
En el SQL Editor de tu proyecto, ejecuta estos archivos **en este orden**:

1. `01-supabase-setup.sql` — crea la tabla `lugares`.
2. `02-migracion-perfiles.sql` — añade autenticación y perfiles de usuario.
3. `03-migracion-username.sql` — añade el nombre de usuario a los perfiles.
4. `04-migracion-tipo-rutas.sql` — añade el tipo "Rutas" a la lista permitida.
5. `05-migracion-direccion-username-login.sql` — añade el campo de dirección y la función que permite iniciar sesión con nombre de usuario.

### 3. Configurar Authentication
En **Authentication → Providers → Email**, activa el proveedor de email. Si quieres que las cuentas nuevas funcionen sin tener que confirmar el correo, desactiva "Confirm email".

### 4. Conectar la app
En `app.js`, sustituye `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` por los de tu proyecto (Project Settings → API Keys).

### 5. Ejecutar en local
Sirve la carpeta con un servidor estático (por ejemplo, la extensión **Live Server** de VS Code) — no funciona abriendo `index.html` directamente por el sistema de archivos, ya que usa módulos ES.

## Estructura de archivos

```
sitios-viaje/
├── index.html
├── styles.css
├── app.js
├── 01-supabase-setup.sql
├── 02-migracion-perfiles.sql
├── 03-migracion-username.sql
├── 04-migracion-tipo-rutas.sql
└── 05-migracion-direccion-username-login.sql
```
