# Relojes y bocina de básquet

El reloj de juego es descendente: comienza en 10:00 por cuarto y 05:00 en prórroga. Se mantiene el tiempo consumido en los datos del partido y se presenta el restante tanto en control como en el marcador, los diseños FIBA, cámara y OBS. El botón +1 min aumenta el tiempo restante; Reset prepara nuevamente el período.

Inicio/Sigue, Pausa y Reset del juego controlan también el reloj de posesión. Los botones del reloj de posesión actúan de forma independiente y permiten ajustar 24/14 segundos sin modificar el juego. Ya no es necesario activar Auto Run.

Al llamar un tiempo muerto desde cualquiera de los equipos se pausan juego y posesión, conservando sus tiempos. Comienza la duración elegida en Break (00:30, 01:00 o 01:30) y se muestra una pastilla pequeña en el marcador/cámara. Al finalizar desaparece. Cerrar tiempo muerto la oculta y pausa el descanso; no reanuda automáticamente el juego. Sigue reanuda los dos relojes conservados.

La bocina suena al iniciar el tiempo muerto y al expirar juego, posesión o descanso. La expiración del juego o de la posesión detiene ambos. Se emite una señal por expiración, sin repetirse en cada tick. El sonido se reproduce en la salida de audio predeterminada de Windows; en Configurar bocina puede desactivarse **Sonar por los parlantes del PC**. Si el COM está conectado se envía además el comando configurado, inicialmente `#T`.

La consola puede hacerse más discreta con **Consola discreta**: oculta la información secundaria y los videos rápidos. **Mostrar consola** los recupera. La elección queda guardada y la ventana admite un mínimo de 900×600. El reloj se calcula a partir de timestamps y el proceso de control continúa actualizándolo aunque la ventana esté en segundo plano; para las señales automáticas debe mantenerse abierto el control del partido.

Verificación: `npm.cmd run test:basketball` comprueba transiciones, preservación de tiempos, independencia de posesión y una señal por expiración. Las pruebas de SQLite comprueban guardado y exportación/importación. La reproducción por parlantes y el equipo COM requieren una prueba física.
