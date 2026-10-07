# Dominio, hosting y mails: paso a paso

Todo lo que hay que hacer **después** de comprar el dominio en Porkbun, hasta
tener la tienda andando en el dominio propio, tu casilla funcionando y la app
mandando mails.

Son cinco etapas. **El orden importa**: cada una necesita la anterior.

```
A. Cloudflare      el DNS vive acá
B. Porkbun         apuntar los nameservers a Cloudflare
C. Vercel          la tienda en el dominio
D. Firebase        autorizar el dominio para el login
E. Zoho            tu casilla  (max@tudominio.com)
F. Resend          los mails que manda la app
G. DMARC           un registro que protege las dos cosas
```

> **Sobre los nombres de los botones:** los paneles de Cloudflare, Vercel y
> Zoho cambian seguido. Si un botón no se llama exactamente como dice acá,
> está en esa sección con otro nombre. Lo que no cambia son los **valores**
> de los registros, y esos **siempre hay que copiarlos del panel que los
> genera**, nunca escribirlos de memoria.

En todo el documento, reemplazá `tudominio.com` por el tuyo.

---

## A. Cloudflare: que el DNS viva acá

Porkbun tiene su propio DNS, pero su panel es limitado y vas a cargar
bastantes registros. Cloudflare es gratis y mucho mejor para esto.

- [ ] **A1.** Entrá a <https://dash.cloudflare.com> y creá la cuenta (gratis).

- [ ] **A2.** En el panel, botón **Add a domain** (o *Add site*). Escribí
      `tudominio.com`, sin `www` y sin `https://`.

- [ ] **A3.** Cuando te ofrezca los planes, elegí **Free**. Está abajo de la
      lista y alcanza de sobra.

- [ ] **A4.** Cloudflare escanea el dominio y te muestra los registros que
      encuentra. Si recién lo compraste, va a haber poco o nada. Seguí.

- [ ] **A5.** Te muestra **dos nameservers**, con forma de
      `algo.ns.cloudflare.com`. **Copialos los dos.** Son tuyos y únicos:
      no uses los de ningún tutorial.

Dejá esta pestaña abierta.

---

## B. Porkbun: apuntar los nameservers

- [ ] **B1.** Entrá a <https://porkbun.com> y logueate.

- [ ] **B2.** Arriba a la derecha, menú de la cuenta → **Domain Management**.

- [ ] **B3.** Buscá `tudominio.com` en la lista y abrí sus detalles (la
      flecha o el engranaje a la derecha de la fila).

- [ ] **B4.** Buscá la sección **Authoritative Nameservers** (o *NS
      Records* / *Nameservers*). Click en **Edit**.

- [ ] **B5.** **Borrá los de Porkbun** (`curitiba.ns.porkbun.com` y
      compañía) y poné los **dos de Cloudflare** del paso A5. Guardá.

- [ ] **B6.** Volvé a Cloudflare. Abajo de los nameservers hay un botón
      tipo **Check nameservers**. Apretalo.

> **Esto tarda.** Puede ser diez minutos o unas horas. Cloudflare te manda un
> mail cuando el dominio queda **Active**. **No sigas con C hasta que diga
> Active**: si cargás registros antes, no se van a aplicar y vas a creer que
> algo está mal.

> ⚠️ **Lo importante de este paso:** desde ahora, **los registros DNS de
> Porkbun dejan de tener efecto**. Todo se carga en Cloudflare. Si en algún
> momento algo no resuelve, lo primero a revisar es si lo cargaste en el
> panel equivocado.

---

## C. Vercel: la tienda en tu dominio

- [ ] **C1.** Entrá a <https://vercel.com>, abrí el proyecto.

- [ ] **C2.** **Settings** (arriba) → **Domains** (menú de la izquierda).

- [ ] **C3.** En el campo de texto escribí `tudominio.com` y **Add**.

- [ ] **C4.** Vercel te va a preguntar qué hacer con `www`. Elegí la opción
      que **redirige `www.tudominio.com` a `tudominio.com`**. Así hay una
      sola dirección real y Google no ve dos sitios con el mismo contenido.

- [ ] **C5.** Vercel ahora te muestra **los registros que tenés que crear**,
      con el tipo, el nombre y el valor exactos. Algo así:

      ```
      Tipo    Nombre    Valor
      A       @         <una IP que Vercel te da>
      CNAME   www       <un host que Vercel te da>
      ```

      **Copiá los valores de ahí**, de tu pantalla. No los escribas de
      memoria ni los saques de un tutorial: Vercel los cambia.

- [ ] **C6.** Andá a Cloudflare → tu dominio → **DNS** → **Records** →
      **Add record**. Cargá los dos, uno por uno, con los valores de C5.

- [ ] **C7.** 🚨 **ESTE ES EL PASO QUE TODO EL MUNDO ROMPE.**

      Cada registro `A` y `CNAME` en Cloudflare tiene una **nubecita** en la
      columna *Proxy status*. Viene **naranja** (*Proxied*) por defecto.

      **Ponela en gris (*DNS only*)** en los dos registros de Vercel.

      **Por qué:** con la nube naranja, Cloudflare y Vercel manejan el
      certificado HTTPS cada uno por su lado y se pelean. El resultado es
      `ERR_TOO_MANY_REDIRECTS` o un `Error 526`, y es imposible de
      diagnosticar si no sabés que viene de acá. En gris, Cloudflare solo
      resuelve el nombre y Vercel hace el resto.

- [ ] **C8.** Volvé a Vercel → Settings → Domains. Al rato el dominio pasa
      de *Invalid Configuration* a **Valid**, y Vercel emite el certificado
      solo. Puede tardar unos minutos.

- [ ] **C9.** Abrí `https://tudominio.com`. Tiene que cargar la tienda, con
      el candado de HTTPS.

---

## D. Firebase: autorizar el dominio para el login

Sin esto, **el login con Google no funciona en el dominio nuevo** y te tira
`auth/unauthorized-domain`.

- [ ] **D1.** <https://console.firebase.google.com> → proyecto
      `react-coder-6377b`.

- [ ] **D2.** Menú izquierdo → **Authentication** → pestaña **Settings**
      (arriba, al lado de *Users*, *Sign-in method*, *Templates*).

- [ ] **D3.** Sección **Dominios autorizados** (*Authorized domains*) →
      **Agregar dominio**.

- [ ] **D4.** Agregá los dos, uno por vez:
      - `tudominio.com`
      - `www.tudominio.com`

- [ ] **D5.** Toma efecto al instante, **sin redeploy**.

> Los dominios de *preview* de Vercel cambian en cada push
> (`react-coder-abc123-maxdrag0.vercel.app`), así que no se pueden autorizar
> de antemano. **El login con Google va a andar solo en el dominio real y en
> la URL de producción.** No está roto: es así.

---

## E. Zoho: tu casilla (`max@tudominio.com`)

Esto ya lo hiciste en tu otro proyecto, así que va más corto. Lo único
distinto es que **los registros se cargan en Cloudflare**, no en Porkbun.

- [ ] **E1.** <https://www.zoho.com/mail/> → plan gratuito → **Sign up**.

- [ ] **E2.** Elegí la opción de **dominio propio** (no la de comprar uno) y
      escribí `tudominio.com`.

- [ ] **E3.** Zoho te pide **verificar que el dominio es tuyo** con un
      registro `TXT` (o `CNAME`). Copialo y cargalo en Cloudflare → DNS →
      Records → Add record. Volvé a Zoho y dale **Verify**.

- [ ] **E4.** Creá la casilla. Te sugiero algo que puedas poner en la web sin
      arrepentirte después: `ventas@`, `hola@` o `info@`.

- [ ] **E5.** Zoho te da los **registros MX**. Son tres y cada uno tiene una
      **prioridad** (10, 20, 50). Cargalos en Cloudflare:
      - Tipo: `MX`
      - Nombre: `@`
      - Valor y prioridad: **los que te muestra Zoho** (varían según el
        centro de datos que te asignen, así que no los copies de ningún
        tutorial)

- [ ] **E6.** Zoho también te da un **SPF** y un **DKIM**. Cargá los dos.
      - El SPF es un `TXT` en `@`, con forma `v=spf1 include:zoho.com ~all`
      - El DKIM es un `TXT` en un nombre tipo `zoho._domainkey`

- [ ] **E7.** Mandate un mail desde tu Gmail a la casilla nueva. Tiene que
      llegar. Si no llega, los MX todavía están propagando: esperá y probá
      de nuevo.

> 🚨 **Acordate de esto para la etapa F:** **solo puede existir UN registro
> SPF por dominio.** Acabás de cargar el de Zoho. Si en F agregás otro `TXT`
> con `v=spf1` en `@`, **se rompen los dos**. La etapa F está diseñada para
> que eso no pase.

---

## F. Resend: los mails que manda la app

Acá es donde la tienda te avisa que entró un pedido.

**Resend va en un subdominio, `send.tudominio.com`, no en el dominio raíz.**
Así su SPF vive separado del de Zoho y no se pisan. Es lo que recomienda
Resend y además te deja el correo intacto.

Y como esos mails **te llegan a vos**, que el remitente sea
`pedidos@send.tudominio.com` lo ves solo vos en tu bandeja.

- [ ] **F1.** <https://resend.com/signup>. Plan gratuito: 3.000 mails por
      mes, 100 por día. Te sobra.

- [ ] **F2.** Menú izquierdo → **Domains** → **Add Domain**.

- [ ] **F3.** Escribí **`send.tudominio.com`** (con el `send.` adelante).
      Elegí la región más cercana que te ofrezca.

- [ ] **F4.** Resend te muestra tres o cuatro registros (un `MX`, un `TXT`
      de SPF, y uno de DKIM). **Fijate que el nombre de cada uno ya incluya
      `send`.**

      ⚠️ Cloudflare a veces **agrega el dominio solo** al nombre. Si Resend
      te dice que el nombre es `send` y Cloudflare te muestra
      `send.tudominio.com`, está bien. Lo que **no** tiene que pasar es
      terminar con `send.tudominio.com.tudominio.com`. Después de guardar,
      mirá la columna *Name* y confirmá que quedó como esperabas.

- [ ] **F5.** Cargalos en Cloudflare. Los `MX` y `TXT` no tienen nubecita,
      así que acá no hay nada que poner en gris. Si alguno fuera `CNAME`,
      **ponelo en gris** igual que en C7.

- [ ] **F6.** Volvé a Resend y dale **Verify**. Suele tardar minutos. Si
      falla, esperá y reintentá antes de tocar nada: casi siempre es
      propagación.

- [ ] **F7.** Menú izquierdo → **API Keys** → **Create API Key**. Permiso
      de envío (*Sending access*) alcanza. **Copiala ahora**: no se vuelve a
      mostrar.

- [ ] **F8.** Cargala en Vercel → Settings → **Environment Variables**:

      | Variable | Valor |
      |---|---|
      | `RESEND_API_KEY` | la clave de F7 |
      | `MAIL_DESTINO` | la casilla de Zoho donde querés recibir los pedidos |
      | `MAIL_REMITENTE` | `pedidos@send.tudominio.com` |

      **La API key no va al repo nunca.** Solo acá.

---

## G. DMARC: un registro que cuida las dos cosas

Le dice a Gmail y Outlook qué hacer con un mail que dice venir de tu dominio
pero no pasa las verificaciones. Sin DMARC, tus mails tienen más chance de
caer en spam.

- [ ] **G1.** Cloudflare → DNS → Records → **Add record**:

      | Campo | Valor |
      |---|---|
      | Tipo | `TXT` |
      | Nombre | `_dmarc` |
      | Contenido | `v=DMARC1; p=none; rua=mailto:TU@tudominio.com` |

- [ ] **G2.** Reemplazá `TU@tudominio.com` por tu casilla de Zoho.

> **Por qué `p=none` y no `p=reject`:** `none` significa "no rechaces nada,
> solo mandame reportes". Es el modo de observación.
>
> Arrancar en `p=reject` es la forma más común de romperse el correo solo:
> si algún registro de Zoho o Resend quedó mal, `reject` hace que **tus
> propios mails desaparezcan sin aviso**. Dejalo en `none` un par de semanas,
> mirá los reportes que te llegan, y si todo pasa bien subilo a
> `p=quarantine` y después a `p=reject`.
>
> Un registro `_dmarc` en el dominio raíz **cubre también los subdominios**,
> así que `send.tudominio.com` queda protegido sin cargar nada más.

---

## H. Verificación final

Cuando termines todo, confirmá esto en orden. Si algo falla, el problema está
en esa etapa y no en las siguientes.

- [ ] `https://tudominio.com` carga la tienda con candado de HTTPS
- [ ] `https://www.tudominio.com` **redirige** a la versión sin `www`
- [ ] El login con Google entra sin `auth/unauthorized-domain`
- [ ] Se ven los productos (si no, es el adblocker: probá en incógnito)
- [ ] Un mail de tu Gmail a la casilla de Zoho llega
- [ ] En Resend, `send.tudominio.com` figura **Verified**
- [ ] Mandá un mail de prueba a <https://www.mail-tester.com> y fijate el
      puntaje. Abajo de 8 sobre 10, revisá SPF y DKIM.

---

## I. Lo que se rompe y por qué

| Síntoma | Causa casi siempre | Dónde |
|---|---|---|
| `ERR_TOO_MANY_REDIRECTS` o `Error 526` | la nubecita naranja en los registros de Vercel | C7 |
| `auth/unauthorized-domain` al entrar con Google | falta el dominio en Firebase | D |
| Los mails de Zoho dejan de llegar justo después de configurar Resend | dos registros SPF en el dominio raíz | E7, F3 |
| Resend dice *Not verified* y los registros están | propagación: esperá y reintentá | F6 |
| Resend no verifica nunca | los registros quedaron en el raíz y no en el subdominio, o con el dominio duplicado | F4 |
| Vercel dice *Invalid Configuration* | el dominio todavía no está **Active** en Cloudflare | A6 |
| Todo parece bien pero nada cambia | cargaste los registros en Porkbun en vez de Cloudflare | B6 |
| Los mails llegan a spam | falta el DKIM, o falta DMARC | E6, G |

---

## Pendientes que no son de esta etapa

- **Reglas de Storage sin desplegar.** Corré `npx firebase deploy --only
  storage`. El CLI está instalado pero no en el PATH de Git Bash, por eso va
  con `npx`.
- **Restringir la API key de Firebase por referrer** y activar **App Check**:
  están en [runbook-seguridad-consola.md](runbook-seguridad-consola.md). Al
  hacerlo vas a tener que agregar el dominio nuevo a la lista.
- **Plantillas de mail de Firebase.** Los mails de verificación y de reset de
  contraseña salen con el texto genérico de Google en inglés. Se cambian en
  Authentication → **Templates**.
