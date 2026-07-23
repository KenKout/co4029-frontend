export interface Course {
  id: string;
  slug: string;
  title: string;
  description: string;
  instructor: string;
  instructorAvatar?: string;
  instructorBio: string;
  category: string;
  thumbnail: string;
  duration: string;
  totalLessons: number;
  completedLessons?: number;
  students: number;
  rating: number;
  reviews: number;
  level: "Beginner" | "Intermediate" | "Advanced";
  tags: string[];
  progress?: number;
  price?: number;
  isFeatured?: boolean;
  lastUpdated: string;
  outcomes: string[];
  modules: CourseModule[];
}

export interface CourseModule {
  id: string;
  title: string;
  duration: string;
  lessons: CourseLesson[];
}

export interface CourseResource {
  name: string;
  type: "PDF" | "ZIP" | "MP4" | "XLSX" | "PPTX";
  size: string;
  url: string;
}

export interface CourseLesson {
  id: string;
  title: string;
  duration: string;
  type: "video" | "reading";
  completed?: boolean;
  resources?: CourseResource[];
  quizId?: string;
}

export const categories = [
  "All",
  "AI & Machine Learning",
  "Web Development",
  "Data Science",
  "Cloud Computing",
  "Cybersecurity",
  "Mobile Development",
  "DevOps",
  "Blockchain",
];

export const courses: Course[] = [
  {
    id: "1",
    slug: "intro-to-machine-learning",
    title: "Introduction to Machine Learning",
    description:
      "Master the fundamentals of machine learning with hands-on projects. From regression to neural networks, build a solid foundation in AI.",
    instructor: "Dr. Sarah Chen",
    instructorBio:
      "AI researcher and educator with 10+ years of industry experience at Google Brain and Stanford. Helped over 50,000 students break into ML.",
    category: "AI & Machine Learning",
    thumbnail: "/courses/ml-intro.jpg",
    duration: "12h 30m",
    totalLessons: 48,
    completedLessons: 32,
    students: 12450,
    rating: 4.8,
    reviews: 2340,
    level: "Beginner",
    tags: ["Python", "TensorFlow", "Neural Networks"],
    progress: 67,
    isFeatured: true,
    lastUpdated: "2025-02-15",
    outcomes: [
      "Understand supervised, unsupervised, and reinforcement learning paradigms",
      "Build and train neural networks from scratch using Python",
      "Apply TensorFlow to solve real-world ML problems",
      "Implement regression and classification algorithms confidently",
      "Evaluate and improve model performance using best practices",
      "Complete end-to-end ML project pipelines independently",
    ],
    modules: [
      {
        id: "m1",
        title: "Foundations of ML",
        duration: "2h 45m",
        lessons: [
          {
            id: "l1",
            title: "What is Machine Learning?",
            duration: "15m",
            type: "video",
            completed: true,
          },
          {
            id: "l2",
            title: "Types of Learning",
            duration: "20m",
            type: "video",
            completed: true,
          },
          {
            id: "l3",
            title: "Setting Up Your Environment",
            duration: "25m",
            type: "reading",
            completed: true,
          },
          {
            id: "l4",
            title: "Your First Model",
            duration: "30m",
            type: "video",
            completed: true,
          },
          {
            id: "l5",
            title: "Module Review",
            duration: "15m",
            type: "reading",
            completed: true,
          },
          {
            id: "l5b",
            title: "Applied Practice Review",
            duration: "10m",
            type: "reading",
            completed: false,
          },
        ],
      },
      {
        id: "m2",
        title: "Supervised Learning",
        duration: "3h 15m",
        lessons: [
          {
            id: "l6",
            title: "Linear Regression Deep Dive",
            duration: "25m",
            type: "video",
            completed: true,
          },
          {
            id: "l7",
            title: "Classification Algorithms",
            duration: "30m",
            type: "video",
            completed: true,
          },
          {
            id: "l8",
            title: "Decision Trees & Random Forests",
            duration: "35m",
            type: "video",
            completed: false,
          },
          {
            id: "l9",
            title: "Hands-On: Predict Housing Prices",
            duration: "45m",
            type: "reading",
            completed: false,
          },
          {
            id: "l10",
            title: "Module Review",
            duration: "15m",
            type: "reading",
            completed: false,
          },
        ],
      },
      {
        id: "m3",
        title: "Neural Networks",
        duration: "4h 00m",
        lessons: [
          {
            id: "l11",
            title: "Introduction to Neural Networks",
            duration: "30m",
            type: "video",
            completed: false,
          },
          {
            id: "l12",
            title: "Backpropagation Explained",
            duration: "35m",
            type: "video",
            completed: false,
          },
          {
            id: "l13",
            title: "Building with TensorFlow",
            duration: "45m",
            type: "reading",
            completed: false,
          },
          {
            id: "l14",
            title: "CNNs for Image Recognition",
            duration: "40m",
            type: "video",
            completed: false,
          },
          {
            id: "l15",
            title: "Final Project",
            duration: "60m",
            type: "reading",
            completed: false,
          },
        ],
      },
    ],
  },
  {
    id: "2",
    slug: "advanced-react-patterns",
    title: "Advanced React Patterns & Architecture",
    description:
      "Level up your React skills with advanced patterns including compound components, render props, custom hooks, and state machines.",
    instructor: "Alex Rivera",
    instructorBio:
      "Staff engineer at Vercel and open-source contributor. Creator of several popular React libraries with 20k+ GitHub stars.",
    category: "Web Development",
    thumbnail: "/courses/react-adv.jpg",
    duration: "8h 45m",
    totalLessons: 36,
    completedLessons: 12,
    students: 8920,
    rating: 4.9,
    reviews: 1856,
    level: "Advanced",
    tags: ["React", "TypeScript", "Architecture"],
    progress: 33,
    isFeatured: true,
    lastUpdated: "2025-03-01",
    outcomes: [
      "Master the compound component pattern for flexible UI design",
      "Implement state machines with XState for complex UI flows",
      "Build reusable custom React hooks with clean APIs",
      "Optimize React performance using memoization and lazy loading",
      "Write comprehensive tests with React Testing Library",
      "Design scalable, maintainable component architecture",
    ],
    modules: [
      {
        id: "m1",
        title: "Compound Components",
        duration: "2h 15m",
        lessons: [
          {
            id: "react-l1",
            title: "The Compound Pattern",
            duration: "20m",
            type: "video",
            completed: true,
          },
          {
            id: "react-l2",
            title: "Context API Mastery",
            duration: "25m",
            type: "video",
            completed: true,
          },
          {
            id: "react-l3",
            title: "Building a Tabs Component",
            duration: "35m",
            type: "reading",
            completed: true,
          },
          {
            id: "react-l4",
            title: "Module Review",
            duration: "15m",
            type: "reading",
            completed: false,
          },
        ],
      },
      {
        id: "m2",
        title: "State Machines",
        duration: "2h 30m",
        lessons: [
          {
            id: "react-l5",
            title: "Introduction to XState",
            duration: "25m",
            type: "video",
            completed: false,
          },
          {
            id: "react-l6",
            title: "Modeling UI States",
            duration: "30m",
            type: "video",
            completed: false,
          },
          {
            id: "react-l7",
            title: "Async State Machines",
            duration: "35m",
            type: "reading",
            completed: false,
          },
        ],
      },
      {
        id: "m3",
        title: "Performance & Testing",
        duration: "1h 15m",
        lessons: [
          {
            id: "react-l8",
            title: "Memoization & React.memo",
            duration: "25m",
            type: "video",
            completed: false,
          },
          {
            id: "react-l9",
            title: "React Testing Library",
            duration: "35m",
            type: "reading",
            completed: false,
          },
          {
            id: "react-l10",
            title: "Module Review",
            duration: "15m",
            type: "reading",
            completed: false,
          },
        ],
      },
    ],
  },
  {
    id: "3",
    slug: "data-science-python",
    title: "Data Science with Python",
    description:
      "Comprehensive data science bootcamp covering pandas, NumPy, visualization, statistical analysis, and ML integration.",
    instructor: "Dr. Maya Patel",
    instructorBio:
      "Lead data scientist at Netflix with a PhD from MIT. Published researcher in statistical learning and data visualization.",
    category: "Data Science",
    thumbnail: "/courses/data-science.jpg",
    duration: "16h 00m",
    totalLessons: 62,
    students: 15800,
    rating: 4.7,
    reviews: 3200,
    level: "Intermediate",
    tags: ["Python", "Pandas", "Statistics"],
    isFeatured: true,
    lastUpdated: "2025-01-20",
    outcomes: [
      "Wrangle and clean messy real-world datasets with Pandas",
      "Apply statistical analysis and hypothesis testing correctly",
      "Create compelling data visualizations with Matplotlib and Seaborn",
      "Build interactive dashboards with Plotly",
      "Integrate ML models into end-to-end data pipelines",
      "Complete a capstone data science project from scratch",
    ],
    modules: [
      {
        id: "m1",
        title: "Data Wrangling",
        duration: "4h 15m",
        lessons: [
          {
            id: "ds-l1",
            title: "Pandas Fundamentals",
            duration: "30m",
            type: "video",
          },
          {
            id: "ds-l2",
            title: "Data Cleaning Techniques",
            duration: "35m",
            type: "video",
          },
          {
            id: "ds-l3",
            title: "Merging & Reshaping",
            duration: "40m",
            type: "reading",
          },
          {
            id: "ds-l4",
            title: "Module Review",
            duration: "15m",
            type: "reading",
          },
        ],
      },
      {
        id: "m2",
        title: "Statistical Analysis",
        duration: "3h 30m",
        lessons: [
          {
            id: "ds-l5",
            title: "Descriptive Statistics",
            duration: "30m",
            type: "video",
          },
          {
            id: "ds-l6",
            title: "Hypothesis Testing",
            duration: "35m",
            type: "video",
          },
          {
            id: "ds-l7",
            title: "Correlation & Causation",
            duration: "40m",
            type: "video",
          },
          {
            id: "ds-l8",
            title: "Module Review",
            duration: "15m",
            type: "reading",
          },
        ],
      },
      {
        id: "m3",
        title: "Data Visualisation",
        duration: "4h 00m",
        lessons: [
          {
            id: "ds-l9",
            title: "Matplotlib Foundations",
            duration: "30m",
            type: "video",
          },
          {
            id: "ds-l10",
            title: "Seaborn Statistical Plots",
            duration: "35m",
            type: "video",
          },
          {
            id: "ds-l11",
            title: "Interactive Plots with Plotly",
            duration: "40m",
            type: "reading",
          },
          {
            id: "ds-l12",
            title: "Final Project",
            duration: "60m",
            type: "reading",
          },
        ],
      },
    ],
  },
  {
    id: "4",
    slug: "cloud-architecture-aws",
    title: "Cloud Architecture on AWS",
    description:
      "Design and implement scalable cloud solutions on AWS. Covers EC2, Lambda, S3, DynamoDB, and more.",
    instructor: "James Thompson",
    instructorBio:
      "AWS Solutions Architect Professional with 15 years of cloud experience. Built infrastructure for Fortune 500 companies and unicorn startups.",
    category: "Cloud Computing",
    thumbnail: "/courses/aws-cloud.jpg",
    duration: "10h 15m",
    totalLessons: 42,
    students: 6500,
    rating: 4.6,
    reviews: 980,
    level: "Intermediate",
    tags: ["AWS", "Cloud", "DevOps"],
    lastUpdated: "2025-02-28",
    outcomes: [
      "Design and deploy scalable cloud architectures on AWS",
      "Build serverless APIs with Lambda and API Gateway",
      "Configure EC2, VPC, and IAM for secure deployments",
      "Implement CI/CD pipelines with AWS CodePipeline",
      "Monitor applications and set alerts using CloudWatch",
      "Manage infrastructure as code with CloudFormation",
    ],
    modules: [
      {
        id: "m1",
        title: "AWS Fundamentals",
        duration: "3h 00m",
        lessons: [
          {
            id: "aws-l1",
            title: "Cloud Computing Overview",
            duration: "20m",
            type: "video",
          },
          {
            id: "aws-l2",
            title: "EC2 & VPC Deep Dive",
            duration: "35m",
            type: "video",
          },
          {
            id: "aws-l3",
            title: "S3 Storage & Lifecycle",
            duration: "30m",
            type: "video",
          },
          {
            id: "aws-l4",
            title: "IAM Roles & Policies",
            duration: "35m",
            type: "video",
          },
          {
            id: "aws-l5",
            title: "Module Review",
            duration: "15m",
            type: "reading",
          },
        ],
      },
      {
        id: "m2",
        title: "Serverless Architecture",
        duration: "3h 30m",
        lessons: [
          {
            id: "aws-l6",
            title: "Lambda Functions Deep Dive",
            duration: "30m",
            type: "video",
          },
          {
            id: "aws-l7",
            title: "API Gateway",
            duration: "25m",
            type: "video",
          },
          {
            id: "aws-l8",
            title: "DynamoDB Fundamentals",
            duration: "35m",
            type: "video",
          },
          {
            id: "aws-l9",
            title: "Build a Serverless API",
            duration: "45m",
            type: "reading",
          },
          {
            id: "aws-l10",
            title: "Module Review",
            duration: "15m",
            type: "reading",
          },
        ],
      },
      {
        id: "m3",
        title: "DevOps on AWS",
        duration: "3h 00m",
        lessons: [
          {
            id: "aws-l11",
            title: "CI/CD with CodePipeline",
            duration: "30m",
            type: "video",
          },
          {
            id: "aws-l12",
            title: "CloudFormation Basics",
            duration: "35m",
            type: "video",
          },
          {
            id: "aws-l13",
            title: "Monitoring with CloudWatch",
            duration: "25m",
            type: "video",
          },
        ],
      },
    ],
  },
  {
    id: "5",
    slug: "ethical-hacking-fundamentals",
    title: "Ethical Hacking & Penetration Testing",
    description:
      "Learn cybersecurity through hands-on penetration testing labs. Cover network security, web app testing, and more.",
    instructor: "Kim Nguyen",
    instructorBio:
      "OSCP-certified penetration tester with 12 years of red team experience. Ran security programs at three major financial institutions.",
    category: "Cybersecurity",
    thumbnail: "/courses/cybersec.jpg",
    duration: "14h 00m",
    totalLessons: 55,
    students: 9200,
    rating: 4.8,
    reviews: 1750,
    level: "Intermediate",
    tags: ["Security", "Networking", "Kali Linux"],
    lastUpdated: "2025-03-10",
    outcomes: [
      "Perform systematic reconnaissance and OSINT gathering",
      "Use industry tools like Nmap, Nessus, and Metasploit",
      "Identify and exploit common web vulnerabilities (SQLi, XSS, CSRF)",
      "Conduct full ethical penetration testing engagements",
      "Understand and demonstrate privilege escalation techniques",
      "Write professional, client-ready penetration testing reports",
    ],
    modules: [
      {
        id: "m1",
        title: "Reconnaissance",
        duration: "3h 30m",
        lessons: [
          {
            id: "hack-l1",
            title: "Information Gathering",
            duration: "25m",
            type: "video",
          },
          {
            id: "hack-l2",
            title: "Network Scanning",
            duration: "30m",
            type: "video",
          },
          {
            id: "hack-l3",
            title: "OSINT Techniques",
            duration: "35m",
            type: "video",
          },
          {
            id: "hack-l4",
            title: "Vulnerability Scanning with Nessus",
            duration: "30m",
            type: "video",
          },
          {
            id: "hack-l5",
            title: "Module Review",
            duration: "15m",
            type: "reading",
          },
        ],
      },
      {
        id: "m2",
        title: "Exploitation Techniques",
        duration: "4h 00m",
        lessons: [
          {
            id: "hack-l6",
            title: "Metasploit Framework",
            duration: "40m",
            type: "video",
          },
          {
            id: "hack-l7",
            title: "SQL Injection Deep Dive",
            duration: "35m",
            type: "video",
          },
          {
            id: "hack-l8",
            title: "XSS & CSRF Attacks",
            duration: "30m",
            type: "video",
          },
          {
            id: "hack-l9",
            title: "Hands-On: CTF Challenge",
            duration: "60m",
            type: "reading",
          },
          {
            id: "hack-l10",
            title: "Module Review",
            duration: "15m",
            type: "reading",
          },
        ],
      },
      {
        id: "m3",
        title: "Post-Exploitation & Reporting",
        duration: "3h 00m",
        lessons: [
          {
            id: "hack-l11",
            title: "Privilege Escalation",
            duration: "35m",
            type: "video",
          },
          {
            id: "hack-l12",
            title: "Persistence Mechanisms",
            duration: "30m",
            type: "video",
          },
          {
            id: "hack-l13",
            title: "Writing Pentest Reports",
            duration: "25m",
            type: "reading",
          },
        ],
      },
    ],
  },
  {
    id: "6",
    slug: "flutter-mobile-development",
    title: "Flutter & Dart: Build Beautiful Mobile Apps",
    description:
      "Create cross-platform mobile applications with Flutter. From widgets to state management to deployment.",
    instructor: "Lisa Park",
    instructorBio:
      "Senior Flutter engineer at Shopify. Google Developer Expert in Dart & Flutter with 5 published apps on the App Store and Play Store.",
    category: "Mobile Development",
    thumbnail: "/courses/flutter.jpg",
    duration: "11h 30m",
    totalLessons: 45,
    students: 7800,
    rating: 4.7,
    reviews: 1420,
    level: "Beginner",
    tags: ["Flutter", "Dart", "Mobile"],
    lastUpdated: "2025-02-10",
    outcomes: [
      "Build cross-platform mobile apps for iOS and Android",
      "Master Dart including async/await, null safety, and OOP",
      "Compose complex, responsive UIs with Flutter's widget system",
      "Implement state management with Riverpod and Provider",
      "Integrate REST APIs and handle real-world data",
      "Deploy finished apps to the App Store and Google Play",
    ],
    modules: [
      {
        id: "m1",
        title: "Dart Language Basics",
        duration: "2h 30m",
        lessons: [
          {
            id: "flutter-l1",
            title: "Dart Syntax & Types",
            duration: "20m",
            type: "video",
          },
          {
            id: "flutter-l2",
            title: "OOP in Dart",
            duration: "25m",
            type: "video",
          },
          {
            id: "flutter-l3",
            title: "Null Safety in Dart",
            duration: "25m",
            type: "video",
          },
          {
            id: "flutter-l4",
            title: "Async/Await & Futures",
            duration: "30m",
            type: "video",
          },
          {
            id: "flutter-l5",
            title: "Module Review",
            duration: "15m",
            type: "reading",
          },
        ],
      },
      {
        id: "m2",
        title: "Flutter UI Fundamentals",
        duration: "3h 00m",
        lessons: [
          {
            id: "flutter-l6",
            title: "Widget Tree & Composition",
            duration: "30m",
            type: "video",
          },
          {
            id: "flutter-l7",
            title: "Layouts: Row, Column, Stack",
            duration: "35m",
            type: "video",
          },
          {
            id: "flutter-l8",
            title: "Custom Paint & Animations",
            duration: "40m",
            type: "video",
          },
          {
            id: "flutter-l9",
            title: "Build a Weather App UI",
            duration: "50m",
            type: "reading",
          },
          {
            id: "flutter-l10",
            title: "Module Review",
            duration: "15m",
            type: "reading",
          },
        ],
      },
      {
        id: "m3",
        title: "State Management",
        duration: "3h 30m",
        lessons: [
          {
            id: "flutter-l11",
            title: "setState & InheritedWidget",
            duration: "25m",
            type: "video",
          },
          {
            id: "flutter-l12",
            title: "Provider Pattern",
            duration: "35m",
            type: "video",
          },
          {
            id: "flutter-l13",
            title: "Riverpod in Practice",
            duration: "40m",
            type: "video",
          },
          {
            id: "flutter-l14",
            title: "Final App Project",
            duration: "60m",
            type: "reading",
          },
        ],
      },
    ],
  },
];
