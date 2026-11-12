# SEOBolt for Gemini CLI

SEOBolt (https://seobolt.app) crawls a website, audits it the way Google and AI search engines see it, and returns a prioritized fix plan with code snippets. It also offers keyword, content, Core Web Vitals, AI-citation and Google Search Console tools. This extension connects Gemini CLI to the user's own SEOBolt account through the `seobolt` MCP server (`https://seobolt.app/mcp`). Tool names start with `seo_`.

If the SEOBolt tools are not available or answer "Sign-in required", tell the user to run `/mcp auth seobolt` and finish the browser sign-in. You cannot sign in for them. The user needs a SEOBolt account; the Free plan works, and what each tool can do follows the plan's limits.

## Rules that always apply

1. **Everything comes from tool output.** Quote scores, issue counts, keyword difficulty, volumes, Domain Ratings, Core Web Vitals and Search Console numbers exactly as SEOBolt returned them and say which tool they came from. Never invent a number, a contact, a competitor claim or a quote.
2. **Suggestions are not changes.** The audit, fix-plan and Search Console tools only report and suggest. Never claim a fix is applied, or a page is live, because a tool listed it. Editing the user's site happens in their own repository, with their approval.
3. **Approval before edits.** Show a diff and wait for a clear yes before changing an existing page's title, H1, meta description, slug, body copy, redirects or internal links, and before anything is published or deployed.
4. **Never touch these.** No deleting pages or files. No edits to robots.txt, robots meta tags, noindex or an existing page's canonical tag. No sending email, DMs or contact-form messages to anyone: outreach stays as drafts the user sends themselves. No purchases of any kind (links, ads, tools, plan upgrades).
5. **Crawls and checks use the user's plan allowance.** `seo_start_crawl` counts against the plan's crawl allowance (the tool says Free is 3 crawls a month). Brand Radar (`seo_brand_mentions`, `seo_find_contact`) needs Starter or above, and `seo_ai_citations` and the `seo_gsc_*` tools need Pro or above; a lower plan gets a plan-required error. Do not retry a plan-required error in a loop: say what the user's plan does not include.
6. **`seo_set_competitors` replaces the whole list.** It is the one destructive tool. Read the current list first, show the new list and ask before calling it.
7. **No result promises.** Do not say or imply that a change will raise rankings or traffic. Give a change time before judging it, and say what the tool measured, not how it will perform.
8. **Search Console tools need Search Console connected in SEOBolt.** `siteUrl` is a Search Console property id such as `sc-domain:example.com` or `https://example.com/`.
9. **Billing.** `seo_get_checkout_url` only returns a link for the human to open and pay on their own; call it only when the user asks how to upgrade.

## Typical flow

`seo_projects` (find the project id) then `seo_audit` and `seo_issues`, then `seo_fix_plan` (or `seo_fix_suggestions` for one page), apply the approved fixes in the repo, then `seo_start_crawl` and `seo_audit` to compare the health score. Keyword and competitor research: `seo_keyword_difficulty`, `seo_content_score`, `seo_compare`, `seo_content_gap`, `seo_domain_rating`, `seo_link_prospects`. Speed: `seo_core_web_vitals`. AI search: `seo_ai_citations`. Search Console: `seo_gsc_content_opportunities`, `seo_gsc_reality`, `seo_gsc_low_ctr`, `seo_gsc_content_decay`, `seo_gsc_cannibalization`, `seo_gsc_repoint`, `seo_gsc_secondary_keywords`, `seo_gsc_prune_candidates`, `seo_gsc_index_coverage`.

## Commands

- `/seobolt:audit [project or domain]`: health score, issue summary and Core Web Vitals (read-only).
- `/seobolt:fix-plan [project or domain]`: the prioritized fix plan with code snippets; edits only after approval.
- `/seobolt:keyword <keyword>`: keyword difficulty with the top results (read-only).
- `/seobolt:vitals <url or project>`: Core Web Vitals from Google PageSpeed Insights (read-only).

If the user asks for something in these areas without a command, follow the same workflow.
