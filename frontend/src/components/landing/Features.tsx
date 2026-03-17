import { motion } from "framer-motion";
import { 
  Zap, 
  LayoutGrid, 
  BarChart3, 
  Plug, 
  Sparkles, 
  GitBranch,
  Keyboard,
  FileSpreadsheet,
  Clock,
  Shield,
  Users,
  Code2
} from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Lightning-Fast Creation",
    description: "Create test cases in seconds with our spreadsheet-style editor. Press Enter for new steps, paste from Excel, done.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: Sparkles,
    title: "AI-Powered Assist",
    description: "Paste a requirement, get 10 test cases. AI generates expected results and suggests edge cases automatically.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: LayoutGrid,
    title: "Notion-Like Interface",
    description: "Clean, modern UI that feels familiar. Drag & drop organization, rich text editing, and keyboard shortcuts everywhere.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: BarChart3,
    title: "Powerful Reporting",
    description: "Executive dashboards, burn-down charts, coverage metrics, and flaky test detection. All in real-time.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: Plug,
    title: "Dev-Friendly Integrations",
    description: "Connect with Jira, GitHub, GitLab, and CI/CD pipelines. Auto-sync automation status and defects.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: GitBranch,
    title: "Version Control",
    description: "Full test case versioning with diff views. Track changes, compare versions, and roll back when needed.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
];

const secondaryFeatures = [
  { icon: Keyboard, text: "Keyboard-first execution" },
  { icon: FileSpreadsheet, text: "Excel/CSV import" },
  { icon: Clock, text: "Reusable step library" },
  { icon: Shield, text: "Enterprise security" },
  { icon: Users, text: "Team collaboration" },
  { icon: Code2, text: "API-first platform" },
];

const Features = () => {
  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <section id="features" className="py-24 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center"
        >
          <span className="text-sm font-semibold uppercase tracking-wider text-primary">
            Features
          </span>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need, nothing you don't
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Built by QA engineers who were tired of slow, bloated tools. 
            We kept what works and reimagined the rest.
          </p>
        </motion.div>

        {/* Main features grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              className="group glass-card rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
            >
              <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${feature.bgColor}`}>
                <feature.icon className={`h-6 w-6 ${feature.color}`} />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Secondary features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-16 flex flex-wrap items-center justify-center gap-4"
        >
          {secondaryFeatures.map((feature) => (
            <div
              key={feature.text}
              className="flex items-center gap-2 rounded-full border border-border bg-card/50 px-4 py-2 text-sm"
            >
              <feature.icon className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">{feature.text}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Features;
