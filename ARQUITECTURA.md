# Tareas y Calificaciones · versión general (Tareas-G) — arquitectura y modelo de datos

Versión 1.0.0-beta.10 · hecha sobre Tareas 1.0.0-beta.45 (Tareas-P30).

## Arquitectura
- PWA en un solo `index.html` (HTML, CSS y JavaScript sin frameworks), más `sw.js`, `manifest.webmanifest`, `version.json`, `LEEME.txt` e íconos.
- Funciona sin internet. El `sw.js` guarda su copia en cachés `tareasg-app-…`, borra solo las suyas y se repara solo (`heal`). Usa la misma estrategia de actualización que Tareas y Asistencia: `version.json` + `pubListo` + `doUpd` con reintentos.
- Se reutilizaron **sin cambios** los módulos de Tareas beta.45: deslizar entre pestañas (el gesto sigue al dedo), Subir/Bajar, Guardar en el celular o Compartir (`sOut`), reconexión a la base (`dbRe`), tema, encabezado con reloj, tarjetas plegables, vuelta al mismo lugar al cambiar de pestaña, manual con índice y buscador, respaldo con Deshacer, Protección de mis datos, calificar desde el reporte, ficha del alumno y el dibujo de PDF e imagen.
- Identidad propia en el mismo sitio que Asistencia y Tareas-P30: IndexedDB `tareasg`, `localStorage` con prefijo `tareasg.` y manifiesto con `id: /Tareas-G/`.

## Modelo de datos (IndexedDB `tareasg`, versión 1)
| Almacén | Campos | Para qué |
|---|---|---|
| `groups` | id, name, mats[], u | Grupos y sus materias |
| `students` | id, mat, name, gid, out, baja, u | Alumnos. `out` = dado de baja o ya no viene en Asistencia: se conserva con su historial |
| `evals` | id, gid, subject, pid, crit[], rd, sc, u | **Evaluación** de un grupo, materia y parcial (equivale a `criteria`, `exams` y `extracurriculars` de la especificación) |
| `acts` | id, gid, subject, pid, cid, name, ini, fin, n, xc, u | Actividades. `cid` es el criterio; `n`, los reactivos del examen; `xc`, la columna del libro (solo las de 1, ½ y 0) |
| `grades` | id = actividad\|alumno, aid, stid, val, u | Número, `NE`, `NP` o `''` (sin calificar) |
| `asis` | id, gid, subject, pid, mat, pct, a, r, p, f, cl, del, al, gen, u | % de asistencia importado (dato derivado, no se edita) |
| `tpls` | id, name, crit[], rd, sc, u | Plantillas de evaluación |
| `kv` | k, v | `cfg` (docente, escuela, parciales, redondeos) y marcas `md|…` |

**Criterio** (`crit[]`): `{id, name, w (%), t, max, xc, x}`. Con `x` = 1 es de **puntos extra**: no cuenta en el 100 % y su parte se suma encima. Los tipos de `t` son:
- `p`: botones 10 a 5, NE y +½
- `c`: botones 1, ½ y 0
- `e`: examen (aciertos y NP)
- `a`: % de asistencia

El `id` del criterio sale de su nombre (`c-tareas`), así que coincide entre aparatos.

**Cálculo** (`calc`):
- El promedio de cada criterio va de 0 a 10. NE y NP valen 0. En los de 1, ½ y 0, el valor se multiplica por 10. El examen es aciertos × 10 ÷ reactivos. La asistencia es el % ÷ 10.
- La **base** es Σ(promedio × %) ÷ Σ%, solo con los criterios que no son de puntos extra. Con la regla «No cuenta», solo se suman los que tienen algo calificado; con «Cuenta como 0», todos.
- El **extra** es Σ(promedio × % ÷ 100) de los criterios de puntos extra que tienen algo calificado.
- **Real** = base + extra, sin límite (puede pasar de 10). **Final** = Real limitada a 10 y redondeada.
- Redondeo configurable: entero con 5.5 que sube a 6 (de fábrica), un decimal, entero sin subir o sin redondear.
- Final del semestre: promedio de las calificaciones Final de los parciales, con su propio redondeo.

**Reglas**:
- Toda escritura lleva `u`, que nunca retrocede.
- Lo que se borra uno por uno deja la marca `md|x|almacén|id` para Mis dispositivos.
- Las bajas no borran nada.
- Cambiar la evaluación de un parcial no toca las de otros parciales ni de otros grupos.

## Integración con Asistencia (un solo sentido)
1. **Alumnos**: «Traer alumnos de Asistencia» lee su respaldo completo, como Tareas-P30. Liga por nombre de grupo y matrícula. Los grupos agregados a mano que no vienen en el archivo no se tocan.
2. **% de asistencia**: Asistencia 2.0.80 tiene, en Reportes, el botón «Compartir % de asistencia con Tareas». Genera `asistencia-pct_….json`:
   ```json
   {"tipo":"asistencia-porcentaje","formato":1,"del":"aaaa-mm-dd","al":"aaaa-mm-dd","periodo":"Parcial 1",
    "bloques":[{"grupo":"1A","materia":"…","clases":N,
                "alumnos":[{"mat":"…","nombre":"…","a":0,"r":0,"p":0,"f":0,"sr":0,"clases":N,"pct":95.5}]}]}
   ```
   El % es (asistencias + retardos + permisos) ÷ clases cerradas del alumno, sin las no impartidas; es la misma regla que la columna % Asist. Tareas-G lo importa en el parcial elegido (propone el que tiene esas fechas) y reemplaza lo anterior de ese grupo, materia y parcial.

## Decisiones técnicas
- Los criterios no se guardan en un almacén aparte: van dentro de cada evaluación. Así cada parcial conserva su propia versión y el historial no se pierde al cambiar porcentajes.
- Un criterio con actividades no puede cambiar de tipo. Quitarlo pide escribir BORRAR.
- Tres reglas de fábrica: redondeo con 5.5 que sube a 6, «sin calificar no cuenta» y «en rojo menos de 6».
- El Excel genérico es un `.xlsx` armado en la propia app (zip sin compresión, sin librerías ni macros), con una hoja por grupo y materia.
- La exportación especial al libro del autor está detrás de una clave (huella FNV-1a, la misma de Asistencia). Se guarda solo en el aparato (`tareasg.xls`) y no viaja en respaldos ni en Mis dispositivos.

## Cambios de la beta.10
- `m5on`/`m5` (g_core): Final menor de 6 → 5, como la columna U del libro; opción de la evaluación (`m5:false` la apaga; ausente = encendida). También en el Final del semestre si todos sus parciales la tienen.
- Editor: `XCE`/`XCX` (hoja CE del libro v34), `evCode`, `evDif`, `evBk` (cuadro «Tu libro de Excel») y `evIgual`. Evaluación nueva con el interruptor encendido: `sc:'z'`.
- `xPrep`: dos exámenes incluidos → no exporta. `xDifT`/`xDifM`: aviso al exportar de evaluaciones que no coinciden con el libro.
- Traer de Tareas-P30: `p30Def` usa XCE; Jardín 3; `sc:'z'`.
- `taForm`: aviso al renombrar una actividad (libro por nombre).
- Excel del reporte: `rXSheet`/`rXRes` + `xlsxB` con styles.xml, combinadas, anchos, paneles fijos, títulos de impresión y horizontal a lo ancho; hoja Resumen con varios grupos.
- Prueba `test/book10.py`: copia de las fórmulas T y U del libro; 289 alumnos reales, 0 diferencias.

## Cambios de la beta.9
- Editor de evaluación (solo con el interruptor del libro encendido): `xpSug`/`xpGuess` proponen `xc` por el nombre del criterio (`XPG`) y `EXA` para un examen nuevo. Marca temporal `_xg` (propuesta); elegir a mano la borra y ya no se vuelve a proponer; `evSave` quita `_xg`. No propone una parte que ya usa otro criterio. Lo ya guardado no cambia.
- Manual: «Con el libro de Excel activado» (sección 4), «Libro de calificaciones de Excel» (Ajustes) y «Algo no llega a mi libro de Excel» (problemas).

## Cambios de la beta.8
- Exportación especial al libro v34: código `PA2` (Part2, columna M) además de `PAR` (Part1, columna L); nombres Part1, Part2 y Homje.
- `xcGuess`: «Participación 2», «Part 2» o «Part2» → `PA2`.
- `xMig` (una vez por sesión, al abrir Calificar o exportar): si en un grupo, materia y parcial dos criterios mandan a `PAR`, el que termina en «2» (o el segundo) pasa a `PA2`. Usa `put`, así que viaja con Mis dispositivos.
- `xPrep`: cada código de 0 a 1 admite una sola actividad incluida; si hay más, no exporta y dice cuáles.
- Traer de Tareas-P30: acepta `PA2`; si el respaldo trae dos `PAR`, la segunda llega como `PA2`.

## Posibles extensiones
- Calificación final con exámenes extraordinarios o recuperación.
- Ponderar los parciales de forma distinta en el final.
- Más formas de calificar (número libre de 0 a 10, rúbricas).
- Reporte por actividad con estadísticas (promedio, moda, reprobados).
- Leer el % de asistencia de varios parciales en un solo archivo.
