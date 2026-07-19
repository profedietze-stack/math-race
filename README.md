# Math Race — Resuelve, Compite, Gana

Juego educativo de cálculo mental (sumas y restas) para primaria. Los jugadores resuelven problemas para hacer avanzar a su dragón en una carrera, contra la IA (10 niveles de dificultad) o contra 2-4 amigos en el mismo dispositivo. Desarrollado por **ProfeD.**

## Estructura del proyecto

```
MathRace/
├── index.html          Estructura HTML
├── css/
│   └── style.css        Todos los estilos
├── js/
│   ├── utils.js            Helpers (random, shuffle, RNG seedeada, toast, escapeHtml, safeGetJSON/safeSetItem, clamp, pKey, volumen)
│   ├── data.js             Constantes: stickers, rivales IA, niveles (con ops +/-/×/÷), comentarios, logros, problemas con enunciado
│   ├── profiles.js         Perfiles multi-usuario locales (crear/elegir/borrar, sin contraseña) — namespacea el progreso vía pKey()
│   ├── state.js            Estado global + helpers de robustez (readSavedLevel, normalizeStats, stats históricas, historial semanal)
│   ├── navigation.js       Navegación entre pantallas + panel de accesibilidad (contraste, animaciones, volumen) + pasar dispositivo
│   ├── stickers.js         Selección de corredor / setup de jugadores humanos / práctica / desafío diario
│   ├── race-track.js       Renderizado de la pista y animación de explosión
│   ├── challenge.js        generateChallenge() (pura, testeable) + render de problemas matemáticos + enunciados + proceedToNextChallenge()
│   ├── actions.js          Avanzar / bola de fuego / IA adaptativa / chequeo de ganador
│   ├── results.js          Fin de carrera, desafío diario, logros, stats + historial semanal, compartir resultado
│   ├── comments.js         Comentarista IA (banco de frases local, sin API)
│   ├── audio.js            SFX (Web Audio) + música (Tone.js) + vibración + volumen separado — se carga último porque parchea funciones de los módulos anteriores
│   └── main.js             Inicialización al cargar la página (con manejo de errores aislado)
├── tests/                Tests unitarios (Node, sin dependencias) — ver sección Tests
├── manifest.json         Web App Manifest (PWA)
├── sw.js                 Service Worker (modo offline)
├── package.json          Solo para `npm test`
└── README.md
```

**Importante sobre el orden de carga**: `utils.js` va primero (`state.js` usa `clamp`/`safeGetJSON` al construirse), después `data.js` y `profiles.js`, después `state.js`. `audio.js` debe cargarse después de todos los demás módulos JS porque parchea (`window.showScreen = ...`, etc.) funciones que ya deben existir. `index.html` ya respeta este orden — no lo cambies si agregás módulos nuevos, y si agregás uno nuevo pensá qué otros globals necesita antes de decidir dónde va.

**`globalThis.state` / `globalThis.currentProfileId` (no `let`)**: estas dos variables compartidas entre archivos se declaran colgándolas explícitamente de `globalThis` en vez de con `let` suelto. En el navegador da exactamente lo mismo (todos los `<script>` comparten un solo scope global). En Node (los tests) cada archivo requerido es un módulo aislado — un `let` de nivel superior se queda encerrado en ese módulo y otros archivos no lo ven. `globalThis.x = ...` sí es visible desde cualquier lado en ambos entornos. Si en algún momento agregás OTRA variable que varios archivos necesiten compartir (no una función, una variable con estado), usá el mismo patrón.

## Distribución — GitHub Pages

1. Crear un repositorio en GitHub (puede ser privado o público)
2. Subir toda la carpeta `MathRace/` al root del repositorio
3. Ir a **Settings → Pages → Source → Deploy from branch → main → / (root)**
4. En 1–2 minutos el juego estará disponible en `https://[usuario].github.io/[repo]/`

También funciona abriendo `index.html` directamente desde el sistema de archivos (`file://`) sin necesidad de servidor.

## Modo offline

El Service Worker cachea todos los archivos del juego (HTML, CSS, JS, fuentes) en la primera visita. A partir de ahí, el juego funciona completamente sin conexión, incluyendo la instalación como PWA (botón "Instalar" en Chrome/Edge). La música (Tone.js, vía CDN) requiere conexión la primera vez que se usa; si no hay red, el juego sigue jugable sin música de fondo.

## Comentarista "IA"

El texto in-game menciona un comentarista con IA Haiku, pero en realidad es un banco de frases local (`COMMENTS` en `data.js`) sin ninguna llamada a API externa — funciona 100% sin internet.

## Tests

El juego usa JS clásico (`<script src>`, sin bundler) para poder abrirse con `file://` y desplegarse en GitHub Pages sin build. Para poder testear esa lógica desde Node sin agregar dependencias ni cambiar cómo corre en el navegador, cada archivo relevante (`utils.js`, `data.js`, `profiles.js`, `state.js`, `challenge.js`) tiene al final un bloque:

```js
if (typeof module !== 'undefined' && module.exports) { module.exports = { ... }; }
```

`module` no existe en el navegador, así que ese bloque nunca se ejecuta ahí — cero impacto en el juego real. `tests/helpers/setup.js` hace el trabajo de "cargar" esos archivos en Node y volcar sus funciones al scope global, imitando cómo los `<script>` comparten `window` en el navegador.

Correr los tests (requiere Node 18+, sin instalar nada):

```
node --test tests/
```

o, si preferís:

```
npm test
```

Cubre: generación de preguntas (todas las operaciones, división siempre exacta, sin respuestas duplicadas ni negativas), determinismo del RNG seedeado del Desafío Diario, boost de dificultad, estadísticas históricas (incluye un caso real que este test suite encontró: un bug de referencia compartida en `normalizeStats` que corrompía el objeto de stats por defecto), `escapeHtml`, `clamp`, límites de nivel guardado, y estructura de `data.js` (niveles, stickers, logros).

Lo que **no** está cubierto por tests automáticos (requiere navegador real) tiene su propio checklist manual: pantallas, animaciones, audio/música, vibración háptica, Service Worker/PWA. Antes de un release, seguir el flujo de verificación manual: sticker picker → carrera vs IA → fireball → logros → modo práctica → desafío diario → accesibilidad → compartir resultado.

## Robustez

- `safeGetJSON`/`safeSetItem` (`utils.js`): ningún dato corrupto o cuota de `localStorage` excedida tira la app abajo — cae a un valor por defecto.
- Nivel guardado siempre se acota a `[1, 10]` (`readSavedLevel`), aunque el valor en `localStorage` esté corrompido o manipulado.
- `showScreen`/`renderAchievements`/etc. no rompen si falta un elemento del DOM — avisan por consola y siguen.
- Inicialización (`main.js`) aísla cada paso en su propio `try/catch`: si falla el audio o las partículas, el resto de la pantalla de inicio sigue funcionando.

## Creado por ProfeD.
