# Ewalco Solutions Ltd website

Responsive company website for building materials and hardware, construction, transport, mobile money and fumigation. Includes green-forward visual styling, scroll effects, downloadable images, an interactive inquiry form that emails all attached files, and a protected gallery manager.

## Deploy

1. Install Node.js 20 or newer on your host.
2. In this folder run `npm install`.
3. Copy `.env.example` to `.env` and fill in valid SMTP credentials and a strong `GALLERY_ADMIN_KEY`.
4. Run `npm start`; the site listens on `PORT` (defaults to 3000). Deploy to a Node-capable host such as Render, Railway, Fly.io, or a VPS. Set the same environment variables in the host dashboard instead of uploading `.env`.
5. Test `https://your-domain/api/health` and submit a test inquiry with a small attachment.

## Email delivery setup

Inquiry messages and attachments are sent by the server to **info.ewalcosolutionsltd@gmail.com**. SMTP must be configured before email sending works. For Gmail SMTP, use a Google account with 2-Step Verification and an App Password (or use your email provider's SMTP credentials). The sender mailbox is `SMTP_USER`; the destination is fixed in `server.js`. Email providers commonly limit message size, so attachments are limited to 10 files and 18 MB combined. The form accepts any file extension/type; never open unexpected attachments without checking them.

## Gallery manager

Open the Gallery section on the homepage, expand **Company gallery manager**, enter `GALLERY_ADMIN_KEY`, a title, optional caption, and an image. Supported gallery image formats are JPEG, PNG, WebP, GIF, and AVIF (up to 12 MB). Uploaded images and captions are saved under `uploads/`. Use persistent disk storage on your hosting platform or gallery uploads may be lost on redeploy/restart. The admin key protects the upload endpoint; keep it secret and use HTTPS.

## Downloadable images

The homepage's featured and gallery images include download links. For external image-hosted files, browser behavior depends on the source host; for guaranteed same-domain downloads, replace these stock image URLs with company-owned files stored in this project. Only publish images you own or have permission to use.

## Notes

- `site.webmanifest` and `sitemap.xml` were intentionally left untouched.
- This project does not include a static-host-only workaround for file emailing: the Node backend is required for actual upload and email delivery.
