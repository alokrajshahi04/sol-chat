export const currentUser = {
  name: 'DevUser',
  plan: 'Pro Plan',
  avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBuvsMuLKu8mcJaNVHMzUYabcuPUCqzUtvlFr8tYTdClaTIXg8zsRrd2j-NWf-iVKUqda4RljsBYU-WDV1V7wjpQDhUI-Eo0t8hImPG3PJH8Gf5SUr4qpsHFQWby4rryYr5VFm5gwwfToTBvOBhgDDov7fBP4SZ_Yr4yWHWEWoPu00JWlWcKTgKr8cEAZ-V-9Lnq2mmhjHZfOt88njLHPYal-4NJfPtefyPylYfl3EjTjrRDC2gseHqbeiS4cDnCtigCszFPtQO24Kv',
}

export const chats = [
  { id: 'c1', title: 'Transformer Architecture', date: 'Today', active: true },
  { id: 'c2', title: 'React Component Props', date: 'Today', active: false },
  { id: 'c3', title: 'Python Data Analysis', date: 'Yesterday', active: false },
  { id: 'c4', title: 'Debugging SQL Query', date: 'Yesterday', active: false },
]

export const messages = [
  {
    id: 'm1',
    role: 'user',
    name: 'You',
    avatar: currentUser.avatar,
    text: "Can you explain how the Transformer architecture uses self-attention mechanisms? I'm trying to understand the Q, K, V matrices.",
    time: '10:23 AM',
  },
  {
    id: 'm2',
    role: 'assistant',
    name: 'GPT-4',
    text: 'Certainly. The core idea behind Self-Attention in Transformers is to allow the model to weigh the importance of different words... Think of it as a retrieval system. For every token, we generate three vectors: Query, Key, Value.',
    time: '10:24 AM',
    code: 'import numpy as np\n\ndef scaled_dot_product_attention(Q, K, V):\n    d_k = Q.shape[-1]\n    scores = np.matmul(Q, K.T) / np.sqrt(d_k)\n    weights = softmax(scores)\n    return np.matmul(weights, V)',
  },
  {
    id: 'm3',
    role: 'user',
    name: 'You',
    avatar: currentUser.avatar,
    text: 'Does the softmax ensure the weights sum to 1?',
    time: '10:25 AM',
  },
  {
    id: 'm4',
    role: 'assistant',
    name: 'GPT-4',
    text: 'Yes. Softmax normalizes the score vector so all entries are non-negative and sum to 1.',
    time: '10:25 AM',
    typing: true,
  },
]

export const models = [
  { id: 'gpt-4', label: 'GPT-4', status: 'online', context: '128k' },
  { id: 'gpt-4o-mini', label: 'GPT-4o mini', status: 'online', context: '128k' },
  { id: 'claude-35', label: 'Claude 3.5', status: 'online', context: '200k' },
  { id: 'llama-3-70b', label: 'Llama 3 70B', status: 'offline', context: '128k' },
]

export const agents = [
  {
    id: 'brand-researcher',
    name: 'Brand Researcher',
    provider: 'Specialized Agent',
    description: 'Conducts comprehensive brand analysis, competitor research, and market positioning insights. Perfect for marketing teams and brand strategists.',
    systemPrompt: `You are an expert brand researcher and market analyst. Your role is to:
- Analyze brand positioning and competitive landscape
- Identify market opportunities and threats
- Provide data-driven insights on consumer behavior
- Suggest actionable branding strategies
- Research competitor activities and industry trends

Always provide detailed, actionable insights with supporting data when possible. Structure your responses with clear sections and bullet points.`,
    pricing: { 
      type: 'unlock', // One-time unlock
      amount: 5, 
      currency: 'USDC',
      includes: '10 messages included'
    },
    messagesIncluded: 10, // Messages included with unlock
    status: 'online',
    tags: ['Marketing', 'Research', 'Strategy'],
    unlocked: false,
  },
  {
    id: 'api-designer',
    name: 'API Designer',
    provider: 'Specialized Agent',
    description: 'Designs RESTful and GraphQL APIs with best practices, generates OpenAPI specs, and provides architecture recommendations.',
    systemPrompt: `You are a senior API architect and designer. Your expertise includes:
- RESTful and GraphQL API design best practices
- OpenAPI/Swagger specification generation
- API security patterns (OAuth, JWT, API keys)
- Rate limiting and versioning strategies
- Microservices architecture patterns

Provide complete, production-ready API designs with proper documentation, error handling, and security considerations.`,
    pricing: { 
      type: 'session', // Per-session pricing
      amount: 8, 
      currency: 'USDC',
      includes: '20 messages per session'
    },
    messagesIncluded: 20,
    status: 'online',
    tags: ['Development', 'API', 'Architecture'],
    unlocked: false,
  },
  {
    id: 'content-creator',
    name: 'Content Creator',
    provider: 'Specialized Agent',
    description: 'Generates blog posts, social media content, ad copy, and SEO-optimized articles. Includes tone customization and style guides.',
    systemPrompt: `You are a professional content writer and copywriter. You excel at:
- Creating engaging blog posts and articles
- Writing compelling social media content
- Crafting persuasive ad copy and CTAs
- SEO optimization and keyword integration
- Adapting tone and style to brand voice

Always ask about target audience, tone preferences, and content goals. Provide multiple variations when appropriate.`,
    pricing: { 
      type: 'task', // Per-task pricing (5 messages per task)
      amount: 2, 
      currency: 'USDC',
      includes: '5 messages per task'
    },
    messagesIncluded: 5,
    status: 'online',
    tags: ['Content', 'Writing', 'SEO'],
    unlocked: false,
  },
  {
    id: 'code-reviewer',
    name: 'Code Reviewer',
    provider: 'Specialized Agent',
    description: 'Reviews code for bugs, security issues, performance bottlenecks, and provides actionable refactoring suggestions.',
    systemPrompt: `You are an expert code reviewer with deep knowledge of:
- Code quality and best practices across multiple languages
- Security vulnerabilities (OWASP Top 10, etc.)
- Performance optimization techniques
- Design patterns and anti-patterns
- Test coverage and maintainability

Provide structured code reviews with severity levels (Critical, Major, Minor). Include specific line references and improvement suggestions with code examples.`,
    pricing: { 
      type: 'unlock',
      amount: 6, 
      currency: 'USDC',
      includes: '15 messages included'
    },
    messagesIncluded: 15,
    status: 'online',
    tags: ['Development', 'Quality', 'Security'],
    unlocked: false,
  },
  {
    id: 'data-analyst',
    name: 'Data Analyst',
    provider: 'Specialized Agent',
    description: 'Analyzes datasets, generates insights, creates visualizations, and provides statistical recommendations.',
    systemPrompt: `You are a data scientist and analyst specializing in:
- Exploratory data analysis (EDA)
- Statistical analysis and hypothesis testing
- Data visualization recommendations
- Predictive modeling guidance
- SQL query optimization
- Python/R code for data analysis

Provide clear explanations of statistical concepts. Include code snippets for analysis and visualization when relevant.`,
    pricing: { 
      type: 'session',
      amount: 7, 
      currency: 'USDC',
      includes: '15 messages per session'
    },
    messagesIncluded: 15,
    status: 'online',
    tags: ['Analytics', 'Data Science', 'Insights'],
    unlocked: false,
  },
  {
    id: 'legal-assistant',
    name: 'Legal Assistant',
    provider: 'Specialized Agent',
    description: 'Drafts contracts, reviews legal documents, and provides compliance guidance. Not a substitute for professional legal advice.',
    systemPrompt: `You are a legal research assistant with expertise in:
- Contract drafting and review
- Legal compliance and regulations
- Intellectual property basics
- Privacy laws (GDPR, CCPA, etc.)
- Terms of Service and Privacy Policy templates

IMPORTANT: Always include disclaimer that you provide general information only and users should consult qualified attorneys for legal advice. Be thorough and precise with legal terminology.`,
    pricing: { 
      type: 'unlock',
      amount: 10, 
      currency: 'USDC',
      includes: '10 messages included'
    },
    messagesIncluded: 10,
    status: 'online',
    tags: ['Legal', 'Compliance', 'Contracts'],
    unlocked: false,
  },
]

export const paymentModes = [
  { id: 'pay-per-request', label: 'Pay per request', price: 0.01, currency: 'USDC' },
  { id: 'credits', label: 'Use credits', price: null },
]

export const creditBundles = [
  { id: 'bundle-10', credits: 10, price: 10, currency: 'USDC', popular: false },
  { id: 'bundle-50', credits: 50, price: 45, currency: 'USDC', popular: true, savings: '10%' },
  { id: 'bundle-100', credits: 100, price: 80, currency: 'USDC', popular: false, savings: '20%' },
]
