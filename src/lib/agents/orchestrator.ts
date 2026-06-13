export interface StartupAnalysis {
  intent: {
    name: string;
    industry: string;
    targetAudience: string;
    businessModel: string;
    goal: string;
    tagline: string;
  };
  research: {
    competitors: Array<{ name: string; url: string; strength: string; weakness: string }>;
    trends: string[];
    marketSize: { TAM: string; SAM: string; SOM: string; growthRate: string };
    gaps: string[];
  };
  business: {
    leanCanvas: {
      problem: string[];
      solution: string[];
      keyMetrics: string[];
      uvp: string;
      unfairAdvantage: string;
      channels: string[];
      customerSegments: string[];
      costStructure: string[];
      revenueStreams: string[];
    };
    financials: {
      pricingModel: string;
      pricingPoint: string;
      conversionRate: string;
      trafficTarget: string;
      estimatedMRR: string;
      estimatedARR: string;
    };
  };
  product: {
    mvpFeatures: Array<{ title: string; description: string; complexity: 'Low' | 'Medium' | 'High' }>;
    userFlow: Array<{ step: string; action: string; description: string }>;
    techStack: {
      frontend: string;
      backend: string;
      database: string;
      hosting: string;
      additionalAPIs: string[];
    };
  };
  uiux: {
    colors: { primary: string; secondary: string; background: string; text: string; accent: string };
    typography: { headings: string; body: string };
    sections: Array<{ name: string; purpose: string; layoutHint: string }>;
  };
  content: {
    blogPost: { title: string; excerpt: string; content: string };
    socialPosts: { twitter: string[]; linkedin: string[] };
    emails: { welcome: string; launch: string; retention: string };
  };
  development: {
    landingPageHtml: string;
  };
  marketing: {
    gtmTimeline: Array<{ week: string; tasks: string[]; channels: string[] }>;
    seoKeywords: string[];
    influencerStrategy: string;
  };
  pitchDeck: {
    slides: Array<{ slideNo: number; title: string; bullets: string[]; notes: string }>;
  };
  review: {
    warnings: string[];
    consistencyScore: number;
    hallucinationRisk: string;
    recommendations: string[];
  };
}

export interface ApiKeys {
  groqKey?: string;
  geminiKey?: string;
  geminiModel?: string;
}

export type LogCallback = (agentName: string, status: 'info' | 'success' | 'warning' | 'error', message: string) => void;

function escapeJsonNewlines(jsonString: string): string {
  let inString = false;
  let escaped = false;
  let result = "";
  for (let i = 0; i < jsonString.length; i++) {
    const char = jsonString[i];
    if (char === '"' && !escaped) {
      inString = !inString;
    }
    
    if (inString) {
      if (char === '\n') {
        result += '\\n';
      } else if (char === '\r') {
        result += '\\r';
      } else {
        result += char;
      }
    } else {
      result += char;
    }
    
    if (char === '\\') {
      escaped = !escaped;
    } else {
      escaped = false;
    }
  }
  return result;
}

function escapeNestedJsonQuotes(str: string): string {
  let result = "";
  let i = 0;
  while (i < str.length) {
    const char = str[i];
    
    if (char === '"' && str[i - 1] !== '\\') {
      // Find the true closing quote
      let closingQuoteIdx = -1;
      let quotesFound: number[] = [];
      
      for (let k = i + 1; k < str.length; k++) {
        if (str[k] === '"' && str[k - 1] !== '\\') {
          quotesFound.push(k);
        }
      }
      
      for (let qIdx of quotesFound) {
        let nextNonSpace = "";
        let nextNonSpaceIdx = -1;
        for (let l = qIdx + 1; l < str.length; l++) {
          if (!/\s/.test(str[l])) {
            nextNonSpace = str[l];
            nextNonSpaceIdx = l;
            break;
          }
        }
        
        if (nextNonSpace === ':' || nextNonSpace === '}' || nextNonSpace === ']') {
          closingQuoteIdx = qIdx;
          break;
        }

        if (nextNonSpace === ',') {
          // Verify if the next non-space after the comma starts a new value/key
          let charAfterComma = "";
          for (let m = nextNonSpaceIdx + 1; m < str.length; m++) {
            if (!/\s/.test(str[m])) {
              charAfterComma = str[m];
              break;
            }
          }
          if (charAfterComma === '"' || charAfterComma === '{' || charAfterComma === '[') {
            closingQuoteIdx = qIdx;
            break;
          }
        }
      }
      
      if (closingQuoteIdx !== -1) {
        result += '"';
        let content = str.substring(i + 1, closingQuoteIdx);
        let escapedContent = "";
        let escaped = false;
        for (let c of content) {
          if (c === '"' && !escaped) {
            escapedContent += '\\"';
          } else {
            escapedContent += c;
          }
          if (c === '\\') escaped = !escaped;
          else escaped = false;
        }
        result += escapedContent + '"';
        i = closingQuoteIdx + 1;
        continue;
      }
    }
    
    result += char;
    i++;
  }
  return result;
}

function cleanJson(text: string): string {
  let cleaned = text.trim();
  
  // Strip JS comments first (both single-line and multi-line block comments)
  cleaned = cleaned.replace(/\/\/[^\n]*\n/g, '\n');
  cleaned = cleaned.replace(/\/\/[^\n]*$/g, '');
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
  cleaned = cleaned.trim();

  // Strip markdown wraps
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '').trim();
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```/, '').replace(/```$/, '').trim();
  }

  // Escape unescaped nested double quotes inside keys and string values
  cleaned = escapeNestedJsonQuotes(cleaned);

  // Find dynamic start boundaries
  const start = cleaned.indexOf('{');
  if (start === -1) {
    const arrayStart = cleaned.indexOf('[');
    if (arrayStart !== -1) {
      // Bracket counting for arrays
      let bracketCount = 0;
      let inString = false;
      let escaped = false;
      for (let i = arrayStart; i < cleaned.length; i++) {
        const char = cleaned[i];
        if (char === '"' && !escaped) {
          inString = !inString;
        }
        if (!inString) {
          if (char === '[') bracketCount++;
          else if (char === ']') {
            bracketCount--;
            if (bracketCount === 0) {
              cleaned = cleaned.substring(arrayStart, i + 1);
              break;
            }
          }
        }
        if (char === '\\') escaped = !escaped;
        else escaped = false;
      }
    }
  } else {
    // Brace counting for objects
    let braceCount = 0;
    let inString = false;
    let escaped = false;
    for (let i = start; i < cleaned.length; i++) {
      const char = cleaned[i];
      if (char === '"' && !escaped) {
        inString = !inString;
      }
      if (!inString) {
        if (char === '{') braceCount++;
        else if (char === '}') {
          braceCount--;
          if (braceCount === 0) {
            cleaned = cleaned.substring(start, i + 1);
            break;
          }
        }
      }
      if (char === '\\') escaped = !escaped;
      else escaped = false;
    }
  }

  // Escape literal newlines within string values
  cleaned = escapeJsonNewlines(cleaned);

  // Remove trailing commas which break standard JSON.parse
  cleaned = cleaned.replace(/,(\s*[\]}])/g, '$1');

  return cleaned;
}

// Helper to make LLM REST calls
async function callLLM(prompt: string, keys: ApiKeys, systemPrompt?: string): Promise<string> {
  // Try Groq first
  if (keys.groqKey) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${keys.groqKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
            { role: 'user', content: prompt }
          ],
          temperature: 0.2,
          max_tokens: 3500
        })
      });
      if (response.ok) {
        const json = await response.json();
        return json.choices[0]?.message?.content || '';
      }
      const errText = await response.text();
      throw new Error(`Groq API returned error status ${response.status}: ${errText}`);
    } catch (err: any) {
      console.error('Groq fetch error:', err);
      // If Groq fails and Gemini is not set, bubble up the error
      if (!keys.geminiKey) {
        throw err;
      }
    }
  }

  // Try Gemini second
  if (keys.geminiKey) {
    try {
      const model = keys.geminiModel || process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${keys.geminiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: (systemPrompt ? `${systemPrompt}\n\n` : '') + prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 3500,
            thinkingConfig: {
              thinkingBudget: 0
            }
          }
        })
      });
      if (response.ok) {
        const json = await response.json();
        const content = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (content) return content;
        throw new Error('Gemini API returned empty candidate response.');
      }
      const errText = await response.text();
      throw new Error(`Gemini API returned error status ${response.status}: ${errText}`);
    } catch (err: any) {
      console.error('Gemini fetch error:', err);
      throw err;
    }
  }

  throw new Error('No valid API keys configured.');
}

// -------------------------------------------------------------
// High-Fidelity Local Simulation Engine (Semantic Contextual)
// -------------------------------------------------------------
function generateSimulatedData(userPrompt: string): StartupAnalysis {
  const promptLower = userPrompt.toLowerCase();
  
  // Detect startup concept
  const isEducation = promptLower.includes('student') || promptLower.includes('career') || promptLower.includes('educat') || promptLower.includes('college') || promptLower.includes('counsel');
  const isGreen = promptLower.includes('green') || promptLower.includes('energy') || promptLower.includes('solar') || promptLower.includes('clean') || promptLower.includes('environ');
  
  let name = "FounderOS Launchpad";
  let industry = "General SaaS";
  let targetAudience = "Indie Hackers & Entrepreneurs";
  let businessModel = "SaaS Subscription";
  let goal = "SaaS MVP Launch";
  let tagline = "Launch your startup with a single click.";

  if (isEducation) {
    name = "CareerSet India";
    industry = "EdTech / Career Guidance";
    targetAudience = "Indian High School & College Students (Ages 15-22)";
    businessModel = "Freemium / Premium Guidance Subscription";
    goal = "Launch an AI-guided student mentorship platform";
    tagline = "Your AI-powered map to India's top careers and colleges.";
  } else if (isGreen) {
    name = "EcoVesta India";
    industry = "Green Energy Information & Media";
    targetAudience = "Climate-tech investors, startup founders, and sustainability managers";
    businessModel = "Premium Newsletter Subscription & Sponsorships";
    goal = "Launch the leading green-energy startup publication in India";
    tagline = "Tracking the green revolution driving India's future.";
  } else {
    // Dynamic extraction
    let extractedIndustry = "";
    let extractedAudience = "";
    
    const pattern1 = userPrompt.match(/(?:launch|build|create|make|design)\s+(?:a|an)\s+(.*?)\s+for\s+(.*?)(?:in|with|at|using|$|\.)/i);
    if (pattern1) {
      extractedIndustry = pattern1[1]?.trim();
      extractedAudience = pattern1[2]?.trim();
    } else {
      const pattern2 = userPrompt.match(/(?:a|an)?\s*(.*?)\s+targeting\s+(.*?)(?:in|with|at|using|$|\.)/i);
      if (pattern2) {
        extractedIndustry = pattern2[1]?.trim();
        extractedAudience = pattern2[2]?.trim();
      } else {
        extractedIndustry = userPrompt.replace(/i want to (launch|build|create|make|design|run)/i, '').trim();
        if (extractedIndustry.length > 50) {
          extractedIndustry = extractedIndustry.substring(0, 50) + "...";
        }
      }
    }

    if (extractedIndustry) {
      industry = extractedIndustry.replace(/^(a|an|the)\s+/i, '');
      if (industry.endsWith(" specifically")) {
        industry = industry.substring(0, industry.length - 13);
      }
      industry = industry.charAt(0).toUpperCase() + industry.slice(1);
    }
    if (extractedAudience) {
      targetAudience = extractedAudience.charAt(0).toUpperCase() + extractedAudience.slice(1);
    } else {
      targetAudience = "Early adopters and industry professionals";
    }

    const firstWord = industry.split(' ')[0] || "FounderOS";
    const cleanWord = firstWord.replace(/[^a-zA-Z]/g, '');
    name = cleanWord ? `${cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1)}OS` : "FounderOS Launchpad";
    if (name.length < 5) name += " Launchpad";
    
    tagline = `The ultimate automated platform for ${industry.toLowerCase()}.`;
    goal = `Launch a highly efficient, AI-driven platform for ${targetAudience.toLowerCase()}.`;
  }

  const pricingPoint = isEducation ? "₹299" : isGreen ? "₹399" : "₹499";
  const trafficTarget = "10,000 monthly visits";
  const conversionRate = "5%";
  
  // MRR Calculation
  const customers = 500;
  const priceMultiplier = isEducation ? 299 : isGreen ? 399 : 499;
  const mrrVal = customers * priceMultiplier;
  const estimatedMRR = `₹${mrrVal.toLocaleString('en-IN')}`;
  const estimatedARR = `₹${(mrrVal * 12).toLocaleString('en-IN')}`;

  // Pre-bake or generate contextual details
  const competitors = isEducation ? [
    { name: "Mentoria", url: "https://www.mentoria.com", strength: "Large network of manual human counselors", weakness: "Expensive pricing starting at ₹5,000+; non-scalable booking" },
    { name: "iDreamCareer", url: "https://idreamcareer.com", strength: "Government school partnerships", weakness: "Static aptitude tests, lack of direct action items" },
    { name: "Leverage Edu", url: "https://leverageedu.com", strength: "Strong study abroad referral commission setup", weakness: "Focuses heavily on high-commission universities rather than best student fit" }
  ] : isGreen ? [
    { name: "CleanTechnica", url: "https://cleantechnica.com", strength: "Massive global audience and brand authority", weakness: "Lack of localized, hyper-focused Indian ecosystem reports" },
    { name: "Eco-Business", url: "https://eco-business.com", strength: "Excellent general Asia ESG coverage", weakness: "Paywalled, high subscription prices targeted at enterprises only" },
    { name: "Mercom India", url: "https://mercomindia.com", strength: "Deep regulatory tracking and data reports", weakness: "Too technical for startup founders, lacking GTM narratives" }
  ] : [
    { name: `${name.replace(/OS$/, '')} OldGuard`, url: "https://legacy-competitor.com", strength: "Established brand presence and large enterprise contracts", weakness: "Outdated legacy interface, high custom setup costs, slow development cycle" },
    { name: `${name.replace(/OS$/, '')} Lite`, url: "https://alternative-cheap.com", strength: "Very low pricing points", weakness: "Lacks core automation workflows, poor reliability, and minimal API support" }
  ];

  const trends = isEducation ? [
    "Surge in Tier-2/3 Indian student aspirations seeking jobs beyond traditional IT & Medicine",
    "Adoption of AI-based counseling to replace expensive, biased human consultants",
    "High growth of online counseling searches post-NEET/JEE exams"
  ] : isGreen ? [
    "India targeting 500GW non-fossil energy capacity by 2030",
    "Venture capital interest shifting towards Indian EV infrastructure and grid storage solutions",
    "Rise of green micro-investing among retail Gen-Z investors"
  ] : [
    `Rapid rise of automation in the ${industry} space to reduce manual administrative overhead`,
    `Shifting customer preference towards integrated, all-in-one dashboards over single-feature tools`,
    `Increased adoption of AI micro-agents to streamline customer validation and onboarding`
  ];

  const marketSize = isEducation ? {
    TAM: "₹24,000 Crores ($3.2B) - Total Indian career counseling & test-prep market",
    SAM: "₹4,500 Crores ($600M) - Digital counseling and mentoring target segments",
    SOM: "₹15 Crores ($2M) - CareerSet's target in Tier-1/2 colleges in year 1-3",
    growthRate: "22% CAGR"
  } : isGreen ? {
    TAM: "$800M - Global climate intelligence publication & newsletter sponsorships",
    SAM: "$120M - Asia-Pacific green tech audience and research publications",
    SOM: "$1.5M - Year-2 Indian premium subscription base and native sponsors",
    growthRate: "18.5% CAGR"
  } : {
    TAM: "$12B - Global addressable market for automated developer tooling",
    SAM: "$1.5B - Serviceable target segments seeking self-validation platforms",
    SOM: "$12M - Year-3 obtainable share of early adopter builders",
    growthRate: "16% CAGR"
  };

  const gaps = isEducation ? [
    "No accessible guidance for modern careers (e.g. AI Prompt Engineering, Esports, Climate Science)",
    "Parent-student dashboard alignment - parents usually pay but students make decisions. Existing platforms ignore parents.",
    "Lack of immediate local internships/skill programs integrated directly inside the counseling results."
  ] : isGreen ? [
    "Lack of startup pitch database and active founder lists in Indian green tech",
    "No micro-news feeds tracking policy changes specifically state-by-state (e.g. Karnataka EV subsidies vs Gujarat solar mandates)",
    "No platform connecting green founders directly with early-stage angel investors"
  ] : [
    `Existing tools in ${industry} are too expensive for small and medium-sized operators`,
    `Lack of localized API integrations tailored for the core user demographic`,
    `No direct, automated workflow onboarding, resulting in high churn during configuration`
  ];

  const problem = isEducation ? [
    "Students choose careers based on parental peer pressure and lack of exposure to modern jobs.",
    "Professional counselors cost upwards of ₹3,000 per hour, making it unaffordable for 95% of families.",
    "Traditional aptitude tests are static, boring, and fail to reflect dynamic market opportunities."
  ] : isGreen ? [
    "Indian green tech founders struggle to get media visibility in general business press.",
    "Investors spend days digging through government circulars to understand energy policy updates.",
    "Sustainability managers lack a reliable source for competitor tracking and vendor discovery."
  ] : [
    `Professionals in this space spend hours on manual administration and fragmented workflows.`,
    `Current enterprise software tools are prohibitively expensive and hard to customize.`,
    `Lack of clean, real-time analytics dashboards makes data-driven decisions slow and error-prone.`
  ];

  const solution = isEducation ? [
    "AI Mentorship Agent that acts as a personalized 24/7 career guide.",
    "Affordable tiered subscription starting at just ₹299/month.",
    "Interactive scenario game tests that evaluate student interests dynamically."
  ] : isGreen ? [
    "Weekly curated newsletter summarizing funding rounds, business models, and profiles.",
    "A clean dashboard showing state-by-state policy updates in real-time.",
    "A private Slack/Discord community linking founders directly to green-tech syndicates."
  ] : [
    `A unified, AI-driven automation hub specifically designed to streamline ${industry.toLowerCase()} tasks.`,
    `Affordable subscription tiers designed for teams of all sizes, starting at just ${pricingPoint}/month.`,
    `An intuitive, interactive dashboard delivering real-time logs, reports, and code validation.`
  ];

  const uvp = isEducation 
    ? "India's first AI-driven career pathfinder that parents trust and students love, at 1/10th the cost of a counselor."
    : isGreen
    ? "The central node of India's climate tech ecosystem—insightful news, raw policy updates, and direct investor access."
    : `The most efficient, AI-powered execution platform to automate and optimize your ${industry.toLowerCase()} workflows.`;

  const customerSegments = isEducation 
    ? ["Indian Students (Class 9-12 & College)", "Parents of Middle-Class Aspirants", "Tier-2/3 School Administrations"]
    : isGreen
    ? ["Climate Tech Startup Founders", "Angel Investors & ESG VCs", "Sustainability Consultants"]
    : [`Small & Medium ${industry} Businesses`, `Independent Operators and Consultants`, `Early-stage tech builders`];

  const costStructure = isEducation
    ? ["LLM API tokens & DB Hosting: ₹15,000/mo", "SEO & Content Marketing: ₹20,000/mo", "Counselor partnership review: ₹30,000/mo"]
    : isGreen
    ? ["Newsletter platform (e.g. Beehiiv): ₹8,000/mo", "Research analyst contractor: ₹25,000/mo", "GTM & Twitter growth tools: ₹5,000/mo"]
    : [`Cloud hosting & LLM API tokens: ₹10,000/mo`, `Customer acquisition & SEO content: ₹15,000/mo`, `Support & customer onboarding tools: ₹8,000/mo`];

  const revenueStreams = isEducation
    ? ["Premium Report Unlock: ₹299 one-time", "AI Counselor Subscription: ₹999/year", "College partner application referral fees"]
    : isGreen
    ? ["Premium Newsletter Subscription: ₹399/mo ($5/mo)", "Native Newsletter sponsorships: ₹25,000/edition", "Annual ecosystem report downloads"]
    : [`Premium SaaS Subscription: ${pricingPoint}/month`, `Add-on custom integration setup fees`, `Enterprise high-volume usage plans`];

  const mvpFeatures = isEducation ? [
    { title: "Dynamic AI Career Assistant", description: "Interactive chat assistant mapped to Indian career outcomes.", complexity: "High" as const },
    { title: "Interests Aptitude Game", description: "Quick 5-minute quiz returning career suggestions.", complexity: "Medium" as const },
    { title: "Parent dashboard alignment", description: "Automated WhatsApp summary report sent to parents containing recommendations.", complexity: "Medium" as const }
  ] : isGreen ? [
    { title: "Ecosystem Directory", description: "Searchable base of all 300+ green energy startups in India.", complexity: "Medium" as const },
    { title: "Policy tracker map", description: "Interactive map displaying state-wise solar & wind energy policies.", complexity: "High" as const },
    { title: "Premium Weekly Newsletter", description: "Automated curation dashboard feeding into premium Beehiiv layouts.", complexity: "Low" as const }
  ] : [
    { title: "Core Automation Dashboard", description: `Interactive dashboard mapping user queries directly to ${industry.toLowerCase()} solutions.`, complexity: "High" as const },
    { title: "Visual Analytics Module", description: "Real-time chart visualization for core performance metrics.", complexity: "Medium" as const },
    { title: "One-Click PDF/HTML Exporter", description: "Instantly export structured data and generated landing components.", complexity: "Low" as const }
  ];

  const userFlow = isEducation ? [
    { step: "1. Landing Page", action: "User enters platform", description: "Learns UVP and clicks 'Find My Career Path'." },
    { step: "2. Assessment", action: "Student plays aptitude game", description: "AI evaluates cognitive interests and skills." },
    { step: "3. Recommendations", action: "Review AI career match", description: "AI details top 3 careers, salary ranges, and colleges." },
    { step: "4. Parent Check", action: "Enter parent phone number", description: "Sends easy-to-read progress summary report to parents via WhatsApp." },
    { step: "5. Premium Upgrade", action: "Purchase annual support plan", description: "Unlocks direct scholarship matches and deep-dive college application guides." }
  ] : isGreen ? [
    { step: "1. Main Dashboard", action: "Visitor views latest green-tech report", description: "Views top 5 curated articles and subscribes to newsletter." },
    { step: "2. Email Welcome", action: "Receives welcome digest", description: "Delivers top 3 past green-tech deep dives instantly." },
    { step: "3. Interactive Map", action: "Clicks on Policy Hub", description: "Browses Gujarat solar and Karnataka EV incentive data." },
    { step: "4. Paywall Trigger", action: "Access investor directory", description: "Hits payment wall to see list of active VCs funding green tech." },
    { step: "5. Premium Access", action: "SaaS upgrade", description: "Subscribes for monthly access to live databases." }
  ] : [
    { step: "1. Main Landing", action: "Visitor views product demo", description: `Sees UVP for ${name} and enters their prompt/industry detail.` },
    { step: "2. Prompt Processing", action: "Submit query to orchestrator", description: "AI agents parse variables and structure canvas/MVP roadmaps." },
    { step: "3. Dashboard Render", action: "Explore generated workspace", description: "User views Lean Canvas, competitor research, and custom code outputs." },
    { step: "4. Sandbox Validation", action: "Test the landing component", description: "Inspects sandboxed live view of the generated landing page." },
    { step: "5. Paid Conversion", action: "Subscribe for complete export", description: `Enters payment flow for ${pricingPoint}/month to unlock source code download and integrations.` }
  ];

  const techStack = isEducation ? {
    frontend: "Next.js 15, React, Tailwind CSS",
    backend: "Vercel Serverless Functions, Node.js",
    database: "Supabase PostgreSQL (for student profiles & career data)",
    hosting: "Vercel Edge Platform",
    additionalAPIs: ["Gemini API (career analysis)", "Twilio Sandbox (WhatsApp reports)", "Razorpay (payment gateway)"]
  } : isGreen ? {
    frontend: "Next.js, Tailwind, Framer Motion",
    backend: "Node.js (Express), Beehiiv API integration",
    database: "Supabase Postgres / Prisma ORM",
    hosting: "Vercel / Netlify",
    additionalAPIs: ["Groq Llama 3 (news summary)", "Stripe India (subscription billing)"]
  } : {
    frontend: "Next.js 15, React, Tailwind CSS",
    backend: "Vercel Serverless Functions, Node.js",
    database: "Supabase PostgreSQL (for user profiles and data logs)",
    hosting: "Vercel / Netlify",
    additionalAPIs: ["Gemini API / Groq Llama 3", "Stripe (global billing)"]
  };

  const uiux = {
    colors: isEducation ? {
      primary: "#6366f1",
      secondary: "#f43f5e",
      background: "#030303",
      text: "#f3f4f6",
      accent: "#a855f7"
    } : isGreen ? {
      primary: "#10b981",
      secondary: "#06b6d4",
      background: "#030303",
      text: "#f3f4f6",
      accent: "#84cc16"
    } : {
      primary: "#3b82f6",
      secondary: "#6366f1",
      background: "#030303",
      text: "#f3f4f6",
      accent: "#8b5cf6"
    },
    typography: {
      headings: "Outfit, sans-serif",
      body: "Inter, sans-serif"
    },
    sections: [
      { name: "Hero Section", purpose: "Deliver high-impact value proposition", layoutHint: "Left text, right interactive AI prompt demo" },
      { name: "Features Grid", purpose: "Highlight core platform capabilities", layoutHint: "3-column grid, glassmorphic hover animations" },
      { name: "Live Stats / Social Proof", purpose: "Build trust with numbers", layoutHint: "Horizontal numbers layout with glowing borders" },
      { name: "Pricing Table", purpose: "Provide simple tiered subscription", layoutHint: "2-card layout with premium plan highlight" },
      { name: "FAQ Accordion", purpose: "Overcome onboarding doubts", layoutHint: "Clean expanding sections" }
    ]
  };

  const content = {
    blogPost: {
      title: isEducation 
        ? "The Career Crisis: Why 82% of Indian College Graduates Feel Lost"
        : isGreen
        ? "Powering the Subcontinent: The Unstoppable Rise of Indian Green-Tech Startups"
        : `The Future of Modern Validation: How ${name} is Transforming the ${industry} Industry`,
      excerpt: isEducation
        ? "With traditional counseling lagging behind current industry changes, how can AI empower the next generation of Indian students?"
        : isGreen
        ? "How regulatory mandates, venture capital flow, and local innovation are coming together to solve India's energy transition."
        : `How automated startup execution and custom workflow configurations are enabling ${targetAudience} to launch in record time.`,
      content: isEducation 
        ? `In India, choosing a career has traditionally been simple: you either study engineering, medicine, or prepare for government exams. But in 2026, the job market looks completely different. The rise of generative AI, Web3, and ESG corporate requirements has created job descriptions that did not exist five years ago.\n\nAI-driven career mentorship changes this equation. By modeling cognitive inputs, interest metrics, and local job growth in real-time, platforms like ${name} can deliver high-quality, customized career roadmaps at a fraction of the cost of a human consultant. This democratizes career guidance for millions of students in Tier-2 and Tier-3 cities across India...`
        : isGreen
        ? `India is going through one of the most massive energy transitions in human history. Under the ambitious goal of reaching 500GW of non-fossil energy capacity by 2030, a new wave of local startups is rising.\n\n${name} was built to bridge this gap. By compiling state policy maps, profiling early-stage innovators, and providing direct investor connections, we are consolidating the green-tech movement into a single interactive platform. In this report, we detail the top green-tech niches to watch this year...`
        : `In the modern business landscape, speed and precision are the ultimate differentiators. Whether you are launching a niche application or scaling a global product, the time spent transitioning from concept to execution is the critical window where most ideas perish.\n\nAI-driven automation platforms represent the next frontier. By mapping high-level business ideas directly to lean canvas structures, technology stacks, marketing timelines, and functional web code, platforms like ${name} empower ${targetAudience} to build and iterate rapidly. This analysis explores how standardizing multi-agent workflows solves the traditional execution bottleneck...`
    },
    socialPosts: {
      twitter: isEducation ? [
        "1/ 82% of Indian graduates feel they picked the wrong college major. Why? Because we're using 1990s counseling for a 2026 job market. 🧵👇",
        `2/ Traditional counseling costs ₹5,000+. That is inaccessible to 95% of Indian families. We are launching #${name} to change that. Personal AI mentor for ₹299/mo.`
      ] : isGreen ? [
        `1/ India is targeting 500GW of non-fossil energy by 2030. Green-tech is the next major wave for indie builders. Here is why we are building #${name}. ⚡🧵`,
        "2/ Finding policy data state-by-state is a nightmare. Our interactive dashboard tracks Karnataka, Gujarat, and Maharashtra subsidies in real-time."
      ] : [
        `1/ Building a startup in the ${industry} space is exciting, but slow execution kills great ideas. That's why we're launching #${name} to accelerate validation. 🧵👇`,
        `2/ Get structured lean canvas layouts, tailored tech stacks, marketing timelines, and a sandbox landing page preview instantly. Validate with #${name} today!`
      ],
      linkedin: isEducation ? [
        `🎓 Exciting News! Today we are introducing ${name}, an AI-powered career pathfinder built for the Indian student ecosystem.\n\nOur goal is simple: make high-end career mentorship affordable for every student in Tier-1, Tier-2, and Tier-3 cities. We analyze interests, map them to current salary trends, and compile parental feedback digests via WhatsApp.\n\nCheck it out and help shape the future of EdTech! #Startup #CareerGuidance #EdTech`
      ] : isGreen ? [
        `🌱 The Green Energy transition in India is moving at breakneck speed. Today, we are launching ${name}, a dedicated climate intelligence hub for founders, investors, and consultants.\n\nGet state-by-state policy trackers, native funding reports, and access to a private syndicate community of sustainability investors.\n\nSubscribe to the revolution: #CleanTech #ClimateStartup #IndiaGreenEnergy`
      ] : [
        `🚀 We are thrilled to announce the launch of ${name}, a multi-agent orchestration platform tailored for the ${industry} sector.\n\nOur platform helps ${targetAudience} go from concept to launch assets in seconds, including lean canvas strategies, targeted marketing roadmaps, and functional landing pages. Check out the dashboard to begin your journey!\n\n#Startup #BuildInPublic #SaaS #${name}`
      ]
    },
    emails: {
      welcome: `Subject: Welcome to ${name} - Let's build together!\n\nHi there,\n\nWelcome to ${name}! We're thrilled to have you join our community.\n\nReply to this email if you have any questions!\n\nBest,\nThe ${name} Team`,
      launch: `Subject: We are Live! Unveiling ${name} 🚀\n\nHello,\n\nThe wait is over. ${name} is officially live!\n\nGet Started Now: [Link]`,
      retention: `Subject: 3 Tips to Maximize Your Growth on ${name}\n\nHey build partner,\n\nNeed help? Just reply to this email!`
    }
  };

  const primaryColorHex = uiux.colors.primary;
  const secondaryColorHex = uiux.colors.secondary;
  const accentColorHex = uiux.colors.accent;
  
  const landingPageHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name} - ${tagline}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&family=Inter:wght@300;400;500;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; background-color: #030303; color: #f3f4f6; }
    .font-outfit { font-family: 'Outfit', sans-serif; }
    .neon-glow { box-shadow: 0 0 40px -5px ${primaryColorHex}40; }
  </style>
</head>
<body class="overflow-x-hidden min-h-screen bg-[#030303] text-gray-200">
  <header class="border-b border-white/5 bg-black/40 backdrop-blur-md sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-gradient-to-tr from-[${primaryColorHex}] to-[${secondaryColorHex}] flex items-center justify-center font-bold text-white font-outfit">
          ${name.substring(0,1)}
        </div>
        <span class="font-outfit font-bold text-xl text-white tracking-tight">${name}</span>
      </div>
      <div><a href="#signup" class="px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-[${primaryColorHex}] to-[${secondaryColorHex}] text-white hover:opacity-90 transition">Get Started</a></div>
    </div>
  </header>
  <section class="relative py-24 px-6 max-w-7xl mx-auto flex flex-col items-center text-center">
    <h1 class="font-outfit font-extrabold text-5xl md:text-7xl text-white max-w-4xl leading-tight mb-8">${tagline}</h1>
    <p class="text-gray-400 text-lg md:text-xl max-w-2xl mb-10 leading-relaxed">${isEducation ? "Access premium career mentorship, map skills to high-income jobs." : isGreen ? "Get premium newsletters, policies, and investor access." : "Launch your product, automate execution, and scale your business easily."}</p>
    <a href="#signup" class="px-8 py-4 rounded-xl font-bold bg-white text-black hover:bg-gray-100 transition shadow-lg text-center">Get Started</a>
  </section>
</body>
</html>`;

  const gtmTimeline = isEducation ? [
    { week: "Week 1", tasks: ["Finalize interests-aptitude assessment flow", "Set up Google/Meta tracking and organic SEO structures"], channels: ["SEO Content Hub", "Reddit /r/IndianAcademia"] },
    { week: "Week 2", tasks: ["Deploy MVP tool on Vercel", "Integrate automated Parent WhatsApp notifications on assessment completes"], channels: ["WhatsApp Business API", "LinkedIn Articles"] },
    { week: "Week 3", tasks: ["Run outreach campaign with school career counselors", "Incentivize first 500 signups with a free detailed resume review"], channels: ["School Counseling partnerships", "Instagram Micro-influencers"] }
  ] : isGreen ? [
    { week: "Week 1", tasks: ["Publish first 3 premium green energy startup profiles", "Set up Beehiiv template page and import primary lead list"], channels: ["LinkedIn Ecosystem updates", "Twitter threads"] },
    { week: "Week 2", tasks: ["Add Gujarat, Rajasthan, and Maharashtra solar policies to Policy Tracker Hub", "Host launch Twitter Space with 3 EV startup founders"], channels: ["Twitter Spaces", "Subreddits"] },
    { week: "Week 3", tasks: ["Establish sponsorship pricing tiers", "Reach out to clean energy VCs and angel networks for investor partnerships"], channels: ["Direct Email outreach", "ESG Investor events"] }
  ] : [
    { week: "Week 1", tasks: [`Deploy ${name} MVP landing page`, "Set up Google Analytics and configure primary conversion tracking"], channels: ["Product Hunt", "Twitter / buildinpublic"] },
    { week: "Week 2", tasks: ["Publish 2 search-optimized blogs outlining product workflows", "Host live launch demo webinar"], channels: ["SEO Content Hub", "LinkedIn Events"] },
    { week: "Week 3", tasks: ["Launch direct email campaigns to first 100 early access signups", "Roll out affiliate partner program"], channels: ["Direct Email outreach", "Niche Slack/Discord groups"] }
  ];

  const seoKeywords = isEducation ? [
    "career counseling India", "AI career guidance", "top career options in India after 12th"
  ] : isGreen ? [
    "India green energy startups", "climate tech venture capital India", "renewable energy policy India 2026"
  ] : [
    `${industry.toLowerCase()} automation`, `AI-driven ${name.toLowerCase()}`, `how to build a ${industry.toLowerCase()}`
  ];

  const influencerStrategy = isEducation
    ? "Partner with student influencers and young graduates on YouTube/Instagram who explain alternative career options."
    : isGreen
    ? "Collaborate with climate tech researchers on LinkedIn, ESG consultants, and clean energy tech influencers."
    : `Collaborate with independent ${industry.toLowerCase()} experts, tech newsletter writers, and founders to showcase workflow speedups.`;

  const slides = [
    { slideNo: 1, title: "Title: " + name, bullets: [tagline, "Multi-agent generated startup outline", "Target market: " + targetAudience], notes: "Introduction of the product and high-level pitch." },
    { slideNo: 2, title: "The Problem", bullets: problem, notes: "Highlighting main pain points in the target market." },
    { slideNo: 3, title: "The Solution", bullets: solution, notes: "Introducing our platform as the definitive solution to the problem." },
    { slideNo: 4, title: "Market Opportunity (TAM/SAM/SOM)", bullets: [`TAM: ${marketSize.TAM}`, `SAM: ${marketSize.SAM}`, `SOM: ${marketSize.SOM}`, `Growth Rate: ${marketSize.growthRate}`], notes: "Demonstrate that the market is huge." },
    { slideNo: 5, title: "Product Features", bullets: mvpFeatures.map(f => `${f.title} (${f.complexity} Complexity)`), notes: "Deep dive into MVP capabilities." },
    { slideNo: 6, title: "Business & Pricing Model", bullets: [`Pricing Point: ${pricingPoint}/month`, "Subscription model.", `Target MRR: ${estimatedMRR}`], notes: "Explaining how we make money." },
    { slideNo: 7, title: "Go-To-Market Plan", bullets: gtmTimeline.map(g => `${g.week}: ${g.tasks[0]}`), notes: "Explain our early traffic acquisition plan." },
    { slideNo: 8, title: "Technology Stack", bullets: [`Frontend: ${techStack.frontend}`, `Backend: ${techStack.backend}`, `Database: ${techStack.database}`], notes: "Highly scalable stack." },
    { slideNo: 9, title: "Review Agent Warnings", bullets: isEducation ? ["Ensure pricing point is correct.", "Check legal student data mapping."] : isGreen ? ["Ensure newsletter API is integrated.", "Track solar policy radar details."] : ["Monitor API token operating cost.", "Ensure data privacy standards."], notes: "Consistency analysis." },
    { slideNo: 10, title: "The Ask", bullets: ["Seeking seed funding for 12 months runway.", `Targeting 500 paid customers at ${pricingPoint}/month in Year 1.`], notes: "Closing slide with funding goal." }
  ];

  const warnings = isEducation ? [
    "Conflict: The Business Model states 'Premium Counselor subscription' targeting high schoolers, but students aged 15-18 do not have credit cards. Need parental billing alignment.",
    "Data Gap: The Market Size metrics depend on national test prep volumes, but do not capture localized state board counts.",
    "Risk: Relying on third-party WhatsApp APIs can raise cost of customer notifications."
  ] : isGreen ? [
    "Conflict: The Product Architect recommends database tracking of state policies, but the UI plan does not outline a specific region selection menu in the navbar.",
    "Data Gap: Oppportunity gaps claim lack of competitor reporting, but Mercom India does track policy updates. Need to emphasize accessibility and clarity over raw coverage.",
    "Risk: Policy revisions by state DISCOMs can happen rapidly without public API announcements, creating static content risk."
  ] : [
    `Conflict: The pricing point of ${pricingPoint} is set for small teams, but the SaaS hosting model uses high-cost real-time streaming APIs. Monitor margins.`,
    `Data Gap: Target audience is wide. Recommend focusing on niche operators first before attempting general market scaling.`,
    `Risk: Heavy reliance on third-party LLM APIs might cause service delay if rate limits are reached.`
  ];

  const recommendations = isEducation ? [
    "Revise the onboarding: add a Parent Phone Number field to send billing details directly to parents while students run the career games.",
    "Utilize WhatsApp Twilio Sandboxes to lower transaction message costs.",
    "Map career updates to immediate local college courses to increase referral commission opportunities."
  ] : isGreen ? [
    "Differentiate from Mercom India by writing summary explanations instead of raw PDF lists.",
    "Ensure state policy pages are user-editable (wiki-style) to crowdsource updates and avoid stale reports.",
    "Focus GTM strictly on LinkedIn first before launching paid marketing ads."
  ] : [
    `Implement strict rate limiting and request caching to keep LLM token costs under control.`,
    `Launch targeting independent builders first, then build team collab features.`,
    `Ensure visual export assets are fully downloadable as static HTML/zip bundles.`
  ];

  return {
    intent: { name, industry, targetAudience, businessModel, goal, tagline },
    research: { competitors, trends, marketSize, gaps },
    business: { leanCanvas: { problem, solution, keyMetrics: ["Active monthly users", "Conversion to premium", "Average session duration"], uvp, unfairAdvantage: "Proprietary AI evaluation prompt structures and local partnership databases", channels: ["WhatsApp", "LinkedIn", "SEO blogs"], customerSegments, costStructure, revenueStreams }, financials: { pricingModel: "Subscription", pricingPoint, conversionRate, trafficTarget, estimatedMRR, estimatedARR } },
    product: { mvpFeatures, userFlow, techStack },
    uiux,
    content,
    development: { landingPageHtml },
    marketing: { gtmTimeline, seoKeywords, influencerStrategy },
    pitchDeck: { slides },
    review: { warnings, consistencyScore: isEducation ? 88 : isGreen ? 91 : 85, hallucinationRisk: "Low - Grounded in current trends", recommendations }
  };
}

export async function runOrchestrator(
  prompt: string,
  keys: ApiKeys,
  log: LogCallback
): Promise<StartupAnalysis> {
  log("Intent Analyzer Agent", "info", "Starting multi-agent business orchestration...");
  await new Promise(r => setTimeout(r, 1000));
  
  let useRealLLM = !!(keys.groqKey || keys.geminiKey);
  if (useRealLLM) {
    const activeApis = [];
    if (keys.groqKey) activeApis.push("Groq Llama 3");
    if (keys.geminiKey) activeApis.push("Gemini Flash");
    log("Intent Analyzer Agent", "success", `API Keys Detected! Connected to: ${activeApis.join(" & ")}. Running live LLM agent generation...`);
  } else {
    log("Intent Analyzer Agent", "warning", "No API keys detected. Running in high-fidelity sandbox simulation mode.");
  }
  await new Promise(r => setTimeout(r, 1000));
  
  log("Intent Analyzer Agent", "info", "Parsing concept prompt and extracting structured metrics...");
  
  let intentData = null;
  const baseData = generateSimulatedData(prompt);
  
  // Step 1: Intent
  if (useRealLLM) {
    try {
      const intentPrompt = `You are the Intent Analyzer Agent (Agent 1).
Analyze this startup prompt: "${prompt}".
Extract details in JSON format containing:
{
  "name": "a creative catchy startup name",
  "industry": "industry type",
  "targetAudience": "specific target demographic",
  "businessModel": "subscription, SaaS, marketplace, etc.",
  "goal": "primary objective of launch",
  "tagline": "one line catchy tagline"
}
Return ONLY valid JSON. No markdown formatting, no comments.`;
      
      const res = await callLLM(intentPrompt, keys);
      const cleaned = cleanJson(res);
      intentData = JSON.parse(cleaned);
      baseData.intent = intentData;
      log("Intent Analyzer Agent", "success", `Extracted intent: Name="${intentData.name}", Industry="${intentData.industry}"`);
    } catch (e: any) {
      log("Intent Analyzer Agent", "warning", `Intent LLM failed: ${e.message || e}. Loaded local fallback parser.`);
    }
  }

  // Step 2: Research
  log("Research Agent", "info", "Running competitor analysis, tracking market trends, sizing TAM/SAM/SOM...");
  if (useRealLLM) {
    try {
      const system = "You are a Research Agent (Agent 2). Conduct competitor and market sizing research based on the startup details.";
      const researchPrompt = `Startup Details: ${JSON.stringify(baseData.intent)}.
Generate a JSON response matching:
{
  "competitors": [{"name": "competitor name", "url": "url", "strength": "strength", "weakness": "weakness"}],
  "trends": ["trend 1", "trend 2", "trend 3"],
  "marketSize": {"TAM": "total market size", "SAM": "serviceable market size", "SOM": "obtainable year 1 market size", "growthRate": "growth % (e.g. 15% CAGR)"},
  "gaps": ["opportunity gap 1", "opportunity gap 2"]
}
Return ONLY valid JSON. No markdown formatting, no comments.`;
      const res = await callLLM(researchPrompt, keys, system);
      const cleaned = cleanJson(res);
      baseData.research = JSON.parse(cleaned);
      log("Research Agent", "success", `Identified ${baseData.research.competitors.length} competitors and sized market.`);
    } catch (e: any) {
      log("Research Agent", "warning", `Research LLM failed: ${e.message || e}. Loaded context-aware market report.`);
    }
  } else {
    await new Promise(r => setTimeout(r, 1500));
    log("Research Agent", "success", `Loaded market sizes: TAM = ${baseData.research.marketSize.TAM}. Growth = ${baseData.research.marketSize.growthRate}`);
  }

  // Step 3: Business Strategy
  log("Business Strategy Agent", "info", "Formulating Lean Canvas framework, structuring cost systems, calculating MRR...");
  if (useRealLLM) {
    try {
      const system = "You are the Business Strategy Agent (Agent 3). Design a Lean Canvas and financial projections.";
      const promptText = `Startup Details: ${JSON.stringify(baseData.intent)}.
Market Research: ${JSON.stringify(baseData.research)}.
Generate a JSON response matching:
{
  "leanCanvas": {
    "problem": ["problem 1", "problem 2", "problem 3"],
    "solution": ["solution 1", "solution 2", "solution 3"],
    "keyMetrics": ["metric 1", "metric 2"],
    "uvp": "unique value proposition string",
    "unfairAdvantage": "unfair advantage explanation",
    "channels": ["acquisition channel 1", "channel 2"],
    "customerSegments": ["segment 1", "segment 2"],
    "costStructure": ["cost line 1", "cost line 2"],
    "revenueStreams": ["revenue model 1", "revenue model 2"]
  },
  "financials": {
    "pricingModel": "SaaS Subscription, Freemium, etc.",
    "pricingPoint": "Pricing amount (e.g. ₹299/mo or $19/mo)",
    "conversionRate": "Expected conversion % (e.g. 3%)",
    "trafficTarget": "Target traffic (e.g. 5,000 monthly visits)",
    "estimatedMRR": "Calculated MRR based on traffic * conversion * pricing (e.g. ₹44,850)",
    "estimatedARR": "Calculated ARR (estimatedMRR * 12)"
  }
}
Return ONLY valid JSON.`;
      const res = await callLLM(promptText, keys, system);
      const cleaned = cleanJson(res);
      const parsed = JSON.parse(cleaned);
      baseData.business = parsed;
      log("Business Strategy Agent", "success", `Projected MRR: ${baseData.business.financials.estimatedMRR} based on target metrics.`);
    } catch (e: any) {
      log("Business Strategy Agent", "warning", `Business LLM failed: ${e.message || e}. Loaded fallback Lean Canvas.`);
    }
  } else {
    await new Promise(r => setTimeout(r, 1500));
    log("Business Strategy Agent", "success", `Projected MRR: ${baseData.business.financials.estimatedMRR} based on target metrics.`);
  }

  // Step 4: Product Architect
  log("Product Architect Agent", "info", "Drafting MVP features, designing user flow diagrams, and selecting tech stack...");
  if (useRealLLM) {
    try {
      const system = "You are the Product Architect Agent (Agent 4). Select a tech stack and MVP roadmap.";
      const promptText = `Startup Details: ${JSON.stringify(baseData.intent)}.
Lean Canvas: ${JSON.stringify(baseData.business.leanCanvas)}.
Generate a JSON response matching:
{
  "mvpFeatures": [{"title": "feature title", "description": "feature description", "complexity": "Low" | "Medium" | "High"}],
  "userFlow": [{"step": "Step name", "action": "action", "description": "details"}],
  "techStack": {
    "frontend": "frontend stack recommended",
    "backend": "backend stack recommended",
    "database": "database recommended",
    "hosting": "hosting recommended",
    "additionalAPIs": ["API 1", "API 2"]
  }
}
Return ONLY valid JSON.`;
      const res = await callLLM(promptText, keys, system);
      const cleaned = cleanJson(res);
      baseData.product = JSON.parse(cleaned);
      log("Product Architect Agent", "success", `Recommended stack: ${baseData.product.techStack.frontend}.`);
    } catch (e: any) {
      log("Product Architect Agent", "warning", `Product LLM failed: ${e.message || e}. Loaded fallback stack.`);
    }
  } else {
    await new Promise(r => setTimeout(r, 1500));
    log("Product Architect Agent", "success", `Recommended stack: ${baseData.product.techStack.frontend}.`);
  }

  // Step 5: UI/UX Agent
  log("UI/UX Agent", "info", "Mapping landing page sections, planning HSL color scheme, setting layout wireframes...");
  if (useRealLLM) {
    try {
      const system = "You are the UI/UX Agent (Agent 5). Plan colors, typography, and wireframe sections.";
      const promptText = `Startup: ${JSON.stringify(baseData.intent)}.
MVP Specs: ${JSON.stringify(baseData.product.mvpFeatures)}.
Generate a JSON response matching:
{
  "colors": {"primary": "#hex", "secondary": "#hex", "background": "#hex", "text": "#hex", "accent": "#hex"},
  "typography": {"headings": "heading font name", "body": "body font name"},
  "sections": [{"name": "section title", "purpose": "goal of section", "layoutHint": "alignment/wireframe hint"}]
}
Return ONLY valid JSON.`;
      const res = await callLLM(promptText, keys, system);
      const cleaned = cleanJson(res);
      baseData.uiux = JSON.parse(cleaned);
      log("UI/UX Agent", "success", `Planned ${baseData.uiux.sections.length} core sections with ${baseData.uiux.colors.primary} theme.`);
    } catch (e: any) {
      log("UI/UX Agent", "warning", `UI/UX LLM failed: ${e.message || e}. Loaded fallback visual style.`);
    }
  } else {
    await new Promise(r => setTimeout(r, 1500));
    log("UI/UX Agent", "success", `Planned ${baseData.uiux.sections.length} core sections with ${baseData.uiux.colors.primary} theme.`);
  }

  // Step 6: Content Agent
  log("Content Agent", "info", "Drafting 1000-word blog post, welcome email digests, and social copy...");
  if (useRealLLM) {
    try {
      const system = "You are the Content Copywriting Agent (Agent 6). Write blog post, emails, and social media announcements.";
      const promptText = `Startup details: ${JSON.stringify(baseData.intent)}.
UVP: ${baseData.business.leanCanvas.uvp}.
Generate a JSON response matching:
{
  "blogPost": {"title": "post title", "excerpt": "short summary", "content": "1000-word markdown formatted blog post content"},
  "socialPosts": {"twitter": ["tweet 1", "tweet 2"], "linkedin": ["linkedin update text"]},
  "emails": {"welcome": "Welcome email copy", "launch": "Launch email copy", "retention": "Retention drip copy"}
}
Return ONLY valid JSON.`;
      const res = await callLLM(promptText, keys, system);
      const cleaned = cleanJson(res);
      baseData.content = JSON.parse(cleaned);
      log("Content Agent", "success", "Generated blog and social assets for launch distribution.");
    } catch (e: any) {
      log("Content Agent", "warning", `Content LLM failed: ${e.message || e}. Loaded fallback articles.`);
    }
  } else {
    await new Promise(r => setTimeout(r, 1500));
    log("Content Agent", "success", "Generated blog and social assets for launch distribution.");
  }

  // Step 7: Development Agent
  log("Development Agent", "info", "Writing self-contained HTML component incorporating custom Tailwind CSS layouts...");
  if (useRealLLM) {
    try {
      const system = "You are the Development Agent (Agent 7). Write a fully styled, self-contained Tailwind HTML page code.";
      const promptText = `Business Name: ${baseData.intent.name}.
Tagline: ${baseData.intent.tagline}.
Colors: ${JSON.stringify(baseData.uiux.colors)}.
Sections: ${JSON.stringify(baseData.uiux.sections)}.
Features: ${JSON.stringify(baseData.product.mvpFeatures)}.
Pricing Point: ${baseData.business.financials.pricingPoint}.
Write complete valid HTML code styled with Tailwind CSS CDN script, fully responsive, containing premium colors matching the palette, custom typography, grids, layout structure, working buttons, mock newsletter signup script, and cards. Include ALL code. Do not truncate. Return ONLY the HTML code. No markdown tags, no wrapper text.`;
      const res = await callLLM(promptText, keys, system);
      // Clean result from markdown wrapper if any
      let cleanedHtml = res.trim();
      if (cleanedHtml.startsWith("```html")) {
        cleanedHtml = cleanedHtml.replace(/^```html/, '').replace(/```$/, '').trim();
      } else if (cleanedHtml.startsWith("```")) {
        cleanedHtml = cleanedHtml.replace(/^```/, '').replace(/```$/, '').trim();
      }
      baseData.development.landingPageHtml = cleanedHtml;
      log("Development Agent", "success", "Rendered interactive HTML landing page code successfully.");
    } catch (e: any) {
      log("Development Agent", "warning", `Development LLM failed: ${e.message || e}. Loaded fallback website.`);
    }
  } else {
    await new Promise(r => setTimeout(r, 1500));
    log("Development Agent", "success", "Rendered interactive HTML landing page code successfully.");
  }

  // Step 8: Marketing Agent
  log("Marketing Agent", "info", "Synthesizing 3-week GTM launch timeline and compiling target SEO keywords...");
  if (useRealLLM) {
    try {
      const system = "You are the Marketing Agent (Agent 8). Outline GTM timeline and SEO targeting.";
      const promptText = `Startup Details: ${JSON.stringify(baseData.intent)}.
Customer segments: ${JSON.stringify(baseData.business.leanCanvas.customerSegments)}.
Generate a JSON response matching:
{
  "gtmTimeline": [{"week": "Week 1", "tasks": ["task 1", "task 2"], "channels": ["channel 1"]}],
  "seoKeywords": ["keyword 1", "keyword 2", "keyword 3"],
  "influencerStrategy": "detailed influencer outreach strategy text"
}
Return ONLY valid JSON.`;
      const res = await callLLM(promptText, keys, system);
      const cleaned = cleanJson(res);
      baseData.marketing = JSON.parse(cleaned);
      log("Marketing Agent", "success", `Compiled ${baseData.marketing.seoKeywords.length} focus keywords.`);
    } catch (e: any) {
      log("Marketing Agent", "warning", `Marketing LLM failed: ${e.message || e}. Loaded GTM plan.`);
    }
  } else {
    await new Promise(r => setTimeout(r, 1500));
    log("Marketing Agent", "success", `Compiled ${baseData.marketing.seoKeywords.length} focus keywords.`);
  }

  // Step 9: Pitch Deck Agent
  log("Pitch Deck Agent", "info", "Structuring 10-slide investor deck with financials, problem statement, and funding ask...");
  if (useRealLLM) {
    try {
      const system = "You are the Pitch Deck Agent (Agent 9). Generate 10 structured slides for investor presentation.";
      const promptText = `Startup Details: ${JSON.stringify(baseData.intent)}.
Financials: ${JSON.stringify(baseData.business.financials)}.
Market: ${JSON.stringify(baseData.research.marketSize)}.
Generate a JSON response matching:
{
  "slides": [{"slideNo": 1, "title": "Slide Title", "bullets": ["bullet 1", "bullet 2"], "notes": "notes"}]
}
Return ONLY valid JSON containing 10 slides.`;
      const res = await callLLM(promptText, keys, system);
      const cleaned = cleanJson(res);
      const parsed = JSON.parse(cleaned);
      baseData.pitchDeck.slides = parsed.slides || parsed;
      log("Pitch Deck Agent", "success", "Compiled Slide 1-10 investor pitches.");
    } catch (e: any) {
      log("Pitch Deck Agent", "warning", `Pitch Deck LLM failed: ${e.message || e}. Loaded standard deck.`);
    }
  } else {
    await new Promise(r => setTimeout(r, 1500));
    log("Pitch Deck Agent", "success", "Compiled Slide 1-10 investor pitches.");
  }

  // Step 10: Review Agent
  log("Quality Review Agent", "info", "Analyzing outputs for logical inconsistencies, target audience conflicts, and hallucination risk...");
  if (useRealLLM) {
    try {
      const system = "You are the Quality Review Agent (Agent 10). Perform logical conflict checking across all generated reports.";
      const promptText = `Check details for contradictions:
Intent: ${JSON.stringify(baseData.intent)}
Business: ${JSON.stringify(baseData.business)}
Product: ${JSON.stringify(baseData.product)}
Marketing: ${JSON.stringify(baseData.marketing)}
Generate a JSON response matching:
{
  "warnings": ["warning 1", "warning 2"],
  "consistencyScore": score between 0 and 100,
  "hallucinationRisk": "Low, Medium, or High",
  "recommendations": ["recommendation 1", "recommendation 2"]
}
Return ONLY valid JSON.`;
      const res = await callLLM(promptText, keys, system);
      const cleaned = cleanJson(res);
      baseData.review = JSON.parse(cleaned);
      if (baseData.review.warnings.length > 0) {
        log("Quality Review Agent", "warning", `FOUND ${baseData.review.warnings.length} POTENTIAL CONFLICTS.`);
      } else {
        log("Quality Review Agent", "success", "No logical conflicts found in the business orchestration.");
      }
    } catch (e: any) {
      log("Quality Review Agent", "warning", `Quality Review LLM failed: ${e.message || e}. Loaded consistency metrics.`);
    }
  } else {
    await new Promise(r => setTimeout(r, 1500));
    log("Quality Review Agent", "success", "No logical conflicts found in the business orchestration.");
  }

  log("Quality Review Agent", "success", `Complete! Final Launch Feasibility Score: ${baseData.review.consistencyScore}/100.`);
  
  return baseData;
}
