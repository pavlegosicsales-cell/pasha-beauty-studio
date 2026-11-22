# Pasha Beauty Studio: form backend (Google Apps Script)

`Code.gs` receives the booking form (rezervacije.html and the home page) and for every submission:

1. writes a row to the Google Sheet, tab **Rezervacije**
2. sends one branded notification email (Serbian, light theme, gold accent)

The form also opens WhatsApp (062 978 0605) on the visitor's phone with the same request. The script is the record and the notification.

## Deploy (in this order)

1. Create a Google Sheet (e.g. "Pasha Beauty Studio, upiti"). Open it, then **Extensions > Apps Script**.
2. Replace everything in `Code.gs` with this folder's `Code.gs`.
3. Set `NOTIFY_TO` to **your own** email address for testing.
4. Optional: paste the Sheet's link into `SHEET_URL`, so every email links to the full list.
5. **Deploy > New deployment > Web app**. Execute as **Me**, access **Anyone**. Approve the permissions.
6. Copy the `/exec` URL into `const ENDPOINT = '...'` at the top of the site's `main.js`, then push.
7. Send a test booking from the live site. Check the email and the Sheet.

## Go live

Change `NOTIFY_TO` to `pashabeautystudioo@gmail.com`, then **Deploy > Manage deployments > edit (pencil) > Version: New version > Deploy**.

Editing the script alone does nothing to the live URL. Every change needs a new version.

## Fields the site sends (GET, URL params)

`kategorija`, `usluga` (with length or technique), `dodaci`, `okvirno` (estimated price and time),
`termin`, `ime`, `telefon`, `email`, `poruka`, `stranica`.

## Known limits

- The site sends with `no-cors`, so the browser cannot read the reply. The thank-you screen shows whether or not the email actually went out. Test after every deploy.
- A free Gmail account can send 100 emails a day, plenty for a studio.
- This folder is inside `site/`, so Vercel serves it publicly. It holds no secrets: `NOTIFY_TO` is set only in the Apps Script editor.
