# French Drill

App web mobile-first para practicar francés con tus propios textos.

## Funciones

- Pega un texto y se divide automáticamente en oraciones
- Toca una oración para seleccionarla y pronunciarla (Web Speech API, `fr-FR`)
- Toca una palabra para abrir un panel con pronunciación individual
- Guarda textos en `localStorage` para practicar después
- Al guardar, las palabras nuevas se agregan al vocabulario
- Exporta e importa un backup JSON del estado completo

## Desarrollo

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Notas

- La pronunciación usa la voz del sistema/navegador; en iOS Safari funciona mejor con el dispositivo desbloqueado y tras una interacción del usuario.
- Los datos viven solo en el navegador (`localStorage`). Usa **Ajustes → Exportar backup** para respaldarlos.
