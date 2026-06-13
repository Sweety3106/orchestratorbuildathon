# FounderOS AI: Multi-Agent Startup Launchpad

FounderOS AI is a high-fidelity startup launch orchestrator. Entering a single startup idea coordinates **10 specialized AI agents** to automatically generate market sizing, competitors, Lean Canvas, financial projections, MVP features, product flows, copywriting copies, marketing roadmaps, pitch decks, and an interactive, functional landing website template.

It also features a real-time **AI Boardroom Advisory roundtable** where custom virtual personas (CEO, Investor, Marketing, and Tech) debate the viability and feasibility of your business concept.

---

## 🌟 Core Features

### 1. 10-Agent Collaborative Engine
Each step of your business structure is handled by a specialized micro-agent:
- **Agent 1: Intent Analyzer** - Extracts structural industries, target audiences, and goals.
- **Agent 2: Research Agent** - Computes market sizing (TAM/SAM/SOM), identifies core trends, and parses competitors.
- **Agent 3: Business Strategy Agent** - Formulates a complete Lean Canvas and calculates pricing points, MRR, and ARR.
- **Agent 4: Product Architect Agent** - Outlines MVP feature complexity, maps step-by-step user pipelines, and recommends tech stacks.
- **Agent 5: UI/UX Agent** - Wireframes landing page sections and tailors primary/secondary HSL colors.
- **Agent 6: Content Copywriter Agent** - Drafts welcome drip campaigns, social media posts (Twitter/LinkedIn), and a 1,000-word blog post.
- **Agent 7: Development Agent** - Renders a fully responsive, self-contained landing page styled with Tailwind CSS.
- **Agent 8: Marketing Agent** - Structures a detailed 3-week Go-To-Market roadmap and focus keywords.
- **Agent 9: Pitch Deck Agent** - Structures 10 pitch slides complete with detailed investor speaker notes.
- **Agent 10: Quality Review Agent** - Performs logical consistency checks, checks pricing constraints, and flags potential business gaps.

### 2. Live Interactive Sandbox
Inspect and preview the generated Tailwind HTML landing page instantly inside a secure, responsive sandboxed `iframe` directly on your dashboard. You can also view the raw code, ready to copy and export.

### 3. Virtual Boardroom roundtable
Ask the boardroom custom questions (e.g., *"Is ₹299 a good price point?"* or *"Should I launch this in Tier-2 Indian cities?"*). personified CEO, Investor, Marketing, and Tech agents will debate the pros and cons to recalculate your Launch Score.

### 4. Configurable Models & Rate-Limit Bypasses
- **Flexible Models**: Choose from **Gemini 3.1 Flash-Lite**, **Gemini 3.5 Flash**, **Gemini 2.0 Flash**, or **Groq Llama 3** directly in the UI.
- **Zero-Setup Simulation**: Runs a context-aware semantic simulation if no API keys are supplied. Ideal for quick evaluations.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router, React 19, TypeScript)
- **Styling**: Tailwind CSS & Vanilla CSS (includes custom responsive HSL glassmorphism, animated gradients, and custom magnetic cursor)
- **Animations**: Framer Motion & Confetti particle triggers
- **APIs**: Server-Sent Streaming API endpoints (NDJSON)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm or yarn

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/Sweety3106/orchestratorbuildathon.git
   cd orchestratorbuildathon
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables (Optional - keys can also be saved dynamically in the UI Settings):
   Create a `.env` file in the root directory:
   ```env
   GROQ_API_KEY=your_groq_api_key_here
   GEMINI_API_KEY=your_gemini_api_key_here
   GEMINI_MODEL=gemini-3.1-flash-lite
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🌐 Deployment on Vercel

Since the project is built using Next.js with App Router and serverless API routes, it is optimized to run out-of-the-box on Vercel:

1. Push your repository to GitHub, GitLab, or Bitbucket.
2. Import your repository into the [Vercel Dashboard](https://vercel.com/new).
3. (Optional) Configure environment variables (`GROQ_API_KEY` and `GEMINI_API_KEY`) under **Environment Variables**.
4. Click **Deploy**. Vercel will automatically configure settings, run the production build, and assign a live production URL!
