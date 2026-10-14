# Tres pantallas

Desde **Control del partido → 3 pantallas** o **OBS / Streaming**, asigna los monitores y pulsa **Aplicar 3 pantallas**:

1. **Control y configuración:** ventana del operador para equipos, partidos, diseño, puntuación y OBS.
2. **Marcador:** ventana independiente en pantalla completa, sincronizada con el partido.
3. **Cámara en vivo / OBS:** ventana independiente para cámara y marcador superpuesto, o para visualizar la mezcla de OBS mediante su cámara virtual.

Windows debe estar en modo **Extender estas pantallas**. La distribución completa requiere tres monitores distintos. Con uno o dos monitores puedes abrir y mover las ventanas por separado. La asignación se guarda; si desconectas un monitor, pulsa **Detectar monitores** y reasigna las salidas.

## Cámara directa hacia OBS

En la tercera ventana selecciona una webcam o capturadora y pulsa **Iniciar cámara**. La app no activa la cámara al abrir la ventana y no captura audio. **Detener cámara** libera el dispositivo.

En OBS añade una **Captura de ventana**, selecciona **Marcador Pro — Cámara y OBS** y oculta los controles de esa ventana. El marcador pequeño se actualiza con el partido. Los mensajes y contenidos multimedia del marcador también aparecen como superposiciones.

El botón **Mostrar / Ocultar marcador** permite elegir si la cámara lleva puntuación. F11 alterna pantalla completa; mueve el ratón para recuperar los controles. El audio de la transmisión se configura en OBS.

## Salida final de OBS hacia el tercer monitor

Inicia **Cámara virtual** en OBS y selecciona **OBS Virtual Camera** en la tercera ventana. Si OBS ya incorpora el marcador, oculta el marcador pequeño de la app para evitar duplicarlo. Usa una cámara física como fuente de OBS; esta modalidad muestra su mezcla final en la tercera pantalla.

También puedes usar el proyector de programa propio de OBS en ese monitor. La app no inicia una emisión pública automáticamente.

## Verificación realizada

- TypeScript y compilación de las tres páginas, proceso principal y preload.
- `npm.cmd run test:screens`: tres monitores simulados; reparto, monitores repetidos/desconectados, reapertura sin duplicar ventanas, pantalla completa y permisos exclusivos de vídeo.
- `scripts/verify-live-camera.cjs`: Electron real con cámara simulada de Chromium. Verifica activación manual, vídeo sin audio, cambios de puntuación, liberación del dispositivo y rechazo del micrófono.
- Pruebas existentes de control y salida OBS.

La validación física de tres monitores, webcams/capturadoras concretas y OBS Virtual Camera depende del equipo conectado. Los `.exe` anteriores requieren empaquetarse nuevamente.
