# Mejoras necesarias
_Exported on 7/4/2026 at 13:57:22 AST from Cursor (3.8.23)_

---

**User**

Crees que le falten mejoras?

---

**Cursor**

Revisando el código reciente del proyecto para dar una opinión fundamentada.


Sí — la app ya está en muy buen estado para lo que pediste al inicio, pero hay margen claro de mejora. Lo que acabas de pulir (colapsar el editor, velocidad visible, atajos de teclado) cierra bien el flujo de **Práctica**. Lo que sigue depende de qué quieras priorizar.

## Lo que ya está sólido

- Flujo completo: texto → oraciones → pronunciación → vocabulario → memoria (SRS) → lecciones guardadas.
- Buen detalle de UX reciente: colapso al scroll, barra compacta, drill de palabra aleatoria con highlight, edición manual de traducciones.
- Reutilización coherente (`WordCategorySummary` en Memoria y Mis lecciones, colores alineados).
- Persistencia local + backup, multi-idioma, controles de voz.

## Mejoras que más valor darían

### 1. Experiencia móvil (tu objetivo original)
No hay PWA (`manifest`, service worker). En el iPhone se abre como pestaña del navegador: sin icono en home, sin pantalla completa, y el teclado/atajos (← ↑ ↓ →) casi no aplican. Para uso “principalmente en el teléfono”, esto sería la mejora más impactante.

### 2. Memoria (flashcards)
- Atajos de teclado: espacio para revelar, 1–4 para calificar (como Anki).
- Opción de no repetir la misma palabra en la misma sesión si fallaste varias veces.
- En móvil, gestos (swipe izquierda/derecha = difícil/bien) encajarían mejor que botones pequeños.

### 3. Práctica ↔ Memoria conectadas
El drill aleatorio elige cualquier palabra al azar, sin priorizar las que tienes pendientes en SRS. Podrías:
- Priorizar palabras “pendientes” o “aprendiendo”.
- Evitar repetir la misma palabra dos veces seguidas en el drill.

### 4. Mis lecciones
Funciona bien el resumen por categoría y el % de dominio, pero faltan cosas útiles cuando crezca la biblioteca:
- Ordenar (por fecha, dominio, palabras pendientes).
- Buscar por título.
- Editar título sin re-guardar todo el texto.
- Indicador de “última práctica” (ya tienes `markTextPracticed` en el estado; podría mostrarse en la tarjeta).

### 5. `WordCategorySummary`
El componente es limpio, pero las chips son solo informativas. Un tap en “Pendientes” o “Aprendiendo” que filtre vocabulario o lance una sesión de repaso de esa lección sería un salto de utilidad grande con poco código extra.

### 6. Pulido y consistencia
- Mezcla de español e inglés en UI: p. ej. “← Random” en `SentenceNavPanel` vs el resto en español.
- `window.confirm` al borrar lecciones/vocabulario — funcional, pero poco elegante en móvil.
- El README está desactualizado (no menciona Memoria, lecciones guardadas, inglés, etc.).

### 7. Robustez técnica
- **Cero tests** — la lógica de SRS (`spacedRepetition.ts`), extracción de palabras y cálculo de dominio (`textWordStats.ts`) son candidatos ideales para tests unitarios.
- En `PracticeView`, el scroll a palabra/oración usa `document.querySelector` con `data-*` attributes — funciona, pero refs serían más fiables si cambia el DOM.

## Lo que puede esperar

- Dashboard de progreso (racha, palabras dominadas por semana).
- Modo oscuro.
- Refactor de `PracticeView` (~530 líneas) extrayendo un hook — más mantenibilidad que valor visible.
- Exportar solo vocabulario (aparte del backup completo).

---

**En resumen:** para uso diario en el móvil, yo priorizaría **PWA + gestos en Memoria + drill inteligente (SRS-aware)**. Para robustez a largo plazo, **tests del algoritmo de repaso**. El resto es polish.

Si quieres, en Agent mode puedo implementar una de esas mejoras concreta; dime cuál te interesa más.

---

**User**

hacer todas esas mejoras

---

**Cursor**

Implementando todas las mejoras sugeridas. Explorando el código base para planificar los cambios.


Creando la infraestructura base y luego actualizando los componentes existentes.


Listo. Implementé todas las mejoras. Resumen:

### PWA
- `vite-plugin-pwa` con service worker y manifest
- Instalable en el teléfono (Añadir a pantalla de inicio)
- Icono en `public/icon.svg`

### Memoria
- Atajos: **Espacio/Enter** revelar · **1–4** calificar
- Gestos: desliza **←** otra vez · **→** bien
- Anti-repetición: evita la misma tarjeta seguidas en sesión
- Categorías clicables → sesión filtrada por esa categoría

### Práctica
- Drill **SRS-aware**: prioriza pendientes/aprendiendo sobre dominadas
- No repite la misma palabra dos veces seguidas
- Scroll con **refs** (sin `querySelector`)
- Atajos extraídos a `usePracticeKeyboard`

### Mis lecciones
- Buscar por título
- Ordenar: recientes, pendientes, dominio, A–Z
- Editar título (tap en el título)
- Muestra última práctica
- Chips de categoría → abre Memoria filtrada por esa lección

### WordCategorySummary
- Chips interactivos en lecciones, Memoria y Ajustes
- Ajustes → toca categoría → filtra Vocabulario

### Pulido
- «Random» → «Aleatoria»
- Modal de confirmación (reemplaza `window.confirm`)
- README actualizado

### Ajustes
- **Progreso**: racha, dominadas, pendientes, esta semana
- **Tema oscuro**
- Exportar vocabulario JSON/CSV

### Tests
- 9 tests unitarios (SRS, dominio, extracción de palabras)
- `npm test`

Build y tests pasan. Para probar la PWA en el móvil: `npm run build && npm run preview` y abre la URL HTTPS desde el teléfono.

---

**User**

las estadisticas que pusiste en ajustes, ponlas en Lecciones. 

En practica, al agregar un texto, se revelan las oraciones que creamos, pero se oculta el primer panel donde estsan los botones guardar y traducir. creo que lo unico que hay que  colapsar es el input o texta area para el texto. corrige eso. si quieres review la pantalla practica completa y arreglala como consideres

---

**Cursor**

Revisando la estructura actual de Práctica y Lecciones para aplicar los cambios.


Reorganizando Práctica para colapsar solo el editor de texto y moviendo las estadísticas a Lecciones.


Listo. Dos cambios principales:

### Estadísticas → Lecciones
- El bloque **Progreso** (racha, dominadas, esta semana, pendientes + categorías) está ahora arriba en **Mis lecciones**
- Se muestra siempre, aunque no haya lecciones guardadas
- Las categorías del resumen global siguen llevando a Vocabulario filtrado
- Eliminado de Ajustes

### Práctica: colapsar solo el editor
Antes se ocultaba todo el panel (`Traducir`, `Guardar`, toolbar). Ahora:

- **Siempre visibles:** botones Traducir / Guardar / Cerrar lección, banner de lección guardada, y «Leer toda la lección»
- **Colapsable:** título, textarea, hint y botón de muestra B1
- Cuando el editor está colapsado aparece una barra compacta con preview del texto + **Editar texto**
- **Mostrar oraciones** colapsa solo el editor, no los botones
- Al cargar lección, usar muestra B1 o hacer scroll en oraciones → se colapsa el editor, no el panel de acciones
- Al borrar el texto (sin oraciones) el editor se expande de nuevo

Flujo típico: pegas texto → ves oraciones abajo con Traducir/Guardar arriba → opcionalmente colapsas el textarea para ganar espacio.

---

**User**

editar texto y mostrar oraciones deberian ser cta mas notables. swipe left y right and memoria no tiene animacion o algo para distinguirlo.

---

**Cursor**

Mejorando los CTAs de práctica y añadiendo feedback visual al swipe en Memoria.


Listo. Cambios:

### Práctica — CTAs más visibles
- **Editar texto**: botón primario ancho completo (`btn--primary btn--block`), 44px de alto, con preview del texto arriba en gris
- **Mostrar oraciones**: botón secundario ancho completo, mismo tamaño, con flecha ↓

### Memoria — swipe con feedback
- **Al arrastrar**: la tarjeta se mueve y rota siguiendo el dedo
- **Overlay de color**: rojo ← «Otra vez» · azul → «Bien», que aparece según la dirección
- **Al soltar**: animación de salida (vuela hacia el lado) antes de pasar a la siguiente tarjeta
- **Guía fija** debajo de la tarjeta revelada: `← Desliza · Otra vez` | `Bien · Desliza →` con fondos rojo/azul suaves

Así se distingue claramente qué hace cada gesto, no solo al completarlo sino mientras deslizas.

---

**User**

en practica necesito mas real state para las oraciones. pon los botones editar texto leer toda la leccion traducir y guardar juntos debajo del input de las oraciones, el cual es collapsable

---

**Cursor**

Reorganizando la vista de Práctica: textarea colapsable y botones de acción agrupados debajo.


Consolidando el editor en un bloque compacto: textarea colapsable y barra de acciones unificada.


Listo. La zona superior quedó mucho más compacta:

### Nuevo layout
- **Colapsado:** solo una línea de preview + barra de acciones
- **Expandido:** título + textarea (3 filas) + la misma barra debajo
- **Barra unificada** (siempre visible cuando hay texto):
  - `✏️ Editar texto` / `↓ Oraciones` (alterna colapsar/expandir)
  - `▶ Leer todo` / `■ Detener`
  - `Traducir`
  - `Guardar` / `Cerrar`

### Más espacio para oraciones
- Eliminados el header con botones sueltos, hints largos y el toolbar separado
- Card con menos padding
- Textarea más bajo (3 filas)
- Al colapsar, la barra de acciones ocupa ~80px en lugar de todo el editor

En móvil los botones van en grid 2×2; en pantallas más anchas, en una sola fila de 4.

---

**User**

en movil necesito mas real state para las oraciones en practica, pon los botones mas pequenos. revisa nuevamente y dime si hay mejoras

---

**Cursor**

Compactando la UI móvil: botones más pequeños, editor que se colapsa al aparecer oraciones y velocidad integrada en el panel de navegación.


He compactado la vista de Práctica para móvil. Resumen:

### Cambios hechos

**Barra de acciones (editor colapsado ~34px alto)**
- 4 botones en una fila: iconos `✏️` `▶` `Trad.` `Guard.` en móvil
- Sin preview de texto en móvil (solo la barra)
- Banner «Lección guardada» oculto cuando está colapsado

**Auto-colapso**
- Al aparecer oraciones (pegar texto, muestra B1, cargar lección) el editor se colapsa solo

**Panel inferior unificado**
- Velocidad (L/N/R) integrada en el panel de navegación → eliminada una fila entera (~52px)
- Botones nav: `←` `↑` `▶` `↓` en móvil
- Contador compacto: `3/12` en lugar de «Oración 3 de 12»

**Oraciones**
- Menos padding en cards y lista
- `app-main` con menos margen en Práctica

---

### Mejoras que aún valdría la pena

1. **Ocultar título «Oraciones (N)» en móvil** cuando ya hay contador abajo — ganarías ~24px más.
2. **Sticky solo la barra de 4 botones** al hacer scroll en oraciones (Traducir/Guardar siempre accesibles sin subir).
3. **Modo lectura**: tap en oración = pantalla casi llena, sin panel inferior hasta salir.
4. **Word panel como bottom sheet** ya ocupa espacio; en móvil podría ser más bajo o cerrarse al seleccionar otra oración.
5. **Gestos en oraciones** (swipe ↑↓ entre oraciones) como en Memoria — los atajos de teclado no aplican en teléfono.

¿Quieres que implemente alguna de estas? La más impactante en móvil sería **ocultar el título de la lista** + **barra sticky**.

---

**User**

aplica todo, y progreso en lecciones hazlo mas resumido y que ocupe menos espacio

---

**Cursor**

Implementando todas las mejoras sugeridas y compactando el bloque de progreso en Lecciones.


Listo. Resumen de lo implementado:

### Práctica — más espacio en móvil

**Barra sticky de acciones**
- Al colapsar el editor, los 4 botones (`✏️` `▶` `Trad.` `Guard.`) quedan fijos arriba de la lista al hacer scroll

**Título oculto en móvil**
- «Oraciones (N)» solo aparece en pantallas ≥640px (el contador `3/12` del panel inferior basta)

**Modo lectura (focus)**
- Toca una oración con el editor colapsado → pantalla casi completa con esa oración grande
- Barra superior: `← Lista` · contador · `▶` pronunciar
- Sin panel inferior ni editor
- Hint: «↑ anterior · ↓ siguiente»

**Gestos swipe**
- Desliza ↑↓ en la lista (o en modo lectura) para cambiar de oración

**Word panel**
- Más compacto en móvil (max 55vh, menos padding)
- Se cierra al cambiar de oración (ya limpiaba `selectedWord`)

### Lecciones — progreso compacto
- Una sola fila: `🔥 3 · ✓ 12 · +2 · ⏳ 45`
- Chips de categoría inline debajo (en lugar del grid grande con título «Progreso»)

### Flujo típico en móvil
1. Pegas texto → editor se colapsa solo
2. Barra sticky arriba de oraciones
3. Toca oración → modo lectura a pantalla completa
4. Swipe ↑↓ para navegar · `← Lista` para volver

---

**User**

mejora la parte de vocabulario como creas. y talvez se le puede poner un boton de regenerar las traducciones y voces

---

**Cursor**

Revisando la vista de vocabulario y cómo se gestionan traducciones y voces.


Implementando mejoras en vocabulario y regeneración masiva de traducciones y audios.


Listo. Vocabulario renovado:

### Nueva UI
- **Tarjetas** en lugar de filas planas: palabra + traducción siempre visibles
- **Badge de estado SRS** por palabra (Nuevas, Aprendiendo, Pendientes…)
- **Resumen compacto** arriba: total, aviso de sin traducción, chips filtrables
- **Ordenar**: recientes · A–Z · por estado
- **Acciones por tarjeta**: ✏️ editar · ↻ regenerar · ▶ pronunciar · ✕ borrar
- Sin toggle de ojo — la traducción siempre está ahí

### Regenerar traducciones y voces
- **↻ Regenerar** en la barra (masivo)
  - Re-traduce todas las palabras
  - Limpia y vuelve a generar todos los audios en caché
  - **Conserva traducciones manuales** (solo regenera su audio)
  - Muestra progreso mientras trabaja
  - Pide confirmación antes de empezar

- **↻ por palabra** — fuerza nueva traducción + audio aunque fuera manual

### Detalles técnicos
- `regenerateVocabulary.ts` — lógica de regeneración masiva
- `clearAllCachedAudio` / `removeCachedAudio` en el caché de audio
- Actualización en lote del estado con `bulkUpdateVocabTranslations`

---

**User**

creo que ganas mejor real state poniendo la palabra, su traduccion y fecha en la linea de arriba y luego los botones en la linea de abajo en vocabulario

---

**Cursor**

Reorganizando las tarjetas de vocabulario en dos filas: contenido arriba y botones abajo.


Dejando los botones solo con iconos para que la fila inferior quede más compacta.


He reorganizado cada tarjeta de vocabulario en dos filas:

**Fila superior:** palabra · traducción · badge SRS · fecha (alineada a la derecha)

**Fila inferior:** botones horizontales (✏️ ↻ ▶ ✕)

Así cada tarjeta ocupa menos altura y aprovecha mejor el ancho en móvil. La traducción se trunca con `…` si no cabe, y el modo edición mantiene la misma lógica: palabra + input arriba, Guardar/Cancelar abajo.

---

**User**

esas misma tarjetas tiene letras y botones muy pequenos todavia. aunque queden un poco mas altas, agrega padding y margen entre los elementos segun se necesite, agranda un poco los botones. 

en ajustes, agrega un boton para limpiar y resetear todo 

---

**Cursor**

Implementando tarjetas de vocabulario más legibles y el botón de reset en Ajustes.


Listo, dos cambios:

### Tarjetas de vocabulario
- Más padding en la tarjeta (12–14px) y más espacio entre filas y elementos
- Texto más grande: palabra ~17px, traducción 16px, fecha ~13px, badge SRS un poco más legible
- Botones de acción ~42–44px de alto (44px en móvil), iconos a 16px
- Input de edición también más grande

### Ajustes — reset total
Nueva sección **Zona de peligro** al final con el botón **Limpiar y resetear todo**. Pide confirmación y borra:
- Lecciones y vocabulario (todos los idiomas)
- Progreso de memoria / rachas
- Cachés de traducción y audios (IndexedDB)
- Preferencias de voz por palabra

No toca tema, velocidad de lectura ni proveedor de traducción. Si quieres un reset aún más completo (incluyendo esas preferencias), dímelo.

---

**User**

poner alguna barra de progreso donde sea necesaria

---

**Cursor**

Revisando dónde hay operaciones largas o estados de progreso que merezcan una barra visible.


Creando un componente reutilizable y añadiendo barras de progreso en regeneración de vocabulario, sesiones de memoria, lecciones y práctica.


He añadido un componente reutilizable `ProgressBar` y lo integré donde aporta más valor:

### Vocabulario
- **Regenerar todo:** barra con % durante la traducción; barra animada (indeterminada) en la fase de audios
- **Resumen:** barra apilada por categorías SRS (nuevas, pendientes, dominadas, etc.)

### Memoria
- **Sesión activa:** barra `Sesión: 3/10` con porcentaje mientras repasas tarjetas

### Lecciones
- **Progreso general:** barra apilada por estado de todas tus palabras
- **Cada lección:** barra de dominio (0–100 %), verde al llegar al 100 %

### Práctica
- **Traducir / Guardar:** barra animada con mensaje mientras se traduce o se preparan los audios

Las barras apiladas usan los mismos colores que los chips de categoría (morado = nuevas, rojo = pendientes, verde = dominadas, etc.).

---

**User**

muchas de las traducciones falla. mira los errores. tambien me pregunto si muchas llamadas al mismo tiempo estan siendo bloqueadas

---

**Cursor**

Investigando cómo se hacen las traducciones y las peticiones de audio, y si el paralelismo provoca bloqueos (429).


Confirmado: los 429 vienen de la API de audio de Lingva por demasiadas peticiones en paralelo. Implementando cola global, reintentos con backoff y serializando traducción y audio.


Añadiendo deduplicación de peticiones en vuelo para evitar solicitudes duplicadas de la misma palabra.


Tenías razón: el problema principal son los **429 (Too Many Requests)** de Lingva, sobre todo en `/api/v1/audio/fr/...`. No eran fallos de traducción como tal, sino de **audio en paralelo**.

### Qué pasaba
1. **Varias peticiones a la vez** — el prefetch de audio usaba concurrencia 3, y además traducir y descargar audios corrían **en paralelo** al guardar/traducir una lección.
2. **Sin reintentos** — un 429 se descartaba y la palabra quedaba sin audio (o sin traducción en regeneración masiva).
3. **Peticiones duplicadas** — la misma palabra podía pedirse varias veces a la vez (prefetch + reproducción + reintentos en 3 instancias de Lingva).

### Qué cambié
- **Cola global Lingva** (`lingvaClient.ts`): 1 petición a la vez, pausa de 350 ms entre ellas, reintentos con backoff ante 429/502/503.
- **Audio en serie**: prefetch con concurrencia 1 (antes 3).
- **Traducir → luego audio** en Práctica (ya no en paralelo).
- **Traducciones en lotes** de 12 ítems con pausa, en lugar de mandar todo el texto de golpe.
- **Deduplicación**: si dos partes piden la misma palabra/audio a la vez, comparten una sola petición.
- **Regenerar vocabulario**: 1 traducción a la vez (antes 2).

Será **más lento** al traducir/guardar lecciones largas, pero mucho más fiable. Si sigues viendo 429, en Ajustes puedes probar **Google Translate** como proveedor de traducciones (el audio online sigue yendo por Lingva si no tienes voz nativa).

¿Quieres que añada un aviso tipo “X audios no se pudieron descargar” al terminar?

---

**User**

aunque cambio a google en ajustes, veo que las llamadas siguien para lingva. google tiene esta opcion de traducir? 

---

**Cursor**

Revisando qué servicios usa cada función cuando eliges Google en ajustes.


Aclarando: Google solo traduce texto; el audio sigue yendo a Lingva. Mejorando los textos en Ajustes para que quede explícito.


Sí, **Google Translate traduce texto**, y con esa opción activa las traducciones van a `translate.googleapis.com`. Lo que ves en la red de Lingva casi seguro son **otras cosas**, no las traducciones.

### Dos servicios distintos en la app

| Función | Con Google activo | Servicio |
|--------|-------------------|----------|
| Traducir oraciones/palabras | ✅ Google | `translate.googleapis.com` |
| Pronunciar / prefetch de audio (▶) | ❌ Sigue Lingva | `lingva.ml/api/v1/audio/...` |
| Respaldo si Google falla | Lingva | solo para ese texto |

En tu captura los 429 eran de **`/api/v1/audio/fr/...`**: es **audio**, no traducción. Lingva actúa como proxy de Google para TTS; la app no tiene integración directa con el TTS de Google.

### Por qué sigues viendo Lingva

1. **Guardar / Traducir** también precarga audios → llamadas a Lingva aunque el texto lo traduzca Google.
2. **Modo en línea** (sin voz nativa del dispositivo) → cada ▶ usa Lingva.
3. Si alguna traducción de Google falla → fallback puntual a Lingva.

### Cómo evitar las llamadas a Lingva

En **Ajustes → Pronunciación**, elige una **voz del dispositivo** (HTTPS o localhost). Así la app usa `speechSynthesis` y no descarga audio de Lingva.

He actualizado el texto en Ajustes para dejar esto explícito.

Si quieres, el siguiente paso sería añadir **TTS de Google** como alternativa al audio de Lingva cuando elijas Google Translate (más trabajo y puede tener sus propios límites). ¿Te interesa?

---

**User**

es posible hacerlo todo con google translate solamente?

---

**Cursor**

Revisando qué usa la app hoy y qué ofrece Google Translate para traducción y audio.


**Parcialmente sí**, pero hoy la app no está hecha para eso. Son dos capacidades distintas:

### Lo que ya hace Google (texto)
Con **Google Translate** en Ajustes, las traducciones van a:

```174:176:src/utils/translate.ts
async function fetchGoogleTranslation(text: string, sourceLang: StudyLanguage): Promise<string> {
  const sourceCode = LANGUAGES[sourceLang].lingvaCode;
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceCode}&tl=${TARGET_LANG}&dt=t&q=${encodeURIComponent(text)}`;
```

Eso es el endpoint no oficial `gtx` que usa la web de Google Translate. **Sí traduce**, pero:
- No es una API oficial con contrato/soporte
- Puede fallar o limitarse (429)
- Si falla, la app **vuelve a Lingva** como respaldo

### Lo que sigue yendo a Lingva (audio)
La pronunciación en línea **no usa Google directamente**. Usa Lingva:

```43:50:src/utils/lingvaSpeech.ts
async function fetchStudyAudioRemote(text: string): Promise<Uint8Array> {
  const lingvaCode = LANGUAGES[activeLang].lingvaCode;
  // ...
      const url = `${instance}/api/v1/audio/${lingvaCode}/${encodeURIComponent(text)}`;
      const response = await lingvaFetch(url);
```

Cuando guardas/traduces una lección, el **prefetch de audios** también pasa por ahí. Por eso en la red sigues viendo `lingva.ml/api/v1/audio/...` aunque el traductor sea Google.

---

## ¿Se puede hacer *todo* solo con Google?

| Enfoque | ¿Viable? | Notas |
|--------|----------|--------|
| **Traducciones solo Google** | ✅ Sí | Quitar fallback a Lingva y usar solo `fetchGoogleTranslation` |
| **Audio con TTS “de Google Translate”** | ⚠️ Con matices | Existe un endpoint no oficial tipo `translate.google.com/translate_tts?...` que devuelve MP3. Muchas apps lo usan, pero **no es API pública oficial**, tiene límite de caracteres (~200), CORS/rate limits, y puede romperse |
| **APIs oficiales de Google Cloud** | ✅ Sí, pero distinto | Translation API + Text-to-Speech API: estable, pero requiere **cuenta, facturación y API key** (no conviene poner la key en el frontend) |
| **Voz del dispositivo** | ✅ Sí, sin Google ni Lingva | `speechSynthesis` del navegador; no es Google Translate, pero elimina las llamadas online |

Lingva, en la práctica, es un **proxy gratuito** hacia servicios de Google (traducción + TTS). Por eso al quitar Lingva del traductor el audio **no desaparece solo**.

---

## Qué habría que cambiar para “solo Google”

1. **`translate.ts`**: eliminar `fetchLingvaTranslation` y el fallback cuando Google está activo (o siempre).
2. **`lingvaSpeech.ts`**: sustituir `fetchStudyAudioRemote` por TTS de Google (no oficial) o por Cloud TTS vía backend.
3. **`lingvaClient.ts` / `lingva.ts`**: dejarían de usarse (o solo como respaldo).
4. **Rate limiting**: seguiría haciendo falta cola/reintentos; Google también devuelve 429.
5. **Modo nativo**: opcionalmente forzar voz del dispositivo y no precargar audio online.

---

## Recomendación práctica

- **Sin backend ni API key**: “todo Google” es posible en traducción + TTS no oficial, pero **no es más fiable que Lingva**; cambias un proxy por otro con los mismos riesgos.
- **Más fiable sin pagar**: voz nativa del dispositivo + Google solo para traducir.
- **Producción seria**: backend propio con **Google Cloud Translation + Text-to-Speech** (o similar).

Si quieres que lo implemente (p. ej. TTS de Google en lugar de Lingva cuando elijas Google), cambia a **Agent mode** y lo hacemos.

---

**User**

lingva es gratis?

---

**Cursor**

**Sí, para ti como usuario de la app es gratis**: no pide API key ni pago. La app llama a instancias públicas de Lingva (p. ej. `lingva.ml`, `translate.jae.fyi`) sin coste directo.

### Qué es Lingva en la práctica
[Lingva Translate](https://github.com/thedaviddelta/lingva-translate) es un proyecto **open source** (AGPL) que actúa como **proxy** hacia los servicios web de Google Translate: traducción de texto y, en muchos casos, audio (TTS). No es un producto oficial de Google.

### Lo “gratis” tiene límites
- **Rate limiting**: demasiadas peticiones → **429** (lo que viste).
- **Sin garantía**: instancias públicas las mantienen voluntarios; pueden caerse, ir lentas o bloquear uso intensivo.
- **Zona gris legal/técnica**: usa el servicio de Google de forma no oficial; Google puede cambiar o bloquear el acceso.
- **No es ilimitado**: en lecciones largas con muchos audios, el prefetch puede saturar el servidor.

### Alternativas si Lingva falla mucho
1. **Google Translate** en Ajustes → solo cambia traducciones; el audio online sigue yendo a Lingva.
2. **Voz del dispositivo** → evita descargar audio online.
3. **Auto-hospedar Lingva** → gratis en tu servidor, pero tú gestionas límites y mantenimiento.
4. **Google Cloud** (Translation + Text-to-Speech) → oficial y estable, pero **de pago** con API key.

**Resumen:** Lingva es gratis de usar para el usuario final, pero es un servicio comunitario/no oficial con límites de uso, no un API empresarial con SLA. Para una app personal o PWA suele bastar; para uso muy intensivo conviene voz nativa o una API de pago.

---

**User**

ok, pregunta: actualmente esta en el estado ideal, con google  para traducciones, voz dispositivo (si esta disponible) por default, y finalmente lingva?

---

**Cursor**

Revisando los valores por defecto y las cadenas de fallback en el código.


**Casi**, pero no del todo. Hoy no coincide con ese orden “ideal” en todos los casos.

### Estado actual real

| Capa | Lo que describiste | Lo que hace la app ahora |
|------|-------------------|---------------------------|
| **Traducciones** | Google por defecto | **Lingva por defecto** (`lingva` si no guardaste otra cosa en Ajustes) |
| **Traducciones (fallback)** | Lingva al final | Solo si **elegiste Google** → Google primero, Lingva si falla |
| **Voz al pulsar ▶** | Dispositivo → Lingva | ✅ Así: nativa si hay voz y modo `native` → si falla, Lingva → si Lingva falla, reintenta nativa |
| **Prefetch al guardar/traducir** | — | ❌ **Siempre Lingva**, aunque uses voz del dispositivo |

### Voz (sí, bien encadenada al reproducir)

```71:72:src/hooks/useSpeech.ts
  const [speechMode, setSpeechMode] = useState<SpeechMode>(() =>
    canUseNativeSpeech() ? 'native' : 'online',
```

Al hablar: nativa → Lingva → nativa otra vez si Lingva falla.

### Traducciones (no es Google por defecto)

```16:16:src/utils/translate.ts
let activeProvider: TranslationProvider = 'lingva';
```

```28:34:src/utils/translate.ts
export function loadTranslationProvider(): TranslationProvider {
  // ...
  return saved === 'google' ? 'google' : 'lingva';
}
```

Hay que ir a **Ajustes → Google Translate** manualmente. Con Google activo:

```200:209:src/utils/translate.ts
async function fetchTranslation(...) {
  if (activeProvider === 'google') {
    try {
      return await fetchGoogleTranslation(...);
    } catch {
      return fetchLingvaTranslation(...);  // fallback
    }
  }
  return fetchLingvaTranslation(...);
}
```

### Prefetch (el hueco importante)

Al **Guardar** o **Traducir** una lección siempre se llama `prefetchSpeech` → audios por **Lingva**, sin mirar si tienes voz nativa. Ahí es donde sigues viendo muchas llamadas a `lingva.ml` aunque el resto esté “bien”.

---

### Resumen

**Ideal que planteas:** Google (traducción) → voz dispositivo → Lingva (último recurso).

**Hoy:**
- ✅ Voz al reproducir: dispositivo → Lingva (con matices).
- ⚠️ Traducciones: **Lingva primero** salvo que cambies Ajustes; Google → Lingva solo si elegiste Google.
- ❌ Prefetch: **siempre Lingva**, independiente del modo de voz.

Para acercarlo al ideal haría falta (en Agent mode): **Google por defecto**, **prefetch solo en modo online** (o saltarlo con voz nativa), y dejar Lingva como respaldo en traducción y audio.

¿Quieres que lo implementemos así?

---

**User**

pues hazlo ideal, porque muchas llamadas a lingva estan fallando por exceso de lllamadas

---

**Cursor**

Implementando Google por defecto, voz nativa prioritaria y prefetch de Lingva solo cuando haga falta.


Listo. La app sigue ahora esta prioridad:

### Traducciones
- **Google Translate por defecto** (nuevo usuario o sin preferencia guardada)
- **Lingva solo como respaldo** si Google falla en un texto concreto
- Lingva sigue disponible en Ajustes si lo prefieres

### Pronunciación
- **Voz del dispositivo** por defecto (HTTPS/localhost + voces instaladas)
- **Lingva solo** si no hay voz nativa o si el modo pasó a “en línea” tras un fallo

### Menos llamadas a Lingva
- **Prefetch de audio desactivado** cuando hay voz nativa → al guardar/traducir una lección ya no dispara decenas de peticiones a `lingva.ml`
- **Regenerar vocabulario** omite la fase de audios si usas voz del dispositivo
- **Regenerar palabra** igual: no toca Lingva en modo nativo

### Ajustes
- Textos actualizados para reflejar este comportamiento
- Google aparece primero como opción predeterminada

Si ya tenías **Lingva** guardado en Ajustes, se respeta. Para usar el nuevo default, elige **Google Translate** en Traducciones. Con voz del dispositivo configurada, deberías ver muchas menos peticiones a Lingva en la pestaña Red.

---

**User**

decir claramente en ajustes si la voz actual es nativa o de lingva. 

el area de exportar a json esta very crowded. simplificar.

---

**Cursor**

Hecho. Cambios en Ajustes:

### Pronunciación — estado claro
Al inicio de la sección hay un **banner destacado**:
- **Nativa** (verde): “Voz nativa del dispositivo” + nombre de la voz activa
- **Lingva** (azul): “Lingva (en línea)” + aviso de que los audios se descargan al pulsar ▶

Refleja lo que realmente usará la app (`usesOnlineAudio`), no solo un modo interno.

### Datos — más compacto
La sección pasó de “Backup y exportación” con 4 botones grandes a **“Datos”**:
- Fila principal: **Exportar backup** | **Importar**
- Debajo, separador fino: **Vocabulario** → botones pequeños **JSON** | **CSV**

Menos texto repetido y menos botones del mismo tamaño apilados.

---

**User**

where can i tweak the time between calls to lingva for batch request?

---

**Cursor**

The main knob for **spacing between Lingva HTTP calls** is here:

```7:7:src/utils/lingvaClient.ts
const lingvaQueue = createRequestQueue({ concurrency: 1, minDelayMs: 350 });
```

- **`minDelayMs: 350`** → minimum gap between the *start* of each Lingva request (translation **and** audio both go through `lingvaFetch`).
- **`concurrency: 1`** → only one Lingva call at a time.

To slow down batch work, raise `350` (e.g. `500` or `800`). To allow parallel calls (usually worse for 429s), increase `concurrency`.

---

### How the queue works

`createRequestQueue` in `src/utils/requestQueue.ts` waits until at least `minDelayMs` has passed since the previous request started before starting the next one.

Everything that hits Lingva uses this queue:
- **Translations** → `fetchLingvaTranslation` in `translate.ts` → `lingvaFetch`
- **Audio** → `fetchStudyAudioRemote` in `lingvaSpeech.ts` → `lingvaFetch`

---

### Other delays (not the main batch spacing)

| Location | What it controls |
|----------|------------------|
| `lingvaClient.ts` → `retryDelayMs` | Backoff on **429/502/503** (1.5s × 2^attempt, max 12s) |
| `lingvaClient.ts` → `MAX_RETRIES` | How many retries per URL |
| `translate.ts` → `await sleep(400)` | Pause **between translation chunks** when bulk-translating via Lingva |
| `translate.ts` → `BULK_CHUNK_SIZE = 12` | Items per bulk translation request (not time) |
| `audioCache.ts` → `prefetchAudio(..., concurrency = 1)` | Parallel audio prefetches (each still goes through `lingvaQueue`) |

---

### Note with your current “ideal” setup

If you’re on **native voice**, `prefetchSpeech` is skipped, so you mostly see Lingva for:
- Lingva-as-translation-provider (or Google fallback)
- ▶ playback in **online** mode

**TL;DR:** change **`minDelayMs` in `src/utils/lingvaClient.ts` line 7** for global spacing between Lingva calls; bump **`sleep(400)` in `translate.ts`** if you want extra pause between bulk translation chunks only.

---

**User**

una pregunta, podemos conectar esto a la api de gemini, y asi mandarle todo el texto de una leccion de golpe y que el lo devuelva en formato json por ejemplo, para que esta app lo actualice de golpe? 

---

**Cursor**

Revisando cómo se traduce y estructura una lección hoy para evaluar si encaja con Gemini en JSON.


**Sí, es viable** y encaja bien con cómo está hecha la app. Hoy no usa Gemini; traduce por ítems (oraciones + palabras) vía Google/Lingva. Con Gemini podrías mandar **toda la lección en una sola llamada** y recibir un JSON que rellene el caché de golpe.

### Cómo funciona hoy

Al traducir/guardar, la app construye una lista de claves:

```110:116:src/hooks/useTranslation.ts
    const sentences = splitIntoSentences(trimmed);
    const words = uniqueWords(trimmed);
    const items = [...new Set([...sentences, ...words])];
```

Cada clave es el **texto exacto** (oración o palabra). Las traducciones viven en un `Record<string, string>` en memoria + `localStorage`. La UI hace `getTranslation(sentence)` / `getTranslation(word)` — no le importa si vinieron de 1 o 200 peticiones HTTP.

### Qué haría Gemini

Un flujo típico:

1. Mandas el texto de la lección + instrucciones (idioma origen → español).
2. Pides **JSON estructurado** (Gemini lo soporta con `responseSchema` / JSON mode).
3. Parseas la respuesta y llamas `cacheTranslation` / `setTranslations` para cada clave.
4. La UI se actualiza igual que ahora.

Formato más simple (drop-in con el código actual):

```json
{
  "translations": {
    "Bonjour, comment allez-vous?": "Hola, ¿cómo está usted?",
    "bonjour": "hola",
    "comment": "cómo"
  }
}
```

Mejor aún: pedir listas separadas y **mapear tú** a las claves que ya genera `splitIntoSentences` y `uniqueWords`, para evitar desajustes de puntuación/espacios.

### Ventajas

- **Una sola llamada** por lección → menos 429 que con Lingva/Google por palabra.
- Mejor **contexto** (traducciones más coherentes entre oraciones).
- Podrías pedir extras: título sugerido, notas gramaticales, etc.

### Limitaciones importantes

| Tema | Detalle |
|------|---------|
| **API key** | No conviene poner la key de Gemini en el frontend (se puede extraer). Lo habitual: función serverless (Vercel, Cloudflare Workers) que hace de proxy. |
| **Audio** | Gemini **no sustituye** Lingva/voz nativa para ▶. Solo traducciones (salvo que integres otro TTS aparte). |
| **Claves exactas** | El JSON debe usar las mismas cadenas que `splitIntoSentences` / `uniqueWords`. Si el modelo cambia comillas o espacios, algunas traducciones no aparecerán. |
| **Tamaño** | Lecciones muy largas pueden pasar límites de tokens (entrada + salida). Habría que trocear o resumir. |
| **Coste** | Gemini tiene tier gratis; lecciones largas consumen tokens. |
| **Traducciones manuales** | Hay que seguir respetando `manualCaches` y no sobrescribirlas. |

### Dónde encajaría en el código

- Nuevo proveedor en `translate.ts` (junto a `'google' | 'lingva'`), p. ej. `'gemini'`.
- Nueva función `translateLessonWithGemini(content)` llamada desde `translateAllText` en `useTranslation.ts` en lugar de `translateBulk(items)`.
- Campo en Ajustes: API key o URL del proxy (no la key en claro en producción).
- Opcional: tercer modo en el selector de traducción.

### ¿Merece la pena?

**Sí**, sobre todo para lecciones completas y evitar rate limits. El cambio es moderado porque el modelo de datos ya es un mapa clave → traducción; no hace falta rehacer la UI.

**No cubre todo “solo con Gemini”** si quieres pronunciación online sin Lingva: eso sigue siendo voz nativa u otro servicio de TTS.

Si quieres implementarlo, en **Agent mode** se puede hacer con un proxy mínimo + proveedor Gemini + fallback al flujo actual. ¿Prefieres key propia en Ajustes (uso personal) o proxy serverless desde el principio?

---

**User**

que necesitarias que te proporcione? no me importa hacerlo en frontend

---

**Cursor**

Para implementarlo en frontend, esto es lo que necesitaría de ti:

### 1. API key de Gemini (obligatorio)
- Crear una en [Google AI Studio](https://aistudio.google.com/apikey).
- Pasármela o decirme que la pondrás tú en Ajustes / `.env` después.
- **Riesgo:** cualquiera que abra la app en el navegador puede ver la key (DevTools → red o código). Aceptable si es uso personal; no lo recomendaría en una app pública.

### 2. Modelo preferido (opcional, hay default)
Por ejemplo:
- `gemini-2.0-flash` — rápido y barato, bueno para esto
- `gemini-1.5-flash` — alternativa estable

Si no tienes preferencia, usaría **Flash** (el más reciente disponible en la API gratuita).

### 3. Cómo quieres activarlo
Elige una:
- **A)** Tercera opción en Ajustes: Google | Lingva | **Gemini**
- **B)** Reemplazar Google como predeterminado por Gemini
- **C)** Solo botón “Traducir con Gemini” en Práctica (sin cambiar el resto)

### 4. Alcance de la traducción Gemini
Confirmar si Gemini debe traducir:
- **Solo al pulsar Traducir/Guardar** (toda la lección de golpe) ← lo más útil
- **También** traducción palabra a palabra al tocar una oración/palabra suelta

Recomiendo empezar solo con **lección completa**; el resto puede seguir con Google/Lingva.

### 5. Idiomas
Hoy la app traduce al **español** (`TARGET_LANG = 'es'`) desde francés o inglés. ¿Seguimos así o quieres otro idioma destino?

### 6. Qué hacer con traducciones manuales
Por defecto: **no sobrescribir** las que ya editaste a mano. ¿Te parece bien?

---

### Lo que NO necesito de ti
- Backend ni proxy
- Cuenta de Google Cloud (la key de AI Studio basta)
- Cambios en el formato de lecciones guardadas (el JSON interno lo diseño yo para encajar con `Record<string, string>`)

---

### Formato de respuesta que pediría a Gemini (para tu info)

Algo así, alineado con tu app:

```json
{
  "translations": {
    "oración exacta 1": "traducción 1",
    "palabra": "traducción"
  }
}
```

Las claves las generaría la app (`splitIntoSentences` + `uniqueWords`) y se las mandaría en el prompt para que Gemini devuelva el mapa sin inventar textos distintos.

---

### Para arrancar en Agent mode

Con esto basta un mensaje tipo:

> “Usa Gemini Flash, opción A en Ajustes, solo lección completa, español, respeta manuales. Mi API key es: AIza…”

(o “la pondré yo en `.env` como `VITE_GEMINI_API_KEY`”).

**Nota:** la pronunciación (▶) **no** pasa por Gemini; seguiría voz nativa → Lingva como ahora. Gemini sería solo para **traducciones**.

---

**User**

tu que recomiendas, quitar google translate y usar gemini o poner un boton traducir con IA ? responde de manera bien breve en lo adelante. muy breve.

---

**Cursor**

**Botón “Traducir con IA” (Gemini)**, no reemplazar Google.

- Google sigue siendo rápido y gratis para palabras sueltas y fallback.
- Gemini en **lección completa** evita rate limits y da mejor contexto.
- Menos riesgo: si falla Gemini o se acaba la cuota, no rompes todo el flujo.

Opcional: hacer Gemini el default **solo** en “Traducir toda la lección”, y dejar Google/Lingva para el resto.

---

**User**

no, quitalo y usa solo gemini. supongo que vas a mandarle la leccion completa como json y recibir la respuesta.... bueno, hazlo como quieras

[REDACTED — API key eliminada; usar VITE_GEMINI_API_KEY en .env.local]
B) Reemplazar Google como predeterminado por Gemini

Solo al pulsar Traducir/Guardar (toda la lección de golpe) ← lo más útil

eguimos así al 'es' target_lang

---

**Cursor**

Implementando Gemini como único traductor para lecciones completas; revisando el flujo actual.


Implementando Gemini como único traductor; la API key irá en `.env.local` (gitignored).


Listo. Cambios principales:

### Traducciones → solo Gemini
- **Traducir / Guardar**: manda oraciones + palabras a Gemini en 1 petición (trozos de 80 si hace falta) y recibe JSON `{ translations: { ... } }`.
- Eliminados Google Translate y Lingva como traductores.
- Toques sueltos en oraciones: solo caché; usa **Traducir** primero.
- Regenerar vocabulario: también usa Gemini en lote.

### API key
- En **`.env.local`** (gitignored) con tu key.
- También editable en **Ajustes → Traducciones (Gemini)**.

Reinicia `npm run dev` para cargar `.env.local`.

### Sin cambios
- **Lingva** solo para audio online (▶) si no hay voz nativa.
- Destino: **español**.
- Traducciones manuales: no se sobrescriben.

---

**User**

const API_KEY = "[REDACTED — usar import.meta.env.VITE_GEMINI_API_KEY]"
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${API_KEY}`;

usa esto si te sirve para que la llamada funcione

---

**Cursor**

Updated to **`gemini-3.1-flash-lite`** and your new API key in `.env.local`.

Restart `npm run dev` so Vite picks up the env change, then try **Traducir** on a lesson.

---

**User**

arregla el padding y general layout de vocabulario. no veo el toggle para ver la traduccion.

en practica, cuando se este leyendo algo de alguna oracion hacer scroll hasta ella. en memoria. al entrar en esa pantalla, la primera vez se pronuncia la palabra dos veces siempre, y ya luego una vez por tarjeta.  simplificar la parte del resumen en la pantalla memoria, se esta tomando demasiado espacio. 

---

**Cursor**

Implementando los cambios: vocabulario con toggle de traducción, scroll al hablar en práctica, arreglo de doble pronunciación en memoria y resumen más compacto.


Listo. Cambios:

### Vocabulario
- Layout más claro: **palabra + badge + fecha** arriba, **traducción en línea propia** abajo.
- Botón **👁** en la barra de herramientas para mostrar/ocultar traducciones (por defecto ocultas).
- Más padding y espaciado; quitada la barra de progreso del resumen (menos ruido).

### Práctica
- Al leer una oración (▶, leer todo, nav), hace **scroll automático** hasta esa oración.

### Memoria
- **Sin doble pronunciación** al entrar (debounce 800 ms en la primera tarjeta).
- Resumen **compacto**: título + meta en una línea, chips inline en lugar de la cuadrícula grande, sin texto de ayuda extra.

---

**User**

esta casi perfecto, pero el toggle, input y boton regenerate en vocabulario estan mal maquetados. mejoralo

---

**Cursor**

Reorganizando la barra de vocabulario en dos filas con controles alineados.


He reorganizado la toolbar de vocabulario para que quede más clara y alineada:

**Móvil**
- Fila 1: búsqueda a ancho completo
- Fila 2: grid con tres controles del mismo alto (40px): toggle traducciones | ordenar | regenerar

**Escritorio (≥640px)**
- Una sola fila: búsqueda flexible + controles agrupados a la derecha

**Detalles**
- El toggle ya no usa el botón ojo suelto; es un botón con icono + etiqueta corta (“Trad.” / “Ocultar”) y estado activo visible
- Regenerar muestra el texto completo desde 400px de ancho
- Todos los controles comparten altura, padding y estilo de borde

Si quieres ajustar algo más (por ejemplo, ocultar la etiqueta del toggle en pantallas muy pequeñas), dímelo.

---

**User**

bien, para las tarjetas de vocabulario haz un div flex con estos elementos: 
chip "nueva" (invisible si no lo es, pero reservado el espacio)
palabra
traduccion
div contenedor de estos botones: 
pronunciar, editar, volver a traducir ( como se llame), eliminar

conserva la fecha flotando arriba derecha.

el contenedor de tarjetas genera una scrollbar. todo lo demas (como barra de acciones y resumen) debe tener un margin para que quede alineado fuera del espacio del scrollbar de ese contenedor.

---

**Cursor**

Reestructurando las tarjetas en una fila flex y alineando el resumen y la toolbar con el gutter del scroll.


Manteniendo una sola fila flex en móvil y reservando espacio para el chip en modo edición.


He reestructurado las tarjetas de vocabulario según pediste:

**Cada tarjeta**
- Fila flex (`vocab-card__main`): chip **Nueva** → palabra → traducción → botones
- El chip reserva siempre 52px; solo se ve si la palabra es nueva (`visibility: hidden` cuando no lo es)
- Botones en orden: ▶ pronunciar · ✏️ editar · ↻ regenerar · ✕ eliminar
- Fecha flotando arriba a la derecha (`position: absolute`)

**Scroll y alineación**
- Solo `vocab-list-body` hace scroll, con `scrollbar-gutter: stable`
- Resumen, toolbar, banner de filtro y barra de progreso usan la clase `vocab-list-view__chrome` con `margin-inline-end: 12px` para alinearse con el borde derecho de las tarjetas, fuera del espacio del scrollbar

**Otros**
- Quité el chip de categoría (Aprendiendo, En repaso, etc.); solo queda **Nueva**
- El toggle de traducciones sigue funcionando: cuando está oculto, la traducción no ocupa espacio en la fila

Si en pantallas muy estrechas la fila se queda apretada, puedo ajustar tamaños de botones o permitir ellipsis más agresivo en la traducción.

---

**User**

el boton exportar backup exporta un simple json. podriamos guardarlo aqui junto con la misma aplicacion?  eso funcionaria al subirlo a netlify?

---

**Cursor**

Revisando cómo funciona el export de backup y el despliegue en Netlify para darte una respuesta precisa.


Depende de qué quieras decir con “guardarlo junto con la aplicación”.

## Cómo funciona hoy

El backup es un JSON con el estado del **idioma actual** (`savedTexts` + `vocabulary`), descargado al dispositivo del usuario. Los datos viven en **`localStorage`** del navegador, no en el servidor.

```216:218:src/utils/storage.ts
export function exportState(state: AppState): string {
  return JSON.stringify(state, null, 2);
}
```

En Netlify la app se despliega como **sitio estático** (HTML/JS/CSS en `dist/`). No hay base de datos ni escritura en disco desde el navegador.

---

## Sí funciona: JSON estático en el repo

Si quieres **incluir un backup de ejemplo o datos iniciales** con la app:

1. Lo pones en `public/`, por ejemplo `public/seed-fr.json`
2. Al hacer build, Vite lo copia a `dist/`
3. En Netlify queda disponible en `https://tu-app.netlify.app/seed-fr.json`
4. La app puede hacer `fetch('/seed-fr.json')` e importarlo con `restoreFromBackup`

**Casos de uso:**
- Lecciones precargadas para quien abre la app por primera vez
- Un “pack” de vocabulario que compartes con otros
- Recuperar datos si borras `localStorage` (volviendo a importar ese JSON)

**Limitaciones:**
- Es **el mismo archivo para todos** los usuarios
- Para cambiarlo hay que **volver a desplegar**
- No guarda automáticamente lo que cada usuario va aprendiendo

---

## No funciona: que el usuario “guarde” su backup en Netlify

Desde el navegador **no se puede escribir** en los archivos del sitio en Netlify. El export actual solo descarga a tu ordenador/móvil.

Para persistir datos de cada usuario en la nube haría falta algo más:
- **Netlify Functions** + base de datos (Supabase, Fauna, etc.)
- **Netlify Blobs** u otro almacenamiento
- Login (Netlify Identity, Auth0, etc.)

Eso ya sería un cambio de arquitectura, no solo mover el JSON.

---

## Netlify concreto

| Enfoque | ¿Funciona en Netlify? |
|--------|------------------------|
| JSON en `public/` como datos iniciales | Sí |
| `localStorage` en el navegador (actual) | Sí |
| Descargar/importar backup manual | Sí |
| Guardar el backup del usuario en el servidor automáticamente | No, sin backend |
| Mismos datos en móvil y PC sin exportar | No, sin sync |

---

## Detalle importante del backup

El JSON **no incluye todo**:
- Caché de traducciones (otro `localStorage`)
- Audios en caché (`IndexedDB`)
- Racha de estudio, preferencias de voz, API key de Gemini

Solo lecciones, vocabulario y progreso SRS de las tarjetas.

---

## Recomendación práctica

Si tu objetivo es **no perder datos al desplegar o al cambiar de dispositivo**:

1. **Datos iniciales compartidos** → `public/seed.json` + import automático si no hay datos
2. **Tus datos personales** → seguir exportando el JSON y guardarlo en iCloud/Drive/Git (como archivo del repo, no generado por la app en producción)
3. **Sync real entre dispositivos** → habría que añadir backend o algo tipo Supabase

Si me dices cuál de estos tres buscas (seed para nuevos usuarios, backup personal tuyo, o sync multi-dispositivo), te puedo proponer el diseño concreto. Para implementarlo tendrías que cambiar a **Agent mode**.

---

**User**

quiero poder importar los datos facilmente al ir a otro dispositivo, pero no quiero muchisimas complicaciones de login etc, ya que es una app persona

---

**Cursor**

Revisando qué exporta/importa la app hoy para proponerte la opción más simple.


Para una app personal, lo más sensato es **mejorar el flujo de backup manual** antes de meter login, bases de datos o sync en la nube.

## El problema hoy

1. El backup es **solo del idioma activo** (fr o en), no de toda la app.
2. Solo **descarga un archivo**; no hay compartir, pegar desde portapapeles, etc.
3. En el otro dispositivo hay que **buscar el archivo e importarlo** a mano.
4. El JSON **no incluye** caché de traducciones ni audios (los audios se pueden regenerar; las traducciones sí importan).

Para cambiar de móvil a PC, eso funciona, pero con fricción.

---

## Recomendación: “sync por archivo”, pero más cómodo

Sin login, el patrón más fiable es:

**Un solo archivo → lo guardas donde ya guardas cosas personales → lo importas en el otro sitio.**

Eso encaja con iCloud Drive, Google Drive, AirDrop, email a ti mismo, etc.

Lo que haría falta en la app (todo compatible con Netlify, 100% cliente):

| Mejora | Por qué ayuda |
|--------|----------------|
| **Exportar todo** (fr + en + traducciones + rachas) en un solo JSON | Un solo paso al cambiar de dispositivo |
| Botón **“Compartir backup”** (`navigator.share`) | En móvil: AirDrop, Drive, Notas… en un toque |
| **Importar desde portapapeles** o arrastrar archivo | En PC: copias el JSON y pegas; en móvil: “Abrir en…” |
| Texto claro: *“Antes de cambiar de dispositivo, exporta y guárdalo en Drive/iCloud”* | Reduce olvidos |

Con eso el flujo sería:

1. Dispositivo A → Ajustes → **Exportar / Compartir**
2. Lo guardas en Drive o te lo envías
3. Dispositivo B → Ajustes → **Importar** (archivo o pegar)

Sin cuentas, sin servidor, despliegue en Netlify igual que ahora.

---

## Si quieres aún menos fricción (sin “login” clásico)

Opción intermedia: **“clave de sync”** (como una contraseña que tú eliges o generas una vez).

- Guardas la clave en el gestor de contraseñas.
- Botones: **“Subir datos”** / **“Bajar datos”**.
- Detrás: Supabase/Firebase con **una fila por clave**, sin email ni OAuth.

Sigue siendo app personal, pero añade:
- una dependencia externa,
- configuración (API keys en Netlify),
- y un poco de código.

Para uso solo tuyo, suele ser **demasiado** si ya usas Drive/iCloud.

---

## Lo que evitaría

- **Login con Google/email** → más de lo que necesitas.
- **JSON estático en el repo/Netlify** → sirve para datos de ejemplo, no para *tus* progresos (cada cambio = redeploy).
- **URL con el backup embebido** → se rompe con muchas lecciones/palabras (límite de tamaño).
- **Confiar en que el navegador sincronice solo** → poco fiable entre dispositivos distintos.

---

## Resumen práctico

Para tu caso (“app personal, cambiar de dispositivo sin complicaciones”):

**Mejor relación esfuerzo/beneficio:** backup **completo** + **compartir** + **importar más fácil**.  
El archivo lo guardas en **iCloud Drive / Google Drive / AirDrop**; es el “servidor” que ya tienes.

Si quieres, en **Agent mode** puedo implementar ese paquete (export global, share, import desde pegado y mensajes en Ajustes). Dime si prefieres incluir también la caché de traducciones en el backup.

---

**User**

$2a$10$I2HRkV5im72sgWaQ0WfqqOQzEkslvA698VXvSwKRceFPmCX4TqhYO

https://jsonbin.io/app/app/api-keys 

{}jsonbin.io
Features Developers
 Company
 Pricing My Dashboard
Get Started with the Access Keys API
Security is a top priority whether you wish to store your data or retrieve. Using Access Keys, you can limit the access to the different API endpoints by granting API permissions to these Access Keys.

Core APIs for Access Keys
Create an Access Key
Create an Access Key to configure access to specific API endpoints.
Learn More 

Debo persistir el estado de una aplicación de idiomas (vocabulario y configuración) usando la API v3 de JSONbin.io. Implementa un hook personalizado llamado useStorage.js con los siguientes requisitos:

Configuración: Utiliza una variable de entorno para VITE_JSONBIN_BIN_ID y VITE_JSONBIN_ACCESS_KEY.

Funcionalidad:

fetchState: Realiza un GET a https://api.jsonbin.io/v3/b/${BIN_ID}.

saveState: Realiza un PUT a https://api.jsonbin.io/v3/b/${BIN_ID} enviando el objeto de estado en el cuerpo.

Headers: Incluye X-Access-Key para autenticación y Content-Type: application/json.

Manejo de estados: El hook debe exponer data, loading, error y una función updateData(newState) que dispare el PUT de forma asíncrona.

Optimización: Implementa una lógica para evitar llamadas innecesarias (debounce) en la función updateData para no exceder los límites de la API al escribir cambios frecuentes.

cada usuario tendra en algun punto que ofrecer un nombre de usuario (pero no contrasena, el cual se guardara en el storage local. al exportar el estado se le preguntara en cual de los usuarios locales antes usados lo quiere guardar. al importar, lo mismo.

List Access Keys
List all the access keys and fetch associated Metadata.
Learn More 

Delete Access Keys
Delete a specific Access Key.
Learn More 

Bins API
ins are nothing but JSON records. Bins API is the one you will be using the most as it gives you full control of Creating, Updating, Reading & Deleting your JSON Data.
Learn More 

Collections API
Multiple Bins can be fetched from a Collection using the Listing API, or a Schema Doc can be attached to the Collection to Validate the Bins before they are stored.
Learn More 

Schema Docs Validation API
Using Schema Docs API, you can Create Schema Docs which can be attached to a Collection. Every Bin which is Created under this Collection will be validated against this Schema Doc.
Learn More 

Create a Free Account
Create an Account View Pricing
Copyright IconJSONbin.io
Privacy Terms


---

**Cursor**

Implementando persistencia con JSONBin.io: revisando la estructura actual del estado y de Ajustes.


Implementando el hook `useStorage`, perfiles locales y la sincronización en Ajustes.


Implementé la sincronización con JSONBin.io y perfiles locales. Resumen:

## Qué se añadió

**`src/hooks/useStorage.ts`** — hook con:
- `fetchState` → GET a JSONBin
- `updateData` → PUT con **debounce de 2 s**
- `flushUpdate` → guardado inmediato (usado al subir)
- `data`, `loading`, `error`

**`src/utils/jsonbinClient.ts`** — cliente API v3 con `X-Access-Key` y `Content-Type: application/json`

**Perfiles locales** (`cloudProfiles.ts`):
- Nombres de usuario sin contraseña (2–32 chars, `a-z`, `0-9`, `_`, `-`)
- Lista guardada en `localStorage`
- Usuario activo seleccionable en Ajustes

**Backup completo** (`fullBackup.ts`):
- Francés + inglés, traducciones, rachas
- En la nube: `{ users: { "juan": { updatedAt, backup } } }`

**Ajustes → Datos**:
- Gestión de usuarios locales
- **Subir a la nube** / **Bajar de la nube** (elige usuario en un diálogo)

## Configuración

En `.env.local` (y en Netlify → Environment variables):

```env
VITE_JSONBIN_BIN_ID=tu-bin-id
VITE_JSONBIN_ACCESS_KEY=tu-access-key
```

1. Crea un bin en [JSONBin.io](https://jsonbin.io) con contenido inicial: `{ "users": {} }`
2. Crea un **Access Key** en [API Keys](https://jsonbin.io/app/app/api-keys) con permisos de **Read** y **Update** en Bins API
3. Copia el **Bin ID** y la **Access Key** (no es un hash bcrypt; la cadena `$2a$10$...` que pegaste parece otra cosa)

## Flujo entre dispositivos

1. Dispositivo A → Ajustes → añade usuario (ej. `juan`) → **Subir a la nube**
2. Dispositivo B → mismo `.env` / variables en Netlify → **Bajar de la nube** → elige `juan`

## Nota de seguridad

Las variables `VITE_*` van en el bundle del navegador: la access key es visible para quien inspeccione el JS. Para una app personal suele bastar; si quieres más seguridad habría que usar Netlify Functions como proxy.

Build y tests pasan. ¿Quieres que también unifique el export/import de archivo local con el backup completo (fr + en)?

---

**User**

https://api.jsonbin.io/v3/b/6a45adaff5f4af5e2950c92c  esto es del bin que he creado

---

**Cursor**

El ID del bin es la parte final de esa URL. Revisando tu `.env.local` para configurarlo.


Perfecto: el **Bin ID** es la parte final de la URL:

```
6a45adaff5f4af5e2950c92c
```

En tu `.env.local` ya lo tienes bien:

```env
VITE_JSONBIN_BIN_ID=6a45adaff5f4af5e2950c92c
```

Lo que falta corregir es **`VITE_JSONBIN_ACCESS_KEY`**. El valor que tienes (`$2a$10$...`) parece un **hash bcrypt** (tipo contraseña), no una **Access Key** de JSONBin. Por eso la sync fallará.

## Qué hacer

1. Entra en [JSONBin → API Keys](https://jsonbin.io/app/app/api-keys)
2. Crea una **Access Key** nueva
3. Dale permisos de **Read** y **Update** en **Bins API**
4. Copia la clave que te muestran (suele ser una cadena larga, **sin** `$2a$10$`)
5. Pégala en `.env.local`:

```env
VITE_JSONBIN_ACCESS_KEY=la-clave-que-te-den
```

6. Reinicia el dev server (`npm run dev`) para que Vite cargue las variables

## Bin inicial

El bin debe tener algo como:

```json
{
  "users": {}
}
```

Puedes crearlo vacío o con ese objeto; la app lo rellenará al subir.

## En Netlify

Añade las mismas dos variables en **Site settings → Environment variables** y vuelve a desplegar.

---

**Nota:** `.env.local` no debe subirse a git. Si quieres, en Agent mode puedo ayudarte a probar la conexión cuando tengas la Access Key correcta.

---

**User**

{"message":"X-Access-Key is invalid or the bin doesn't belong to your account"}

este es mi env.local 
@.env.local (1-4) 

---

**Cursor**

El error apunta a la Access Key. Revisando cómo la enviamos y qué formato exige JSONBin.


El **Bin ID** está bien (`6a45adaff5f4af5e2950c92c`). El problema es casi seguro **`VITE_JSONBIN_ACCESS_KEY`**: no es una clave válida de JSONBin.

## Qué tienes ahora (incorrecto)

```env
VITE_JSONBIN_ACCESS_KEY=$2a$10$MYTjHtGnDy5EEhj3V.17v.wqw8N417USjv7CUq2rvpWAfYNzjQdNq
```

Eso es un **hash bcrypt** (formato de contraseña: empieza por `$2a$10$`). JSONBin **no** usa ese formato para `X-Access-Key`.

Por eso la API responde:

> `X-Access-Key is invalid or the bin doesn't belong to your account`

---

## Qué clave necesitas

En [JSONBin → API Keys](https://jsonbin.io/app/app/api-keys) hay dos tipos:

| Tipo | Header | Uso |
|------|--------|-----|
| **Master Key** | `X-Master-Key` | Acceso total. **No** en el frontend (se ve en el JS). |
| **Access Key** | `X-Access-Key` | La que usa la app, con permisos limitados. |

Para la app necesitas una **Access Key** creada ahí, con permisos en **Bins**:
- **Read** ✓
- **Update** ✓

Al crearla, JSONBin te muestra la clave **una vez**. Suele ser una cadena larga alfanumérica, **sin** `$2a$10$`.

---

## Pasos

1. Ve a [jsonbin.io/app/app/api-keys](https://jsonbin.io/app/app/api-keys)
2. **Create Access Key** (o similar)
3. Nombre: p. ej. `word-gym`
4. Permisos: **Bins → Read + Update**
5. Copia la clave que te den
6. Sustituye en `.env.local`:

```env
VITE_JSONBIN_ACCESS_KEY=pega-aqui-la-clave-real
```

7. Reinicia el dev server (`npm run dev`)

---

## Comprueba que el bin es tuyo

El bin `6a45adaff5f4af5e2950c92c` tiene que estar en **la misma cuenta** con la que creaste la Access Key. Si el bin lo creaste con otra cuenta o sin estar logueado, tampoco funcionará.

Prueba en terminal (sustituye `TU_ACCESS_KEY`):

```bash
curl -s -H "X-Access-Key: TU_ACCESS_KEY" \
  "https://api.jsonbin.io/v3/b/6a45adaff5f4af5e2950c92c"
```

Si responde bien, la clave es correcta.

---

## Extra: el `$` en `.env`

Si alguna clave llevara `$`, en `.env` conviene entrecomillarla:

```env
VITE_JSONBIN_ACCESS_KEY="valor-con-simbolos$"
```

Con una Access Key real de JSONBin normalmente no hace falta.

---

## Seguridad

Has pegado aquí tu `.env.local` (Gemini + JSONBin). Conviene **rotar la API key de Gemini** en Google AI Studio y no volver a compartir `.env.local`.

Cuando tengas la Access Key correcta de JSONBin, **Subir/Bajar de la nube** en Ajustes debería funcionar. Si sigue fallando, dime el resultado del `curl` (sin pegar la clave).

---

**User**

6a45af66da38895dfe1f3d13

ahora puse esto

---

**Cursor**

Comprobando si la nueva clave funciona con tu bin.


Sigue fallando: probé tu bin con esa clave y la API responde **401** con el mismo mensaje.

Tu `.env.local` queda así (el **Bin ID** está bien):

```env
VITE_JSONBIN_BIN_ID=6a45adaff5f4af5e2950c92c
VITE_JSONBIN_ACCESS_KEY=6a45af66da38895dfe1f3d13
```

El formato ya no es bcrypt, pero **`6a45af66da38895dfe1f3d13` no es la clave secreta válida**. Lo más habitual es que hayas copiado el **`accessKeyId`** (ID de la clave) y no el **`accessKey`** (secreto).

Al crear una Access Key, JSONBin devuelve algo así:

```json
{
  "accessKey": "xxxxxxxxxxxxxxxxxxxxxxxx",      ← esta va en .env
  "accessKeyId": "6a45af66da38895dfe1f3d13",   ← esta NO
  ...
}
```

El **secreto solo se muestra una vez** al crearla. En el listado de claves no vuelve a aparecer.

## Qué hacer

1. Entra en [JSONBin → API Keys](https://jsonbin.io/app/app/api-keys)
2. **Borra** la clave que creaste (si no tienes el `accessKey` guardado, no sirve)
3. Crea una **nueva Access Key**:
   - Nombre: `word-gym`
   - **Bins → Read ✓ y Update ✓** (Update es obligatorio para subir datos)
4. Copia el valor de **`accessKey`** en el momento de crearla (no el `accessKeyId`)
5. Pégalo en `.env.local`:

```env
VITE_JSONBIN_ACCESS_KEY=el-accessKey-completo
```

6. Reinicia `npm run dev`

## Comprueba que funciona

```bash
curl -s -H "X-Access-Key: TU_ACCESS_KEY" \
  "https://api.jsonbin.io/v3/b/6a45adaff5f4af5e2950c92c"
```

- **200** con JSON → clave correcta  
- **401** → clave incorrecta o bin de otra cuenta

## Si no tienes el secreto guardado

No se puede recuperar: hay que **crear otra Access Key** y copiar el `accessKey` al crearla.

Cuando tengas la clave nueva, prueba otra vez **Subir a la nube** en Ajustes. Si quieres, pega aquí solo el **código HTTP** del `curl` (sin la clave).

---

**User**

no me dio nada al crearlo, solo se puso esto: 
{}
 Dashboard
 Bins
 Collections
 Schema Docs
 API Keys
 My Account
 API Reference 
 Logout
API Keys
API Key or X-Master-Key is needed to access any data and bins which are created as Private.

 Create Access Key
X-Master-Key 
$2a$10$Ww8g6v6Vy0sQiyptlfEHregE5o3.uj4YCITAMm6GmG/zrPk57k.zG 

X-Access-Key 
word-gym-api-key
$2a$10$khSa8VHCOfxXgspH4ocr8uXc5uXStNMosCRz/AnWMsr0mbOGCD.oy 

Access Key ID
6a45b078f5f4af5e2950d182

Key Permissions
bins
 update
 delete
 create
 read
 Delete Access Key



---

**Cursor**

JSONBin muestra las claves en formato bcrypt; el problema puede ser cómo `.env` interpreta los `$`. Probando la clave real y corrigiendo la configuración.


La clave bcrypt funciona; el fallo era usar el Access Key ID o que `.env` corrompa los `$`. Corrigiendo `.env.local`.


Los `$` en `.env` se interpretan como variables y corrompen la clave. Probando escapes.


Ya está claro qué pasaba. JSONBin **sí** usa claves con formato `$2a$10$...`; el dashboard no te ocultó nada.

## Qué copiar (y qué no)

| Campo en JSONBin | ¿Usarlo? |
|------------------|----------|
| **X-Access-Key** (`$2a$10$khSa8VHC...`) | ✅ Esta va en `.env.local` |
| **Access Key ID** (`6a45b078f5f4af5e2950d182`) | ❌ No sirve para la API |
| **X-Master-Key** | ❌ No en el frontend (acceso total) |

Probé tu **X-Access-Key** de `word-gym-api-key` contra el bin y responde **200** — la clave es válida.

## El otro problema: los `$` en `.env`

Vite/dotenv interpreta `$algo` como variable y **partía la clave**. Por eso fallaba aunque pegaras el valor correcto.

En tu `.env.local` debe quedar así (con `\` delante de cada `$`):

```env
VITE_JSONBIN_BIN_ID=6a45adaff5f4af5e2950c92c
VITE_JSONBIN_ACCESS_KEY="\$2a\$10\$khSa8VHCOfxXgspH4ocr8uXc5uXStNMosCRz/AnWMsr0mbOGCD.oy"
```

Ya lo dejé configurado así.

## Siguiente paso

1. **Reinicia** el dev server (`npm run dev`)
2. Ve a **Ajustes → Subir a la nube**

En **Netlify**, usa el mismo valor escapado en las variables de entorno.

---

**Seguridad:** Has publicado tu Master Key y Access Key. Para una app personal puede valer; si la subes a un repo público, conviene crear una Access Key nueva y borrar la antigua. No compartas el **X-Master-Key** nunca en el código del navegador.

---

**User**

alinear los botones de importar exportar suber nube etc en ajustes.
tambien puse la clave de gemini en netlify asi que podemos quitarla de ajustes, creo. redistribuye las seccionjes de ajustes que tengan mas sentido. talvez importar exportar etc de primero y quitar resumen. vocabulario, el input que tome el 100% y los tres botones en la siguiente linea con ver/ocultar traduccion spelled completo. al hacer fetch a gemini de las traducciones, que tambien nos envie algunas oraciones o fragmentos de oraciones  que tambien usaremos en la pantalla memoria.

---

**Cursor**

Varios cambios en UI y en la integración con Gemini. Revisando el código actual para aplicarlos.


Implementando los cambios: empezando por Gemini (context hints), luego UI de Ajustes y vocabulario.


Reescribiendo SettingsView y actualizando el resto de la UI.


Cambios aplicados:

## Ajustes
- **Datos y sincronización** va primero: grid alineado con Subir · Bajar · Exportar · Importar (2×2 en móvil, 4 columnas en pantallas anchas).
- Eliminada la sección **API key de Gemini** (usa `VITE_GEMINI_API_KEY` en Netlify).
- Eliminado el **Resumen** (lecciones/palabras).
- Orden: Datos → Idioma → Apariencia → Pronunciación → Zona de peligro.

## Vocabulario
- **Fila 1:** búsqueda al 100 %.
- **Fila 2:** «Ver traducciones» / «Ocultar traducciones» (texto completo) · ordenar · Regenerar.
- En pantallas muy estrechas el toggle ocupa toda la fila; ordenar y Regenerar van debajo.

## Gemini + Memoria
- Al traducir una lección, Gemini devuelve también **`contextHints`**: fragmentos de oración por palabra.
- Se guardan en `VocabEntry.contextHint` y se muestran en **Memoria** bajo la palabra (antes de revelar la traducción).
- También se generan al regenerar vocabulario o al volver a traducir una palabra.

Para ver contextos en palabras ya traducidas, vuelve a pulsar **Traducir** en la lección o **Regenerar** en vocabulario.

---

**User**

No se si entendiste, yo quiero tambien agregar a vocabulario fragmentos de oracion relativos a las oraciones. por ejemplo la oracion "J'accepte ton invitation avec plaisir, Marie"

Quiero que aparte de la traduccion de las palabras individuales, tambien devuelva fragmentos que se practicaran en memoria como: "j'accepte", "ton invitation", "mon invitation", j'accepte avec plaisir", "je n'aimes pas l'invitation", "mes invitations". Es para no solo estudiar palabras sino tambien capsulas del idioma, relacionadas. tambien cambia el cotejo del boton traducir, y pon la palabra traducir. ajustes subir y bajar iconos de flecha arriba abajo. luego de bajar de la nube, si esos fragmentos que mencione se se han bajado para cierta leccion, asegurarse de bajarlos de gemini. combinar idioma de estudio y apariencia en ajustes, estan tomando demasiado espacio. olvida cvs, siempre exportar a json, quita exportar vocabulario.

---

**Cursor**

Explorando el código para implementar fragmentos de memoria, los cambios de UI y la lógica post-descarga.


Implementando cápsulas de memoria como entradas de vocabulario, los cambios de UI y la generación tras bajar de la nube.


Listo. Resumen de lo implementado:

## Cápsulas de memoria (fragmentos)
Al **Traducir** o **Guardar** una lección, Gemini devuelve además **cápsulas** (p. ej. `j'accepte`, `ton invitation`, `mon invitation`, `j'accepte avec plaisir`…) que se añaden al vocabulario con `kind: 'capsule'`.

- Aparecen en **Vocabulario** (chip morado «Cápsula») y en **Memoria** (pill «Cápsula»).
- Se practican como tarjetas normales con traducción.

## Tras bajar de la nube
Si una lección no tiene cápsulas locales, se piden automáticamente a Gemini para cada lección que falte.

## UI
- Botón **Traducir** con texto completo (`Traducir` / `Traducido ✓` / `Traduciendo…`).
- Ajustes: **↑** y **↓** para subir/bajar (con `title` y `aria-label`).
- **Preferencias** compactas: idioma + tema en una sola tarjeta.
- Eliminado exportar vocabulario (CSV/JSON sueltos); solo **Exportar backup** / **Importar backup**.

## Flujo
1. Pegas lección → **Traducir** → palabras + oraciones + cápsulas.
2. En **Memoria** repasas palabras y cápsulas.
3. Al **Bajar de la nube** en otro dispositivo, se completan cápsulas faltantes vía Gemini.

Para lecciones ya traducidas antes de este cambio: vuelve a pulsar **Traducir** en la lección, o **Bajar de la nube** si vienes de otro sitio.

---

**User**

ahora solo me salen oraciones, tambien hay capsulas?  por ahora ponme un boton temporal o una manera de peek into the categories to see whats in them. well remove that later on. me gusto el chip de "capsula" en la card, se puede usar eso en vez de "frances", dividirlas entre palabras, frases y oraciones (tal vez en el futuro pongamos imagenes, pero ahora no).

---

**Cursor**

Revisando cómo se clasifican palabras, cápsulas y oraciones en vocabulario y memoria.


Añadiendo oraciones al vocabulario de memoria, chips por tipo y un panel temporal para inspeccionar categorías.


Aplicando los cambios restantes: arreglar archivos rotos e integrar la sincronización.


Listo. Resumen de lo que cambió:

### Sí hay cápsulas (y ahora también oraciones en memoria)
Al **Traducir** una lección guardada:
- **Palabras** → al guardar la lección (como antes)
- **Cápsulas** → Gemini genera fragmentos (`j'accepte`, `ton invitation`, etc.)
- **Oraciones** → cada frase traducida pasa a memoria con `kind: 'sentence'`

Si solo veías oraciones largas, era porque las frases se traducían pero **no se guardaban como entradas**. Eso ya está corregido. En lecciones ya traducidas, vuelve a pulsar **Traducir** o recarga la app (relee la caché y rellena oraciones).

### Chips por tipo (en lugar de «Francés» / «Nueva»)
En **Vocabulario** y **Memoria** cada tarjeta muestra:
- **Palabra** (azul)
- **Cápsula** (morado)
- **Oración** (verde azulado)

### Peek temporal
Botón **«Ver tipos (temp)»** en Vocabulario y Memoria: despliega conteos y hasta 12 ejemplos por tipo. Lo quitamos cuando quieras.

### Cómo probar
1. Abre una lección ya traducida → **Traducir** de nuevo  
2. Ve a **Memoria** → **Ver tipos (temp)** → deberías ver Palabra / Cápsula / Oración  
3. Las tarjetas de repaso llevan el chip de tipo arriba

---

**User**

en vocabulario solo poner palabras y frases que no pasen de 4 palabras, y en el caso de las frases ponerlas en una linea y la traduccion en otra linea debajo, ambas con la letra un poco mas pequena, para que siempre quepan cada una en su linea 

---

**Cursor**

Revisando el listado de vocabulario y sus estilos para aplicar el filtro y el layout de frases.


Filtrando entradas de hasta 4 palabras y aplicando layout en dos líneas para frases.


Hecho. Cambios en **Vocabulario**:

### Filtro
Solo se muestran entradas de **máximo 4 palabras** (palabras sueltas y frases cortas). Las oraciones largas siguen en **Memoria**, no aquí.

### Layout
- **1 palabra** → fila horizontal como antes (palabra + traducción al lado).
- **2–4 palabras** → dos líneas apiladas:
  - arriba: la frase en francés/inglés
  - abajo: la traducción
  - tipografía más pequeña (`0.8125rem`) y `…` si no cabe en una línea.

El contador pasa a decir **«X términos»** para reflejar palabras + frases cortas.

---

**User**

en vocabulario tambien filtrar por oraciones y capsulas. lecciones alinear input buscar por titulo y dropdown recientes. en memoria tirame las frases y palabras de manera aleatoria, o sea no solo las frases una detras de otras, claro continua respetando si el mazo es nuevas, aprendiendo, etc. en lecciones veo dos porcentajes en cada card, no se si es redundante (uno es dominio y el otro no tiene titulo).

---

**Cursor**

Revisando vocabulario, lecciones y memoria para aplicar los cambios.


Implementando los cuatro cambios.


Hecho. Resumen:

### Vocabulario
Excluye **cápsulas** y **oraciones** (`kind: capsule | sentence`). Solo palabras y frases cortas (≤4 palabras). Lo demás queda en Memoria.

### Lecciones — toolbar
Mismo patrón que Vocabulario:
- **Fila 1:** buscar por título (ancho completo)
- **Fila 2:** dropdown «Más recientes»

### Lecciones — porcentajes duplicados
Había **dos indicadores de dominio**: el badge `{mastery}%` arriba a la derecha y la barra con etiqueta «Dominio» + porcentaje. Quité el badge; queda solo la barra con título y %.

### Memoria — orden aleatorio
El mazo se **mezcla al azar** dentro del filtro activo (pendientes, nuevas, por lección, etc.). Ya no salen todas las frases seguidas y luego las palabras. Los filtros por categoría SRS siguen igual; solo cambia el orden dentro de la sesión.

---

**User**

cuando se esta esperando el audio de lingva, se puede indicar cuantos elementos FALTAN por traducir para dar una sensacion de progreso?

---

**Cursor**

Revisando cómo se obtiene el audio de Lingva y dónde mostrar el progreso pendiente.


Añadiendo callbacks de progreso en la cola de audio de Lingva y mostrándolos en Práctica y al regenerar.


Hecho. Mientras Lingva descarga audios (uno por uno en la cola), ahora ves progreso con cuántos faltan.

### Práctica (Traducir / Guardar)
Después de Gemini, la barra muestra:
- **«Preparando audios… faltan 12»** (el número baja con cada clip)
- Barra de progreso con **%** según completados / total

La fase de traducción sigue como **«Traduciendo lección…»** (indeterminada).

### Vocabulario → Regenerar
En la fase de audio: **«Preparando audios… faltan X»** con barra determinada.

Si todos los audios ya están en caché, no aparece la barra de audios (no hay nada pendiente). Con voz nativa del dispositivo tampoco aplica Lingva.

La configuración en Netlify se ve bien para lo que usa la app. Tienes las tres variables que importan:

| Variable | Para qué |
|---|---|
| `VITE_GEMINI_API_KEY` | Traducciones y cápsulas de memoria |
| `VITE_JSONBIN_BIN_ID` | ID del bin de backup en la nube |
| `VITE_JSONBIN_ACCESS_KEY` | Clave de acceso a JSONBin |

**Cosas a tener en cuenta:**

1. **`VITE_` en el nombre** — Vite solo expone al cliente las que empiezan así. Correcto.

2. **`VITE_JSONBIN_ACCESS_KEY`** — Si el valor es un hash bcrypt (`$2a$10$...`), en Netlify suele ir **sin comillas** y con los `$` tal cual. En `.env.local` a veces hace falta escaparlos (`\$`); en el panel de Netlify normalmente no.

3. **Redeploy** — Tras cambiar variables, hace falta un deploy nuevo para que entren en el build.

4. **Política “Require approval”** — Bien para PRs de forks: no exponen tus claves en deploys no confiables.

Si algo no funciona en producción (traducciones, sync, etc.), dime qué falla y lo revisamos. Si querías validar otra cosa con esta captura, indícamelo.

---

**User**

mira el archivo @french_vocab.json  que se podria implementar en relacion a eso?

---

**Cursor**

Revisando la estructura de `french_vocab.json` y cómo encaja con la app actual.


`french_vocab.json` es un **lexicón curado** (~1.965 entradas, ranking 31→~1996) con campos que la app **aún no usa**:

| Campo | Ejemplo | En la app hoy |
|---|---|---|
| `word` / `translation` | `mais` → `pero` | Sí, pero solo si salen de lecciones + Gemini |
| `category` | `verbo`, `conjunción` | No |
| `level` | `A1`, `B2` | No |
| `frequency_ranking` | 31, 500, 1500 | No |
| `tags` | `tiempo`, `posesivo` | No |

Hoy el vocabulario nace al **guardar lecciones** (`saveText` en `storage.ts`): extrae palabras del texto, traduce con Gemini si hace falta, y SRS en Memoria. No hay diccionario base ni decks predefinidos.

---

### Lo más útil para implementar (orden sugerido)

**1. Diccionario offline / fallback de traducción**  
Antes de llamar a Gemini, buscar en el lexicón por `normalizeWord(word)`.  
- Menos API y más rápido para palabras frecuentes  
- Funciona sin red para esas ~2k palabras  
- Encaja en `translate.ts` y en `withCachedTranslation` al guardar lecciones  

**2. Deck “Top frecuentes” en Memoria**  
Importar o estudiar directamente desde el JSON, sin lección:  
- “Estudiar top 500 / A1 / verbos”  
- Mazo aparte o entradas con `sourceTextId` especial (`"lexicon"`)  
- Reutiliza `FlashcardsView` + SRS tal cual  

**3. Metadatos en tarjetas y filtros**  
Extender `VocabEntry` (opcional) con `level`, `category`, `frequencyRank`, `tags` al cruzar con el lexicón:  
- Chips en Vocabulario: `A1 · verbo`  
- Filtros: nivel, categoría, tags  
- En la práctica, al pulsar una palabra: mostrar categoría y nivel  

**4. Análisis de lecciones**  
Cruzar palabras de la lección con el lexicón:  
- “12 palabras del top 200 que aún no dominas”  
- Dominio ponderado por frecuencia (no solo contar palabras)  
- Mejora `textWordStats.ts` y la barra de dominio en lecciones  

**5. Drill más inteligente**  
En `drillPicker.ts`, además del peso SRS, subir peso si `frequency_ranking` es bajo (más frecuente = más prioridad).  

**6. Importación masiva desde Ajustes**  
Botón tipo “Añadir deck A1 (800 palabras)” → crea entradas con traducción ya incluida, sin Gemini.  

**7. Resaltar palabras “core” en Práctica**  
Subrayar en oraciones las del top N que el usuario aún no tiene en SRS verde/fácil.  

---

### Encaje con lo que ya tienes

- **Vocabulario** (solo palabras/frases ≤4 palabras): el lexicón encaja bien; son casi todas palabras sueltas.  
- **Memoria**: ideal para un mazo “frecuencia” mezclado con lo de lecciones.  
- **Cápsulas/oraciones**: el JSON no las cubre; seguirían viniendo de lecciones + Gemini.  

---

### Antes de integrarlo: limpiar el archivo

El JSON **no está listo para import directo**:

1. **Duplicados** — ids 31–50 aparecen dos veces (líneas 2–21 y 22–41).  
2. **Posible JSON inválido** — hay un `{` suelto alrededor de la línea 43 entre bloques.  
3. **Empieza en 31** — faltan ranks 1–30 (¿otro archivo o aún no generados?).  

Conviene: deduplicar por `word`/`frequency_ranking`, validar JSON, y generar un `Map<normalized, entry>` en build time (`import lexicon from './french_vocab.json'` o script que lo empaquete).

---

### Implementación mínima vs. ambiciosa

| Esfuerzo | Qué haría |
|---|---|
| **Bajo** | Lookup en traducción + mostrar categoría/nivel al clicar palabra |
| **Medio** | Deck top 500/A1 + filtros en Vocabulario/Memoria |
| **Alto** | Progreso por nivel CEFR, análisis de lección, drill por frecuencia, import masivo |

Si quieres que lo implemente en el repo, cambia a **Agent mode** y dime por dónde empezar (por ejemplo: fallback de traducción + deck A1).

---

**User**

ok, cuando te ponga en agente vas a hacer los arreglos. pero todavia no. no entiendo bien el esfuerzo alto

---

**Cursor**

El **esfuerzo alto** no es “más código por gusto”: son varias piezas que se **alimentan entre sí** y tocan casi toda la app. Por eso cuesta más que el fallback de traducción o un deck A1 sueltos.

### Qué incluye el paquete “alto”

**1. Progreso por nivel CEFR (A1, A2, B1, B2)**  
No basta con filtrar por `level` en el JSON. Hay que definir:

- ¿Progreso sobre **todo el lexicón A1** (~cuántas palabras hay en A1 en el archivo)?
- ¿O solo sobre **las que ya importaste o viste en lecciones**?

Luego hace falta UI nueva (dashboard, barras por nivel) y lógica que cruce lexicón + `vocabulary` + SRS (`getFlashcardCategory`). Es diseño de producto, no solo un filtro.

**2. Análisis de lección enriquecido**  
Hoy `summarizeWordsInText` y `calculateTextMasteryPercent` miran palabras de la lección vs tu vocabulario SRS. El salto sería:

- “Esta lección usa **47 palabras del top 500**”
- “**8 son frecuentes y aún no las dominas**”
- Dominio ponderado por `frequency_ranking` (una palabra rank 50 pesa más que rank 1800)

Eso implica lookup en el lexicón en **Práctica** y **Lecciones**, textos de ayuda, y posiblemente resaltado en oraciones.

**3. Drill por frecuencia**  
`pickWeightedDrillOccurrence` ya pondera por SRS (`again`, `hard`, `new`…). Añadir frecuencia significa:

- Combinar dos pesos (SRS + ranking) sin que las palabras raras desaparezcan del drill
- Decidir si aplica solo a palabras del lexicón o a todas
- Probar que no rompa el “no repetir la misma palabra seguida”

**4. Import masivo + sync a largo plazo**  
“Añadir deck A1” suena simple, pero en modo alto suele ir con:

- ¿Qué pasa si la palabra **ya existe** con otra traducción (Gemini vs lexicón)?
- ¿Entra en backup JSONBin, regeneración, filtros de Vocabulario/Memoria?
- ¿Las palabras importadas cuentan para dominio de lecciones aunque nunca salieron en un texto?

Son reglas de datos que hay que acordar e implementar en `storage`, backup y UI.

**5. Mantener el lexicón como fuente de verdad**  
Script de limpieza (duplicados, JSON roto), tipos TypeScript, quizá versión del lexicón en `APP_STATE_VERSION`. Eso es infraestructura continua, no un botón.

---

### Comparación rápida

| | Bajo | Medio | Alto |
|---|---|---|---|
| **Traducción** | Lookup en lexicón | + deck estudiar | + reglas import/conflictos |
| **UI** | Chip nivel/categoría | Filtros + mazo A1 | Dashboard CEFR + análisis lección |
| **Práctica** | — | — | Resaltado + drill por frecuencia |
| **Decisiones** | Pocas | Algunas | Varias (qué es “dominar A1”) |

---

### En la práctica

- **Bajo:** “Esta palabra está en el diccionario → usa su traducción y muéstrame que es verbo A1.”
- **Medio:** “Quiero estudiar solo A1 o top 500 como un mazo más.”
- **Alto:** “Quiero que la app me diga **cómo voy en francés general** (por nivel y frecuencia), **qué me falta en cada lección** y **qué practicar primero** según importancia + SRS.”

No hace falta hacerlo todo de golpe. Lo razonable suele ser **bajo → medio**, y solo subir a alto si quieres que la app sea casi un “curso por niveles” además de lecciones propias.

Cuando pases a agente, lo primero sería **arreglar el JSON** y el **fallback de traducción**; el resto lo puedes ir pidiendo por fases.

---

**User**

en lo adelante responde mas breve. muy muy conciso. voy a seguir contigo acordando las posibilidades. 

---

**Cursor**

Perfecto. De aquí en adelante: respuestas cortas y directas.

Cuando quieras, seguimos acordando qué implementar del lexicón (bajo → medio → alto, por fases).

---

**User**

supon que aparte de las 2000 palabras, le pido a otra ia que me genere oraciones que las incluya todas, para practicar, lo cual seria obviamente menos de 2000 oraciones, y luego quisiera convertir esta aplicacion en un curso progresivo en el que presentas las oraciones (o conversaciones) mas o menos cubriendo niveles, etc. la parte que tenemos de "Practica" seria solo un agregado para uno practicar leccioens personalizadas (esta vez sin agregar su contenido al vocabulario, pues ya tenemos un archivo). La parte de "lecciones" ya estara generada por ti, con estas 2000 palabras y las oraciones que te dare. No estoy seguro de como transformariamos "Memoria", y croe que "vocabulario" se quedaria igual. 

---

**Cursor**

**Visión resumida**

| Pestaña | Rol nuevo |
|---|---|
| **Lecciones** | Curso fijo: unidades por nivel, oraciones/conversaciones tuyas |
| **Práctica** | Extra opcional: texto libre, sin tocar vocabulario |
| **Vocabulario** | Las ~2000 del lexicón (+ filtros nivel/categoría) |
| **Memoria** | Repaso SRS de lo del curso + lexicón |

---

**Contenido (2 archivos)**

1. `french_vocab.json` — palabras + metadatos  
2. `course.json` (nuevo) — unidades, nivel, oraciones, qué palabras cubre cada una  

Varias palabras por oración → ~400–800 oraciones bastan si están bien diseñadas.

---

**Lecciones (curso)**  
Lista por unidades (A1.1, A1.2…), no lecciones del usuario. Progreso: desbloqueo lineal o por % dominio. UI parecida a Práctica actual (leer, audio, traducción).

---

**Práctica (extra)**  
Mismo editor/drill, pero **sin** `saveText` ni añadir palabras. Estado aparte o efímero.

---

**Vocabulario**  
Carga inicial desde lexicón. SRS vive aquí o en Memoria (mismo `VocabEntry`). Filtros por `level` / `category`.

---

**Memoria — 3 opciones**

1. **Solo palabras** del lexicón (más simple)  
2. **Palabras + oraciones** del curso (recomendado si el curso es el centro)  
3. **Palabras + oraciones + cápsulas** (como ahora; cápsulas quizá sobran si las oraciones ya cubren todo)

Yo iría con **2**: Memoria repasa palabras y oraciones del curso; las oraciones largas no van a Vocabulario.

---

**Qué sobra o cambia**

- Gemini para vocab base → no (lexicón + curso)  
- Cápsulas auto → opcional  
- Dominio por lección usuario → dominio por **unidad del curso**  
- JSONBin → progreso del curso + SRS  

---

**Orden lógico al implementar**  
1. Limpiar lexicón + cargar vocab fijo  
2. Formato `course.json` + pestaña Lecciones curso  
3. Aislar Práctica libre  
4. Redefinir Memoria (palabras ± oraciones)  

¿Memoria solo palabras, o palabras + oraciones del curso? Eso define casi todo lo demás.

---

**User**

se te irian muchos tokens haciendo eso?

---

**Cursor**

**En desarrollo (conmigo en agente):** no hace falta un chat enorme. Es trabajo por fases en el repo; lo pesado es código y datos, no tokens de conversación. Varias sesiones medianas, no una sola de 500k tokens.

**En la app (Gemini):** baja mucho. Lexicón + curso fijos → casi sin traducir ni generar cápsulas. Gemini solo para **Práctica libre** (opcional) o extras.

**Tu otro paso (IA que genera oraciones):** eso sí gasta tokens **una vez**, fuera de la app, al crear el `course.json`. Después la app solo lee archivos locales.

**Resumen:** implementar el curso no te “come” tokens en uso diario; el coste grande es generar el contenido del curso al inicio.

---

**User**

yo tengo gemini pro que me da bastantes tokens. en el momento dado tu me podrias dar las instrucciones tecnicas (json, etc) para que gemini (junto con el archivo de vocabulario) me genere el contenido del curso? 

---

**Cursor**

Sí. Cuando quieras, te puedo dar un paquete listo para pegar en Gemini:

1. **`course.json` schema** — unidades, nivel, oraciones, `wordIds`/`words` cubiertos, orden, desbloqueo  
2. **Prompt maestro** — reglas (A1→B2, N palabras por oración, cubrir todo el vocab, español en traducciones)  
3. **Formato de salida** — JSON válido, sin markdown, chunks por unidad si hace falta  
4. **Checklist de validación** — 2000 palabras cubiertas, sin duplicados, niveles coherentes  
5. **Ejemplo** — 1 unidad completa como plantilla  

**Antes:** lexicón limpio (sin duplicados, JSON válido, ids 1–2000).

**Flujo:** subes `french_vocab.json` + instrucciones → Gemini genera por lotes (ej. A1 unidades 1–5) → tú validas → repetimos hasta completar.

Dime “dame el prompt/schema” cuando tengas el vocab listo (o casi).

---

**User**

ok, dime con que terminaremos?

---

**Cursor**

**App final (curso + extra)**

**Lecciones** — Curso fijo por unidades/niveles. Oraciones y conversaciones del `course.json`. Progreso y desbloqueo. Sin crear lecciones a mano.

**Práctica** — Texto libre opcional. Leer, traducir, drill. **No** añade al vocabulario.

**Vocabulario** — ~2000 palabras del lexicón. Filtros nivel/categoría. Traducciones del archivo, no Gemini.

**Memoria** — SRS de palabras + oraciones del curso (según acordemos). Mazo mezclado, filtros por unidad/nivel.

**Ajustes** — Sync progreso (JSONBin). Sin depender de Gemini para el curso.

**Datos**
- `french_vocab.json` — palabras
- `course.json` — unidades, oraciones, cobertura de palabras
- `localStorage`/nube — SRS + unidad actual + Práctica libre aparte

**Fuera o secundario:** Gemini solo para Práctica libre; cápsulas auto; lecciones guardadas por el usuario como núcleo del producto.

---

**User**

por que desbloqueo por progreso? no podemos dejar todo abierto e ir mostrando progreso segun lo que se domine?

---

**Cursor**

Sí, se puede. No hace falta desbloqueo.

**Todo abierto:** el usuario elige cualquier unidad. La app muestra progreso (% palabras/oraciones dominadas por unidad y por nivel).

**Desbloqueo** solo sirve si quieres guiar el orden tipo curso clásico. No es obligatorio.

**Recomendación:** todo abierto + barras/chips de dominio + sugerencia “siguiente unidad con más palabras nuevas” (opcional, no bloqueante).

Menos fricción, mismo SRS en Memoria.

---

**User**

las instrucciones que me daras para gemini son un solo prompt o varios?

---

**Cursor**

**Varios**, en la práctica:

1. **Prompt base** — schema, reglas, tono (una vez)  
2. **Prompts por lote** — “genera unidad A1-3, palabras ids 101–150” (repetir)  
3. **Prompt de validación** — revisar cobertura y JSON (al final o entre lotes)

Un solo prompt con 2000 palabras suele fallar (límite, JSON roto, olvidos). Lotes de 20–40 palabras / 3–5 unidades por respuesta funciona mejor.

Te daré plantilla base + plantilla de lote + checklist.

---

**User**

o sea, aun gemini pro puede fallar?

---

**Cursor**

Sí. Pro da más margen, pero puede:

- **Cortar** respuesta (JSON incompleto)
- **Inventar** ids o palabras que no están en el vocab
- **Repetir** u **olvidar** palabras del lote
- **Romper** JSON (comas, comillas)

Por eso: lotes pequeños + validación automática/manual + pegar unidades juntas al final.

No es fallo del plan; es normal con salidas largas y estructuradas.

---

**User**

dame un prompt que yo le pueda dar a gemini para que me confirme si esa informacion es correcta o no

---

**Cursor**

Copia esto en Gemini (adjunta `french_vocab.json` si ya está limpio):

---

**Prompt de validación**

```
Eres un revisor técnico de diseño de producto para una app de francés (React + localStorage + SRS).

Contexto del plan:
1. Lexicón fijo ~2000 palabras en french_vocab.json (word, translation, category, level A1–B2, frequency_ranking, tags).
2. Otro archivo course.json con unidades del curso: oraciones/conversaciones que cubren TODAS las palabras del lexicón (menos oraciones que palabras; varias palabras por oración).
3. Pestañas de la app:
   - Lecciones: curso pregenerado, TODO abierto (sin desbloqueo), solo progreso/dominio por unidad y nivel.
   - Práctica: texto libre opcional, NO añade palabras al vocabulario.
   - Vocabulario: las ~2000 del lexicón + filtros.
   - Memoria: SRS de palabras + oraciones del curso (mazo mezclado).
4. Gemini en producción casi no se usa; el contenido del curso se genera offline con prompts por lotes (20–40 palabras / 3–5 unidades por respuesta) porque JSON grande falla (cortes, ids inventados, palabras olvidadas).
5. Progreso = dominio SRS + % palabras cubiertas por unidad, no bloqueos.

Tu tarea:
A) ¿Es coherente este diseño? Lista pros, contras y riesgos.
B) ¿El schema propuesto (lexicón + course.json con units, level, sentences[], wordIds[]) es adecuado? ¿Qué campos faltan o sobran?
C) ¿Es realista cubrir ~2000 palabras con cuántas oraciones? Orden de magnitud.
D) ¿Generación por lotes + validación es la estrategia correcta vs un solo prompt?
E) ¿Memoria con palabras + oraciones tiene sentido o mejor solo palabras?
F) ¿Qué errores típicos verías en french_vocab.json y course.json generados por IA?
G) Dame un checklist concreto (10–15 ítems) para validar course.json antes de importarlo a la app.

Responde en español, directo, con secciones A–G. Si algo del plan es incorrecto, dilo explícitamente y propón alternativa mejor.
```

---

Si el vocab aún tiene duplicados o JSON roto, añade: *“El adjunto puede tener errores; incluye en F cómo detectarlos.”*

---

**User**

A) **Coherencia y Riesgos**

* **Pros:** Diseño modular, desacoplamiento de datos, alta eficiencia con `localStorage`.
* **Contras:** `localStorage` tiene límite de ~5MB. 2000 palabras + oraciones + metadata SRS excederán este límite si no se gestionan proactivamente.
* **Riesgos:** Pérdida de integridad referencial entre `wordIds` y `lexicon`. La navegación "todo abierto" reduce retención; el usuario no sabe por dónde empezar.

B) **Schema**

* **Lexicón:** Falta `audio_url` (o texto-a-voz local) y `pos` (part-of-speech). Sobra `tags` si `category` ya existe.
* **Course:** `sentences` debería ser un objeto normalizado (`id: string, text: string, translation: string, wordIds: string[]`).
* **Mejora:** Incluir un campo `morphology` (conjugaciones) en el lexicón para evitar duplicar palabras como "manger", "mangent", "mangeons".

C) **Volumen**

* **Orden de magnitud:** 400–600 oraciones.
* **Ratio:** 3.5–5 palabras nuevas por oración es el límite cognitivo. Menos oraciones generan sobrecarga; más, diluyen la atención.

D) **Generación**

* **Estrategia:** La generación por lotes es **correcta**.
* **Validación:** Es obligatoria. Debes construir un script de validación (Node.js/Python) que verifique que cada `wordId` referenciado en `course.json` exista realmente en `french_vocab.json`.

E) **Memoria (SRS)**

* **Recomendación:** **Solo palabras (términos) para SRS puro.**
* **Oraciones:** Úsalas como contexto dentro de la tarjeta de la palabra. Si haces SRS de oraciones completas, la carga cognitiva aumenta exponencialmente y la tasa de olvido se dispara.

F) **Errores típicos**

* **Alucinaciones:** Palabras inexistentes o traducciones contextuales erróneas.
* **Desalineación:** `wordIds` que no coinciden con los IDs reales.
* **Fuga de nivel:** Oraciones nivel B2 conteniendo vocabulario A1 avanzado, rompiendo la progresión pedagógica.
* **Duplicidad:** La IA generará la misma oración dos veces en diferentes lotes.

G) **Checklist de validación (Importación)**

1. **Integridad:** ¿Todos los `wordIds` en `course.json` existen en `lexicon`?
2. **Unicidad:** ¿Existen IDs de oración duplicados?
3. **Cobertura:** ¿Alguna palabra del lexicón quedó sin ser referenciada en ninguna oración?
4. **Balance:** ¿Ninguna unidad tiene <3 o >8 palabras nuevas?
5. **Formato:** ¿Cumplen todas las entradas con el schema JSON (tipos de datos)?
6. **Contexto:** ¿La traducción de la oración es precisa y no literal?
7. **Progresión:** ¿Las palabras en `unit_n` son de dificultad igual o menor que en `unit_n+1`?
8. **Tags:** ¿Están presentes todos los campos obligatorios?
9. **Limpieza:** ¿Existen caracteres especiales mal escapados?
10. **SRS:** ¿Todas las palabras tienen un campo inicial de `easiness_factor` o `next_review`?
11. **Consistencia:** ¿Las conjugaciones están normalizadas (ej. siempre infinitivo)?
12. **Volumen:** ¿El archivo final es inferior a 2MB para asegurar compatibilidad con `localStorage`?
13. **Audio:** ¿Existe un campo placeholder listo para la integración de voz?

---

**Cursor**

**En general:** Gemini acertó en lo importante. Algunos puntos hay que matizarlos con tu app actual.

**De acuerdo**
- Lotes + script de validación → sí, imprescindible.
- 400–600 oraciones, 3–5 palabras nuevas/oración → razonable.
- `sentences` como objetos con `id`, `text`, `translation`, `wordIds` → bien.
- Errores F (ids, cobertura, duplicados, fuga de nivel) → todos reales.
- Checklist G (1–4, 5–9) → útil tal cual.

**Matizar**
- **localStorage 5MB:** hoy la app ya guarda vocab + lecciones + SRS + caché traducción/audio. Curso fijo va en el **bundle** (`course.json`), no en localStorage. Solo progreso SRS (~2000 entradas) cabe; audios Lingva/IndexedDB son aparte. Vigila tamaño, pero no es bloqueante.
- **Todo abierto = menos retención:** opcional un “recomendado” (unidad con más palabras nuevas), sin bloqueo.
- **SRS solo palabras:** buen default. Oraciones en **Lecciones** (lectura), no en Memoria — encaja con lo que hablamos.
- **`audio_url` en lexicón:** no hace falta; ya tienes Lingva + caché.
- **`morphology`/conjugaciones:** nice-to-have; tu lexicón son lemmas. No mezclar formas flexionadas como entradas distintas salvo que lo decidas expreso.
- **Checklist 10 (SRS en course.json):** no. SRS vive en estado del usuario al estudiar, no en el curso estático.
- **Checklist 12 (<2MB):** orientativo; el curso embebido puede ser >2MB si no va en localStorage.
- **Checklist 13 (audio placeholder):** innecesario; audio se genera on demand.

**Conclusión:** El plan sigue siendo válido. Ajustes clave: curso en repo, SRS solo palabras, validador de cobertura, todo abierto + indicador de progreso.

¿Seguimos acordando schema final de `course.json` o primero limpiar el vocab?

---

**User**

quiero que me des un prompt para yo preguntarle a gemini si el puede darme el contenido del curso de una vez o en muy pocos lotes

---

**Cursor**

Copia esto (adjunta `french_vocab.json`):

---

```
Contexto: Voy a generar un curso de francés para una app React.

Datos:
- french_vocab.json adjunto: ~2000 palabras (id, word, translation, category, level, frequency_ranking).
- Necesito course.json con unidades por nivel (A1→B2), cada unidad con oraciones que cubran TODAS las palabras del lexicón.
- Objetivo: ~400–600 oraciones total; varias palabras por oración (3–5 nuevas por oración como máximo).
- Schema por oración: { id, text, translation, wordIds[] }
- Schema por unidad: { id, title, level, order, sentences[] }

Pregunta principal:
¿Puedes generarme TODO el course.json de una sola vez, o en muy pocos lotes (1–3 respuestas)?

Responde con honestidad técnica:

1. ¿Cuántas palabras/oraciones/unidades caben en UNA respuesta sin cortar el JSON?
2. ¿Cuántos lotes mínimos recomiendas con Gemini Pro (adjunto completo)?
3. ¿Cuál es el tamaño estimado en tokens/caracteres del course.json final?
4. Si dices que sí en pocos lotes, ¿qué condiciones debo imponer (max oraciones por respuesta, unidades por lote, etc.)?
5. ¿Qué estrategia concreta propones: 1 shot, 3 lotes por nivel, o muchos lotes pequeños?
6. Dame un plan numerado (paso 1, 2, 3…) con el número exacto de prompts que usarías.

Importante:
- Salida debe ser JSON válido parseable, sin markdown.
- Cada wordId debe existir en el lexicón adjunto.
- Al final debe haber 100% cobertura del lexicón (ninguna palabra sin oración).

Si NO es viable en 1–3 lotes, dilo claro y justifica con límites de salida.
```

---

---

**User**

esto que quiero hacer con gemini pro, puedo hacerlo tambien con la version gratuita? 

---

**Cursor**

**Sí, pero peor experiencia.**

| | Gratis | Pro |
|---|---|---|
| Contexto / salida | Menor → cortes más frecuentes | Más margen |
| Rate limits | Más estrictos | Más relajados |
| Archivo adjunto | Suele ir bien el vocab | Igual o mejor |
| Calidad JSON largo | Más errores y olvidos | Más estable |

**Conclusión:** viable en **muchos lotes** (10–20+), más reintentos y validación. Pro en **pocos lotes** (5–8). El vocab adjunto cabe en ambos; lo que limita es el **tamaño de cada respuesta** (oraciones + JSON).

**Tip gratis:** lotes chicos (1 unidad o 30–50 palabras), pide solo JSON, valida cobertura al final con script o prompt aparte.

---

**User**

dame un ejemplo de lo que le pedirismos en el primer lote para yo probar

---

**Cursor**

**Lote 1 de prueba** — 20 palabras (ids 31–50), 1 unidad, ~6 oraciones.

Adjunta `french_vocab.json` y pega:

---

```
Genera el LOTE 1 del curso de francés.

Palabras OBLIGATORIAS a cubrir (cada id exactamente 1 vez en wordIds del lote):
31 mais, 32 leur, 33 comme, 34 ou, 35 si, 36 avant, 37 y, 38 dire, 39 elle, 40 devoir,
41 donner, 42 deux, 43 même, 44 prendre, 45 où, 46 aussi, 47 celui, 48 bien, 49 cela, 50 fois

Reglas:
- 1 unidad: id "a1-u01", title "Primeros conectores", level "A1", order 1
- 5–7 oraciones naturales en francés, nivel A1, conversación cotidiana
- Traducción al español en cada oración
- Máximo 4 palabras nuevas del lote por oración
- Cada oración: wordIds[] solo con ids de la lista (números, no strings)
- Verbos en formas naturales del texto (infinitivo o conjugado), pero wordIds apuntan al id del lexicón
- JSON válido SOLO, sin markdown ni explicación

Schema:
{
  "version": 1,
  "units": [{
    "id": "a1-u01",
    "title": "...",
    "level": "A1",
    "order": 1,
    "sentences": [{
      "id": "a1-u01-s01",
      "text": "...",
      "translation": "...",
      "wordIds": [31, 32]
    }]
  }]
}

Al final incluye array "coverageCheck": lista de los 20 ids y boolean si aparecen en alguna oración.
```

---

**Qué revisar en la respuesta:** JSON parseable, 20/20 en `coverageCheck`, oraciones naturales, ids numéricos correctos.

*(Tu vocab tiene duplicados 31–50; para la prueba real conviene limpiar el archivo antes.)*

---

**User**

me devolvio esto: 
{
"version": 1,
"units": [
{
"id": "a1-u01",
"title": "Primeros conectores",
"level": "A1",
"order": 1,
"sentences": [
{
"id": "a1-u01-s01",
"text": "Tu dois dire cela, mais elle ne veut pas.",
"translation": "Debes decir eso, pero ella no quiere.",
"wordIds": [38, 49, 31, 39]
},
{
"id": "a1-u01-s02",
"text": "Il faut prendre deux fois leur café avant si.",
"translation": "Hay que tomar su café dos veces antes si.",
"wordIds": [44, 42, 50, 32, 36, 35]
},
{
"id": "a1-u01-s03",
"text": "Donner comme celui ou où aussi bien.",
"translation": "Dar como ese o dónde también bien.",
"wordIds": [41, 33, 47, 34, 45, 46, 48]
},
{
"id": "a1-u01-s04",
"text": "Elle y va même.",
"translation": "Ella va allí incluso.",
"wordIds": [39, 37, 43]
},
{
"id": "a1-u01-s05",
"text": "Tu dois donner deux fois.",
"translation": "Debes dar dos veces.",
"wordIds": [40, 41, 42, 50]
}
]
}
],
"coverageCheck": [
{"id": 31, "covered": true},
{"id": 32, "covered": true},
{"id": 33, "covered": true},
{"id": 34, "covered": true},
{"id": 35, "covered": true},
{"id": 36, "covered": true},
{"id": 37, "covered": true},
{"id": 38, "covered": true},
{"id": 39, "covered": true},
{"id": 40, "covered": true},
{"id": 41, "covered": true},
{"id": 42, "covered": true},
{"id": 43, "covered": true},
{"id": 44, "covered": true},
{"id": 45, "covered": true},
{"id": 46, "covered": true},
{"id": 47, "covered": true},
{"id": 48, "covered": true},
{"id": 49, "covered": true},
{"id": 50, "covered": true}
]
}

---

**Cursor**

**Técnicamente:** JSON válido, 20/20 cobertura, schema OK.

**Pedagógicamente:** malo.

- **s03** no es francés natural (“Donner comme celui ou où aussi bien”) — lista de palabras, no oración.
- **s02** suena forzada (“avant si” pegado).
- **Traducciones** literales/raras (“antes si”, “incluso” por *même*).

**Conclusión:** el validador de cobertura pasa; el de **calidad** no. Hay que añadir reglas al prompt:

1. Cada oración debe sonar como frase real (diálogo o narración).
2. Prohibido encadenar conectores sin sujeto/verbo completo.
3. Máx. 1–2 palabras “difíciles” por oración; el resto ya vistas o muy comunes.
4. Rechazar lote si alguna oración no tiene sujeto + verbo conjugado.

**Prompt de corrección** (pega esto):

```
Reescribe solo las oraciones a1-u01-s02 y a1-u01-s03. Deben ser francés natural A1, como diálogo cotidiano. Mismos wordIds obligatorios. Sin listas de palabras. JSON de esas 2 entradas solamente.
```

Si el lote 2 sale igual de forzado, baja a **10 palabras por lote** y pide **mini-diálogo de 2–3 frases** por unidad.

---

**User**

esto lo probe con pro, dame opinion: 
{
"version": 1,
"units": [
{
"id": "a1-u01",
"title": "Primeros conectores",
"level": "A1",
"order": 1,
"sentences": [
{
"id": "a1-u01-s01",
"text": "Elle doit prendre cela.",
"translation": "Ella debe tomar eso.",
"wordIds": [
39,
40,
44,
49
]
},
{
"id": "a1-u01-s02",
"text": "Mais où est leur voiture ?",
"translation": "Pero, ¿dónde está su coche?",
"wordIds": [
31,
32,
45
]
},
{
"id": "a1-u01-s03",
"text": "Je veux dire la phrase deux fois.",
"translation": "Quiero decir la frase dos veces.",
"wordIds": [
38,
42,
50
]
},
{
"id": "a1-u01-s04",
"text": "Il faut donner celui-ci ou l'autre.",
"translation": "Hay que dar este o el otro.",
"wordIds": [
34,
41,
47
]
},
{
"id": "a1-u01-s05",
"text": "Si tu y vas avant, c'est bien.",
"translation": "Si vas allí antes, está bien.",
"wordIds": [
35,
36,
37,
48
]
},
{
"id": "a1-u01-s06",
"text": "Il est comme toi, et moi aussi j'aime le même.",
"translation": "Él es como tú, y a mí también me gusta el mismo.",
"wordIds": [
33,
43,
46
]
}
]
}
],
"coverageCheck": [
{
"id": 31,
"covered": true
},
{
"id": 32,
"covered": true
},
{
"id": 33,
"covered": true
},
{
"id": 34,
"covered": true
},
{
"id": 35,
"covered": true
},
{
"id": 36,
"covered": true
},
{
"id": 37,
"covered": true
},
{
"id": 38,
"covered": true
},
{
"id": 39,
"covered": true
},
{
"id": 40,
"covered": true
},
{
"id": 41,
"covered": true
},
{
"id": 42,
"covered": true
},
{
"id": 43,
"covered": true
},
{
"id": 44,
"covered": true
},
{
"id": 45,
"covered": true
},
{
"id": 46,
"covered": true
},
{
"id": 47,
"covered": true
},
{
"id": 48,
"covered": true
},
{
"id": 49,
"covered": true
},
{
"id": 50,
"covered": true
}
]
}

---

**Cursor**

**Mucho mejor.** Usable como piloto con retoques menores.

**Bien**
- Francés natural en casi todas (s02, s05, s06 destacan).
- 20/20 cobertura, schema OK.
- Oraciones cortas, nivel A1 razonable.

**Ajustar**
- **s01** “prendre cela” = tomar eso (aceptable); “debe tomar eso” suena raro en ES → “Ella tiene que cogerlo” / “debe recoger eso”.
- **s03** “dire la phrase” es correcto pero artificial → mejor contexto (“Je veux le dire deux fois”).
- **s04** bien; “celui-ci” encaja con id 47.
- **s06** un poco larga y “le même” sin sustantivo previo es ambiguo.

**Falta en el prompt**
- Pedir **mini-hilo** (2–3 frases relacionadas), no 6 frases sueltas.
- Validar que **wordIds** coinciden con formas en el texto (ej. “devoir” → id 40 aunque sea “doit”).

**Veredicto:** Pro + reglas de calidad funcionan. Sigue con lotes de 15–20 palabras; añade “diálogo coherente entre personajes” y revisión humana rápida por lote.

---

**User**

primero dame el prompt ajustado para probar nuevamente con la version flash-lite. quiero ver si logramos que esa version lo haga bien, pues no quiero pagar pro.

---

**Cursor**

Copia esto (adjunta vocab o pega la lista de ids 31–50):

---

```
Genera LOTE 1 del curso de francés (prueba calidad).

Palabras OBLIGATORIAS (cada id debe aparecer en wordIds al menos 1 vez):
31 mais, 32 leur, 33 comme, 34 ou, 35 si, 36 avant, 37 y, 38 dire, 39 elle, 40 devoir,
41 donner, 42 deux, 43 même, 44 prendre, 45 où, 46 aussi, 47 celui, 48 bien, 49 cela, 50 fois

Reglas de CALIDAD (obligatorias):
1. Francés natural A1, como diálogo entre 2 personas (Marie y Paul).
2. 6–8 oraciones que formen un mini-hilo coherente, no frases sueltas.
3. Prohibido encadenar palabras sin sentido (ej. "Donner comme celui ou où").
4. Cada oración: sujeto + verbo conjugado; longitud máx 12 palabras.
5. wordIds = ids del lexicón aunque la palabra aparezca conjugada (ej. "doit" → id 40 devoir).
6. Traducción al español natural, no literal palabra por palabra.
7. Máximo 4 ids nuevos del lote por oración.
8. Solo JSON válido, sin markdown.

Schema:
{
  "version": 1,
  "units": [{
    "id": "a1-u01",
    "title": "Primeros conectores",
    "level": "A1",
    "order": 1,
    "sentences": [{
      "id": "a1-u01-s01",
      "text": "...",
      "translation": "...",
      "wordIds": [39, 40]
    }]
  }],
  "coverageCheck": [{"id": 31, "covered": true}, ...]
}

Antes de responder, verifica internamente:
- ¿Suena como conversación real?
- ¿Los 20 ids están cubiertos?
- ¿Alguna oración suena forzada? Si sí, reescríbela.
```

---

**Compara con Pro:** si s03 vuelve artificial o corta el JSON, Flash Lite no basta para lotes grandes; baja a 10 palabras por lote.

---

**User**

{
"version": 1,
"units": [
{
"id": "a1-u01",
"title": "Primeros conectores",
"level": "A1",
"order": 1,
"sentences": [
{
"id": "a1-u01-s01",
"text": "Marie: Elle doit prendre le train avant deux heures.",
"translation": "Marie: Ella debe tomar el tren antes de las dos.",
"wordIds": [39, 40, 44, 36, 42]
},
{
"id": "a1-u01-s02",
"text": "Paul: Mais, où est son billet ?",
"translation": "Paul: Pero, ¿dónde está su billete?",
"wordIds": [31, 45]
},
{
"id": "a1-u01-s03",
"text": "Marie: Je ne sais pas, elle y pense même.",
"translation": "Marie: No lo sé, ella incluso piensa en eso.",
"wordIds": [37, 43, 49]
},
{
"id": "a1-u01-s04",
"text": "Paul: Je veux lui donner celui-ci ou l'autre.",
"translation": "Paul: Quiero darle este o el otro.",
"wordIds": [41, 47, 34]
},
{
"id": "a1-u01-s05",
"text": "Marie: C'est bien, elle aime leur aide aussi.",
"translation": "Marie: Está bien, a ella también le gusta su ayuda.",
"wordIds": [48, 32, 46]
},
{
"id": "a1-u01-s06",
"text": "Paul: Si tu peux, tu dois dire deux fois la vérité.",
"translation": "Paul: Si puedes, debes decir dos veces la verdad.",
"wordIds": [35, 38, 50]
},
{
"id": "a1-u01-s07",
"text": "Marie: Tu agis comme un ami.",
"translation": "Marie: Actúas como un amigo.",
"wordIds": [33]
}
]
}
],
"coverageCheck": [
{"id": 31, "covered": true},
{"id": 32, "covered": true},
{"id": 33, "covered": true},
{"id": 34, "covered": true},
{"id": 35, "covered": true},
{"id": 36, "covered": true},
{"id": 37, "covered": true},
{"id": 38, "covered": true},
{"id": 39, "covered": true},
{"id": 40, "covered": true},
{"id": 41, "covered": true},
{"id": 42, "covered": true},
{"id": 43, "covered": true},
{"id": 44, "covered": true},
{"id": 45, "covered": true},
{"id": 46, "covered": true},
{"id": 47, "covered": true},
{"id": 48, "covered": true},
{"id": 49, "covered": true},
{"id": 50, "covered": true}
]
}

---

**Cursor**

**Veredicto:** Flash Lite **sirve** con este prompt. No necesitas Pro obligatorio.

**Mejor que el primer intento**
- Diálogo coherente Marie/Paul
- Francés mayormente natural
- 20/20 en checklist

**Problema serio**
- **s03:** `wordIds` incluye **49 (cela)** pero el texto dice **"y"**, no *cela*. Cobertura **falsa**.

**Menores**
- s03 traducción rara (“piensa en eso”)
- s01 “debe tomar el tren” → mejor “coger/tomar el tren”
- Prefijos `Marie:`/`Paul:` — decide si los quieres en UI o solo en generación

**Conclusión:** calidad ~Pro en este lote. Añade regla al prompt:

> *“Cada id en wordIds debe tener forma visible en `text` (o conjugación del lemma). Si usas `y`, no marques id 49.”*

Y validación automática post-lote. Con eso, **Flash Lite + lotes de 15–20** es viable sin pagar Pro.

---

**User**

puedo usra otro chat del mismo lite dcon un prompt detallado y especifico para validar la salida?

---

**Cursor**

Sí. Es buena práctica.

**Flujo:** Chat 1 genera → Chat 2 valida (pega JSON + lista de palabras del lote).

**Ventaja:** el validador no “defiende” su propio output; detecta ids falsos como el 49/ceLa.

**Prompt validador (corto):**

```
Eres auditor estricto. NO reescribas salvo errores críticos.

Entrada: course.json del lote + lista de palabras obligatorias (id, word).

Verifica:
1. JSON válido
2. Cada id obligatorio en algún wordIds
3. Cada id en wordIds tiene forma en `text` (lemma o conjugación razonable)
4. Francés natural A1
5. Traducciones correctas
6. Máx 4 ids nuevos por oración

Salida:
- PASS / FAIL
- Tabla: id | word | ¿en text? | oración
- Lista de oraciones a reescribir (solo ids)
- coverageCheck corregido si miente
```

Si falla, vuelves al chat 1 solo con las oraciones rotas.

---

**User**

ok, pues lo voy a hacer asi. recuerdame entonces cual sera el plan de accion

---

**Cursor**

**Plan de acción**

**Fase 0 — Vocab**
- Limpiar `french_vocab.json` (duplicados, JSON válido, ids 1–2000)

**Fase 1 — Contenido (tú + Flash Lite)**
- Chat A: generar lotes (15–20 palabras, diálogo, prompt ajustado)
- Chat B: validar cada lote (wordIds vs texto, cobertura, calidad)
- Corregir solo lo que falle → repetir hasta ~100 lotes / 400–600 oraciones
- Unir en `course.json`

**Fase 2 — App (agente, cuando digas)**
- Lexicón → vocab fijo
- Lecciones = curso embebido, todo abierto + % dominio
- Práctica libre sin añadir vocab
- Memoria = SRS solo palabras
- Script validador en repo

**Fase 3 — Sync**
- JSONBin guarda progreso SRS + unidad vista, no el curso

**Orden:** vocab limpio → 1 lote piloto validado → escala lotes → luego agente en app.

---

# HANDOFF — Continuar en otra máquina

_Documento para que otra instancia de Cursor/IA retome el contexto. Actualizado: 4 jul 2026._

## Instrucciones para la IA

- Responder **en español**, **muy conciso** (el usuario lo pidió explícitamente).
- **No commitear** salvo que lo pida.
- El usuario generará `course.json` **fuera de la app** con Gemini Flash Lite (2 chats: generador + validador). La app aún **no** está transformada en curso.
- Antes de implementar el curso en código, esperar a que el usuario termine lotes o lo pida explícitamente.

---

## Proyecto

**Word Gym / french-drill** — PWA React + Vite + TypeScript. Francés (e inglés) con lecciones, vocabulario, memoria SRS, sync JSONBin.

- Repo: `french-drill`
- Deploy: Netlify
- Datos usuario: `localStorage` + IndexedDB (audio) + JSONBin (backup)

### Env (`.env.local` / Netlify)

```
VITE_GEMINI_API_KEY=...
VITE_JSONBIN_BIN_ID=...
VITE_JSONBIN_ACCESS_KEY=...   # bcrypt: escapar $ en .env.local como \$
```

---

## Visión acordada (pivot a curso — NO implementado aún)

| Pestaña | Futuro |
|---------|--------|
| **Lecciones** | Curso fijo desde `course.json`, **todo abierto**, progreso por % dominio (sin desbloqueo) |
| **Práctica** | Texto libre opcional, **sin** añadir al vocabulario |
| **Vocabulario** | ~2000 palabras del lexicón + filtros nivel/categoría |
| **Memoria** | SRS **solo palabras** (oraciones se estudian en Lecciones, no flashcards de frase completa) |
| **Gemini en producción** | Casi off; lexicón + curso estáticos. Gemini solo para Práctica libre si acaso |

**Archivos de contenido:**

1. `french_vocab.json` — lexicón (en repo, ~1970 entradas ids **31–2000**)
2. `course.json` — unidades + oraciones ( **pendiente**, generado por usuario con IA)

**Volumen curso:** ~400–600 oraciones, 3–5 palabras nuevas/oración, lotes de 15–20 palabras.

---

## Estado del código HOY (app actual — sí implementado)

### Pestañas

- **Práctica:** lecciones usuario, traducir (Gemini bulk + cápsulas), guardar, drill SRS-aware, progreso audio Lingva.
- **Lecciones:** tarjetas con dominio (solo barra, **sin** badge % duplicado), toolbar buscar + ordenar alineado como Vocabulario.
- **Vocabulario:** solo palabras/frases **≤4 palabras**; **excluye** `kind: capsule | sentence`. Frases en 2 líneas (texto + traducción pequeña). Chip Palabra/Cápsula/Oración vía `vocabKind.ts`.
- **Memoria:** chips por tipo; mazo **mezclado aleatoriamente** (`shuffleDeck` en `useFlashcards.ts`); panel temp **Ver tipos (temp)** (`VocabKindPeek.tsx`).
- **Ajustes:** sync JSONBin, tema, voz, reset.

### Tipos y memoria de lección

- `VocabEntryKind`: `'word' | 'capsule' | 'sentence'`
- `syncLessonMemoryItems()` — oraciones traducidas + cápsulas al traducir/guardar
- `backfillAllLessonMemoryItems()` en `loadState`
- Cápsulas: Gemini en `lessonCapsules.ts`

### Traducción y audio

- Traducciones: **solo Gemini** (`geminiTranslate.ts`, `translate.ts`) — ya no Lingva para texto.
- Audio: Lingva (`lingvaSpeech.ts`, cola `lingvaClient.ts`). Prefetch con progreso **«faltan N»** (`audioCache.ts` → `PracticeView`).

### Archivos clave

| Área | Archivos |
|------|----------|
| Estado | `src/hooks/useAppState.ts`, `src/utils/storage.ts` |
| Curso futuro | `french_vocab.json` (root), `course.json` (crear) |
| SRS | `src/utils/spacedRepetition.ts`, `src/hooks/useFlashcards.ts` |
| UI vocab | `src/components/VocabularyList.tsx`, `src/utils/vocabKind.ts` |
| UI lecciones | `src/components/SavedTextsView.tsx` |
| Práctica | `src/components/PracticeView.tsx` |
| Sync | `src/utils/jsonbinClient.ts`, `SettingsView.tsx` |

### Tests

`npm test` — vitest (SRS, wordExtractor, textWordStats). `npm run build` OK.

---

## `french_vocab.json` — estado

- **Ubicación:** raíz del repo
- **Formato:** JSON array pretty-printed, válido
- **Rango:** ids **31–2000** (faltan 1–30 si se quería 2000 exactos)
- **Campos:** `id`, `word`, `translation`, `category`, `level`, `frequency_ranking`, `tags`
- **Integración en app:** aún **no** — el archivo existe pero la app no lo importa

---

## Schema acordado para `course.json`

```json
{
  "version": 1,
  "units": [{
    "id": "a1-u01",
    "title": "Primeros conectores",
    "level": "A1",
    "order": 1,
    "sentences": [{
      "id": "a1-u01-s01",
      "text": "Marie: Elle doit prendre le train avant deux heures.",
      "translation": "Marie: Ella debe tomar el tren antes de las dos.",
      "wordIds": [39, 40, 44, 36, 42]
    }]
  }]
}
```

**Reglas generación:**

- Diálogo coherente (ej. Marie/Paul), francés natural A1
- Máx 4 `wordIds` nuevos del lote por oración
- `wordIds` = ids numéricos del lexicón; conjugaciones OK pero **debe haber forma visible en `text`** (no marcar `cela` si solo hay `y`)
- Traducción ES natural, no literal
- `coverageCheck` al final de cada lote (validar que no mienta)

**SRS no va en course.json** — vive en estado usuario.

**Curso va en bundle**, no en localStorage. JSONBin solo progreso SRS.

---

## Flujo Gemini (usuario, Flash Lite — sin pagar Pro)

1. **Chat A — Generador:** prompt por lote (15–20 palabras)
2. **Chat B — Validador:** auditor estricto (PASS/FAIL, tabla id/word/en text)
3. Corregir solo oraciones fallidas en Chat A
4. Repetir ~100 lotes → unir en `course.json`
5. Script validador en repo (Fase 2 app) — pendiente

### Prompt generador (lote piloto ids 31–50 — probado OK en Flash Lite)

Ver sección anterior en este archivo (~línea 2950+) o usar:

- 20 palabras obligatorias con ids
- Unidad `a1-u01`, diálogo Marie/Paul, 6–8 oraciones
- Reglas calidad (no listas de palabras, sujeto+verbo, wordIds visibles en text)
- JSON solo + `coverageCheck`

### Prompt validador

```
Eres auditor estricto. NO reescribas salvo errores críticos.
Entrada: course.json del lote + lista de palabras obligatorias (id, word).
Verifica: JSON válido; cobertura ids; wordIds vs texto; francés natural; traducciones; máx 4 ids/oración.
Salida: PASS/FAIL; tabla id|word|¿en text?|oración; oraciones a reescribir; coverageCheck corregido.
```

### Resultados de prueba

- **Pro:** lote ids 31–50 usable con retoques menores (6 oraciones sueltas).
- **Flash Lite (prompt ajustado):** diálogo coherente, calidad ~Pro. **Error detectado:** s03 marcaba id 49 (cela) pero texto tenía solo `y` — validador en chat separado lo atrapa.

---

## Revisiones externas (Gemini auditor del plan)

- Lotes + script validación: **sí**
- 400–600 oraciones: **sí**
- SRS solo palabras: **acordado**
- localStorage 5MB: curso en bundle mitiga; vigilar tamaño
- Desbloqueo: **rechazado** — todo abierto + progreso
- `morphology`/audio_url en lexicón: **nice-to-have**, no prioritario

---

## Plan de acción (orden)

| Fase | Quién | Qué |
|------|-------|-----|
| **0** | Usuario/agente | Vocab listo (31–2000). Opcional: ids 1–30 |
| **1** | Usuario + Flash Lite | Generar/validar lotes → `course.json` |
| **2** | Agente (cuando pida) | Integrar lexicón + curso en app; Práctica aislada; validador script |
| **3** | Agente | JSONBin: solo progreso, no curso |

---

## Pendiente explícito (no hacer sin pedir)

- [ ] Importar `french_vocab.json` en la app
- [ ] Crear/consumir `course.json`
- [ ] Quitar `VocabKindPeek` (temp)
- [ ] Integrar lexicón como fallback traducción
- [ ] Transformar Lecciones en curso fijo
- [ ] Aislar Práctica libre del vocabulario
- [ ] Script Node de validación course + lexicon

---

## Comunicación con el usuario

- Español, **muy breve**
- Commits/PR solo si lo pide
- Preferencia: **Flash Lite gratis** para generar curso, no Gemini Pro

---

## Comando útil en otra máquina

```bash
cd french-drill
npm install
npm run dev        # dev con HTTPS local
npm test
npm run build
```

Copiar `.env.local` manualmente (no está en git).

---

_Fin del handoff._

