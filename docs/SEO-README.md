# SEO Checklist — AETHER HOUSE

## Arquivos criados

### `robots.txt`

- Permite indexação total (`Allow: /`).
- Aponta para o sitemap na raiz do domínio.

### `sitemap.xml`

- Lista as 5 páginas do site com `lastmod` = 2026-08-17.
- Prioridades:
  - `index.html` — 1.0 (weekly)
  - `projetos.html` — 0.9 (weekly)
  - `sobre.html` — 0.8 (monthly)
  - `servicos.html` — 0.8 (monthly)
  - `contato.html` — 0.7 (monthly)

### `assets/json/structured-data.json`

Três blocos JSON-LD para inserir via `<script type="application/ld+json">`:

1. **Organization** — nome, descrição, URL, logo, endereço (Lisbon, PT).
2. **WebSite** — nome, URL, SearchAction apontando para `projetos.html?q=`.
3. **LocalBusiness / Architect** — coordenadas geo de Lisboa
   (`38.7223, -9.1393`), telefone placeholder, horário seg–sex 09:00–18:00.

## Pendências

- Substituir `[PREENCHER Endereco]` e `[PREENCHER CEP]` com o endereco real.
- Substituir `+351-XXX-XXX-XXX` com o telefone do estudio.
- Adicionar URLs de redes sociais no array `sameAs` da Organization.
- Confirmar URL exata do logo em `assets/img/logos/`.
