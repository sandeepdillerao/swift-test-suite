import { motion } from "framer-motion";
import { PenLine, Play, BarChart3, Bug } from "lucide-react";

const steps = [
  {
    icon: PenLine,
    title: "Write",
    description: "Create test cases at lightning speed with our spreadsheet-style editor or let AI generate them from requirements.",
  },
  {
    icon: Play,
    title: "Execute",
    description: "Run test cases with keyboard shortcuts. Bulk actions, one-click defect creation, and real-time status updates.",
  },
  {
    icon: Bug,
    title: "Track",
    description: "Automatically link defects from Jira. Track blockers, retests, and maintain full traceability.",
  },
  {
    icon: BarChart3,
    title: "Report",
    description: "Beautiful dashboards with pass/fail trends, coverage metrics, and executive summaries — all generated automatically.",
  },
];

const Workflow = () => {
  return (
    <section className="py-24 sm:py-32 bg-muted/30">
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
            Workflow
          </span>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            From test case to insight in minutes
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            A streamlined workflow that eliminates context switching and keeps your team focused on quality.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative"
            >
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-10 left-full w-full h-0.5 bg-gradient-to-r from-primary/40 to-transparent -translate-x-8" />
              )}
              
              <div className="flex flex-col items-center text-center">
                <div className="relative">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
                    <step.icon className="h-8 w-8 text-primary" />
                  </div>
                  <div className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {index + 1}
                  </div>
                </div>
                <h3 className="mt-6 text-xl font-semibold">{step.title}</h3>
                <p className="mt-2 text-muted-foreground">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Workflow;
