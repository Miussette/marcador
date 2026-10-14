# Segunda etapa: controles y reglamentos deportivos

Los partidos nuevos inicializan el reglamento según el deporte del proyecto. En **Control del partido**, configura el formato antes de registrar la primera acción. Los partidos antiguos con puntuación requieren **Reiniciar reglamento**, con confirmación, para empezar con estos controles.

| Grupo | Controles incorporados |
| --- | --- |
| Tenis y pádel | 0/15/30/40, ventajas, punto de oro o Star Point; juegos, sets, tie-break, saque y ganador automático. |
| Vóleibol, playa, nieve, tenis de mesa, bádminton y squash | Sets por puntos, diferencia de dos, set decisivo, tope configurable y ganador automático. Saque alternado en tenis de mesa. Bádminton incluye formatos de 21/tope 30 y 15/tope 21. |
| Béisbol | Entradas y mitades, bolas, strikes, outs, bases, carreras, hits y errores. Cuatro bolas fuerzan corredores; tres outs cambian la mitad. Entradas extra por empate y cierre por ventaja local en la última baja. |
| Combate | Puntos y sanciones manuales, rounds configurables, reloj descendente y decisión del árbitro. En judo: ippon, waza-ari, yuko, shido y Golden Score. |
| Pruebas de marcas | Participantes, intentos, mejor marca, unidad y clasificación ascendente o descendente. Estados DNS/DNF/DQ, edición y tabla de resultados en pantalla. |

**Deshacer última acción** conserva hasta 100 acciones de puntuación. Restaura también sets, entrada, bases, técnicas y ganador. El reloj se pausa al deshacer y se controla por separado. Puntuación, configuración e historial quedan guardados en SQLite y se incluyen en exportación/importación del proyecto.

La pantalla personalizada y los cuatro diseños generales reciben puntuación específica y reloj de combate. La franja inferior muestra juegos/sets, saque, cuenta de béisbol o sanciones. Las pruebas de marcas muestran una tabla completa. OBS utiliza el mismo renderer.

Atajos de puntuación: en tenis y sets agregan un punto; en béisbol agregan una carrera al equipo al bate; en combate general agregan un punto. Los atajos de restar ejecutan Deshacer. Judo utiliza botones de técnicas; las marcas se introducen mediante formulario.

## Alcance pendiente

- Los demás deportes del catálogo mantienen el control general.
- Tenis/pádel no incluyen match tie-break en sustitución del último set ni rotación individual de dobles. El tie-break configurable corresponde al desempate de un set.
- Béisbol exige introducir los avances de corredores y jugadas excepcionales; no lleva un libro completo de anotación oficial ni corredores automáticos de extra innings.
- Combate general no automatiza tarjetas de jueces, puntuación por técnica de cada federación ni criterios de superioridad técnica. Judo no incluye temporizador de inmovilización.
- Las marcas se introducen manualmente, sin sensores ni fotofinish. Los empates comparten puesto; no se resuelven por segundo mejor intento. Las pruebas combinadas no calculan tablas de conversión.
- Las pruebas de marcas todavía usan la entidad de partido existente, que requiere dos equipos para crearse.
- Los ejecutables distribuidos previamente requieren generar nuevamente el paquete para incorporar estos cambios.

## Validación

- `npm.cmd run build`: TypeScript y compilación de ambos procesos.
- `npm.cmd run test:sports`: ventajas, Star Point, tie-break y saque, cierre/undo, extensión de sets, tope, bolas/outs, empate y victoria de béisbol, judo, rounds y clasificación de marcas.
- `npm.cmd run test:core`: SQLite, reapertura, exportación/importación de puntuación e historial; funciones de la primera etapa.
- `scripts/verify-sport-control.cjs`: Electron oculto con preload real y SQLite temporal; botones de punto/deshacer, cuenta de béisbol, ippon/deshacer y formulario de marcas/finalización.
- `scripts/verify-display-browser.cjs`: renderer real de OBS; ventajas, béisbol, judo, reloj agotado y resultados, además de jugadores, mensajes y vídeo.

## Referencias de reglamentos

- [ITF: reglas y reglamentos](https://www.itftennis.com/en/about-us/governance/rules-and-regulations/).
- [FIP: Star Point](https://www.padelfip.com/2025/12/between-innovation-and-tradition-introducing-the-star-point-the-scoring-system-that-appeals-to-everyone/).
- [FIVB: reglas de vóleibol](https://www.fivb.com/volleyball/the-game/official-volleyball-rules/).
- [ITTF: leyes del tenis de mesa](https://documents.ittf.sport/sites/default/files/public/2022-02/ITTF_HB_2022_tc_v1_0.pdf).
- [World Squash Officiating: reglas](https://worldsquashofficiating.com/rules-of-squash/).
- [Federación japonesa: transición de formatos de bádminton](https://www.badminton.or.jp/storage/uploads/news_images/2160/2/release_20260501.pdf).
- [MLB: reglas](https://www.mlb.com/glossary/rules).
- [IJF: reglas y documentos](https://www.ijf.org/ijf/rules).
