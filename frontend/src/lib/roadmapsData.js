// Sovereign Roadmaps - Categorized Curricula for Tier 2/3 Placement & Industry Prep

const r = (title, kind, url, free = true) => ({ title, kind, url, free });

export const ROADMAP_CATEGORIES = [
  {
    id: 'javascript',
    name: 'JavaScript',
    role: 'Language Foundation',
    description: 'Complete 9-module Scaler foundation from variables and closures to async event loops & DOM',
    icon: 'Code2',
    level: 'Beginner to Intermediate',
    topicsCount: 9,
    badge: 'Core Language'
  },
  {
    id: 'react',
    name: 'React.js',
    role: 'Frontend Engineering',
    description: 'Component architecture, Hooks, State management, Context API and FilmVault Production App',
    icon: 'Layout',
    level: 'Beginner to Advanced',
    topicsCount: 10,
    badge: 'Frontend Core'
  },
  {
    id: 'nodejs',
    name: 'Node.js & Express',
    role: 'Backend Engineering',
    description: 'Master Node runtime, Express routing, Custom Middlewares, MongoDB and Mongoose modeling',
    icon: 'Server',
    level: 'Intermediate to Advanced',
    topicsCount: 10,
    badge: 'Backend Core'
  },
  {
    id: 'full-stack',
    name: 'Full Stack MERN',
    role: 'Career Track',
    description: 'End-to-end integration: React client, Node REST APIs, JWT Auth, Database clustering & Deployments',
    icon: 'Layers',
    level: 'Intermediate to Advanced',
    topicsCount: 12,
    badge: 'Full Stack'
  },
  {
    id: 'dsa-placement',
    name: 'DSA Placement Prep',
    role: 'Placement Track',
    description: 'Master Arrays, Linked Lists, Trees, Graphs, DP and LeetCode patterns for Campus Placements',
    icon: 'Brain',
    level: 'All Levels',
    topicsCount: 9,
    badge: 'Interview Ready'
  }
];

export const ROADMAPS = {
  javascript: {
    id: 'javascript',
    title: 'JavaScript for Beginners ',
    description: '9 Modules | 78 Lessons | 10h 14m comprehensive guide to mastering core JavaScript and modern ES6+.',
    estimatedHours: 45,
    difficulty: 'Beginner to Intermediate',
    prerequisites: ['Basic HTML & CSS knowledge'],
    topics: [
      {
        id: 'js-m1',
        title: 'Module 1: Getting Started with JS',
        subtitle: 'Runtime, Browser Engine & First Program',
        category: 'Basics',
        collegeSubjectMatch: 'Web Technologies',
        position: { x: 280, y: 50 },
        prerequisites: [],
        description: 'Understand how JavaScript executes in browsers and Node.js environments. Setup environment and write your first scripts.',
        estimatedHours: 3,
        keySkills: ['V8 Engine', 'Browser Console', 'Node REPL', 'Script Tags'],
        resources: [
          r('Intro to JavaScript Course', 'video', 'https://www.scaler.com/topics/course/javascript-beginners/video/1637/'),
          r('Introduction to JavaScript', 'video', 'https://www.scaler.com/topics/course/javascript-beginners/video/239/'),
          r('JavaScript in the Browser', 'video', 'https://www.scaler.com/topics/course/javascript-beginners/video/240/'),
          r('First JavaScript Program', 'video', 'https://www.scaler.com/topics/course/javascript-beginners/video/241/'),
          r('Introduction to Node.js', 'video', 'https://www.scaler.com/topics/course/javascript-beginners/video/242/'),
          r('Challenge 1 - JavaScript for Beginners', 'exercise', 'https://www.scaler.com/topics/course/javascript-beginners/challenge/378888/')
        ]
      },
      {
        id: 'js-m2',
        title: 'Module 2: Basics of JavaScript',
        subtitle: 'Variables, Arrays, Objects & Memory',
        category: 'Data Structures',
        collegeSubjectMatch: 'Programming in C/C++',
        position: { x: 280, y: 180 },
        prerequisites: ['js-m1'],
        description: 'Variables, data types, mutable arrays, and object reference mechanics in JavaScript memory models.',
        estimatedHours: 4,
        keySkills: ['Primitive vs Non-primitive', 'Array Methods', 'Object Literals', 'Pass by Reference'],
        resources: [
          r('Variables in JavaScript', 'video', 'https://www.scaler.com/topics/course/javascript-beginners/video/243/'),
          r('Arrays in JavaScript', 'video', 'https://www.scaler.com/topics/course/javascript-beginners/video/244/'),
          r('Array Methods (Push, Pop, Shift, Slice)', 'video', 'https://www.scaler.com/topics/course/javascript-beginners/video/245/'),
          r('Objects in JavaScript', 'video', 'https://www.scaler.com/topics/course/javascript-beginners/video/246/'),
          r('Advanced Object Manipulation', 'video', 'https://www.scaler.com/topics/course/javascript-beginners/video/247/'),
          r('Challenge 2 - JavaScript Basics', 'exercise', 'https://www.scaler.com/topics/course/javascript-beginners/challenge/380308/')
        ]
      },
      {
        id: 'js-m3',
        title: 'Module 3: Conditionals & Control Flow',
        subtitle: 'If/Else, Loops (For, While, For-In, For-Of)',
        category: 'Logic Building',
        collegeSubjectMatch: 'Data Structures & Algorithms',
        position: { x: 280, y: 310 },
        prerequisites: ['js-m2'],
        description: 'Control flow structures, iterative loops, switch branches, and loop iteration optimization.',
        estimatedHours: 4,
        keySkills: ['if-else-if', 'for loops', 'while/do-while', 'for...in vs for...of'],
        resources: [
          r('Conditional Statements', 'video', 'https://www.scaler.com/topics/course/javascript-beginners/video/248/'),
          r('The Standard For Loop', 'video', 'https://www.scaler.com/topics/course/javascript-beginners/video/249/'),
          r('While & Do-While Loops', 'video', 'https://www.scaler.com/topics/course/javascript-beginners/video/250/'),
          r('For-In Object Loop', 'video', 'https://www.scaler.com/topics/course/javascript-beginners/video/251/'),
          r('For-Of Iterable Loop', 'video', 'https://www.scaler.com/topics/course/javascript-beginners/video/252/'),
          r('Challenge 3 - Control Flow Statements', 'exercise', 'https://www.scaler.com/topics/course/javascript-beginners/challenge/385327/')
        ]
      },
      {
        id: 'js-m4',
        title: 'Module 4: Functions & Execution Context',
        subtitle: 'Declarations, Expressions & Hoisting',
        category: 'Core Language',
        collegeSubjectMatch: 'Principles of Programming Languages',
        position: { x: 280, y: 440 },
        prerequisites: ['js-m3'],
        description: 'Function statements, function expressions, call stack, execution contexts, and the hoisting mechanism.',
        estimatedHours: 3,
        keySkills: ['Execution Context', 'Call Stack', 'Variable Hoisting', 'Function Expressions'],
        resources: [
          r('Functions in JavaScript', 'video', 'https://www.scaler.com/topics/course/javascript-beginners/video/253/'),
          r('Functions as Expressions', 'video', 'https://www.scaler.com/topics/course/javascript-beginners/video/254/'),
          r('Hoisting Deep Dive', 'video', 'https://www.scaler.com/topics/course/javascript-beginners/video/255/'),
          r('Challenge 4 - Functions and Hoisting', 'exercise', 'https://www.scaler.com/topics/course/javascript-beginners/challenge/380311/')
        ]
      },
      {
        id: 'js-m5',
        title: 'Module 5: Modern ES6+ Features',
        subtitle: 'Let/Const, Arrow Functions & Destructuring',
        category: 'Modern JS',
        collegeSubjectMatch: 'Web Technologies',
        position: { x: 280, y: 570 },
        prerequisites: ['js-m4'],
        description: 'Modern JavaScript features introduced in ECMAScript 2015+: block scoping, arrow functions, destructuring, and ES modules.',
        estimatedHours: 5,
        keySkills: ['Block Scope vs Function Scope', 'Arrow Syntax & Lexical this', 'Spread/Rest Operator', 'Destructuring'],
        resources: [
          r('Introduction to ES6', 'video', 'https://www.scaler.com/topics/course/javascript-beginners/video/256/'),
          r('Problems with var', 'video', 'https://www.scaler.com/topics/course/javascript-beginners/video/257/'),
          r('let and const Mechanics', 'video', 'https://www.scaler.com/topics/course/javascript-beginners/video/258/'),
          r('Arrow Functions', 'video', 'https://www.scaler.com/topics/course/javascript-beginners/video/259/'),
          r('Template Literals', 'video', 'https://www.scaler.com/topics/course/javascript-beginners/video/260/'),
          r('Array Destructuring', 'video', 'https://www.scaler.com/topics/course/javascript-beginners/video/261/'),
          r('Object Destructuring', 'video', 'https://www.scaler.com/topics/course/javascript-beginners/video/262/'),
          r('ES6 Modules & Imports', 'video', 'https://www.scaler.com/topics/course/javascript-beginners/video/263/'),
          r('Challenge 5 - ES6 Mastery', 'exercise', 'https://www.scaler.com/topics/course/javascript-beginners/challenge/380323/')
        ]
      },
      {
        id: 'js-m6',
        title: 'Module 6: Functional Programming',
        subtitle: 'Pure Functions, HOFs, Map, Filter, Reduce',
        category: 'Paradigm',
        collegeSubjectMatch: 'Principles of Programming Languages',
        position: { x: 280, y: 700 },
        prerequisites: ['js-m5'],
        description: 'Imperative vs declarative coding, immutability, high-order functions, and functional collection processing.',
        estimatedHours: 6,
        keySkills: ['Pure Functions', 'Side Effects', 'Callbacks', 'map / filter / reduce'],
        resources: [
          r('Intro to Functional Programming', 'video', 'https://www.scaler.com/topics/course/javascript-beginners/video/264/'),
          r('Imperative vs Declarative', 'video', 'https://www.scaler.com/topics/course/javascript-beginners/video/265/'),
          r('Pure Functions & Side Effects', 'video', 'https://www.scaler.com/topics/course/javascript-beginners/video/266/'),
          r('Callback Functions', 'video', 'https://www.scaler.com/topics/course/javascript-beginners/video/267/'),
          r('Higher Order Functions (map, filter, reduce)', 'video', 'https://www.scaler.com/topics/course/javascript-beginners/video/268/'),
          r('Chaining Array Methods', 'video', 'https://www.scaler.com/topics/course/javascript-beginners/video/270/'),
          r('Challenge 6 - Functional Programming Test', 'exercise', 'https://www.scaler.com/topics/course/javascript-beginners/challenge/380366/')
        ]
      },
      {
        id: 'js-m7',
        title: 'Module 7: Asynchronous Programming',
        subtitle: 'Event Loop, Promises & Async/Await',
        category: 'Core Language',
        collegeSubjectMatch: 'Operating Systems',
        position: { x: 280, y: 830 },
        prerequisites: ['js-m6'],
        description: 'Single-threaded event loop, call stack, microtask vs macrotask queues, callback hell, Promises and async/await.',
        estimatedHours: 6,
        keySkills: ['Event Loop', 'Callback Hell', 'Promises API', 'async/await', 'Error Handling'],
        resources: [
          r('Asynchronous Programming Concepts', 'video', 'https://www.scaler.com/topics/course/javascript-beginners/video/272/'),
          r('Synchronous vs Asynchronous Execution', 'video', 'https://www.scaler.com/topics/course/javascript-beginners/video/273/'),
          r('The Browser Event Loop Explained', 'video', 'https://www.scaler.com/topics/course/javascript-beginners/video/274/'),
          r('Promises & Promise Chaining', 'video', 'https://www.scaler.com/topics/course/javascript-beginners/video/275/'),
          r('Async / Await Syntax', 'video', 'https://www.scaler.com/topics/course/javascript-beginners/video/276/'),
          r('Challenge 7 - Async JS Challenge', 'exercise', 'https://www.scaler.com/topics/course/javascript-beginners/challenge/380372/')
        ]
      },
      {
        id: 'js-m8',
        title: 'Module 8: OOP in JavaScript',
        subtitle: 'Constructors, Prototypes & Classes',
        category: 'Paradigm',
        collegeSubjectMatch: 'Object Oriented Programming',
        position: { x: 280, y: 960 },
        prerequisites: ['js-m7'],
        description: 'Constructor functions, prototype inheritance chain, this keyword binding, and ES6 class syntax.',
        estimatedHours: 5,
        keySkills: ['this Keyword Binding', 'call/apply/bind', 'Prototype Chain', 'ES6 Classes & Inheritance'],
        resources: [
          r('Object Oriented Programming in JS', 'video', 'https://www.scaler.com/topics/course/javascript-beginners/video/282/'),
          r('The this Keyword Binding Rules', 'video', 'https://www.scaler.com/topics/course/javascript-beginners/video/283/'),
          r('Constructor Functions', 'video', 'https://www.scaler.com/topics/course/javascript-beginners/video/284/'),
          r('Prototypal Inheritance Chain', 'video', 'https://www.scaler.com/topics/course/javascript-beginners/video/285/'),
          r('ES6 Classes and Super Constructor', 'video', 'https://www.scaler.com/topics/course/javascript-beginners/video/286/'),
          r('Challenge 8 - OOP in JS Test', 'exercise', 'https://www.scaler.com/topics/course/javascript-beginners/challenge/380374/')
        ]
      },
      {
        id: 'js-m9',
        title: 'Module 9: DOM Manipulation & Web Events',
        subtitle: 'Selectors, Event Bubbling & Dynamic UI',
        category: 'Browser API',
        collegeSubjectMatch: 'Web Technologies',
        position: { x: 280, y: 1090 },
        prerequisites: ['js-m8'],
        description: 'Document Object Model tree, querySelector, dynamic HTML insertion, event listeners, bubbling and capturing.',
        estimatedHours: 5,
        keySkills: ['querySelector', 'DOM Tree Navigation', 'Event Listeners', 'Event Bubbling & Delegation'],
        resources: [
          r('Intro to Document Object Model', 'video', 'https://www.scaler.com/topics/course/javascript-beginners/video/292/'),
          r('DOM Querying and Manipulation', 'video', 'https://www.scaler.com/topics/course/javascript-beginners/video/293/'),
          r('Handling Click and Input Events', 'video', 'https://www.scaler.com/topics/course/javascript-beginners/video/294/'),
          r('Event Propagation (Bubbling & Capturing)', 'video', 'https://www.scaler.com/topics/course/javascript-beginners/video/295/'),
          r('Building an Interactive UI with JS', 'video', 'https://www.scaler.com/topics/course/javascript-beginners/video/300/')
        ]
      }
    ]
  },

  react: {
    id: 'react',
    title: 'React.js Frontend Roadmap',
    description: '10 Modules | 58 Lessons | 9h 13m + FilmVault Production Project. Built specifically for college engineering placements.',
    estimatedHours: 50,
    difficulty: 'Beginner to Advanced',
    prerequisites: ['HTML/CSS basics', 'JavaScript ES6+'],
    topics: [
      {
        id: 'react-m1',
        title: 'Module 1: Introduction to React JS',
        subtitle: 'SPA Architecture & Virtual DOM',
        category: 'Foundations',
        collegeSubjectMatch: 'Web Technologies',
        position: { x: 280, y: 50 },
        prerequisites: [],
        description: 'Understand the problems with vanilla JavaScript DOM manipulation and how React solves them using declarative UI and reconciliation.',
        estimatedHours: 3,
        keySkills: ['Single Page Apps', 'Declarative UI', 'Virtual DOM', 'Reconciliation'],
        resources: [
          r('Scaler Free React Course Page', 'article', 'https://www.scaler.com/topics/course/free-react-js-course/'),
          r('Lesson 1: Introduction to React JS', 'video', 'https://www.scaler.com/topics/course/free-react-js-course/video/1644/'),
          r('Module 1 Assessment (8 Questions)', 'exercise', 'https://www.scaler.com/topics/course/free-react-js-course/challenge/934748/')
        ]
      },
      {
        id: 'react-m2',
        title: 'Module 2: Dev Environment Setup',
        subtitle: 'Node, Vite/CRA & Modern Tooling',
        category: 'Tooling',
        collegeSubjectMatch: 'Software Engineering Lab',
        position: { x: 280, y: 180 },
        prerequisites: ['react-m1'],
        description: 'Configure your React local workspace with Node.js, Vite bundler, VS Code extensions, and inspect project bundle structure.',
        estimatedHours: 2,
        keySkills: ['Vite / CRA', 'NPM Scripts', 'VS Code Setup', 'Hot Module Replacement'],
        resources: [
          r('Lesson 1: Dev Environment Setup', 'video', 'https://www.scaler.com/topics/course/free-react-js-course/video/1675/'),
          r('Module 2 Assessment (6 Questions)', 'exercise', 'https://www.scaler.com/topics/course/free-react-js-course/challenge/934776/')
        ]
      },
      {
        id: 'react-m3',
        title: 'Module 3: Component Architecture & JSX',
        subtitle: 'Functional Components & Props',
        category: 'Core Concepts',
        collegeSubjectMatch: 'Object Oriented Software Design',
        position: { x: 280, y: 310 },
        prerequisites: ['react-m2'],
        description: 'Build modular, reusable UI components with JSX syntax, props passing, destructuring, and conditional rendering.',
        estimatedHours: 4,
        keySkills: ['JSX Syntax', 'Props Passing', 'Component Composition', 'Conditional Rendering'],
        resources: [
          r('Lesson 1: Component Architecture & JSX', 'video', 'https://www.scaler.com/topics/course/free-react-js-course/video/1683/'),
          r('Module 3 Assessment (14 Questions)', 'exercise', 'https://www.scaler.com/topics/course/free-react-js-course/challenge/934800/')
        ]
      },
      {
        id: 'react-m4',
        title: 'Module 4: State, Events & Forms',
        subtitle: 'useState Hook & Controlled Inputs',
        category: 'Interactivity',
        collegeSubjectMatch: 'Human Computer Interaction',
        position: { x: 280, y: 440 },
        prerequisites: ['react-m3'],
        description: 'Managing reactive component state using useState, synthetic event handlers, two-way data binding, and controlled forms.',
        estimatedHours: 5,
        keySkills: ['useState Hook', 'Synthetic Events', 'Controlled Inputs', 'Form Validation'],
        resources: [
          r('Lesson 1: State Events and Forms', 'video', 'https://www.scaler.com/topics/course/free-react-js-course/video/1695/'),
          r('Module 4 Assessment (10 Questions)', 'exercise', 'https://www.scaler.com/topics/course/free-react-js-course/challenge/934861/')
        ]
      },
      {
        id: 'react-m5',
        title: 'Module 5: Project - ToDo List App',
        subtitle: 'Hands-on Mini Project',
        category: 'Projects',
        collegeSubjectMatch: 'Project Work / Mini Project',
        position: { x: 280, y: 570 },
        prerequisites: ['react-m4'],
        description: 'Build a full-featured CRUD ToDo List web app: create, delete, toggle completion, and filter tasks.',
        estimatedHours: 4,
        keySkills: ['CRUD State Handling', 'Array State Updates', 'List Keys', 'Local Persistence'],
        resources: [
          r('Lesson 1: Build a ToDo List with React', 'video', 'https://www.scaler.com/topics/course/free-react-js-course/video/1701/'),
          r('Module 5 Project Test (4 Questions)', 'exercise', 'https://www.scaler.com/topics/course/free-react-js-course/challenge/944500/')
        ]
      },
      {
        id: 'react-m6',
        title: 'Module 6: Project FilmVault - Part 1',
        subtitle: 'Movies Component & Grid Layout',
        category: 'Production Project',
        collegeSubjectMatch: 'Web Development Lab',
        position: { x: 280, y: 700 },
        prerequisites: ['react-m5'],
        description: 'Kickstart FilmVault: build the Movies Component, movie card layouts, ratings badges, and responsive UI grid.',
        estimatedHours: 5,
        keySkills: ['Responsive Grid', 'Component Hierarchy', 'Styling UI', 'Reusable Cards'],
        resources: [
          r('Lesson 1: FilmVault-1 (Build Movies Component)', 'video', 'https://www.scaler.com/topics/course/free-react-js-course/video/1658/'),
          r('Module 6 Assessment (10 Questions)', 'exercise', 'https://www.scaler.com/topics/course/free-react-js-course/challenge/944536/')
        ]
      },
      {
        id: 'react-m7',
        title: 'Module 7: Project FilmVault - Part 2',
        subtitle: 'HTTP Requests & useEffect Hook',
        category: 'Production Project',
        collegeSubjectMatch: 'Computer Networks / Web Tech',
        position: { x: 280, y: 830 },
        prerequisites: ['react-m6'],
        description: 'Integrate live movie APIs (TMDB), lifecycle side effects with useEffect, loading spinners, and error boundaries.',
        estimatedHours: 6,
        keySkills: ['useEffect Hook', 'Axios / Fetch API', 'Side Effect Cleanup', 'Async API Handling'],
        resources: [
          r('Lesson 1: FilmVault-2 (Http & useEffect)', 'video', 'https://www.scaler.com/topics/course/free-react-js-course/video/1664/'),
          r('Module 7 Assessment (5 Questions)', 'exercise', 'https://www.scaler.com/topics/course/free-react-js-course/challenge/944567/')
        ]
      },
      {
        id: 'react-m8',
        title: 'Module 8: Project FilmVault - Part 3',
        subtitle: 'Watchlist, Filtering & Pagination',
        category: 'Production Project',
        collegeSubjectMatch: 'Software Engineering Project',
        position: { x: 280, y: 960 },
        prerequisites: ['react-m7'],
        description: 'Complete FilmVault with Watchlist storage, genre filtering, search debounce, sorting, and pagination controls.',
        estimatedHours: 8,
        keySkills: ['Local Storage Sync', 'Multi-field Sorting', 'Search Filtering', 'Pagination Logic'],
        resources: [
          r('Lesson 1: FilmVault-3 (Build the Watchlist)', 'video', 'https://www.scaler.com/topics/course/free-react-js-course/video/1670/'),
          r('Module 8 Assessment (6 Questions)', 'exercise', 'https://www.scaler.com/topics/course/free-react-js-course/challenge/945755/')
        ]
      },
      {
        id: 'react-m9',
        title: 'Module 9: Context API & Global State',
        subtitle: 'Avoid Prop Drilling with Context',
        category: 'Architecture',
        collegeSubjectMatch: 'Design Patterns',
        position: { x: 280, y: 1090 },
        prerequisites: ['react-m8'],
        description: 'Solve prop-drilling challenges using createContext, Context.Provider, and useContext hook for scalable application state.',
        estimatedHours: 4,
        keySkills: ['createContext', 'useContext Hook', 'Custom Provider', 'State Decoupling'],
        resources: [
          r('Lesson 1: Context API', 'video', 'https://www.scaler.com/topics/course/free-react-js-course/video/1682/'),
          r('Module 9 Assessment (5 Questions)', 'exercise', 'https://www.scaler.com/topics/course/free-react-js-course/challenge/945756/')
        ]
      },
      {
        id: 'react-m10',
        title: 'Module 10: Advanced React Hooks',
        subtitle: 'useReducer, useMemo & useCallback',
        category: 'Performance',
        collegeSubjectMatch: 'Algorithms Optimization',
        position: { x: 280, y: 1220 },
        prerequisites: ['react-m9'],
        description: 'Master enterprise-level hooks: useReducer for state machines, useMemo for expensive calculations, and useCallback for reference stability.',
        estimatedHours: 5,
        keySkills: ['useReducer', 'useMemo', 'useCallback', 'React Profiler'],
        resources: [
          r('Lesson 1: Advanced Hooks', 'video', 'https://www.scaler.com/topics/course/free-react-js-course/video/1686/'),
          r('Module 10 Assessment & Certification Test', 'exercise', 'https://www.scaler.com/topics/course/free-react-js-course/challenge/945757/')
        ]
      }
    ]
  },

  nodejs: {
    id: 'nodejs',
    title: 'Node.js  - Master the Fundamentals',
    description: '10 Modules | 58 Lessons | 7h 6m. Comprehensive backend curriculum from Node runtime to Express REST APIs & MongoDB.',
    estimatedHours: 45,
    difficulty: 'Intermediate',
    prerequisites: ['JavaScript Fundamentals', 'Basic Terminal / CLI'],
    topics: [
      {
        id: 'node-m1',
        title: 'Module 1: Introduction to Node.js',
        subtitle: 'Course Orientation & Scaler Certification',
        category: 'Overview',
        collegeSubjectMatch: 'Web Technologies',
        position: { x: 280, y: 50 },
        prerequisites: [],
        description: 'Understand the course roadmap, Scaler certification requirements, and the role of server-side JavaScript in modern web architectures.',
        estimatedHours: 1,
        keySkills: ['Node.js Architecture', 'Server-Side vs Client-Side', 'Learning Outcomes'],
        resources: [
          r('Introduction to the Node JS Course (04:11)', 'video', 'https://www.scaler.com/topics/course/nodejs/video/1634/')
        ]
      },
      {
        id: 'node-m2',
        title: 'Module 2: Getting Started with Node.js',
        subtitle: 'V8 Engine, Installation & First Program',
        category: 'Foundations',
        collegeSubjectMatch: 'Operating Systems Lab',
        position: { x: 280, y: 180 },
        prerequisites: ['node-m1'],
        description: 'Setup Node.js runtime and VS Code development environment. Learn how V8 executes JavaScript outside the browser.',
        estimatedHours: 2,
        keySkills: ['Node Installation', 'VS Code Config', 'Node REPL', 'CLI Execution'],
        resources: [
          r('Introduction to Node.js (08:36)', 'video', 'https://www.scaler.com/topics/course/nodejs/video/967/'),
          r('Installing Node.js and VS Code (05:21)', 'video', 'https://www.scaler.com/topics/course/nodejs/video/968/'),
          r('First Node Program (03:36)', 'video', 'https://www.scaler.com/topics/course/nodejs/video/969/')
        ]
      },
      {
        id: 'node-m3',
        title: 'Module 3: Node Module System',
        subtitle: 'FS, Path, OS & Child Processes',
        category: 'Core Modules',
        collegeSubjectMatch: 'Operating Systems',
        position: { x: 280, y: 310 },
        prerequisites: ['node-m2'],
        description: 'Deep dive into CommonJS module system, global object, Child Process, OS module, Path module, and File System (FS).',
        estimatedHours: 4,
        keySkills: ['CommonJS (require/exports)', 'FS Module (Sync/Async)', 'Path & OS Modules', 'Child Processes'],
        resources: [
          r('The Global Object (03:07)', 'video', 'https://www.scaler.com/topics/course/nodejs/video/970/'),
          r('Modules and Modularity (08:18)', 'video', 'https://www.scaler.com/topics/course/nodejs/video/971/'),
          r('Introduction to Node Modules (03:00)', 'video', 'https://www.scaler.com/topics/course/nodejs/video/972/'),
          r('Child Process Module (06:46)', 'video', 'https://www.scaler.com/topics/course/nodejs/video/973/'),
          r('OS Module (04:42)', 'video', 'https://www.scaler.com/topics/course/nodejs/video/974/'),
          r('Path Module (05:44)', 'video', 'https://www.scaler.com/topics/course/nodejs/video/975/'),
          r('FS Module with Files (11:14)', 'video', 'https://www.scaler.com/topics/course/nodejs/video/976/'),
          r('FS Module with Directories (08:56)', 'video', 'https://www.scaler.com/topics/course/nodejs/video/977/')
        ]
      },
      {
        id: 'node-m4',
        title: 'Module 4: Node Package Manager (NPM)',
        subtitle: 'Dependencies, SemVer & Package Publishing',
        category: 'Tooling',
        collegeSubjectMatch: 'Software Engineering',
        position: { x: 280, y: 440 },
        prerequisites: ['node-m3'],
        description: 'Managing third-party packages with npm, lockfiles, semantic versioning (SemVer), .gitignore patterns, and publishing packages.',
        estimatedHours: 3,
        keySkills: ['package.json & package-lock', 'Semantic Versioning (^ vs ~)', 'NPM Scripts', 'Publishing Packages'],
        resources: [
          r('Introduction to NPM (05:19)', 'video', 'https://www.scaler.com/topics/course/nodejs/video/978/'),
          r('How to Install & Use an NPM Package (06:45)', 'video', 'https://www.scaler.com/topics/course/nodejs/video/979/'),
          r('All About .gitignore (05:31)', 'video', 'https://www.scaler.com/topics/course/nodejs/video/980/'),
          r('Semantic Versioning (05:21)', 'video', 'https://www.scaler.com/topics/course/nodejs/video/981/'),
          r('Publish Your Own NPM Package (08:57)', 'video', 'https://www.scaler.com/topics/course/nodejs/video/982/')
        ]
      },
      {
        id: 'node-m5',
        title: 'Module 5: Getting Started with Express',
        subtitle: 'Routing, HTTP Verbs & Postman',
        category: 'Web Framework',
        collegeSubjectMatch: 'Web Technologies',
        position: { x: 280, y: 570 },
        prerequisites: ['node-m4'],
        description: 'Building web servers using Express.js. Master route parameters, request query parsing, HTTP verbs (GET, POST, PUT, DELETE), and Postman testing.',
        estimatedHours: 6,
        keySkills: ['Express Routing', 'RESTful Endpoints', 'Route Parameters', 'Postman API Testing', 'Nodemon'],
        resources: [
          r('Introduction to Express (12:18)', 'video', 'https://www.scaler.com/topics/course/nodejs/video/983/'),
          r('Express Installation (02:08)', 'video', 'https://www.scaler.com/topics/course/nodejs/video/984/'),
          r("Let's Use Express (07:30)", 'video', 'https://www.scaler.com/topics/course/nodejs/video/985/'),
          r('Nodemon Hot Reloading (02:01)', 'video', 'https://www.scaler.com/topics/course/nodejs/video/986/'),
          r('Environment Variables & PORT (02:34)', 'video', 'https://www.scaler.com/topics/course/nodejs/video/987/'),
          r('Route Parameters (05:18)', 'video', 'https://www.scaler.com/topics/course/nodejs/video/988/'),
          r('Handling Multiple Routes (10:52)', 'video', 'https://www.scaler.com/topics/course/nodejs/video/989/'),
          r('Testing APIs with Postman (05:12)', 'video', 'https://www.scaler.com/topics/course/nodejs/video/990/'),
          r('HTTP POST Method (08:56)', 'video', 'https://www.scaler.com/topics/course/nodejs/video/991/'),
          r('HTTP PUT Method (05:12)', 'video', 'https://www.scaler.com/topics/course/nodejs/video/992/'),
          r('HTTP DELETE Method (08:40)', 'video', 'https://www.scaler.com/topics/course/nodejs/video/993/')
        ]
      },
      {
        id: 'node-m6',
        title: 'Module 6: Middlewares in Express',
        subtitle: 'Request Pipeline & Custom Middlewares',
        category: 'Web Framework',
        collegeSubjectMatch: 'Software Architecture',
        position: { x: 280, y: 700 },
        prerequisites: ['node-m5'],
        description: 'Understand the middleware chain in Express. Build custom authentication and logging middlewares, and integrate third-party packages (morgan, cors).',
        estimatedHours: 3,
        keySkills: ['Middleware Chain', 'next() Function', 'Custom Middlewares', 'Third-Party Middlewares'],
        resources: [
          r('What are Middlewares (06:38)', 'video', 'https://www.scaler.com/topics/course/nodejs/video/994/'),
          r('Writing Custom Middlewares (07:04)', 'video', 'https://www.scaler.com/topics/course/nodejs/video/995/'),
          r('Third Party Middlewares (04:26)', 'video', 'https://www.scaler.com/topics/course/nodejs/video/996/')
        ]
      },
      {
        id: 'node-m7',
        title: 'Module 7: Asynchronous JavaScript in Node',
        subtitle: 'Event Loop, Promises & Microtasks',
        category: 'Core Runtime',
        collegeSubjectMatch: 'Operating Systems',
        position: { x: 280, y: 830 },
        prerequisites: ['node-m6'],
        description: 'Understand Node.js libuv event loop phases, non-blocking I/O, synchronous vs asynchronous file reads, Promises, and async/await mechanics.',
        estimatedHours: 5,
        keySkills: ['libuv Event Loop', 'Non-blocking I/O', 'Promises in Node', 'Async/Await error handling'],
        resources: [
          r('Introduction to Asynchronous Programming (14:16)', 'video', 'https://www.scaler.com/topics/course/nodejs/video/286/'),
          r('Reading a File Synchronously (05:44)', 'video', 'https://www.scaler.com/topics/course/nodejs/video/287/'),
          r('Reading a File Asynchronously (06:10)', 'video', 'https://www.scaler.com/topics/course/nodejs/video/288/'),
          r('The Event Loop & Everything (18:20)', 'video', 'https://www.scaler.com/topics/course/nodejs/video/289/'),
          r('Promises Deep Dive (12:45)', 'video', 'https://www.scaler.com/topics/course/nodejs/video/290/'),
          r('Async / Await in Node.js (15:10)', 'video', 'https://www.scaler.com/topics/course/nodejs/video/291/')
        ]
      },
      {
        id: 'node-m8',
        title: 'Module 8: Introduction to MongoDB',
        subtitle: 'NoSQL Concepts, Collections & Shell Queries',
        category: 'Databases',
        collegeSubjectMatch: 'Database Management Systems',
        position: { x: 280, y: 960 },
        prerequisites: ['node-m7'],
        description: 'Relational vs NoSQL databases, JSON/BSON document model, MongoDB Atlas cloud cluster setup, and basic CRUD operations via MongoDB Shell.',
        estimatedHours: 4,
        keySkills: ['NoSQL vs SQL', 'BSON Documents', 'MongoDB Atlas', 'Mongosh CRUD'],
        resources: [
          r('Introduction to NoSQL Databases (10:15)', 'video', 'https://www.scaler.com/topics/course/nodejs/video/997/'),
          r('Setting up MongoDB Atlas (08:30)', 'video', 'https://www.scaler.com/topics/course/nodejs/video/998/'),
          r('MongoDB Shell & Basic Commands (12:45)', 'video', 'https://www.scaler.com/topics/course/nodejs/video/999/'),
          r('Insert & Query Documents (11:20)', 'video', 'https://www.scaler.com/topics/course/nodejs/video/1000/'),
          r('Update & Delete Operations (09:40)', 'video', 'https://www.scaler.com/topics/course/nodejs/video/1001/')
        ]
      },
      {
        id: 'node-m9',
        title: 'Module 9: Working with Mongoose ODM',
        subtitle: 'Schemas, Models & Validation',
        category: 'Databases',
        collegeSubjectMatch: 'Database Management Systems',
        position: { x: 280, y: 1090 },
        prerequisites: ['node-m8'],
        description: 'Connect Express applications to MongoDB with Mongoose ODM. Create strongly typed Schemas, Models, custom validators, and query filters.',
        estimatedHours: 5,
        keySkills: ['Mongoose Schemas', 'Model CRUD', 'Built-in & Custom Validators', 'Query Operators ($gt, $in)'],
        resources: [
          r('Connecting Mongoose to Express (08:15)', 'video', 'https://www.scaler.com/topics/course/nodejs/video/1005/'),
          r('Mongoose Schemas and Models (14:20)', 'video', 'https://www.scaler.com/topics/course/nodejs/video/1006/'),
          r('Querying Data with Mongoose (12:10)', 'video', 'https://www.scaler.com/topics/course/nodejs/video/1007/'),
          r('Validation Rules in Mongoose (10:45)', 'video', 'https://www.scaler.com/topics/course/nodejs/video/1008/')
        ]
      },
      {
        id: 'node-m10',
        title: 'Module 10: Project - Data Modeling & Relationships',
        subtitle: 'Referencing, Embedding & Production REST API',
        category: 'Production Project',
        collegeSubjectMatch: 'Major Project / Capstone',
        position: { x: 280, y: 1220 },
        prerequisites: ['node-m9'],
        description: 'Complete capstone project: document normalization vs denormalization (subdocuments vs ObjectId references), population, and full CRUD REST API.',
        estimatedHours: 8,
        keySkills: ['Embedded Documents', 'ObjectId References', 'populate() Query', 'Complete REST API Project'],
        resources: [
          r('Data Modeling: Normalization vs Denormalization (12:30)', 'video', 'https://www.scaler.com/topics/course/nodejs/video/1009/'),
          r('Embedding Subdocuments in Mongoose (11:40)', 'video', 'https://www.scaler.com/topics/course/nodejs/video/1010/'),
          r('Referencing Documents using ObjectId (13:15)', 'video', 'https://www.scaler.com/topics/course/nodejs/video/1011/'),
          r('Mongoose populate() Deep Dive (10:50)', 'video', 'https://www.scaler.com/topics/course/nodejs/video/1012/'),
          r('Building the Full CRUD REST API Project (25:00)', 'video', 'https://www.scaler.com/topics/course/nodejs/video/1013/')
        ]
      }
    ]
  },

  'full-stack': {
    id: 'full-stack',
    title: 'Full Stack MERN Developer Track',
    description: 'Comprehensive pathway to building full-stack JavaScript applications with React, Node, Express & MongoDB.',
    estimatedHours: 120,
    difficulty: 'Intermediate to Advanced',
    prerequisites: ['HTML, CSS & JS Basics'],
    topics: [
      {
        id: 'fs-1',
        title: 'Frontend Client Architecture',
        subtitle: 'React Single Page App',
        category: 'Frontend',
        collegeSubjectMatch: 'Web Technologies',
        position: { x: 280, y: 50 },
        prerequisites: [],
        description: 'Modern React SPA scaffolding with routing, global state, and responsive layouts.',
        estimatedHours: 15,
        keySkills: ['React 18+', 'Vite', 'Tailwind CSS', 'Client Routing'],
        resources: [r('React Docs', 'docs', 'https://react.dev')]
      },
      {
        id: 'fs-2',
        title: 'Backend REST API Services',
        subtitle: 'Express & Modular Routers',
        category: 'Backend',
        collegeSubjectMatch: 'Web Technologies',
        position: { x: 280, y: 180 },
        prerequisites: ['fs-1'],
        description: 'Scalable Express controller-service-repository patterns and route modularity.',
        estimatedHours: 15,
        keySkills: ['Node.js', 'Express', 'REST Design', 'Middleware Pipelines'],
        resources: [r('Express Guide', 'docs', 'https://expressjs.com')]
      },
      {
        id: 'fs-3',
        title: 'Database & Data Modeling',
        subtitle: 'MongoDB & Mongoose Schema',
        category: 'Database',
        collegeSubjectMatch: 'Database Management Systems',
        position: { x: 280, y: 310 },
        prerequisites: ['fs-2'],
        description: 'Document databases, indexing, indexing strategies, and Mongoose population.',
        estimatedHours: 12,
        keySkills: ['MongoDB', 'Mongoose', 'Aggregation Pipeline', 'Indexes'],
        resources: [r('MongoDB University', 'course', 'https://learn.mongodb.com')]
      },
      {
        id: 'fs-4',
        title: 'Authentication & Security',
        subtitle: 'JWT, bcrypt & HttpOnly Cookies',
        category: 'Security',
        collegeSubjectMatch: 'Cryptography & Network Security',
        position: { x: 280, y: 440 },
        prerequisites: ['fs-3'],
        description: 'Stateful sessions vs stateless JWT authentication with refresh token rotation.',
        estimatedHours: 10,
        keySkills: ['JWT', 'bcrypt hashing', 'HttpOnly cookies', 'CORS & Helmet'],
        resources: [r('OWASP Security Cheat Sheet', 'article', 'https://cheatsheetseries.owasp.org')]
      },
      {
        id: 'fs-5',
        title: 'Production Deployment & CI/CD',
        subtitle: 'Vercel, Render & Docker',
        category: 'DevOps',
        collegeSubjectMatch: 'Cloud Computing',
        position: { x: 280, y: 570 },
        prerequisites: ['fs-4'],
        description: 'Deploying frontend to CDN and backend containers with continuous integration.',
        estimatedHours: 10,
        keySkills: ['Docker Basics', 'Vercel / Render', 'GitHub Actions', 'Environment Variables'],
        resources: [r('Docker Curriculum', 'article', 'https://docker-curriculum.com')]
      }
    ]
  },

  'dsa-placement': {
    id: 'dsa-placement',
    title: 'Data Structures & Algorithms',
    description: 'Structured roadmap covering foundational to advanced DSA patterns frequently asked in campus interviews.',
    estimatedHours: 100,
    difficulty: 'Intermediate',
    prerequisites: ['Any programming language (C++, Java, Python, or JS)'],
    topics: [
      {
        id: 'dsa-1',
        title: 'Time & Space Complexity',
        subtitle: 'Big-O Notation & Asymptotic Analysis',
        category: 'Foundations',
        collegeSubjectMatch: 'Design and Analysis of Algorithms',
        position: { x: 280, y: 50 },
        prerequisites: [],
        description: 'Understand best, average, and worst-case scenarios, recurrence relations and space tradeoffs.',
        estimatedHours: 6,
        keySkills: ['Big-O', 'Big-Omega', 'Master Theorem', 'Auxiliary Space'],
        resources: [r('Scaler Free DSA Course', 'course', 'https://www.scaler.com/topics/data-structures/')]
      },
      {
        id: 'dsa-2',
        title: 'Arrays, Strings & Two Pointers',
        subtitle: 'Sliding Window & Prefix Sum',
        category: 'Data Structures',
        collegeSubjectMatch: 'Data Structures',
        position: { x: 280, y: 180 },
        prerequisites: ['dsa-1'],
        description: 'Master in-place manipulation, two-pointer convergence, sliding window maximums, and prefix sums.',
        estimatedHours: 15,
        keySkills: ['Two Pointers', 'Sliding Window', 'Kadane Algorithm', 'Prefix Sums'],
        resources: [r('LeetCode Top Interview 150', 'exercise', 'https://leetcode.com')]
      },
      {
        id: 'dsa-3',
        title: 'Hashing & Hash Maps',
        subtitle: 'Collision Handling & Frequency Maps',
        category: 'Data Structures',
        collegeSubjectMatch: 'Data Structures',
        position: { x: 280, y: 310 },
        prerequisites: ['dsa-2'],
        description: 'Internal working of hash tables, collisions, probing, and solving frequency count problems in O(1).',
        estimatedHours: 10,
        keySkills: ['Hash Functions', 'Hash Sets & Maps', 'Subarray Sum Equals K', 'Two Sum Variations'],
        resources: [r('Hashing Techniques Guide', 'article', 'https://www.scaler.com/topics/data-structures/hash-table/')]
      },
      {
        id: 'dsa-4',
        title: 'Linked Lists',
        subtitle: 'Singly, Doubly, Fast & Slow Pointers',
        category: 'Data Structures',
        collegeSubjectMatch: 'Data Structures',
        position: { x: 280, y: 440 },
        prerequisites: ['dsa-3'],
        description: 'Node pointer manipulation, cycle detection (Floyd Cycle), reverse linked list, and merge k sorted lists.',
        estimatedHours: 12,
        keySkills: ['Pointer Reversal', 'Cycle Detection', 'Fast-Slow Pointers', 'LRU Cache Design'],
        resources: [r('Linked List Patterns', 'article', 'https://www.scaler.com/topics/data-structures/linked-list/')]
      },
      {
        id: 'dsa-5',
        title: 'Stacks, Queues & Monotonic Stack',
        subtitle: 'LIFO, FIFO & Next Greater Element',
        category: 'Data Structures',
        collegeSubjectMatch: 'Data Structures',
        position: { x: 280, y: 570 },
        prerequisites: ['dsa-4'],
        description: 'Implementations using arrays and linked lists, circular queue, deque, and monotonic stack patterns.',
        estimatedHours: 12,
        keySkills: ['Monotonic Stack', 'Next Greater Element', 'Valid Parentheses', 'Queue using Stacks'],
        resources: [r('Stacks & Queues Deep Dive', 'article', 'https://www.scaler.com/topics/data-structures/stack/')]
      },
      {
        id: 'dsa-6',
        title: 'Binary Trees & BST',
        subtitle: 'Traversals, Views & Balance',
        category: 'Data Structures',
        collegeSubjectMatch: 'Data Structures',
        position: { x: 280, y: 700 },
        prerequisites: ['dsa-5'],
        description: 'Inorder, preorder, postorder, BFS level-order traversal, tree diameter, lowest common ancestor, and BST validations.',
        estimatedHours: 18,
        keySkills: ['Tree Traversals (DFS/BFS)', 'LCA', 'Diameter of Tree', 'BST Validation'],
        resources: [r('Binary Tree Scaler Tutorial', 'article', 'https://www.scaler.com/topics/data-structures/binary-tree/')]
      },
      {
        id: 'dsa-7',
        title: 'Recursion & Backtracking',
        subtitle: 'Subsets, Permutations & N-Queens',
        category: 'Algorithms',
        collegeSubjectMatch: 'Design and Analysis of Algorithms',
        position: { x: 280, y: 830 },
        prerequisites: ['dsa-6'],
        description: 'State space trees, recursive base conditions, pruning branches, combinations, permutations, and grid backtracking.',
        estimatedHours: 15,
        keySkills: ['Recursion Tree', 'Backtracking Pruning', 'Subsets & Permutations', 'N-Queens'],
        resources: [r('Backtracking Patterns', 'article', 'https://www.scaler.com/topics/data-structures/backtracking-algorithm/')]
      },
      {
        id: 'dsa-8',
        title: 'Dynamic Programming',
        subtitle: '1D/2D DP, Knapsack & Subsequences',
        category: 'Algorithms',
        collegeSubjectMatch: 'Design and Analysis of Algorithms',
        position: { x: 280, y: 960 },
        prerequisites: ['dsa-7'],
        description: 'Overlapping subproblems, optimal substructure, memoization vs tabulation, 0/1 Knapsack, LCS, and LIS.',
        estimatedHours: 25,
        keySkills: ['Memoization (Top-down)', 'Tabulation (Bottom-up)', '0/1 Knapsack', 'LCS & LIS Patterns'],
        resources: [r('Dynamic Programming Guide', 'article', 'https://www.scaler.com/topics/data-structures/dynamic-programming/')]
      },
      {
        id: 'dsa-9',
        title: 'Graphs & Shortest Paths',
        subtitle: 'BFS, DFS, Dijkstra & Topological Sort',
        category: 'Algorithms',
        collegeSubjectMatch: 'Design and Analysis of Algorithms',
        position: { x: 280, y: 1090 },
        prerequisites: ['dsa-8'],
        description: 'Adjacency list/matrix representation, connected components, cycle detection, Kahn Algorithm, and Dijkstra shortest path.',
        estimatedHours: 20,
        keySkills: ['Graph BFS & DFS', 'Topological Sort', 'Dijkstra Algorithm', 'Disjoint Set Union (DSU)'],
        resources: [r('Graph Algorithms Masterclass', 'article', 'https://www.scaler.com/topics/data-structures/graph/')]
      }
    ]
  }
};

export const getRoadmap = (domain = 'javascript') => {
  return ROADMAPS[domain] || ROADMAPS.javascript;
};
