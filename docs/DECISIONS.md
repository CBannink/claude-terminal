# Architecture Decisions & Honest Reflections

## Decision 1: Do We Need Auth?

### Analysis

| Operation | Auth needed? | Why |
|-----------|-------------|-----|
| Browse configs on website | NO | Public content, zero friction |
| Search configs | NO | Public operation |
| Install configs via CLI | NO | Like `npm install` — anonymous |
| View config details | NO | Public |
| Publish a config | YES | Need to know who published it |
| Vote on a config | YES | One-vote-per-person requires identity |
| Comment on a config | YES | Accountability, moderation |
| Edit/delete your own configs | YES | Ownership |

### Verdict: Auth is required, but ONLY for write operations.

- **80% of users will never need to log in.** They browse, install, and leave.
- **20% of users publish, vote, or comment.** These need auth.
- Auth must be **dead simple**: GitHub OAuth only. No email/password, no magic links. Every user of Claude Code already has a GitHub account.

### What auth looks like:

**Website:** "Sign in with GitHub" button in the header. Everything works without it. Voting/publishing/commenting prompt you to sign in when you try.

**CLI:** `agenthub login` opens a browser for GitHub OAuth device flow. Token stored in `~/.agenthub/credentials.json`. All read operations work without login.

**Desktop app:** Delegates to CLI auth. Or has its own GitHub OAuth flow via Tauri deep links.

### What we do NOT need:
- No email verification
- No user roles beyond "user" and "moderator"
- No teams/orgs (not in MVP — that's a paid feature for later)
- No API keys (the API is public for reads, GitHub token for writes)

---

## Decision 2: Is Convex Actually the Right Choice?

### The Honest Critique

I initially proposed Convex because you have an account and it's fast to build with. But let me stress-test that choice:

**Arguments FOR Convex:**
- Real-time subscriptions (live vote counts on the website — genuinely cool UX)
- TypeScript end-to-end (Convex functions + Next.js)
- Built-in scheduling (for recalculating Wilson scores)
- Built-in file storage (for small metadata)
- Fast development: schema → functions → frontend in hours, not days
- You already have an account
- Free tier covers launch easily

**Arguments AGAINST Convex:**
- **Proprietary runtime.** Community can't self-host the backend. If someone wants to run a private AgentHub for their company, they can't.
- **Vendor lock-in.** Convex functions use Convex-specific APIs. Migration to Postgres/Supabase would mean rewriting ALL backend logic.
- **The Convex schema syntax is non-standard.** It's not SQL, not Prisma, not anything portable.
- **If Convex shuts down or raises prices aggressively, we're stuck.** (They're VC-funded, this is a real risk for a project meant to last.)
- **No raw SQL access.** Complex queries (like the Wilson score ranking with multiple sort criteria) can be awkward in Convex's query model.

### Counter-argument: Does it actually matter?

**A config registry is inherently centralized.** npm, crates.io, PyPI — none of these are self-hostable by the community. You run the service, people use the service. Whether the backend is Convex or Postgres doesn't change that.

The "someone wants to self-host" argument only matters if we plan to support private registries. That's a Team/Enterprise feature for much later. By then, we could build a separate self-hostable backend.

### Alternatives Considered

| Option | Pros | Cons |
|--------|------|------|
| **Convex** | Real-time, fast dev, TS-native, you have account | Proprietary, vendor lock-in, non-standard |
| **Supabase** | Open source, Postgres, self-hostable, auth built-in, real-time | You don't have an account, slightly more setup |
| **Postgres on Railway** | Full control, standard SQL, you have account | Way more boilerplate, need to build auth/real-time yourself |
| **SQLite + Turso** | Edge DB, open source | Less mature, no built-in auth/real-time |
| **Plain API on Railway + Postgres** | Maximum control | Maximum effort, most code to write |

### VERDICT: Convex is the right choice for MVP.

Here's why:

1. **Speed to launch matters more than portability right now.** If the product doesn't get traction, the tech stack is irrelevant. Convex lets us ship in weeks, not months.

2. **The centralized nature of a registry means self-hosting is a non-goal for v1.** npm isn't self-hostable and nobody cares.

3. **Migration path exists.** If we outgrow Convex or it becomes a problem, the data model is simple (configs, users, votes). Exporting to Postgres is a weekend project. The hard part (the UI, CLI, desktop app) is stack-agnostic.

4. **Real-time is genuinely valuable here.** Watching vote counts update live, seeing new configs appear — this makes the website feel alive. Building real-time with raw Postgres is painful.

5. **You already have the account.** Zero onboarding friction.

### The escape hatch:

Structure the code so Convex is behind an abstraction layer:

```typescript
// packages/shared/src/registry-client.ts
interface RegistryClient {
  searchConfigs(query: string, filters: Filters): Promise<Config[]>
  getConfig(name: string): Promise<Config>
  publishConfig(pkg: Package): Promise<void>
  castVote(configId: string, value: 1 | -1): Promise<void>
  // ...
}

// apps/web/src/lib/convex-registry-client.ts
class ConvexRegistryClient implements RegistryClient { ... }

// Future: apps/web/src/lib/postgres-registry-client.ts
// class PostgresRegistryClient implements RegistryClient { ... }
```

The CLI and desktop app only talk to the `RegistryClient` interface. If we swap Convex for Postgres later, only the implementation changes.

---

## Decision 3: Do We Need Pinecone?

### Honest assessment: Probably not for MVP.

**What Pinecone gives us:**
- Semantic search: "find me a config for building REST APIs" → matches configs about Express, FastAPI, etc. even if they don't contain the exact words "REST APIs"

**What Convex already gives us:**
- Full-text search (built into Convex). Searches over config names, descriptions, tags.
- This covers 90% of search use cases.

**When Pinecone becomes valuable:**
- When you have 500+ configs and users search with natural language
- "I want something like react-pro but for Vue" — similarity search
- "configs for a monorepo with microservices" — conceptual matching

### VERDICT: Drop Pinecone from MVP. Add it in Phase 2 or 3.

Saves complexity, saves one more vendor, and Convex's built-in search is good enough. When we have enough configs that search quality matters, add Pinecone then.

This also removes OpenRouter as a hard dependency at launch — we only need it for the "nice to have" quality scoring, not for core functionality.

---

## Decision 4: Do We Need OpenRouter for MVP?

### Honest assessment: No, but it's cheap and useful.

**Truly needed at launch?** No. Users can write their own descriptions.

**Nice to have at launch?** Yes:
- Auto-generate a quality score (helps with ranking when vote counts are low)
- Auto-generate long descriptions from CLAUDE.md content
- Detect potential issues in configs (contradictions, vagueness)

### VERDICT: Make it optional.

- Config publishing works without OpenRouter
- If an OpenRouter API key is configured, quality scoring and description generation are enabled
- This way the project can run with zero paid dependencies at launch

---

## Decision 5: Licensing

### The Terminal + CLI (open source)
**License: MIT**
- Maximum adoption, maximum contributions
- Companies can use it, modify it, embed it
- No legal friction for anyone
- Standard for developer tools (VS Code, Alacritty, Wezterm all use MIT or Apache-2.0)

### The Website + Backend (source available, you operate it)
**License: AGPL-3.0 or BSL (Business Source License)**

Wait — actually, let's think about this differently.

The website code should ALSO be MIT. Here's why:
- It's a registry. The value is in the network effect (configs + users), not the code.
- Making the website code MIT means anyone can audit it, contribute to it, and trust it.
- If someone forks and runs their own registry, they'll have zero configs. No threat.
- The open-source goodwill far outweighs any competitive risk.

### VERDICT: Everything is MIT licensed.

The entire monorepo — terminal, CLI, website, shared packages — all MIT.
The value is the community and the hosted service, not the source code.

---

## Summary of Final Infrastructure Decisions

| Component | Choice | Status |
|-----------|--------|--------|
| Backend + DB | Convex | Confirmed (with abstraction layer for portability) |
| Frontend | Vercel + Next.js | Confirmed |
| Bulk storage | Cloudflare R2 | Confirmed |
| Vector search | ~~Pinecone~~ | **Deferred to post-MVP** |
| AI features | OpenRouter | **Optional at launch** |
| Auth | GitHub OAuth only | Confirmed (write ops only) |
| License | MIT (everything) | Confirmed |
| Railway | Reserved for future workers | Unchanged |

This means at launch, the hard dependencies are:
1. Convex (backend + DB)
2. Vercel (frontend)
3. Cloudflare R2 (package storage)
4. GitHub OAuth (auth)

That's it. Minimal vendor surface, minimal cost, maximum speed.
