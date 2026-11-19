# Your Project's Title...
Your project's description...

## Environments
- Preview: https://main--exl-academy--noormd08.aem.page/
- Live: https://main--exl-academy--noormd08.aem.live/

## Documentation

Before using the aem-boilerplate, we recommend you to go through the documentation on [www.aem.live](https://www.aem.live/docs/), more specifically:
1. [AEM Authoring](https://www.aem.live/docs/aem-authoring)
2. [Universal Editor Tutorial](https://www.aem.live/developer/ue-tutorial)
3. [Component Model Definitions](https://www.aem.live/developer/component-model-definitions)
4. [Authoring Path Mapping](https://www.aem.live/developer/authoring-path-mapping)

## Prerequisites

- nodejs 20 or newer
- AEM Cloud Service release 2026.4 or newer

## Installation

```sh
npm i
```

## Linting

```sh
npm run lint
```

## My Hub POC (backend access pending)

This enhances the four existing `pl-*` blocks, not the whole My Hub page. The frontend
currently receives no backend content: the public Runtime endpoint is intentionally disabled
with HTTP 503 pending an approved browser-safe access-control method. The frontend no longer
reads mock fixtures, acquires caller tokens, or calls the backend. Until access control and the
frontend/backend content contract are agreed, all four personalized blocks remain hidden; the
rest of My Hub continues to render.

Run the local draft with the existing AEM CLI:

```sh
aem up --no-open --no-stop-other --html-folder drafts --html-mount /
```

Open `http://localhost:3000/my-hub`. It uses the closed safe layout and makes no backend or
fixture requests. The browser never receives an ALM token. The current backend action does not
provide content to the frontend.
The shared EXL header/footer load remotely and need network access independently of the hub.

```sh
npm test
npm run lint
```

The dependency-free Node tests verify the closed layout, no fixture/network requests, and
safe hiding of unavailable personalized blocks. Backend tests exercise deterministic ranking
and normalization with synthetic values only. There is no background polling or refresh UI.

When the backend becomes available, personalized responses must use `cache: 'no-store'`.
Content failures hide only the affected block. The separate backend prototype reads a manually
supplied ALM access token from its server environment and exposes a loopback-only
current-learner API. It is not connected to My Hub. Everyone using that prototype acts as the
token's learner; it is not multi-user authentication. Goal changes remain deferred: no
approved goal input/persistence source exists in this project.
