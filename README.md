# Marcador Pro

Software profesional de **gestión de marcadores deportivos** para Windows, inspirado funcionalmente en sistemas de control de marcador (tipo Ultra Score) pero con diseño, identidad visual y código completamente originales.

Permite administrar competencias, equipos, jugadores y partidos desde una **ventana de control**, y mostrar el marcador en una **segunda ventana independiente, sin bordes y movible** (pantalla completa con `F11`) para TV, proyector o pantalla LED.

> Fase 1 (MVP) — ver al final de este documento.

---

## Stack

| Capa | Tecnología |
| --- | --- |
| Escritorio | Electron 44 |
| UI | React 19 + TypeScript 5.9 (strict) |
| Build | Vite 8 + `vite-plugin-electron` |
| Estilos | Tailwind CSS 4 |
| Estado | Zustand 5 |
| Persistencia | SQLite (vía `sql.js`, WASM) — 100% offline |
| Iconos | lucide-react |
| Streaming | OBS Studio vía `obs-websocket-js` + servidor web local (SSE) |

### ¿Por qué `sql.js` y no `better-sqlite3` / Prisma?

- `better-sqlite3` exige recompilar módulos nativos contra los headers de Electron (requiere Visual Studio Build Tools en Windows). Es la causa nº1 de fallos de `npm install`.
- Prisma añade un motor binario que hay que sincronizar con Electron y complica el empaquetado.
- `sql.js` es **SQLite compilado a WebAssembly**: sin compilación nativa, sin internet, idéntico comportamiento en cualquier equipo. La base vive en el **proceso principal** y se escribe en disco de forma atómica (`.tmp` + rename) con debounce de 200 ms y guardado síncrono al salir.

Si más adelante necesitas `better-sqlite3` o Prisma, la capa está aislada en `electron/db.ts` + `electron/repository.ts`: cambiar el interior no afecta al renderer.

---

## Requisitos

- Windows 10/11
- Node.js 20+ (probado con Node 24)
- `npm install` (descarga Electron y dependencias)

## Ejecutar

```bash
npm install
npm run dev
```

`npm run dev` arranca Vite, compila `electron/main.ts` y `electron/preload.ts`, y lanza Electron. El **hot reload** aplica al renderer y recarga la ventana al cambiar el proceso principal.

### Otros comandos

```bash
npm run typecheck   # TypeScript estricto, sin emitir
npm run build       # typecheck + build de producción (dist/ + dist-electron/)
npm run preview     # sirve el build del renderer
npm run dist:win    # build + empaquetado Windows (.exe instalador y portátil)
```

### OBS Studio (transmisiones en vivo)

Marcador Pro se conecta a **OBS Studio** mediante el protocolo **obs-websocket**
(incluido por defecto en OBS 28+):

1. En OBS: **Herramientas → Configuración del servidor WebSocket** → habilita el
   servidor en el puerto **4455** (y contraseña si la configuraste).
2. En la app: abre el proyecto → **OBS / Streaming** en el menú lateral.
3. Pulsa **Conectar** (host `localhost`, puerto `4455`, contraseña opcional).
4. Desde ahí puedes **iniciar/detener el streaming**, **cambiar escenas** y
   **mostrar/ocultar fuentes** de OBS sin salir de la app.

#### Ver el marcador en la transmisión

Dos formas de llevar el marcador a OBS:

- **Servidor web (recomendado):** en **OBS / Streaming** pulsa **Iniciar servidor**
  (puerto por defecto `4456`). En OBS añade una fuente **«Navegador»** (Browser
  Source) con la URL que muestra la app (`http://localhost:4456/`). El marcador se
  actualiza en vivo: goles, cronómetro, periodo, cuenta atrás y logo de equipos.
  Marca «Cerrar fuente al no estar visible» para ahorrar CPU.
- **Captura de ventana:** abre el marcador con **ABRIR MARCADOR** y en OBS añade
  una fuente **«Captura de ventana»** seleccionando *Marcador Pro — Pantalla*.

### Verificación automatizada (desarrollo)

```bash
MP_DEBUG_PORT=9222 npm run dev   # arranca Electron con CDP de depuración
node scripts/smoke.mjs           # crea datos reales, navega, dispara atajos y guarda capturas
node scripts/probe.mjs           # comprueba retry de proyecto + deduplicación de avisos
node scripts/verify-phase2a.mjs  # deportes, propiedades, registro de eventos y cuenta atrás
node scripts/verify-salir.mjs    # regresión: "Salir" del control con partido activo (sin rebote)
node scripts/verify-finished.mjs # regresión: partido finalizado no sigue "grabando" el cronómetro
```

`scripts/smoke.mjs` usa Chrome DevTools Protocol contra el puerto de depuración: valida por API (sin mocks) el CRUD, la navegación, los atajos `Q`/`P`/`ESPACIO`, la apertura de la ventana Display, los 4 layouts, el overlay de gol, la persistencia y la recuperación del partido activo. Las capturas quedan en `scripts/shots/` y los errores del renderer se reportan como fallo. `scripts/verify-display-window.mjs` verifica la ventana sin bordes (apertura en ventana, región de arrastre nativa, controles, `F11` y redimensión) y la deja abierta para probarla a mano. `scripts/verify-phase2a.mjs` verifica la migración de propiedades de competencia, el selector de deporte, el registro de eventos con buscador y la cuenta atrás de extremo a extremo (control → display, expiración y persistencia). `scripts/verify-salir.mjs` verifica con un clic real (CDP) que "Salir" del panel de control permanece en Partidos con un partido activo —regresión del arranque que devolvía al usuario al control—, preservando el `activeMatchId` original. `scripts/verify-finished.mjs` verifica que un partido finalizado no pueda arrancar el cronómetro (atajo ESPACIO o botones), que al abrirlo se congele un cronómetro "colgado", y que al reabrirlo ("En juego") vuelva a operar. `scripts/cleanup-junk.mjs` elimina proyectos de prueba manuales.

---

## Generar el .exe (Windows)

```bash
npm install       # primera vez
npm run dist:win  # typecheck + build de producción + electron-builder
```

Artefactos en `release/`:

| Archivo | Qué es |
| --- | --- |
| `MarcadorPro-Setup-0.1.0.exe` | Instalador NSIS: elige carpeta y crea accesos directos (escritorio y menú inicio) |
| `MarcadorPro-Portable-0.1.0.exe` | Versión portátil de un solo archivo, sin instalar |
| `win-unpacked/Marcador Pro.exe` | App descomprimida para pruebas rápidas |

Notas:

- **Mismos datos que en desarrollo**: la app empaquetada usa `%APPDATA%\Marcador Pro\marcador.db`, así que los proyectos, equipos y partidos aparecen tal cual; la migración de la DB se aplica sola al arrancar.
- **Instancia única**: cierra `npm run dev` antes de abrir el `.exe` (comparten userData; si la versión de desarrollo está abierta, el `.exe` solo enfoca esa ventana y se cierra).
- `electron-builder` reutiliza el Electron local (`electronDist: node_modules/electron/dist`), así que solo descarga las herramientas NSIS la primera vez.
- El icono (`build/icon.ico`, tamaños 16–256) se regenera con `powershell -File scripts/make-icon.ps1`.

---

## Arquitectura

```
marcador/
├── electron/                 # Proceso PRINCIPAL (Node + Electron)
│   ├── main.ts               # Ciclo de vida, ventanas, guardado al salir
│   ├── preload.ts            # contextBridge → window.api (única API del renderer)
│   ├── db.ts                 # Conexión SQLite, esquema, persistencia atómica
│   ├── repository.ts         # CRUD de todas las entidades (SQL)
│   ├── ipc.ts                # Registro de canales ipcMain.handle(...)
│   ├── display.ts            # Ventana Display: monitores, fullscreen, sync
│   ├── obs.ts                # Conexión OBS (obs-websocket): streaming, escenas, fuentes
│   ├── obsServer.ts          # Servidor web local: marcador para OBS (HTTP + SSE)
│   └── files.ts              # Diálogos de imagen/texto
│
├── src/                      # Renderer (React)
│   ├── main.tsx              # Entrada ventana CONTROL
│   ├── App.tsx               # Rutas + recuperación del partido activo
│   ├── display/              # Entrada ventana DISPLAY (display.html)
│   ├── pages/                # Pantallas (Projects, Teams, Control, Settings…)
│   ├── components/           # UI genérica (ui/) y layout/
│   ├── features/             # Lógica por dominio
│   │   ├── projects/         # Modal de proyecto + selector de deportes (categorías e iconos)
│   │   ├── teams/            # Modal de equipo
│   │   ├── players/          # Modal de jugador
│   │   ├── matches/          # Modal partido, marcador, cronómetro, cuenta atrás, registro, atajos
│   │   ├── scoreboard/       # (Fase 2)
│   │   ├── timer/            # Cronómetro basado en timestamps + hook de tick
│   │   └── display/          # Layouts del marcador + overlays
│   ├── stores/               # Zustand (projects, teams, players, matches, activeMatch…)
│   ├── services/             # api.ts (puente IPC) y displaySync.ts
│   ├── types/                # Tipos de dominio + contrato de window.api
│   └── utils/                # cn, time, csv, format
│
├── index.html                # Ventana Control
├── display.html              # Ventana Display
└── vite.config.ts            # React + Tailwind + Electron (multi-page)
```

### Seguridad

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`.
- El renderer **no** tiene acceso a Node ni a la base de datos: solo `window.api`, expuesta explícitamente en `preload.ts` mediante `contextBridge`.
- CSP en ambos HTML (scripts propios, imágenes `data:`/`blob:`).

### Sincronización entre ventanas

1. El panel de control muta el partido (`matches:update`) → se persiste en SQLite.
2. Construye `DisplayState` (marcadores, equipos, periodo, snapshot del cronómetro) y lo envía por IPC (`display:sync`).
3. El proceso principal guarda el último estado y lo reenvía a la ventana Display (`display:state`); también lo sirve con `display:getState` cuando la ventana se abre después.
4. El Display **no** recibe un tic por segundo: recibe `{ running, startedAt, elapsed }` y calcula el tiempo con `Date.now()` localmente (rAF/100 ms). Así no se desincroniza aunque la UI se congela.

### Cronómetro robusto

`src/features/timer/timer.ts`:

```ts
startTimer()   // { running: true, startedAt: Date.now(), elapsed: 0 }
pauseTimer()   // congela en elapsed = elapsed + (now - startedAt)
resumeTimer()  // arranca de nuevo desde elapsed acumulado
resetTimer()
setTimer(ms)   // valor absoluto
addTime(ms)    // delta (±1 minuto)
```

Como guarda **timestamps**, el tiempo real no depende de cuántos renders haya hecho React, y al reabrir la app se reconstruye correctamente (autoguardado + recuperación).

---

## Cómo probar la segunda pantalla

1. `npm run dev`.
2. Entra a un proyecto → **Partidos** → **Control** (o **Marcador** en el sidebar).
3. Pulsa **ABRIR MARCADOR** (barra superior derecha). Se abre una **ventana sin bordes** (1280×720, sin barra de título) para que puedas colocarla donde quieras.
4. **Muévela** arrastrando su barra superior (región de arrastre nativa: la barra aparece al mover el ratón y se oculta sola) y **redimensiónala** desde la esquina inferior derecha.
5. En **Configuración → Pantalla externa** elige el monitor (usa `screen.getAllDisplays()`) y vuelve a abrir: la ventana se ubica en ese monitor conservando su tamaño.
6. Marca goles (`Q` / `P`) y arranca el cronómetro (`ESPACIO`): la pantalla se actualiza en tiempo real.
7. `F11` (o el botón de la ventana) alterna pantalla completa; la barra incluye además minimizar y cerrar.

Resoluciones soportadas: el Display usa `clamp()` + `vw/vh` → se adapta a 1280×720, 1366×768, 1920×1080 y 3840×2160 sin cambios.

### Atajos (por defecto; configurables)

| Tecla | Acción |
| --- | --- |
| `ESPACIO` | Iniciar / pausar cronómetro |
| `Q` | Gol local / punto local (vóleibol) |
| `P` | Gol visitante / punto visitante (vóleibol) |
| `CTRL + Q` | Restar gol/punto local |
| `CTRL + P` | Restar gol/punto visitante |
| `F11` | Pantalla completa del marcador |

Se desactivan mientras escribes en un campo de texto. Puedes reasignarlas en **Atajos** (con perfiles de operador).

---

## Fase 1 (incluida)

- Electron + React + TS + Vite + Tailwind + Zustand (seguridad completa, preload con contextBridge).
- SQLite local con autoguardado (cada mutación) y guardado síncrono al salir.
- Pantalla **Proyectos**: crear, abrir, duplicar, importar, exportar y eliminar.
- Navegación lateral por proyecto: Dashboard, Partidos, Equipos, Jugadores, Competencia, Marcador, Multimedia, Configuración.
- CRUD de equipos (logo PNG/JPG/SVG, colores, ciudad/país).
- CRUD de jugadores + importación CSV (`nombre,apellido,numero,posicion`) y plantilla descargable.
- Crear/editar/eliminar partidos (local, visitante, fecha, hora, sede, jornada, competencia) con estados Programado / En juego / Finalizado.
- **Panel de control**: marcador local/visitante, cronómetro completo (iniciar, pausar, reanudar, reiniciar, ±1 min), selector de periodo, tiempo añadido, timeline de eventos con borrado.
- **Ventana Display** independiente con 4 layouts: Classic, Modern, Minimal, Broadcast.
- Sincronización IPC en tiempo real + overlays de multimedia (mensajes/imágenes temporales).
- Recuperación automática del partido activo al reabrir la aplicación.

## Fase 2a (incluida)

- **Selector de deporte** en el modal de proyecto/competencia: 11 categorías (Pelota, Atletismo, Artes marciales, Artístico, Acuáticos, Hielo, Nieve, Ciclismo, Ecuestre, Precisión, Otros) con ~56 deportes, icono por ficha, buscador y selección visual; se muestra en la lista de proyectos y en la página de competencia.
- **Propiedades de competencia** (código, sesión, cancha) dentro del mismo modal, reflejadas en la página de competencia. La base de datos existente se migra sola (`ALTER TABLE` con guard en `db.ts`); exportar/importar/duplicar proyecto conserva las propiedades.
- **Cuenta atrás** en el panel de control: `Ejecutar` / `Pausar` / `Reset` / `Modificar` (mm:ss) con barra de progreso, aviso `¡TIEMPO!` al llegar a cero y botón **Mostrar/Ocultar** en la pantalla. Va en timestamps como el cronómetro y se persiste en settings (sobrevive a recargas y reinicios).
- **Registro de eventos con buscador**: el timeline pasó a registro completo con contador (`N de M`), búsqueda por minuto/equipo/detalle y filtro por tipo de evento (Todos los eventos / Gol / Amarilla…).
- **Competencia y sede heredadas del proyecto**: si un partido no trae competencia/sede, la cabecera de control y la ventana Display usan las del proyecto.

## Fase 2 (incluida)

- Eventos completos con selector de equipo/jugador: autogol, tarjetas, sustituciones, penal, VAR, tiempo añadido como evento.
- Asignar goleador a cada gol y edición de eventos existentes (minuto/descripción).
- Multimedia avanzada: videos, secuencias programadas y sponsor rotativo.
- Atajos configurables y perfil de operador.
- **Tabla de posiciones** (`standings`) con CRUD y cálculo de puntos/diferencia.
- **Calendario y resultados** (`/p/:id/calendar`): pestaña *Calendario* con los próximos partidos agrupados por fecha y pestaña *Resultados* con los finalizados (marcador local–visitante, del más reciente al más antiguo).
- **Actas PDF reales**: la página de actas exporta un PDF con jsPDF (cabecera, datos del partido, marcador, tabla de eventos, texto del acta, oficiales, firmas y pie con fecha) mediante `dialog.showSaveDialog`.
- **Marcadores por deporte**: básquetbol con cuartos, faltas, tiempos fuera y shot clock (posesión); vóleibol con **sets** (`SetsControl` en control + `SetsInfo` en las 4 layouts y en el servidor OBS, evento `set` en la timeline).
- Empaquetado con `electron-builder` (instalador `.exe` y portable) y actualizaciones.


## Primera etapa de consolidaci?n

- Videos: selector de archivos MP4, WebM y Ogg, reproducci?n en pantalla/OBS y retorno al marcador. Duraci?n 0 reproduce hasta el final. Los archivos se conservan en su ubicaci?n original: no moverlos despu?s de agregarlos. Los registros antiguos creados mediante el selector de texto deben agregarse de nuevo.
- Secuencias: reproducci?n ordenada de im?genes/mensajes, intervalo configurable, bucle opcional y bot?n para detener. Las rotaciones de sponsors reproducen las im?genes en bucle y muestran su estado real.
- Reemplazar contenido cancela la cola anterior. Detener devuelve todas las salidas al marcador. Eliminar la lista o el video en reproducci?n tambi?n lo detiene.
- Atajos: los activos reemplazan la asignaci?n predeterminada de su acci?n. Las combinaciones duplicadas se rechazan. Funcionan en el control, excepto mientras se escribe en un campo.
- Estad?sticas individuales de baloncesto: puntos y faltas se guardan por partido en SQLite; se conservan al reabrir y al exportar/importar proyectos. Son un registro individual separado del marcador de equipo.
- OBS usa el mismo renderer que la pantalla externa: dise?os, cron?metro, n?minas, im?genes, mensajes y videos. El servidor requiere un build actualizado (`npm.cmd run build`), incluso al probarlo en desarrollo.

Pruebas aisladas sin modificar los datos del operador:

`npm.cmd run test:core` verifica colas, atajos, persistencia/importaci?n de estad?sticas, SSE y video HTTP por rangos. Requiere un build previo.

`electron scripts/verify-display-browser.cjs` comprueba el renderer real en una ventana oculta con perfil temporal; genera un WebM de prueba local y registra el resultado en `scripts/verify-display-result.json`.
