Transición a Curso Estructurado y Modo de Práctica Libre
Este plan de diseño describe los cambios técnicos necesarios para transformar la aplicación de práctica de francés a un sistema de curso guiado basado en course.json, conservando un modo de "Práctica Libre" aislado (sandbox) para textos personalizados.

Resumen del Diseño
Estructura del Curso (course.json): El archivo generado con 99 unidades será parte del bundle y servirá como el núcleo del plan de estudios.
Pestaña "Curso": Reemplaza la antigua pestaña "Mis Lecciones" para mostrar el progreso general de las 99 unidades, mostrando un porcentaje de dominio basado en el estado SRS del vocabulario asociado a cada unidad.
Práctica Libre (Sandbox): La pantalla de práctica se adaptará para admitir un modo de "Práctica Libre" temporal donde el usuario puede pegar textos personalizados para escuchar o practicar pronunciación, pero sin que estas palabras nuevas o no controladas contaminen su mazo SRS del lexicón.
Proposed Changes
[Backend/State]
[MODIFY] 
useAppState.ts
Cargar course.json al inicializar la aplicación.
Adaptar el cargado de vocabulario. Al iniciar una lección del curso:
Extraer las palabras por sus IDs (wordIds) correspondientes desde french_vocab.json.
Si no existen en el estado state.vocabulary, agregarlas con un estado inicial de SRS listo para repasar.
Ofrecer una función específica para "Práctica Libre" que no altere el mazo permanente de vocabulario del usuario.
[Components & Views]
[NEW] 
CourseView.tsx
Nueva vista para mostrar las 99 unidades organizadas por orden.
Calcular el dominio por unidad: (número de palabras en SRS con dominio > 80% / total de palabras de la unidad) * 100.
Permitir hacer clic en cualquier unidad para iniciar su práctica.
[MODIFY] 
BottomNav.tsx
Cambiar pestañas a:
Curso: Acceso al plan de estudios estructurado.
Práctica Libre: Editor/lector sandbox (sin persistencia de vocabulario SRS).
Memoria: Repaso Spaced Repetition (SRS).
Vocabulario: Lista general y progreso del lexicón de 2000 palabras.
Ajustes: Configuración.
[MODIFY] 
PracticeView.tsx
Añadir un modo "Sandbox/Práctica Libre" (cuando no se carga una lección del curso).
En modo Sandbox, deshabilitar la inyección de nuevas palabras en el SRS para evitar "contaminar" el progreso con vocabulario aleatorio o avanzado fuera del lexicón.
Verification Plan
Automated Tests
Ejecutar los tests existentes:
bash

npm run test
Manual Verification
Abrir la aplicación y verificar la nueva pestaña de "Curso".
Confirmar que se listan las unidades A1 creadas con su progreso respectivo.
Practicar una unidad del curso y comprobar que las palabras clave (wordIds) correspondientes se agregan o actualizan en el SRS (pestaña Memoria).
Usar la pestaña "Práctica Libre", escribir o pegar texto personalizado, practicarlo y verificar que no se agrega ninguna palabra nueva a la pestaña "Memoria" ni al listado de "Vocabulario".