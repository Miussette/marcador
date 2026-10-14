# Plantilla FIBA 1

Selecciona **Diseño → Tipo: Baloncesto → Plantilla de baloncesto: FIBA 1**. La aplicación pide confirmar antes de sustituir los elementos del diseño existente y guarda automáticamente la plantilla elegida.

La composición sigue la referencia proporcionada: fondo oscuro, título de competición, nombres amarillos, puntuación roja, cuarto verde, reloj blanco, listas laterales con cinco indicadores de faltas y puntos por jugador, cuadrados de tiempos muertos y flechas de posesión.

- El título utiliza la competición real cuando su texto está vacío.
- Los jugadores y sus estadísticas proceden de los equipos y del partido. Las filas sin jugador registrado permanecen vacías.
- Las listas se muestran al inicio o mediante **Mostrar jugadores**, y se ocultan al iniciar el reloj.
- En el control de baloncesto, **Asignar posesión** activa la flecha del equipo. Pulsar la posesión activa la desmarca; asignarla al rival cambia la flecha. El dato se conserva al reabrir y exportar/importar el partido.
- Los cuadrados representan los tiempos muertos utilizados registrados en el control.
- El reloj utiliza los datos del partido y muestra décimas por debajo de un minuto. Esta plantilla cambia la presentación; no cambia el sentido del cronómetro.
- Los elementos mantienen posición, tamaño, colores y edición habituales del editor. La plantilla seleccionada también llega a la salida OBS.

Validación: TypeScript y compilación; guardado/reapertura/importación de posesión; controles reales de posesión en Electron; renderer de OBS con listas, estadísticas, tiempos muertos, flechas y ocultación de jugadores. Vista de prueba: [fiba1-preview.png](fiba1-preview.png).
