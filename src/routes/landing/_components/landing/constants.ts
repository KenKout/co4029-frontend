import {
  BookOpenCheck,
  Building2,
  ChartNoAxesCombined,
  ClipboardCheck,
  GitBranch,
  Network,
  Presentation,
  ScanSearch,
  ShieldCheck,
  GraduationCap,
  UserCheck,
} from "lucide-react";

export const learningAudiences = [
  {
    icon: Building2,
    role: "Faculty & program leaders",
    value:
      "Align programs to intended capabilities and see evidence across courses.",
  },
  {
    icon: Presentation,
    role: "Instructors",
    value:
      "Turn trusted materials into reviewed learning structures, activities and assessments.",
  },
  {
    icon: GraduationCap,
    role: "Learners",
    value:
      "Understand the next step, practise where support is needed and track mastery.",
  },
];

export const learningPrinciples = [
  {
    icon: UserCheck,
    title: "Instructor-governed",
    description:
      "Educators review learning content before it reaches students.",
  },
  {
    icon: GitBranch,
    title: "Outcome-aligned",
    description:
      "Concepts, activities and evidence connect to explicit outcomes.",
  },
  {
    icon: ScanSearch,
    title: "Adaptive practice",
    description: "Each learner receives practice based on demonstrated gaps.",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Evidence-led",
    description:
      "Faculty see where learners progress, struggle and need support.",
  },
];

export const learningWorkflow = [
  {
    icon: ClipboardCheck,
    title: "Define outcomes",
    description:
      "Faculty and program leaders establish the capabilities learners should demonstrate.",
  },
  {
    icon: BookOpenCheck,
    title: "Contribute knowledge",
    description:
      "Instructors upload approved materials and retain control over what is taught.",
  },
  {
    icon: Network,
    title: "Structure the domain",
    description:
      "AI proposes concepts, relationships and learning sequences for instructor review.",
  },
  {
    icon: ShieldCheck,
    title: "Assess mastery",
    description:
      "Learning activities and assessments collect evidence against each outcome.",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Improve continuously",
    description:
      "Learning evidence informs student support, course improvement and program decisions.",
  },
];
