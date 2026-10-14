# Bocina por USB serial

En **Configuración → Bocina por USB / puerto COM**, ajusta el puerto (por ejemplo COM3), baudios, bits de datos/parada, paridad, control de flujo, texto y terminación. Guarda antes de conectar. Deja el puerto vacío para elegir uno de los detectados mediante un diálogo.

Valores iniciales: 9600 baudios, 8N1, sin control de flujo, comando ASCII `#T`, sin terminación. El envío predeterminado contiene exactamente los bytes `23 54` hexadecimales. Conectar no activa la bocina. **Probar bocina** y **Bocina** reproducen el sonido habilitado por los parlantes del PC y envían la orden una vez por pulsación si el COM está conectado. El equipo externo determina la duración del pulso; no se envía una orden de apagado. En básquet también se activa al comenzar un tiempo muerto y al llegar a cero los relojes de juego, posesión o descanso; consulta [Relojes de básquet](relojes-basquet.md).

La configuración queda guardada localmente. La conexión se mantiene al cambiar de página; hay que conectar nuevamente al reiniciar la aplicación. Desconecta antes de modificar parámetros. Se muestran respuestas recibidas y errores de conexión. Requiere la aplicación de escritorio y que Windows reconozca el controlador USB como puerto COM.

Implementación basada en [Web Serial en Electron](https://www.electronjs.org/docs/latest/tutorial/devices#web-serial-api), sin dependencias nativas adicionales. La validación con un dispositivo simulado no reemplaza la prueba física de la bocina.
