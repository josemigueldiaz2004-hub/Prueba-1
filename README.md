# Entrenos App

Aplicación web sencilla para registrar entrenamientos de gimnasio.

## Qué hace

- Guarda entrenos con fecha, nombre y notas.
- Permite añadir varios ejercicios por entreno.
- Cada ejercicio puede tener varias series.
- Registra repeticiones y peso usado.
- Calcula estadísticas básicas: número de entrenos, series totales y volumen total.
- Permite borrar entrenamientos.
- Guarda los datos en `data/workouts.json`.

## Cómo ejecutarla

Necesitas tener Node.js instalado.

```bash
node server.js
```

Después abre en el navegador:

```bash
http://localhost:3000
```

## Estructura

```text
.
├── package.json
├── server.js
├── public/
│   └── index.html
└── data/
    └── .gitkeep
```

## Notas

No usa dependencias externas. Está hecha con Node.js puro, HTML, CSS y JavaScript. Es una base sencilla pero ampliable para añadir login, rutinas guardadas, gráficos, marcas personales o integración con móvil.
