# SEOBolt for Gemini CLI

Audit a website for Google and AI search from Gemini CLI, using your own [SEOBolt](https://seobolt.app) account. The extension connects Gemini to the SEOBolt MCP server, adds four slash commands and a context file with working rules: SEOBolt reports and suggests, and nothing on your site is edited until you have seen the diff and said yes.

## At a glance

- **What it is:** SEOBolt is SEO and AI-search audit software built for AI agents to operate: your agent crawls a site, reads the audit and the fix plan with code snippets, applies the fixes and re-crawls to verify, while you assign the work, approve changes and review the results.
- **Primary user:** An AI agent (ChatGPT, Claude, Claude Code, Cursor, Gemini CLI or your own) calling the MCP server or REST API. Humans tag the work, approve the changes and review what the agent did.
- **Who pays:** Teams and companies that own websites (agencies, SaaS and e-commerce teams, developers, freelance SEOs, founders) and individuals who ask their assistant to run an audit. The outcome you buy: your agent audits and fixes, you approve and review.
- **What it does not do:** It has no proprietary backlink or keyword index and no live rank checker; tools that need that data say so instead of guessing. It does not query ChatGPT, Claude or Perplexity in the free audit and promises no citations or rankings.
- **Price:** Free plan: $0/month (3 crawls/month, 2 projects, 100 pages per crawl). Paid plans from $19/month: Starter $19, Pro $49, Business $99, billed monthly. Pricing: https://seobolt.app/pricing
- **Integrations:** MCP server (27 tools) for ChatGPT, Claude, Claude Code, Cursor and Gemini CLI; REST API; Google Search Console (Pro and Business); IndexNow submission.
- **Human oversight:** You connect an assistant on a consent screen, see it as a named key in Settings (last used, expiry) and revoke it there at any time; write tools are flagged so clients ask before running them; every crawl and fix plan stays visible in your dashboard. Details: https://seobolt.app/mcp-seo#oversight
- **Data and security:** Sign-in for assistants is OAuth 2.1 with PKCE on seobolt.app; the assistant never sees your password. Assistant keys are stored hashed, expire after 90 days and can be revoked in Settings. Fetching of customer-supplied URLs goes through an SSRF guard. Privacy: https://seobolt.app/privacy
- **Start in under 5 minutes:** Run the free audit at https://seobolt.app/free-audit (no signup), or add the MCP server to your assistant (https://seobolt.app/mcp-seo) and ask it to list your SEOBolt projects.
- **MCP server:** https://seobolt.app/mcp (ChatGPT: https://seobolt.app/mcp/chatgpt). Official MCP Registry name: app.seobolt/seobolt. npm: mcp-server-seobolt.

## Install in 60 seconds

```bash
gemini extensions install https://github.com/airdropfi/seobolt-gemini-extension
# restart Gemini CLI, then:
/mcp auth seobolt
```
The browser opens seobolt.app: sign in and click **Allow** (OAuth; revocable in Dashboard > Settings > API Keys).

## Example prompts (you tag and review, the agent works)

- *Individual:* Use SEOBolt to list my projects and tell me which site has the lowest health score. Summarize the top three issues so I can decide what to fix first.
- *Small business:* Assign to SEOBolt: crawl my site, then give me the fix plan in plain language. Show me what you did and what you found so I can approve it.
- *Agency or team:* Use SEOBolt on every project in the account: start a crawl for each, then report health scores in a table. I review before anything is changed.
- *Developer:* Get the SEOBolt fix plan for this project, apply the fixes in this repo on a branch, and show me the diff. After I deploy, re-crawl and compare the health score.

## More

- Site and MCP docs: https://seobolt.app/mcp-seo (markdown: https://seobolt.app/mcp-seo.md)
- MCP server card: https://seobolt.app/.well-known/mcp/server-card.json
- Official MCP Registry: `app.seobolt/seobolt` (https://registry.modelcontextprotocol.io/v0.1/servers?search=seobolt)
- Pricing: https://seobolt.app/pricing

## Before you start

- **You need a SEOBolt account** (sign up at https://seobolt.app). The Free plan works; what each tool can do follows your plan's limits.
- The audit, fix-plan and keyword tools are read-only. Two kinds of action are not: `seo_start_crawl` starts a crawl that counts against your plan's crawl allowance (its description says Free is 3 crawls a month), and `seo_set_competitors` replaces a project's competitor list.
- Brand Radar tools need Starter or above; AI citation checks and the Google Search Console tools need Pro or above, and Search Console must be connected in SEOBolt. A lower plan gets a plan-required answer.
- You need Gemini CLI, and a browser once for sign-in.

## Install

```bash
gemini extensions install https://github.com/airdropfi/seobolt-gemini-extension
```

Restart Gemini CLI, then sign in:

```text
/mcp auth seobolt
```

A browser window opens: sign in to SEOBolt and click Allow. Sign-in is OAuth 2.1 with PKCE and dynamic client registration, discovered from the server, so there is no key to paste. The Allow step creates an API key named after the client on your SEOBolt account; you can revoke it under Settings, API Keys. Check it with `/mcp` (the `seobolt` server should list its tools) and try `/seobolt:audit`.

Update later with `gemini extensions update seobolt`; remove with `gemini extensions uninstall seobolt`.

### Using an API key instead

If you prefer a key, create one in SEOBolt (Dashboard, Settings, API Keys) and add the server yourself in `~/.gemini/settings.json` with a header; do not put the key in this repository:

```json
{
  "mcpServers": {
    "seobolt": {
      "httpUrl": "https://seobolt.app/mcp",
      "headers": { "Authorization": "Bearer YOUR_API_KEY" }
    }
  }
}
```

### Antigravity

This repository also carries an Antigravity plugin layout (`.antigravity-plugin/plugin.json`, `mcp_config.json`, `rules/AGENTS.md`) for the same server. We have not run it in Antigravity, and Antigravity does not load `commands/`.

## Commands

| Command | What it does |
|---|---|
| `/seobolt:audit [project or domain]` | Health score, issue summary and Core Web Vitals. Read-only. |
| `/seobolt:fix-plan [project or domain]` | Prioritized fix plan with code snippets; edits to your repo only after you approve each diff. |
| `/seobolt:keyword <keyword>` | Keyword difficulty, volume when available, and the top results. Read-only. |
| `/seobolt:vitals <url or project>` | Core Web Vitals from Google PageSpeed Insights. Read-only. |

You can also just describe what you want ("what should I fix first on my site?"); `GEMINI.md` carries the same rules. The 27 server tools also include content gap, link prospects, brand mentions, AI citations and the Search Console tools.

## What it will and will not do

- Tool output is the source of every number; the agent is told not to invent scores, volumes or contacts.
- Suggestions are not changes. Edits to existing pages need your approval, and the agent never deletes pages or edits robots.txt, noindex or canonical tags.
- It never sends email or contact-form messages.
- The checkout tool (`seo_get_checkout_url`) is switched off in this extension (`excludeTools` in `gemini-extension.json`).
- No ranking or traffic result is promised.
- Gemini CLI asks you to confirm MCP tool calls. If you mark the `seobolt` server as trusted in your own settings, that confirmation is skipped; the extension does not set `trust` and we recommend you leave it off.

## Data and privacy

The MCP server receives what the tools need: project ids, URLs, keywords and settings you ask Gemini to send, plus the audit and Search Console data on your SEOBolt account. This repository stores nothing and runs no code on your machine; it is a server address, Markdown instructions and an icon. See the [privacy policy](https://seobolt.app/privacy) and [terms](https://seobolt.app/terms).

## Contents

```text
gemini-extension.json        manifest: name, version, remote MCP server https://seobolt.app/mcp
GEMINI.md                    context: what SEOBolt is and the rules above
commands/seobolt/*.toml      /seobolt:audit, :fix-plan, :keyword, :vitals
.antigravity-plugin/plugin.json  Antigravity plugin manifest
mcp_config.json              Antigravity MCP server definition (same server)
rules/AGENTS.md              Antigravity rule (a copy of GEMINI.md: keep both in sync)
assets/icon.png              icon
scripts/validate.mjs         schema checks, no dependencies: node scripts/validate.mjs
```

## Support

https://seobolt.app/support or support@seobolt.app. Documentation: https://seobolt.app/mcp-seo.

## License

MIT for the files in this repository (see `LICENSE`). The SEOBolt service is governed by its terms.
