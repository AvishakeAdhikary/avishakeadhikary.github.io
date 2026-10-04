@AGENTS.md

## Claude Code specifics

- MCP servers are configured in `.mcp.json`:
  - **shadcn**: search/view/add registry components (`npx shadcn@latest add <item>`).
    After adding, check the generated import uses `@/lib/utils` and restyle variants to the
    design tokens. Don't add Aceternity/Magic UI-style animated components; build the
    effect in CSS per the performance rules.
  - **playwright**: verify UI changes in a real browser. Build, serve `out/` (`npm start`),
    then snapshot/screenshot pages and read console errors.
- Verify loop for any UI change: `npm run lint && npm run typecheck && npm run build`,
  then a Playwright pass at mobile and desktop widths.
- Content facts come from the owner's CV, LinkedIn and Google Scholar. Ask before
  adding a claim you can't trace to one of those.
