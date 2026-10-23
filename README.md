# Academia de Opciones

Manual interactivo en español para aprender trading de opciones desde cero. Es un sitio estático: no necesita instalar nada ni servidor.

Cada concepto se explica primero con su definición exacta y después con un ejemplo de la vida diaria. Cada capítulo termina con un quiz, y varios incluyen simuladores.

## Contenido

| Capítulo | Tema |
|---|---|
| 1 | Qué es una opción: concepto, call, put, piezas del contrato, simulador de ganancia y pérdida |
| 2 | Por qué el contrato cuesta lo que cuesta: valor intrínseco y extrínseco, theta, delta, volatilidad implícita, simulador de precio |
| 3 | Cómo se lee y se opera: cadena de opciones, bid y ask, liquidez, órdenes, ejercicio, niveles de aprobación |
| 4 | TradingView desde cero: cuenta, descarga, recorrido, velas, tendencia, soportes, indicadores, alertas |
| 5 | Estrategias de opciones y simulador de estrategias |
| 6 | Cómo elegir tu estrategia: método de cuatro preguntas y asistente interactivo |
| 7 y 8 | En preparación: gestión del riesgo y plan de trabajo, y sistema propio |

Además hay un glosario con todas las palabras del manual.

## Archivos

- `index.html`: portada con el índice y el progreso por capítulo.
- `cap1.html` a `cap6.html`: los capítulos. `glosario.html`: el glosario.
- `styles.css`: estilos (incluye modo oscuro).
- `lib.js`: cálculos de contratos, Black-Scholes y estrategias.
- `common.js`: progreso, quiz, listas de verificación y gráficas.
- `cap1.js` a `cap6.js`: simuladores y preguntas de cada capítulo.

## Probar en local
Abre `index.html` en el navegador.

## Publicar con GitHub Pages
En el repositorio: Settings, Pages, Source: "Deploy from a branch", rama `main`, carpeta `/ (root)`. El sitio queda en `https://TU-USUARIO.github.io/academia-opciones/`.

## Progreso
El progreso de cada persona se guarda en su propio navegador (almacenamiento local). No se envía a ningún servidor.

> Material educativo. No es asesoría financiera. Operar opciones implica riesgo de perder todo el dinero invertido. Los ejemplos numéricos son ilustrativos y no son precios actuales del mercado.
