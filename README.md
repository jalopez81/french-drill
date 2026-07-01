# Word Gym

App web mobile-first (PWA) para practicar idiomas con tus propios textos.

## Funciones

### Práctica
- Pega un texto y se divide automáticamente en oraciones
- Pronunciación por oración o por palabra (Web Speech API / audio en caché)
- Traducciones por oración (botón ojo) y traducción completa del texto
- Editor colapsable para maximizar espacio de lectura
- Atajos: ← palabra aleatoria (prioriza pendientes SRS) · ↑↓ oraciones · → pronunciar
- Velocidad de lectura: lento / normal / rápido
- Guarda lecciones en `localStorage`

### Mis lecciones
- Listado con dominio %, resumen por categoría SRS y última práctica
- Buscar, ordenar (recientes, pendientes, dominio, título)
- Editar título inline
- Toca una categoría para repasar esas palabras en Memoria

### Memoria (flashcards + repetición espaciada)
- Resumen por categoría (clicable para sesión filtrada)
- Atajos: Espacio revelar · 1–4 calificar
- Gestos: desliza ← otra vez · → bien
- Evita repetir la misma tarjeta seguidas en sesión

### Vocabulario
- Búsqueda, traducciones editables, exportación JSON/CSV

### Ajustes
- Idioma de estudio (francés / inglés)
- Voz, traductor (Lingva / Google), backup import/export
- Progreso: racha, dominadas, pendientes
- Tema claro / oscuro

## Desarrollo

```bash
npm install
npm run dev
```

## Build y PWA

```bash
npm run build
npm run preview
```

La app se puede instalar en el teléfono desde el navegador (Añadir a pantalla de inicio).

## Tests

```bash
npm test
```

## Notas

- La pronunciación usa la voz del sistema/navegador; en iOS Safari funciona mejor con HTTPS y tras una interacción del usuario.
- Los datos viven solo en el navegador (`localStorage`). Usa **Ajustes → Exportar backup** para respaldarlos.
