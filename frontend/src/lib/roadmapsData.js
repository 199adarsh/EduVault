// Multi-domain Roadmaps Data with collegiate Continuo subject mapping
// Inspired by EduVault Learning Paths & reference interactive node architecture

const r = (title, kind, url, free = true) => ({ title, kind, url, free });

export const ROADMAP_CATEGORIES = [
  { id: 'frontend', name: 'Frontend Development', icon: 'palette', badge: 'Client & UI Systems' },
  { id: 'backend', name: 'Backend & Systems', icon: 'dns', badge: 'Services & DB Architecture' },
  { id: 'ai-ml', name: 'AI & Machine Learning', icon: 'psychology', badge: 'Models & RAG Engineering' },
  { id: 'devops', name: 'DevOps & Cloud', icon: 'cloud_sync', badge: 'Infra & CI/CD Pipelines' },
  { id: 'dsa-placement', name: 'Campus Placement DSA', icon: 'code_blocks', badge: 'Interviews & Tech Rounds' }
];

export const ROADMAPS = {
  frontend: {
    id: 'frontend',
    title: 'Frontend Development',
    tagline: 'Client Architecture, Responsive Frameworks & Web Vitals',
    icon: 'palette',
    totalHours: '80–100 hours',
    level: 'Beginner to Advanced',
    topics: [
      {
        id: 'web-basics', title: 'How the Web Works', level: 'Foundation', duration: '2–3 hours',
        prerequisites: [], position: { x: 40, y: 80 },
        collegeSubjectMatch: 'Computer Networks',
        outcomes: ['Explain client-server architecture', 'Inspect network headers in Chrome DevTools', 'Understand DNS resolution & TLS'],
        resources: [
          r('MDN: How the Web Works', 'Documentation', 'https://developer.mozilla.org/en-US/docs/Learn/Getting_started_with_the_web/How_the_Web_works'),
          r('HTTP Overview & Status Codes', 'Documentation', 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview')
        ]
      },
      {
        id: 'html', title: 'HTML5 & Semantic Markup', level: 'Foundation', duration: '4–6 hours',
        prerequisites: ['web-basics'], position: { x: 330, y: 80 },
        collegeSubjectMatch: 'Web Technologies',
        outcomes: ['Structure content semantically', 'Build accessible forms and inputs', 'Master screen-reader accessibility basics'],
        resources: [
          r('MDN HTML Learning Area', 'Documentation', 'https://developer.mozilla.org/en-US/docs/Learn/HTML'),
          r('HTML Elements Reference', 'Documentation', 'https://developer.mozilla.org/en-US/docs/Web/HTML/Element')
        ]
      },
      {
        id: 'css', title: 'Modern CSS & Layout Systems', level: 'Foundation', duration: '8–10 hours',
        prerequisites: ['html'], position: { x: 620, y: 80 },
        collegeSubjectMatch: 'Web Technologies',
        outcomes: ['Build fluid responsive layouts with Flexbox and Grid', 'Understand specificity, inheritance & cascade', 'Implement fluid typography & container queries'],
        resources: [
          r('MDN CSS Guide', 'Documentation', 'https://developer.mozilla.org/en-US/docs/Learn/CSS'),
          r('Flexbox Froggy', 'Practice', 'https://flexboxfroggy.com/'),
          r('CSS Grid Garden', 'Practice', 'https://cssgridgarden.com/')
        ]
      },
      {
        id: 'git', title: 'Git & GitHub Collaboration', level: 'Foundation', duration: '3–4 hours',
        prerequisites: ['web-basics'], position: { x: 330, y: 300 },
        collegeSubjectMatch: 'Software Engineering',
        outcomes: ['Execute commits, merges, and rebasing', 'Resolve git merge conflicts', 'Set up GitHub repositories with pull request reviews'],
        resources: [
          r('Git Handbook', 'Documentation', 'https://guides.github.com/introduction/git-handbook/'),
          r('Learn Git Branching', 'Practice', 'https://learngitbranching.js.org/')
        ]
      },
      {
        id: 'javascript', title: 'JavaScript (ES6+) Deep Dive', level: 'Core', duration: '14–18 hours',
        prerequisites: ['html', 'css'], position: { x: 910, y: 80 },
        collegeSubjectMatch: 'Web Technologies',
        outcomes: ['Write modern modular JavaScript', 'Deeply grasp closures, scope chains, and `this`', 'Manipulate DOM events performantly'],
        resources: [
          r('JavaScript.info Complete Guide', 'Course', 'https://javascript.info/'),
          r('MDN JavaScript Guide', 'Documentation', 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide'),
          r('Exercism JavaScript Track', 'Practice', 'https://exercism.org/tracks/javascript')
        ]
      },
      {
        id: 'responsive', title: 'Responsive UI & A11y', level: 'Core', duration: '6–8 hours',
        prerequisites: ['css', 'html'], position: { x: 620, y: 300 },
        collegeSubjectMatch: 'Web Technologies',
        outcomes: ['Build mobile-first navigation menus', 'Audit pages with Lighthouse A11y', 'Support keyboard and screen reader users'],
        resources: [
          r('Web Accessibility — MDN', 'Documentation', 'https://developer.mozilla.org/en-US/docs/Learn/Accessibility'),
          r('web.dev Responsive Design', 'Course', 'https://web.dev/learn/design/')
        ]
      },
      {
        id: 'browser-apis', title: 'DOM, Web APIs & Async Flow', level: 'Core', duration: '8–10 hours',
        prerequisites: ['javascript'], position: { x: 1200, y: 80 },
        collegeSubjectMatch: 'Web Technologies',
        outcomes: ['Handle asynchronous REST endpoints', 'Manage client side cache and tokens', 'Implement infinite scrolling with IntersectionObserver'],
        resources: [
          r('Using Fetch API', 'Documentation', 'https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch'),
          r('DOM Scripting Guide', 'Documentation', 'https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Client-side_web_APIs')
        ]
      },
      {
        id: 'typescript', title: 'TypeScript Foundations', level: 'Core', duration: '6–8 hours',
        prerequisites: ['javascript'], position: { x: 1490, y: 80 },
        collegeSubjectMatch: 'Object Oriented Programming',
        outcomes: ['Type complex JSON payloads safely', 'Use generics and mapped types', 'Prevent runtime null and undefined bugs'],
        resources: [
          r('TypeScript Official Handbook', 'Documentation', 'https://www.typescriptlang.org/docs/handbook/intro.html')
        ]
      },
      {
        id: 'react', title: 'React 19 & Component Architecture', level: 'Core', duration: '14–18 hours',
        prerequisites: ['javascript', 'html'], position: { x: 1490, y: 300 },
        collegeSubjectMatch: 'Web Technologies',
        outcomes: ['Decompose complex UIs into clean components', 'Manage reactive state and side effects', 'Build declarative reusable form controls'],
        resources: [
          r('React Official Quick Start', 'Documentation', 'https://react.dev/learn'),
          r('Thinking in React', 'Documentation', 'https://react.dev/learn/thinking-in-react')
        ]
      },
      {
        id: 'tooling', title: 'Build Tools: Vite & NPM', level: 'Core', duration: '4–5 hours',
        prerequisites: ['javascript', 'git'], position: { x: 910, y: 300 },
        collegeSubjectMatch: 'Software Engineering',
        outcomes: ['Configure Vite and PostCSS', 'Set up script commands & linter rules', 'Manage dependencies with npm and lockfiles'],
        resources: [
          r('Vite Official Guide', 'Documentation', 'https://vite.dev/guide/'),
          r('NPM Documentation', 'Documentation', 'https://docs.npmjs.com/')
        ]
      },
      {
        id: 'testing', title: 'Frontend Testing & Quality', level: 'Advanced', duration: '6–8 hours',
        prerequisites: ['react', 'javascript'], position: { x: 1780, y: 300 },
        collegeSubjectMatch: 'Software Engineering',
        outcomes: ['Write reliable unit tests with Vitest', 'Test user events with React Testing Library', 'Prevent UI regressions before deployment'],
        resources: [
          r('Vitest Guide', 'Documentation', 'https://vitest.dev/guide/'),
          r('Testing Library Docs', 'Documentation', 'https://testing-library.com/docs/')
        ]
      },
      {
        id: 'performance', title: 'Web Vitals & Performance', level: 'Advanced', duration: '4–6 hours',
        prerequisites: ['react', 'browser-apis'], position: { x: 2070, y: 80 },
        collegeSubjectMatch: 'Web Technologies',
        outcomes: ['Diagnose slow re-renders in Chrome DevTools', 'Optimize bundle sizes with dynamic imports', 'Achieve 90+ Lighthouse performance scores'],
        resources: [
          r('web.dev Web Vitals Guide', 'Documentation', 'https://web.dev/learn/performance/'),
          r('PageSpeed Insights', 'Practice', 'https://pagespeed.web.dev/')
        ]
      },
      {
        id: 'deployment', title: 'CI/CD & Cloud Deployment', level: 'Advanced', duration: '4–6 hours',
        prerequisites: ['tooling', 'git'], position: { x: 1780, y: 80 },
        collegeSubjectMatch: 'Computer Networks',
        outcomes: ['Set up automated GitHub Actions workflow', 'Deploy SPA with client routing rewrites', 'Manage production environment secrets safely'],
        resources: [
          r('Vercel Deployment Docs', 'Documentation', 'https://vercel.com/docs'),
          r('GitHub Actions Quickstart', 'Documentation', 'https://docs.github.com/en/actions/writing-workflows/quickstart')
        ]
      },
      {
        id: 'project', title: 'Capstone: Production Portfolio App', level: 'Project', duration: '1–2 weeks',
        prerequisites: ['react', 'typescript', 'responsive', 'testing', 'deployment'], position: { x: 2360, y: 300 },
        collegeSubjectMatch: 'Project Work / Capstone',
        outcomes: ['Publish a live URL and clean GitHub repo', 'Showcase real-world API data and error handling', 'Document architectural design choices in README'],
        resources: [
          r('Frontend Mentor Real Projects', 'Practice', 'https://www.frontendmentor.io/challenges'),
          r('Web.dev Accessibility Checklist', 'Course', 'https://web.dev/learn/accessibility/')
        ]
      }
    ]
  },

  backend: {
    id: 'backend',
    title: 'Backend & Systems Engineering',
    tagline: 'High-Concurrency Services, Database Architecture & API Security',
    icon: 'dns',
    totalHours: '90–120 hours',
    level: 'Intermediate to Advanced',
    topics: [
      {
        id: 'os-internals', title: 'Operating Systems & Concurrency', level: 'Foundation', duration: '8–10 hours',
        prerequisites: [], position: { x: 40, y: 80 },
        collegeSubjectMatch: 'Operating Systems',
        outcomes: ['Differentiate processes from threads', 'Analyze deadlock scenarios and semaphores', 'Understand multi-threaded memory safety'],
        resources: [
          r('OSTEP: Operating Systems Three Easy Pieces', 'Course', 'https://pages.cs.wisc.edu/~remzi/OSTEP/'),
          r('Linux Journey CLI Basics', 'Practice', 'https://linuxjourney.com/')
        ]
      },
      {
        id: 'java-oop', title: 'OOP & Java/C++ Backend Language', level: 'Foundation', duration: '12–15 hours',
        prerequisites: [], position: { x: 40, y: 300 },
        collegeSubjectMatch: 'Object Oriented Programming in Java',
        outcomes: ['Apply Polymorphism, Inheritance, Encapsulation', 'Implement SOLID design patterns in backend services', 'Use Collections and Stream APIs cleanly'],
        resources: [
          r('Baeldung Java Tutorials', 'Documentation', 'https://www.baeldung.com/'),
          r('Java Design Patterns Guide', 'Course', 'https://refactoring.guru/design-patterns/java')
        ]
      },
      {
        id: 'databases-sql', title: 'Relational DBs & SQL Mastery', level: 'Core', duration: '12–16 hours',
        prerequisites: ['os-internals'], position: { x: 340, y: 80 },
        collegeSubjectMatch: 'Database Management Systems',
        outcomes: ['Write advanced aggregate queries & CTEs', 'Structure relational schemas up to 3NF', 'Enforce ACID transaction boundaries'],
        resources: [
          r('PostgreSQL Official Tutorial', 'Documentation', 'https://www.postgresql.org/docs/current/tutorial.html'),
          r('SQLBolt Interactive Practice', 'Practice', 'https://sqlbolt.com/')
        ]
      },
      {
        id: 'indexing-perf', title: 'DB Indexing & Query Tuning', level: 'Core', duration: '6–8 hours',
        prerequisites: ['databases-sql'], position: { x: 640, y: 80 },
        collegeSubjectMatch: 'Database Management Systems',
        outcomes: ['Interpret EXPLAIN query plans', 'Select proper indexing strategies', 'Optimize slow queries for high throughput'],
        resources: [
          r('Use The Index, Luke!', 'Course', 'https://use-the-index-luke.com/'),
          r('Postgres Indexing Deep Dive', 'Documentation', 'https://www.postgresql.org/docs/current/indexes.html')
        ]
      },
      {
        id: 'rest-api', title: 'RESTful API & Controller Design', level: 'Core', duration: '10–12 hours',
        prerequisites: ['java-oop'], position: { x: 340, y: 300 },
        collegeSubjectMatch: 'Software Engineering',
        outcomes: ['Design idempotent RESTful endpoints', 'Implement DTOs with validation annotations', 'Handle global exceptions with standardized JSON errors'],
        resources: [
          r('Spring Boot REST Tutorial', 'Documentation', 'https://spring.io/guides/tutorials/rest/'),
          r('RESTful API Best Practices', 'Documentation', 'https://restfulapi.net/')
        ]
      },
      {
        id: 'auth-security', title: 'Auth: JWT, Sessions & OAuth2', level: 'Core', duration: '8–10 hours',
        prerequisites: ['rest-api'], position: { x: 640, y: 300 },
        collegeSubjectMatch: 'Computer Networks',
        outcomes: ['Implement secure JWT token verification', 'Safeguard endpoints against SQLi and XSS', 'Set up Role-Based Access Control (RBAC)'],
        resources: [
          r('OWASP Top 10 Web Security', 'Documentation', 'https://owasp.org/www-project-top-ten/'),
          r('JWT.io Introduction', 'Documentation', 'https://jwt.io/introduction')
        ]
      },
      {
        id: 'caching-redis', title: 'Caching & Redis In-Memory Store', level: 'Advanced', duration: '6–8 hours',
        prerequisites: ['indexing-perf', 'rest-api'], position: { x: 940, y: 190 },
        collegeSubjectMatch: 'Operating Systems',
        outcomes: ['Integrate Redis as a low-latency cache layer', 'Design eviction policies (LRU/LFU)', 'Implement rate limiting with Redis counters'],
        resources: [
          r('Redis University', 'Course', 'https://university.redis.com/'),
          r('System Design Primer Caching', 'Documentation', 'https://github.com/donnemartin/system-design-primer#caching')
        ]
      },
      {
        id: 'docker-containers', title: 'Docker & Containerization', level: 'Advanced', duration: '6–8 hours',
        prerequisites: ['rest-api'], position: { x: 1240, y: 190 },
        collegeSubjectMatch: 'Operating Systems',
        outcomes: ['Package services into lightweight containers', 'Write multi-container docker-compose configs', 'Run containerized databases and redis locally'],
        resources: [
          r('Docker Documentation for Beginners', 'Documentation', 'https://docs.docker.com/get-started/'),
          r('Docker Compose in 15 Minutes', 'Practice', 'https://docs.docker.com/compose/')
        ]
      },
      {
        id: 'system-design', title: 'System Design & High Availability', level: 'Advanced', duration: '14–18 hours',
        prerequisites: ['caching-redis', 'docker-containers'], position: { x: 1540, y: 190 },
        collegeSubjectMatch: 'Computer Networks',
        outcomes: ['Design scalable architectures (e.g., TinyURL, Uber)', 'Apply CAP theorem trade-offs', 'Evaluate message brokers like Kafka/RabbitMQ'],
        resources: [
          r('System Design Primer', 'Course', 'https://github.com/donnemartin/system-design-primer'),
          r('ByteByteGo System Design Blog', 'Documentation', 'https://blog.bytebytego.com/')
        ]
      },
      {
        id: 'backend-capstone', title: 'Capstone: Distributed Backend Service', level: 'Project', duration: '2 weeks',
        prerequisites: ['system-design'], position: { x: 1840, y: 190 },
        collegeSubjectMatch: 'Project Work / Capstone',
        outcomes: ['Deliver benchmarked REST APIs with 500+ QPS', 'Publish Docker container to GitHub Registry', 'Write architecture decision records (ADRs)'],
        resources: [
          r('Real-World Backend Specs', 'Practice', 'https://github.com/gothinkster/realworld')
        ]
      }
    ]
  },

  fullstack: {
    id: 'fullstack',
    title: 'Full Stack Engineering',
    tagline: 'End-to-End Modern Web Architecture: Frontend + Backend + Cloud',
    icon: 'layers',
    totalHours: '100–130 hours',
    level: 'Comprehensive Track',
    topics: [
      {
        id: 'fs-git-web', title: 'Web Architecture & Git Workflows', level: 'Foundation', duration: '4–6 hours',
        prerequisites: [], position: { x: 40, y: 190 },
        collegeSubjectMatch: 'Computer Networks',
        outcomes: ['Understand request cycles from browser to database', 'Manage multi-branch team repositories'],
        resources: [r('MDN Client Server Basics', 'Documentation', 'https://developer.mozilla.org/en-US/docs/Learn')]
      },
      {
        id: 'fs-frontend-core', title: 'Frontend: HTML, CSS & React UI', level: 'Foundation', duration: '16–20 hours',
        prerequisites: ['fs-git-web'], position: { x: 340, y: 190 },
        collegeSubjectMatch: 'Web Technologies',
        outcomes: ['Build reactive component trees', 'Manage form inputs and asynchronous data fetching'],
        resources: [r('React 19 Official Documentation', 'Documentation', 'https://react.dev/')]
      },
      {
        id: 'fs-backend-api', title: 'Backend: Node.js / Spring Boot APIs', level: 'Core', duration: '18–22 hours',
        prerequisites: ['fs-frontend-core'], position: { x: 640, y: 190 },
        collegeSubjectMatch: 'Software Engineering',
        outcomes: ['Construct CRUD endpoints with schema validation', 'Integrate ORM database persistence'],
        resources: [r('Spring Boot Guides', 'Documentation', 'https://spring.io/guides')]
      },
      {
        id: 'fs-db-storage', title: 'Database & Object Storage Integration', level: 'Core', duration: '12–14 hours',
        prerequisites: ['fs-backend-api'], position: { x: 940, y: 190 },
        collegeSubjectMatch: 'Database Management Systems',
        outcomes: ['Model relational schemas with foreign keys', 'Implement secure file uploads with pre-signed URLs'],
        resources: [r('Postgres Tutorial', 'Documentation', 'https://www.postgresql.org/docs/')]
      },
      {
        id: 'fs-auth-security', title: 'Fullstack Authentication & Session Security', level: 'Advanced', duration: '8–10 hours',
        prerequisites: ['fs-db-storage'], position: { x: 1240, y: 190 },
        collegeSubjectMatch: 'Computer Networks',
        outcomes: ['Protect frontend routes and backend APIs', 'Handle token refresh cycles without logout'],
        resources: [r('Auth0 JWT Architecture', 'Documentation', 'https://auth0.com/learn/json-web-tokens/')]
      },
      {
        id: 'fs-devops-deploy', title: 'Cloud Deployment & Monitoring', level: 'Advanced', duration: '6–8 hours',
        prerequisites: ['fs-auth-security'], position: { x: 1540, y: 190 },
        collegeSubjectMatch: 'Software Engineering',
        outcomes: ['Automate production deployments with GitHub CI', 'Monitor error traces and latency in production'],
        resources: [r('Vercel + Spring Boot Deployment Docs', 'Documentation', 'https://vercel.com/')]
      },
      {
        id: 'fs-capstone', title: 'Capstone: Complete SaaS Web Application', level: 'Project', duration: '2–3 weeks',
        prerequisites: ['fs-devops-deploy'], position: { x: 1840, y: 190 },
        collegeSubjectMatch: 'Project Work / Capstone',
        outcomes: ['Deploy fully functional SaaS to production', 'Prepare project demo and resume architecture walkthrough'],
        resources: [r('Full Stack Open Course', 'Course', 'https://fullstackopen.com/')]
      }
    ]
  },

  'ai-ml': {
    id: 'ai-ml',
    title: 'AI & Machine Learning',
    tagline: 'From Linear Algebra to Deep Learning, LLMs & Autonomous Agents',
    icon: 'psychology',
    totalHours: '100–140 hours',
    level: 'Intermediate to Advanced',
    topics: [
      {
        id: 'python-math', title: 'Python for Data Science & Math Foundations', level: 'Foundation', duration: '12–15 hours',
        prerequisites: [], position: { x: 40, y: 190 },
        collegeSubjectMatch: 'Engineering Mathematics / Python',
        outcomes: ['Perform matrix operations with NumPy', 'Compute gradients and partial derivatives', 'Understand probability distributions & Bayes theorem'],
        resources: [r('3Blue1Brown Essence of Linear Algebra', 'Video', 'https://www.youtube.com/playlist?list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab')]
      },
      {
        id: 'eda-pandas', title: 'Data Wrangling & EDA with Pandas', level: 'Foundation', duration: '10–12 hours',
        prerequisites: ['python-math'], position: { x: 340, y: 190 },
        collegeSubjectMatch: 'Data Science / Big Data',
        outcomes: ['Clean messy real-world CSV datasets', 'Detect outliers and skewed distributions', 'Generate insightful statistical charts'],
        resources: [r('Kaggle Pandas Course', 'Practice', 'https://www.kaggle.com/learn/pandas')]
      },
      {
        id: 'classical-ml', title: 'Classical ML: Regression, Trees & Clustering', level: 'Core', duration: '14–18 hours',
        prerequisites: ['eda-pandas'], position: { x: 640, y: 190 },
        collegeSubjectMatch: 'Artificial Intelligence & Machine Learning',
        outcomes: ['Train classification and regression models in Scikit-Learn', 'Evaluate with Precision, Recall, F1 and ROC-AUC', 'Tune hyperparameters with GridSearchCV'],
        resources: [r('Scikit-Learn User Guide', 'Documentation', 'https://scikit-learn.org/stable/user_guide.html')]
      },
      {
        id: 'deep-learning', title: 'Neural Networks & PyTorch Fundamentals', level: 'Core', duration: '16–20 hours',
        prerequisites: ['classical-ml'], position: { x: 940, y: 190 },
        collegeSubjectMatch: 'Artificial Intelligence & Machine Learning',
        outcomes: ['Build multi-layer neural networks in PyTorch', 'Write clean training and validation loops', 'Prevent overfitting with Dropout and BatchNorm'],
        resources: [r('PyTorch Official Deep Learning Tutorials', 'Documentation', 'https://pytorch.org/tutorials/')]
      },
      {
        id: 'transformers-nlp', title: 'Transformers, Embeddings & LLM Basics', level: 'Advanced', duration: '14–18 hours',
        prerequisites: ['deep-learning'], position: { x: 1240, y: 190 },
        collegeSubjectMatch: 'Natural Language Processing',
        outcomes: ['Tokenize and generate text with Hugging Face', 'Generate dense vector embeddings with open models', 'Fine-tune pre-trained models with PEFT/LoRA'],
        resources: [r('Hugging Face NLP Course', 'Course', 'https://huggingface.co/learn/nlp-course')]
      },
      {
        id: 'rag-agents', title: 'RAG Systems, Vector DBs & AI Agents', level: 'Advanced', duration: '12–16 hours',
        prerequisites: ['transformers-nlp'], position: { x: 1540, y: 190 },
        collegeSubjectMatch: 'Artificial Intelligence',
        outcomes: ['Build production RAG pipelines with hybrid search', 'Implement structured JSON output from Gemini/Claude', 'Create autonomous tool-using agents'],
        resources: [r('LangChain Conceptual Docs', 'Documentation', 'https://python.langchain.com/docs/')]
      },
      {
        id: 'ai-capstone', title: 'Capstone: Intelligent RAG Knowledge Assistant', level: 'Project', duration: '2 weeks',
        prerequisites: ['rag-agents'], position: { x: 1840, y: 190 },
        collegeSubjectMatch: 'Project Work / Capstone',
        outcomes: ['Deploy end-to-end RAG assistant with real documents', 'Benchmark retrieval accuracy and latency', 'Present architecture in interviews'],
        resources: [r('Full Stack LLM Boot Camp', 'Course', 'https://fullstackdeeplearning.com/')]
      }
    ]
  },

  devops: {
    id: 'devops',
    title: 'DevOps & Cloud Engineering',
    tagline: 'Infrastructure as Code, Kubernetes Orchestration & Observability',
    icon: 'cloud_sync',
    totalHours: '80–110 hours',
    level: 'Intermediate to Advanced',
    topics: [
      {
        id: 'linux-networking', title: 'Linux System Administration & Networking', level: 'Foundation', duration: '10–12 hours',
        prerequisites: [], position: { x: 40, y: 190 },
        collegeSubjectMatch: 'Operating Systems & Computer Networks',
        outcomes: ['Write shell automation scripts', 'Manage systemd daemons and log files', 'Troubleshoot network drops and DNS latency'],
        resources: [r('Linux Foundation System Admin Guide', 'Course', 'https://training.linuxfoundation.org/')]
      },
      {
        id: 'docker-iac', title: 'Docker Containerization & Multi-Stage Builds', level: 'Core', duration: '8–10 hours',
        prerequisites: ['linux-networking'], position: { x: 340, y: 190 },
        collegeSubjectMatch: 'Operating Systems',
        outcomes: ['Minimize image sizes with alpine/distroless', 'Manage local container microservices with Docker Compose'],
        resources: [r('Docker Best Practices', 'Documentation', 'https://docs.docker.com/develop/develop-images/dockerfile_best-practices/')]
      },
      {
        id: 'cicd-github', title: 'CI/CD Pipelines with GitHub Actions', level: 'Core', duration: '8–10 hours',
        prerequisites: ['docker-iac'], position: { x: 640, y: 190 },
        collegeSubjectMatch: 'Software Engineering',
        outcomes: ['Write production GitHub Actions workflows', 'Implement automatic semantic versioning and changelogs'],
        resources: [r('GitHub Actions Docs', 'Documentation', 'https://docs.github.com/en/actions')]
      },
      {
        id: 'k8s-orchestration', title: 'Kubernetes Pods, Deployments & Services', level: 'Advanced', duration: '14–18 hours',
        prerequisites: ['cicd-github'], position: { x: 940, y: 190 },
        collegeSubjectMatch: 'Cloud Computing',
        outcomes: ['Deploy scalable applications to a k8s cluster', 'Configure rolling updates and zero-downtime rollbacks'],
        resources: [r('Kubernetes Official Tutorials', 'Documentation', 'https://kubernetes.io/docs/tutorials/')]
      },
      {
        id: 'terraform-cloud', title: 'Infrastructure as Code (IaC) with Terraform', level: 'Advanced', duration: '10–12 hours',
        prerequisites: ['k8s-orchestration'], position: { x: 1240, y: 190 },
        collegeSubjectMatch: 'Cloud Computing',
        outcomes: ['Declare cloud infrastructure idempotently', 'Manage team Terraform state with locking'],
        resources: [r('HashiCorp Terraform Tutorials', 'Documentation', 'https://developer.hashicorp.com/terraform/tutorials')]
      },
      {
        id: 'observability', title: 'Observability: Prometheus, Grafana & Logs', level: 'Advanced', duration: '8–10 hours',
        prerequisites: ['terraform-cloud'], position: { x: 1540, y: 190 },
        collegeSubjectMatch: 'Software Engineering',
        outcomes: ['Set up SLO/SLA monitoring dashboards', 'Trigger alerts on HTTP 5xx spikes and high CPU utilization'],
        resources: [r('Prometheus Monitoring Guide', 'Documentation', 'https://prometheus.io/docs/introduction/overview/')]
      },
      {
        id: 'devops-capstone', title: 'Capstone: Automated GitOps Cloud Pipeline', level: 'Project', duration: '2 weeks',
        prerequisites: ['observability'], position: { x: 1840, y: 190 },
        collegeSubjectMatch: 'Project Work / Capstone',
        outcomes: ['Demonstrate production-grade zero-downtime CI/CD', 'Walk through automated disaster recovery during interviews'],
        resources: [r('GitOps Principles by Weaveworks', 'Documentation', 'https://www.gitops.tech/')]
      }
    ]
  },

  'dsa-placement': {
    id: 'dsa-placement',
    title: 'Campus Placement DSA Master Track',
    tagline: 'Technical Interview Mastery, Core CS Subjects & Coding Assessments',

    totalHours: '120–150 hours',
    level: 'High Priority Placement Track',
    topics: [
      {
        id: 'complexity-arrays', title: 'Big-O Analysis, Arrays & Two Pointers', level: 'Foundation', duration: '10–12 hours',
        prerequisites: [], position: { x: 40, y: 80 },
        collegeSubjectMatch: 'Data Structures and Algorithms',
        outcomes: ['Calculate Big-O of any nested loop', 'Solve Two Sum, 3Sum, Container with Most Water', 'Implement fast array partition schemes'],
        resources: [
          r('NeetCode Roadmap — Arrays', 'Practice', 'https://neetcode.io/roadmap'),
          r('Big-O Cheat Sheet', 'Documentation', 'https://www.bigocheatsheet.com/')
        ]
      },
      {
        id: 'strings-sliding-window', title: 'Strings & Sliding Window Pattern', level: 'Foundation', duration: '8–10 hours',

        prerequisites: ['complexity-arrays'], position: { x: 340, y: 80 },
        collegeSubjectMatch: 'Data Structures and Algorithms',
        outcomes: ['Solve Longest Substring Without Repeating Characters', 'Master Minimum Window Substring', 'Implement anagram and permutation search'],
        resources: [
          r('LeetCode Sliding Window Collection', 'Practice', 'https://leetcode.com/tag/sliding-window/')
        ]
      },
      {
        id: 'linked-lists-stacks', title: 'Linked Lists, Stacks & Monotonic Queues', level: 'Core', duration: '10–12 hours',

        prerequisites: ['complexity-arrays'], position: { x: 340, y: 300 },
        collegeSubjectMatch: 'Data Structures and Algorithms',
        outcomes: ['Detect and break cycles in Linked Lists (Floyd’s algorithm)', 'Implement monotonic stack for Daily Temperatures and Histogram', 'Reverse linked list iteratively and recursively'],
        resources: [
          r('Visualgo Linked List & Stack', 'Practice', 'https://visualgo.net/en/list')
        ]
      },
      {
        id: 'trees-bst', title: 'Binary Trees, BST & Heap Structures', level: 'Core', duration: '14–18 hours',

        prerequisites: ['linked-lists-stacks'], position: { x: 640, y: 190 },
        collegeSubjectMatch: 'Data Structures and Algorithms',
        outcomes: ['Construct binary trees from traversal arrays', 'Validate BST invariants', 'Implement Top K Frequent Elements with Heaps'],
        resources: [
          r('NeetCode Trees Deep Dive', 'Video', 'https://neetcode.io/practice')
        ]
      },
      {
        id: 'graphs-bfs-dfs', title: 'Graphs: BFS, DFS, Dijkstra & Topological Sort', level: 'Advanced', duration: '16–20 hours',

        prerequisites: ['trees-bst'], position: { x: 940, y: 190 },
        collegeSubjectMatch: 'Data Structures and Algorithms',
        outcomes: ['Solve Number of Islands and Word Ladder', 'Implement Topological Sort for course schedule dependencies', 'Apply Dijkstra’s algorithm with priority queues'],
        resources: [
          r('William Fiset Graph Theory', 'Video', 'https://www.youtube.com/playlist?list=PLDV1Zeh2NRsDGO4--qE8yH72HFL1Km93P')
        ]
      },
      {
        id: 'dynamic-programming', title: 'Dynamic Programming: 1D & 2D Memoization', level: 'Advanced', duration: '18–22 hours',

        prerequisites: ['graphs-bfs-dfs'], position: { x: 1240, y: 190 },
        collegeSubjectMatch: 'Design and Analysis of Algorithms',
        outcomes: ['Identify DP states and transition equations', 'Solve Coin Change, Longest Increasing Subsequence, Edit Distance', 'Optimize 2D space to 1D space'],
        resources: [
          r('Striver DP Series', 'Video', 'https://takeuforward.org/dynamic-programming/striver-dp-series-top-dp-interview-problems/'),
          r('LeetCode DP Study Plan', 'Practice', 'https://leetcode.com/study-plan/dynamic-programming/')
        ]
      },
      {
        id: 'core-cs-review', title: 'Core CS Review: OS, DBMS, Networks & OOP', level: 'Advanced', duration: '12–15 hours',

        prerequisites: ['trees-bst'], position: { x: 1240, y: 390 },
        collegeSubjectMatch: 'Continuous Semester Subjects',
        outcomes: ['Answer technical interview theory questions confidently', 'Write clean SQL queries with joins on the whiteboard', 'Explain multithreading and networking protocols to interviewers'],
        resources: [
          r('Gate Smashers Core CS Playlists', 'Video', 'https://www.youtube.com/@GateSmashers'),
          r('Last Minute Interview Notes', 'Documentation', 'https://www.geeksforgeeks.org/last-minute-notes-operating-systems/')
        ]
      },
      {
        id: 'mock-interviews', title: 'Capstone: Mock Coding Interviews & Strategy', level: 'Project', duration: '2 weeks',

        prerequisites: ['dynamic-programming', 'core-cs-review'], position: { x: 1540, y: 290 },
        collegeSubjectMatch: 'Placement Assessment',
        outcomes: ['Pass timed coding assessments with 100% test coverage', 'Communicate optimal algorithms clearly during live interviews', 'Negotiate campus placement offers with confidence'],
        resources: [
          r('Pramp Free Peer Mock Interviews', 'Practice', 'https://www.pramp.com/'),
          r('LeetCode Weekly Contests', 'Practice', 'https://leetcode.com/contest/')
        ]
      }
    ]
  }
};

export const getRoadmap = (id) => ROADMAPS[id] || ROADMAPS.frontend;

export const getTopicsMap = (roadmap) => {
  return Object.fromEntries((roadmap?.topics || []).map(t => [t.id, t]));
};
