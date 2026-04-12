# Svelte para principiantes

Guía práctica para aprender Svelte 5 (runes mode) desde cero, con ejemplos del proyecto.

> **Versión de esta guía:** Svelte 5 con runes mode (el sistema de reactividad moderno).  
> Este proyecto tiene runes mode activado en todos los archivos.

---

## Tabla de contenidos

1. [¿Qué es Svelte?](#qué-es-svelte)
2. [Tu primer componente](#tu-primer-componente)
3. [Props — recibir datos del padre](#props--recibir-datos-del-padre)
4. [Estado reactivo con `$state`](#estado-reactivo-con-state)
5. [Valores derivados con `$derived`](#valores-derivados-con-derived)
6. [Efectos secundarios con `$effect`](#efectos-secundarios-con-effect)
7. [Plantilla: renderizado condicional](#plantilla-renderizado-condicional)
8. [Plantilla: listas con `{#each}`](#plantilla-listas-con-each)
9. [Plantilla: promesas con `{#await}`](#plantilla-promesas-con-await)
10. [Eventos](#eventos)
11. [Bindings de formulario](#bindings-de-formulario)
12. [Estilos en componentes](#estilos-en-componentes)
13. [Snippets (contenido dinámico)](#snippets-contenido-dinámico)
14. [Ejemplos del proyecto](#ejemplos-del-proyecto)

---

## ¿Qué es Svelte?

Svelte es un **compilador de interfaces de usuario**. A diferencia de React o Vue (que son librerías que corren en el navegador), Svelte compila tus componentes a JavaScript puro durante el build. El resultado es código muy pequeño y rápido sin runtime de framework.

**Lo que escribe el desarrollador:**
```svelte
<script>
  let nombre = $state('mundo');
</script>

<h1>Hola, {nombre}!</h1>
<input bind:value={nombre} />
```

**Lo que genera Svelte (JavaScript puro):**  
Código optimizado que manipula el DOM directamente cuando `nombre` cambia. Sin virtual DOM, sin diff, directo.

---

## Tu primer componente

Un componente Svelte es un archivo `.svelte` con tres secciones opcionales:

```svelte
<script lang="ts">
  // 1. Lógica (TypeScript o JavaScript)
  let mensaje = $state('¡Hola!');

  function cambiar() {
    mensaje = 'Cambiado';
  }
</script>

<!-- 2. Plantilla HTML con expresiones entre {} -->
<div>
  <p>{mensaje}</p>
  <button onclick={cambiar}>Cambiar</button>
</div>

<style>
  /* 3. Estilos (opcionales, con scope automático al componente) */
  p {
    color: blue;
  }
</style>
```

**Reglas básicas:**
- Las expresiones entre `{ }` en la plantilla son JavaScript
- Los estilos en `<style>` solo afectan a ese componente (scope automático)
- `lang="ts"` activa TypeScript en el `<script>`

---

## Props — recibir datos del padre

Los componentes reciben datos del exterior via `$props()`:

```svelte
<!-- Tarjeta.svelte -->
<script lang="ts">
  interface Props {
    titulo: string;
    descripcion?: string;   // Opcional
    destacado?: boolean;    // Con valor por defecto
  }

  let { titulo, descripcion = '', destacado = false }: Props = $props();
</script>

<div class:ring-2={destacado}>
  <h3>{titulo}</h3>
  {#if descripcion}
    <p>{descripcion}</p>
  {/if}
</div>
```

**Usando el componente:**

```svelte
<!-- PaginaPrincipal.svelte -->
<script lang="ts">
  import Tarjeta from './Tarjeta.svelte';
</script>

<Tarjeta titulo="Bienvenido" descripcion="Tu guía de inicio" destacado />
<Tarjeta titulo="Otro artículo" />
```

**Pasar props dinámicos:**

```svelte
<script lang="ts">
  let titulo = $state('Dinámico');
</script>

<Tarjeta {titulo} />  <!-- Shorthand: equivalente a titulo={titulo} -->
```

**Spread de props:**

```svelte
<script lang="ts">
  const props = { titulo: 'Uno', destacado: true };
</script>

<Tarjeta {...props} />
```

---

## Estado reactivo con `$state`

`$state` declara variables reactivas. Cuando cambian, la UI se actualiza automáticamente.

```svelte
<script lang="ts">
  let contador = $state(0);
  let nombre = $state('Ana');
  let activo = $state(false);

  // Arrays y objetos también son reactivos
  let lista = $state<string[]>([]);
  let usuario = $state({ nombre: 'Carlos', edad: 30 });
</script>

<p>Contador: {contador}</p>
<button onclick={() => contador++}>+1</button>

<!-- Arrays: push/splice SON reactivos con $state -->
<button onclick={() => lista.push('nuevo')}>Agregar</button>

<!-- Objetos: mutación directa ES reactiva -->
<button onclick={() => usuario.edad++}>Cumpleaños</button>
```

> **Diferencia con Svelte 4:** En Svelte 4 se usaba `let nombre = 'Ana'` y la reactividad era implícita. En Svelte 5 con runes, debes declarar explícitamente con `$state`.

---

## Valores derivados con `$derived`

Para valores que se calculan a partir de otros estados:

```svelte
<script lang="ts">
  let precio = $state(100);
  let cantidad = $state(3);

  // $derived simple: una expresión
  const total = $derived(precio * cantidad);

  // $derived.by: cuando necesitas múltiples líneas o lógica
  const resumen = $derived.by(() => {
    if (cantidad === 0) return 'Carrito vacío';
    const subtotal = precio * cantidad;
    const iva = subtotal * 0.16;
    return `Subtotal: $${subtotal} + IVA: $${iva.toFixed(2)}`;
  });
</script>

<p>Total: {total}</p>
<p>{resumen}</p>
```

**Regla importante:**
- `$derived(expresión)` → almacena el **resultado** de la expresión
- `$derived(() => fn)` → almacena la **función** (casi nunca es lo que quieres)
- `$derived.by(() => { ... return valor; })` → ejecuta el bloque y almacena el **resultado**

```svelte
<!-- ✅ Correcto -->
const doble = $derived(x * 2);
const complejo = $derived.by(() => {
  const temp = x * 2;
  return temp + 1;
});

<!-- ❌ Incorrecto — almacena la función, no el resultado -->
const doble = $derived(() => x * 2);  // doble es una función, no un número
```

---

## Efectos secundarios con `$effect`

Para código que debe ejecutarse cuando algo cambia (llamadas a APIs, localStorage, etc.):

```svelte
<script lang="ts">
  import { browser } from '$app/environment';

  let tema = $state('claro');

  // Se ejecuta cuando 'tema' cambia
  $effect(() => {
    if (!browser) return;  // Guard: solo en el navegador
    document.documentElement.classList.toggle('dark', tema === 'oscuro');
    localStorage.setItem('tema', tema);
  });

  // Cleanup: la función retornada se ejecuta antes del siguiente efecto
  $effect(() => {
    const intervalo = setInterval(() => console.log('tick'), 1000);
    return () => clearInterval(intervalo);  // Limpieza
  });
</script>
```

**Cuándo usar `$effect`:**
- Sincronizar con el DOM (`document.title = ...`)
- Guardar en localStorage
- Suscribirse a eventos externos
- Integrar librerías de terceros

**Cuándo NO usar `$effect`:**
- Para calcular valores → usa `$derived`
- Para responder a eventos del usuario → usa event handlers directos

---

## Plantilla: renderizado condicional

```svelte
<script lang="ts">
  let cargando = $state(true);
  let error = $state<string | null>(null);
  let datos = $state<string[]>([]);
</script>

{#if cargando}
  <p>Cargando...</p>
{:else if error}
  <p class="text-red-600">Error: {error}</p>
{:else if datos.length === 0}
  <p>No hay datos</p>
{:else}
  <ul>
    {#each datos as dato}
      <li>{dato}</li>
    {/each}
  </ul>
{/if}
```

---

## Plantilla: listas con `{#each}`

```svelte
<script lang="ts">
  const frutas = ['manzana', 'naranja', 'plátano'];

  interface Producto {
    id: number;
    nombre: string;
    precio: number;
  }

  const productos: Producto[] = [
    { id: 1, nombre: 'Libro', precio: 250 },
    { id: 2, nombre: 'Cuaderno', precio: 45 },
  ];
</script>

<!-- Básico -->
{#each frutas as fruta}
  <p>{fruta}</p>
{/each}

<!-- Con índice -->
{#each frutas as fruta, i}
  <p>{i + 1}. {fruta}</p>
{/each}

<!-- Con key (importante para listas que cambian) -->
{#each productos as producto (producto.id)}
  <div>
    <span>{producto.nombre}</span>
    <span>${producto.precio}</span>
  </div>
{/each}

<!-- Bloque vacío -->
{#each productos as producto (producto.id)}
  <p>{producto.nombre}</p>
{:else}
  <p>Lista vacía</p>
{/each}
```

**La key `(producto.id)` es importante** cuando los elementos se reordenan o eliminan. Sin key, Svelte puede reciclar DOM nodes incorrectamente y causar bugs visuales.

---

## Plantilla: promesas con `{#await}`

```svelte
<script lang="ts">
  async function obtenerDatos(): Promise<string[]> {
    const res = await fetch('/api/datos');
    return res.json();
  }

  const promesa = obtenerDatos();
</script>

{#await promesa}
  <p>Cargando...</p>
{:then datos}
  <ul>
    {#each datos as dato}
      <li>{dato}</li>
    {/each}
  </ul>
{:catch error}
  <p>Error: {error.message}</p>
{/await}
```

> En SvelteKit, generalmente NO se usa `{#await}` porque la carga de datos se hace en los archivos `+page.ts`. `{#await}` es útil para cargas secundarias dentro de un componente.

---

## Eventos

```svelte
<script lang="ts">
  function manejarClic(event: MouseEvent) {
    console.log('clic en', event.target);
  }

  function manejarInput(event: Event) {
    const valor = (event.target as HTMLInputElement).value;
    console.log('valor:', valor);
  }
</script>

<!-- Eventos del DOM -->
<button onclick={manejarClic}>Clic</button>
<input oninput={manejarInput} />

<!-- Función inline (para lógica simple) -->
<button onclick={() => console.log('hola')}>Hola</button>

<!-- Con modificadores (Svelte 5 usa los nativos del DOM) -->
<button onclick={(e) => { e.preventDefault(); hacerAlgo(); }}>
  Prevenir default
</button>

<!-- Eventos del teclado -->
<input onkeydown={(e) => e.key === 'Enter' && buscar()} />
```

---

## Bindings de formulario

`bind:value` crea una sincronización bidireccional:

```svelte
<script lang="ts">
  let nombre = $state('');
  let edad = $state(0);
  let activo = $state(false);
  let opcion = $state('b');
  let seleccionados = $state<string[]>([]);
</script>

<!-- Texto -->
<input type="text" bind:value={nombre} />
<p>Hola, {nombre}</p>

<!-- Número (convierte automáticamente) -->
<input type="number" bind:value={edad} />

<!-- Checkbox -->
<input type="checkbox" bind:checked={activo} />

<!-- Radio -->
<input type="radio" bind:group={opcion} value="a" /> Opción A
<input type="radio" bind:group={opcion} value="b" /> Opción B

<!-- Select múltiple -->
<select multiple bind:value={seleccionados}>
  <option value="x">X</option>
  <option value="y">Y</option>
</select>

<!-- Binding a props del DOM -->
<div bind:clientWidth={ancho} bind:clientHeight={alto}></div>
```

---

## Estilos en componentes

Los estilos en `<style>` tienen scope automático (solo afectan a ese componente):

```svelte
<div class="contenedor">
  <p>Este párrafo es azul</p>
</div>

<style>
  /* Solo afecta a párrafos DENTRO de este componente */
  p {
    color: blue;
  }

  /* Para afectar elementos hijos de componentes importados */
  .contenedor :global(p) {
    font-size: 1rem;
  }
</style>
```

**Clases dinámicas:**

```svelte
<script lang="ts">
  let activo = $state(false);
  let tipo = $state('primario');
</script>

<!-- class: directiva (on/off) -->
<div class:activo={activo}>...</div>
<div class:activo>...</div>  <!-- Shorthand cuando variable = nombre de clase -->

<!-- Clases múltiples condicionales -->
<button class="{activo ? 'bg-blue-500' : 'bg-gray-200'} px-4 py-2">
  Botón
</button>
```

**Estilos inline dinámicos:**

```svelte
<script lang="ts">
  let ancho = $state(200);
</script>

<div style:width="{ancho}px" style:background-color="blue">...</div>

<!-- O con objeto -->
<div style="width: {ancho}px; height: 100px">...</div>
```

---

## Snippets (contenido dinámico)

Los snippets reemplazan a los "slots" de Svelte 4 para pasar contenido HTML a componentes:

```svelte
<!-- Boton.svelte -->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    contenido: Snippet;
    variante?: 'primario' | 'secundario';
  }

  let { contenido, variante = 'primario' }: Props = $props();
</script>

<button class="btn-{variante}">
  {@render contenido()}
</button>
```

```svelte
<!-- Uso -->
<Boton variante="primario">
  {#snippet contenido()}
    <span>Guardar</span>
    <svg>...</svg>
  {/snippet}
</Boton>
```

**Children (snippet implícito):**

```svelte
<!-- Tarjeta.svelte -->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    children: Snippet;
  }

  let { children }: Props = $props();
</script>

<div class="tarjeta">
  {@render children()}
</div>
```

```svelte
<!-- Uso — el contenido entre las etiquetas es el children -->
<Tarjeta>
  <h2>Título</h2>
  <p>Contenido de la tarjeta</p>
</Tarjeta>
```

---

## Ejemplos del proyecto

### `CodeBlock.svelte` — estado local + evento

```svelte
<script lang="ts">
  import type { StrapiCodeBlock } from '$lib/types/strapi';

  interface Props {
    block: StrapiCodeBlock;
  }

  let { block }: Props = $props();

  const code = $derived(block.children[0]?.text ?? '');

  let copied = $state(false);

  async function copyCode() {
    await navigator.clipboard.writeText(code);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }
</script>

<div class="code-block">
  <span>{block.language ?? 'código'}</span>
  <button onclick={copyCode}>
    {copied ? 'Copiado' : 'Copiar'}
  </button>
  <pre><code>{code}</code></pre>
</div>
```

### `BlockRenderer.svelte` — `{#each}` con key y `{#if}` anidados

```svelte
<script lang="ts">
  import type { StrapiBlock } from '$lib/types/strapi';
  import HeadingBlock from './HeadingBlock.svelte';
  import ParagraphBlock from './ParagraphBlock.svelte';
  // ... más imports

  interface Props {
    blocks: StrapiBlock[];
  }

  let { blocks }: Props = $props();
</script>

{#each blocks as block, i (i)}
  {#if block.type === 'heading'}
    <HeadingBlock {block} />
  {:else if block.type === 'paragraph'}
    <ParagraphBlock {block} />
  {:else if block.type === 'code'}
    <CodeBlock {block} />
  {/if}
{/each}
```

### `Header.svelte` — `$derived.by()` y browser guard

```svelte
<script lang="ts">
  import { page } from '$app/state';
  import { browser } from '$app/environment';

  // Estado persistido en localStorage
  let dark = $state(browser ? localStorage.getItem('theme') === 'dark' : false);

  // Valor derivado complejo: construye la URL del idioma alternativo
  const altLocale = $derived(page.params.locale === 'es' ? 'en' : 'es');
  const altHref = $derived.by(() => {
    const segments = page.url.pathname.split('/').filter(Boolean);
    segments[0] = altLocale;
    return '/' + segments.join('/');
  });

  $effect(() => {
    if (!browser) return;
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  });
</script>

<header>
  <a href={altHref}>{altLocale.toUpperCase()}</a>
  <button onclick={() => (dark = !dark)}>
    {dark ? '☀️' : '🌙'}
  </button>
</header>
```
