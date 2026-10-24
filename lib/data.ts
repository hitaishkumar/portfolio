export const profile = {
  name: "Hitaish Kumar",
  handle: "DavytheDev",
  role: "Senior Software Engineer",
  tagline: "Backend & Distributed Systems Engineer",
  summary:
    "I design and operate high-throughput, event-driven distributed systems in Go. At KFINTECH — one of India's largest regulated fintech infrastructure providers — I've built platforms handling 600M+ communications and 10M+ users end-to-end, from design docs through live-site operations. Working in finance has made correctness, auditability, and zero-data-loss defaults second nature — exactly the discipline regulated environments demand.",
  location: "Bhubaneswar, Odisha, India",
  email: "hitaishkumar7587@gmail.com",
  phone: "+91 98610 82561",
  linkedin: "https://www.linkedin.com/in/davythedev",
  github: "https://github.com/hitaishkumar",
  resumeUrl: "/Hitaish_Kumar_Resume.pdf",
};

export const highlights = [
  { value: "600M+", label: "Communications orchestrated" },
  { value: "10M+", label: "Users served" },
  { value: "99.9%", label: "Uptime sustained" },
  { value: "13M/hr", label: "Documents generated" },
];

export const skills: { category: string; items: string[] }[] = [
  {
    category: "Languages",
    items: ["Go", "Python", "TypeScript", "Node.js", "C#", "SQL"],
  },
  {
    category: "Distributed Systems",
    items: [
      "Event-Driven Architecture",
      "Microservices",
      "Message Queues",
      "Concurrent Workers",
      "Async Processing",
      "Rate Limiting",
      "Backpressure",
      "Idempotency",
      "Retry & Failure Handling",
      "DLQ",
    ],
  },
  {
    category: "Cloud",
    items: [
      "AWS ECS",
      "Fargate",
      "EC2 Auto-Scaling",
      "S3",
      "SQS",
      "ALB",
      "CloudWatch",
      "CDK",
      "Azure",
    ],
  },
  {
    category: "Backend",
    items: [
      "Go (Gin / Echo)",
      "REST APIs",
      "Background Workers",
      "Durable Job Queues",
      "API Design",
      "OpenAPI",
    ],
  },
  {
    category: "Databases",
    items: [
      "PostgreSQL",
      "ClickHouse",
      "Redis",
      "MySQL",
      "MongoDB",
      "Indexing",
      "Partitioning",
      "Query Optimization",
    ],
  },
  {
    category: "Messaging & Infra",
    items: ["RabbitMQ", "Kafka", "Docker", "Kubernetes"],
  },
  {
    category: "Reliability & Observability",
    items: [
      "OpenTelemetry",
      "Prometheus",
      "Grafana",
      "CloudWatch",
      "pprof Profiling",
      "Structured Logging",
      "Load Testing",
    ],
  },
  {
    category: "Security",
    items: [
      "AES-256-GCM Encryption",
      "Cedar Authorization",
      "Multi-Tenant Isolation",
      "Data Compliance",
    ],
  },
];

/**
 * AI tooling & orchestration fluency — how AI is woven into the engineering
 * workflow, framed as capabilities rather than a tool dump.
 */
export type AiGroup = {
  title: string;
  blurb: string;
  items: string[];
};

export const aiWorkflow: {
  intro: string;
  groups: AiGroup[];
} = {
  intro:
    "AI is a force-multiplier in how I ship, not a novelty. I treat agents like junior engineers I delegate to and review — scaffolding services, writing tests, spelunking unfamiliar codebases, and drafting design docs — while I stay accountable for architecture, correctness, and the parts that actually require judgment. The leverage comes from orchestration: wiring tools, context, and verification loops so the AI does the toil and I do the thinking.",
  groups: [
    {
      title: "Agentic Coding",
      blurb:
        "Day-to-day pair-programming with autonomous and in-editor agents, driving them with tight specs and fast feedback loops rather than one-shot prompts.",
      items: [
        "Claude Code",
        "Cursor",
        "GitHub Copilot",
        "Windsurf",
        "Aider",
        "Codex CLI",
      ],
    },
    {
      title: "Models & Reasoning",
      blurb:
        "Model-agnostic by default — I route tasks to the right model: long-context reasoning for design, fast models for edits, local models for private code.",
      items: [
        "Claude (Opus / Sonnet)",
        "GPT-4o / o-series",
        "Gemini 1.5 Pro",
        "Llama 3 (local)",
        "Ollama",
      ],
    },
    {
      title: "Orchestration & Context",
      blurb:
        "Building the plumbing that makes agents useful on real codebases: tool access, retrieval, and structured context via the Model Context Protocol.",
      items: [
        "MCP (Model Context Protocol)",
        "LangGraph",
        "RAG Pipelines",
        "Vector Search",
        "Function / Tool Calling",
        "Structured Outputs",
      ],
    },
    {
      title: "Delivery & Guardrails",
      blurb:
        "Keeping AI-assisted output honest — evals, review gates, and CI so generated code is held to the same bar as anything I write by hand.",
      items: [
        "AI Code Review",
        "Prompt / Context Engineering",
        "Eval Harnesses",
        "Token / Cost Budgeting",
        "Human-in-the-Loop Review",
      ],
    },
  ],
};

export type Experience = {
  title: string;
  company: string;
  location: string;
  period: string;
  projects: {
    name: string;
    scale?: string;
    caseStudy?: string;
    points: string[];
  }[];
};

export const experiences: Experience[] = [
  {
    title: "Senior Software Engineer (R&D)",
    company: "KFINTECH",
    location: "Bhubaneswar, Odisha",
    period: "Aug 2024 — Present",
    projects: [
      {
        name: "Multi-Tenant Notification Orchestration Platform",
        scale: "600M+ communications · 10M+ users",
        caseStudy: "/case-study/nx",
        points: [
          "Designed, built, and operated a multi-service, event-driven distributed platform in Go (Publisher API, Distributor, Consumer, Webhook, Campaign Manager, Flusher), owning features end-to-end from design docs through deployment and live-site operations.",
          "Architected a high-throughput consumer engine using goroutine-per-message concurrency with semaphore-bounded workers (1000 in-flight) and QoS prefetch matching, improving latency and throughput while preventing memory exhaustion.",
          "Designed an async distribution pipeline on RabbitMQ using per-campaign vhost isolation, token-bucket rate limiting, and self-terminating on-demand compute, eliminating noisy-neighbor contention and idle cost.",
          "Built a durable, exactly-once campaign job queue on PostgreSQL (River) that atomically transitions state and enqueues work in a single transaction, with task-slot admission control and automatic snooze/retry.",
          "Engineered a fault-tolerant delivery lifecycle — publisher confirms, per-campaign DLQs, per-goroutine panic recovery with alerting, auto-reconnect self-healing, and lease-based quota with graceful shutdown.",
          "Implemented AES-256-GCM request/response encryption middleware and Cedar-based per-resource authorization across all APIs, enforcing multi-tenant isolation and data compliance.",
          "Designed schema-per-workspace multi-tenancy on PostgreSQL and per-workspace ClickHouse analytics; optimized indexes, ORDER BY keys, and partitioning to cut dashboard latency by 40%.",
          "Root-caused ClickHouse merge behavior under benchmark load (~1.09M rows / ~48GB per batch); diagnosed single-thread merge blockage and tuned merge pool, part limits, and memory ratios to prevent OOM.",
          "Drove modern engineering practices — OpenTelemetry tracing, Prometheus/Grafana metrics, and pprof profiling — with auto-generated per-service monitoring via a CI pre-commit pipeline, sustaining 99.9% uptime.",
        ],
      },
    ],
  },
  {
    title: "Software Engineer (Golang)",
    company: "KFINTECH",
    location: "Bhubaneswar, Odisha",
    period: "Jun 2023 — Aug 2024",
    projects: [
      {
        name: "Investment Analytics Platform",
        scale: "10M+ investors",
        points: [
          "Designed and implemented high-throughput Go APIs serving 100K+ concurrent users on cloud container infrastructure for large-scale financial workloads.",
          "Owned SQL data modeling, indexing, and partitioning strategies for large datasets, improving query performance for operational and investor-facing workloads.",
          "Designed concurrent Go worker pools for background reconciliation and document-processing jobs with robust error handling and retry mechanisms.",
        ],
      },
      {
        name: "Statement of Account Generation Platform",
        scale: "13M documents/hour",
        points: [
          "Re-architected document-generation pipelines with Go concurrency, worker pools, and object storage, increasing throughput by 10x to ~13M documents/hour.",
          "Isolated document generation from downstream storage/delivery via async processing flows, with retry and failure handling for high-volume resilience.",
          "Performed large-scale load testing with JMeter to identify throughput, concurrency, and resource bottlenecks.",
        ],
      },
    ],
  },
];

export type ProjectShot = {
  src: string;
  caption: string;
};

export type Project = {
  name: string;
  subtitle: string;
  points: string[];
  tags: string[];
  caseStudy?: string;
  /** public repo URL (adds a GitHub link on the card) */
  repo?: string;
  /** screenshots rendered as a thumbnail strip + lightbox */
  screenshots?: ProjectShot[];
};

export const projects: Project[] = [
  {
    name: "NX — Notification Orchestration Platform",
    subtitle: "Multi-tenant distributed systems platform · KFINTECH",
    caseStudy: "/case-study/nx",
    points: [
      "Designed and operated a multi-service, event-driven platform in Go (Publisher, Distributor, Consumer, Webhook, Campaign Manager, Flusher) executing omni-channel campaigns at 600M+ communications across 10M+ users.",
      "Built a 1000-in-flight semaphore-bounded consumer engine, per-campaign RabbitMQ vhost isolation, token-bucket rate limiting to vendor max throughput, and an append-only ClickHouse staging model (ReplacingMergeTree) for wait-time resolution.",
      "Root-caused a single-merge-thread ClickHouse bottleneck and a quota-exhaustion shutdown cascade; tuned merges and reordered graceful shutdown for exactly-once, zero-loss behavior.",
    ],
    tags: ["Go", "RabbitMQ", "ClickHouse", "PostgreSQL", "Redis", "AWS ECS", "OpenTelemetry"],
  },
  {
    name: "Distributed Search & Log Analytics Platform",
    subtitle: "Independent Distributed Systems Project",
    points: [
      "Built a distributed search platform on OpenSearch, Go, Kafka, and object storage with concurrent ingestion workers supporting batching, backpressure, retries, and dead-letter handling.",
      "Designed index mappings, shard/replica strategies, and hot/warm lifecycle policies balancing search latency, indexing throughput, storage, and cost.",
      "Added Prometheus/OpenTelemetry instrumentation and load-tested ingestion/search; designed recovery for worker crashes, duplicate events, and downstream unavailability.",
    ],
    tags: ["OpenSearch", "Go", "Kafka", "Prometheus", "OpenTelemetry"],
  },
  {
    name: "KiteRunner CLI",
    subtitle: "Open-source terminal trading app · Kite Connect API",
    repo: "https://github.com/hitaishkumar/KiteRunner",
    points: [
      "Built a terminal-based trading interface in Go on the Kite Connect API — place/modify/cancel orders, live market data (LTP, OHLC, market depth), and full order history & trade book, all from an interactive tview TUI.",
      "Streamed real-time market data over WebSockets and used concurrent fetchers across independent data sources to cut latency, with secure login and session handling.",
      "Exposed portfolio, positions, holdings, funds, and fast instrument search; Apache-2.0 licensed and open to contributions.",
    ],
    tags: ["Go", "tview", "Kite Connect API", "WebSockets", "Concurrency", "CLI"],
    screenshots: [
      { src: "/projects/kiterunner/login.png", caption: "Login — API key & access token entry" },
      { src: "/projects/kiterunner/home.png", caption: "Command menu — dashboard, instruments, orders, streams" },
      { src: "/projects/kiterunner/instruments.png", caption: "Instrument search & filtering" },
      { src: "/projects/kiterunner/order-history.png", caption: "Order history view" },
      { src: "/projects/kiterunner/order-details.png", caption: "Order book with inline trade book" },
      { src: "/projects/kiterunner/trade-book.png", caption: "Trade book for an order" },
      { src: "/projects/kiterunner/extended-history.png", caption: "Extended order history" },
    ],
  },
  {
    name: "AI-Powered API Scaffolder",
    subtitle: "Side Project",
    points: [
      "Built a developer tool generating type-safe Node.js and Go API boilerplate via LLM APIs, focusing on structured code generation, consistency, and secure validation of generated code.",
    ],
    tags: ["Node.js", "Go", "LLM APIs", "Codegen"],
  },
  {
    name: "hdb — RDBMS in Go",
    subtitle: "Open-source storage-engine internals",
    repo: "https://github.com/hitaishkumar/hdb",
    points: [
      "Implementing a relational database from scratch in Go to internalize storage-engine internals — a buffer pool manager with an LRU replacer, slotted-page layout (header / slots / tuples), and a disk manager over paged files.",
    ],
    tags: ["Go", "Databases", "Storage Engine", "Systems"],
  },
];

export type Education = {
  school: string;
  location: string;
  degree: string;
  detail?: string; // GPA or status
  period: string;
  /** short monogram shown as the logo badge (fallback when no logo image) */
  monogram: string;
  /** optional logo image in /public (e.g. "/bits-pilani.png"). */
  logo?: string;
  current?: boolean;
};

export const education: Education[] = [
  {
    school: "BITS Pilani",
    location: "WILP · India",
    degree: "M.Tech, Data Science & AI",
    detail: "Pursuing",
    period: "2025 — Present",
    monogram: "BITS",
    logo: "/logos/bits-pilani.svg",
    current: true,
  },
  {
    school: "Veer Surendra Sai University of Technology",
    location: "Odisha",
    degree: "B.Tech, Electrical Engineering",
    detail: "8.2 GPA",
    period: "2019 — 2023",
    monogram: "VSSUT",
    logo: "/logos/vssut.svg",
  },
];


/**
 * Featured stack shown as brand logos. `icon` is the simple-icons export key
 * (without the `si` prefix) or `null` for brands not in simple-icons (AWS).
 */
export type Tech = { name: string; icon: string | null };

export const featuredTech: Tech[] = [
  { name: "Go", icon: "Go" },
  { name: "Python", icon: "Python" },
  { name: "TypeScript", icon: "Typescript" },
  { name: "Node.js", icon: "Nodedotjs" },
  { name: "PostgreSQL", icon: "Postgresql" },
  { name: "ClickHouse", icon: "Clickhouse" },
  { name: "Redis", icon: "Redis" },
  { name: "MongoDB", icon: "Mongodb" },
  { name: "Apache Kafka", icon: "Apachekafka" },
  { name: "RabbitMQ", icon: "Rabbitmq" },
  { name: "Docker", icon: "Docker" },
  { name: "Kubernetes", icon: "Kubernetes" },
  { name: "Prometheus", icon: "Prometheus" },
  { name: "Grafana", icon: "Grafana" },
  { name: "OpenTelemetry", icon: "Opentelemetry" },
  { name: "AWS", icon: null },
];
