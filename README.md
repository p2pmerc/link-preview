# link-preview

A small service that turns a URL into a link card: title, description and image. It reads Open Graph tags and falls back to `<title>` and the description meta tag.

```sh
npm install
npm start
curl 'localhost:3000/preview?url=https://example.com'
```

```json
{ "url": "https://example.com/", "status": 200, "title": "Example Domain" }
```

Responses are cached in memory for five minutes. Pages are cut off after 512 KiB and requests time out after five seconds.

## Tests

```sh
npm test
```
