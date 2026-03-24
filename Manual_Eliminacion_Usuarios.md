# Manual de Eliminación de Usuarios (Correos Bloqueados)

Este manual te explica qué hacer cuando el sistema no puede eliminar a un alumno automáticamente de la base de datos de seguridad (Firebase Auth) y su correo queda "bloqueado" para nuevos registros.

## ¿Por qué sucede esto?
Por seguridad, Firebase impide que una aplicación borre la cuenta de un usuario si ese usuario no ha iniciado sesión recientemente. Como tú eres el administrador borrando la cuenta de *otra* persona, Firebase a veces bloquea la acción.

---

## Pasos para Limpieza Manual

Si recibes un mensaje diciendo que el correo sigue en uso en Auth, sigue estos pasos:

1.  **Entra a la Consola de Firebase:**
    Haz clic en el siguiente enlace: [Consola de Firebase - Usuarios](https://console.firebase.google.com/project/sistema-estudiantil-58bc2/authentication/users)

2.  **Busca al Alumno:**
    En la barra de búsqueda que dice "Search by email address, phone number, or UID", escribe el correo del alumno que quieres liberar.

3.  **Elimina la Cuenta:**
    - Una vez que aparezca el usuario en la lista, pon el ratón sobre su fila.
    - Haz clic en los **tres puntos verticales (**⠿**)** que aparecen al final de la fila a la derecha.
    - Selecciona **"Delete account"** (Eliminar cuenta).
    - Confirma en el cuadro de diálogo que aparezca.

4.  **Listo:**
    Ahora que el correo ha sido borrado de la base de datos de seguridad, puedes volver al sistema y **Aprobar** la nueva solicitud del alumno sin problemas.

---

> [!TIP]
> **Recomendación:** Siempre intenta primero la eliminación automática desde el panel de "Gestión de Usuarios". El sistema ahora es más inteligente y tratará de limpiarlo solo durante la aprobación si detecta el conflicto. Usar este manual solo como último recurso.
