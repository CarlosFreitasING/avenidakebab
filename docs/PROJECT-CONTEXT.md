# Contexto del proyecto Club Kebab

## Objetivo

Convertir la demo actual de fidelidad para un restaurante en una aplicación web accesible desde ordenador, Android y iPhone. La aplicación debe funcionar desde un navegador y poder instalarse opcionalmente como una PWA (Progressive Web App).

Todos los dispositivos deben consultar los mismos datos en la nube: usuarios, menú, puntos e historial de operaciones.

## Estado actual

La aplicación está hecha con HTML, CSS y JavaScript sin framework ni proceso de compilación:

- `club-kebab/index.html`: estructura de la interfaz.
 `club-kebab/css/estilos.css`: estilos y diseño responsive existente.
 `club-kebab/js/app.js`: autenticación Supabase, menú, puntos, QR y estado de la aplicación.
 `club-kebab/js/supabase-config.js`: URL y clave publishable del proyecto Supabase.
- `club-kebab/manifest.json`: metadatos de instalación de la PWA.
- `club-kebab/service-worker.js`: caché de los recursos básicos de la aplicación.
 `club-kebab/vendor/qrcode.min.js`: generación de códigos QR.
 `club-kebab/vendor/jsQR.min.js`: lectura de códigos QR.
 `menu-fidelidad.html`: redirección hacia la aplicación.
- `club-kebab/jsQR.min.js`: lectura de códigos QR.
- `menu-fidelidad.html`: redirección hacia la aplicación.

Los datos principales ya se leen de Supabase. La aplicación mantiene únicamente una caché en memoria durante la sesión; no usa `localStorage` para clientes, menú ni puntos.

La autenticación usa Supabase Auth. La clave publishable está en el frontend por diseño; no se incluye ninguna clave `secret` ni `service_role`.

## Funcionalidad existente

### Cliente

- Crear una cuenta aceptando los términos.
- Iniciar sesión.
- Consultar el menú y filtrarlo por texto, categoría y puntos.
- Ver el detalle de cada artículo.
- Ver los puntos acumulados.
- Mostrar una tarjeta QR y un código manual.
- Ver el progreso hacia el premio de 10 puntos.

### Administrador

- Iniciar sesión como administrador.
- Añadir, editar y eliminar artículos del menú.
- Buscar un cliente mediante QR o código manual.
- Sumar uno o varios menús.
- Ver los puntos del cliente.
- Canjear el premio al llegar a 10 puntos y reiniciar el contador.

## Arquitectura objetivo

```text
Ordenador / Android / iPhone
            |
            v
Frontend HTML, CSS y JavaScript como PWA
            |
            v
Autenticación y API segura en la nube
            |
            v
Base de datos compartida
```

La propuesta inicial es:

- Frontend: HTML, CSS y JavaScript existentes.
- PWA: `manifest.json`, `service-worker.js`, iconos y HTTPS.
- Backend y base de datos: Supabase.
- Alojamiento del frontend: Vercel, Netlify o Cloudflare Pages.

## Requisitos de la PWA

- Debe funcionar en navegadores de ordenador y teléfono.
- Debe tener diseño responsive.
- Debe incluir un manifiesto web con nombre, iconos, colores y modo de visualización.
- Debe registrar un service worker para cachear los recursos básicos.
- Debe servirse mediante HTTPS, excepto durante el desarrollo local.
- En Android debe poder ofrecer instalación desde Chrome.
- En iPhone debe poder añadirse a la pantalla de inicio desde Safari.
- La instalación es opcional; la aplicación debe seguir funcionando como web normal.

## Datos en la nube

La base de datos debe sustituir progresivamente a `localStorage`.

Tablas sugeridas:

### `profiles` o `usuarios`

- Identificador del usuario.
- Correo.
- Nombre opcional.
- Rol: `cliente` o `admin`.
- Fecha de registro.

### `menu_items`

- Nombre.
- Categoría.
- Precio.
- Descripción.
- Variantes.
- Guarniciones.
- Indicador de si suma puntos.
- Estado activo.
- Fechas de creación y actualización.

### `point_transactions`

- Cliente afectado.
- Cantidad de puntos.
- Tipo: suma o canje.
- Administrador que realizó la operación.
- Fecha y hora.
- Nota opcional.

Es preferible conservar un historial de movimientos y calcular o actualizar el saldo a partir de operaciones controladas. Así se puede auditar quién modificó los puntos y cuándo.

## Seguridad obligatoria

- No guardar contraseñas directamente en el código ni en tablas accesibles desde el frontend.
- Usar el sistema de autenticación de Supabase.
- No incluir claves secretas del servidor en JavaScript público.
- Usar políticas de seguridad de filas (RLS).
- Un cliente solo debe poder leer su propio perfil, puntos y movimientos.
- Solo los administradores autorizados deben poder modificar el menú o los puntos.
- Validar también los permisos en el backend o en las políticas de la base de datos, nunca solo en la interfaz.
- El QR debe identificar al cliente, pero no debe contener contraseñas ni información sensible.

## Migración desde la demo

1. Crear el proyecto y las tablas en Supabase.
2. Ejecutar `supabase/migrations/002-puntos-seguros.sql` para habilitar las operaciones protegidas de puntos.
3. Crear el usuario administrador en Supabase Auth y asignarle el rol `admin` en `profiles`.
4. La aplicación usa Supabase Auth y llamadas a Supabase para el menú, perfiles y puntos.
5. Migrar manualmente cualquier dato local que se quiera conservar; la demo anterior no se importa automáticamente.
6. Probar los permisos con cuentas de cliente y administrador separadas.

## Criterios de aceptación

- La misma cuenta funciona desde PC, Android y iPhone.
- Un cambio de puntos realizado por el administrador aparece en los demás dispositivos.
- El menú actualizado se comparte entre usuarios.
- Un cliente no puede modificar sus propios puntos.
- La PWA se puede instalar opcionalmente en Android y iPhone.
- La aplicación sigue siendo accesible mediante una URL normal.
- La cámara y el QR funcionan en dispositivos compatibles y existe una alternativa mediante código manual.
- El sistema no depende de `localStorage` para los datos principales en producción.

## Convenciones para futuras modificaciones

- Mantener la interfaz en español.
- Preservar los identificadores DOM existentes salvo que se actualice también toda la lógica que los usa.
- Preferir cambios pequeños y compatibles con la estructura actual.
- No introducir un framework o un proceso de compilación sin una decisión explícita.
- No tratar la autenticación actual ni las credenciales incluidas como seguras.
- Probar siempre en escritorio, Android y Safari de iPhone cuando se modifiquen la PWA, el login, el QR o la sincronización.
