import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Sparkles } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative min-h-screen pt-32 pb-20 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.08),transparent_50%)]" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />

      <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5"
          >
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Now with AI-powered test generation</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
          >
            Test management that
            <br />
            <span className="gradient-text">moves fast</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl"
          >
            The fastest way to write, organize, run, and report test cases. 
            Built for modern teams who refuse to compromise on speed or experience.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Button variant="hero" size="xl">
              Start Free Trial
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Button variant="heroOutline" size="xl">
              <Play className="h-5 w-5" />
              Watch Demo
            </Button>
          </motion.div>

          {/* Social proof */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-12 flex flex-col items-center gap-4"
          >
            <div className="flex -space-x-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-10 w-10 rounded-full border-2 border-background bg-gradient-to-br from-primary/20 to-primary/40"
                />
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">2,000+</span> teams already testing smarter
            </p>
          </motion.div>
        </div>

        {/* Dashboard Preview */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="mx-auto mt-20 max-w-6xl"
        >
          <div className="glass-card-elevated rounded-2xl p-2 glow-effect">
            <div className="rounded-xl bg-card overflow-hidden">
              {/* Mock browser chrome */}
              <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-destructive/60" />
                  <div className="h-3 w-3 rounded-full bg-warning/60" />
                  <div className="h-3 w-3 rounded-full bg-success/60" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="h-6 w-80 max-w-full mx-auto rounded-md bg-muted flex items-center justify-center">
                    <span className="text-xs text-muted-foreground font-mono">app.testflow.dev/project/acme</span>
                  </div>
                </div>
              </div>
              
              {/* Dashboard content */}
              <div className="flex">
                {/* Sidebar */}
                <div className="hidden md:block w-56 border-r border-border p-4">
                  <div className="space-y-2">
                    {["Dashboard", "Test Cases", "Test Runs", "Reports", "Settings"].map((item, i) => (
                      <div
                        key={item}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                          i === 1 ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground"
                        }`}
                      >
                        <div className="h-4 w-4 rounded bg-current opacity-40" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Main content */}
                <div className="flex-1 p-6">
                  <div className="mb-6 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">Test Cases</h3>
                      <p className="text-sm text-muted-foreground">127 test cases • 4 modules</p>
                    </div>
                    <Button size="sm">+ New Test Case</Button>
                  </div>

                  {/* Test case table */}
                  <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50 border-b border-border">
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">ID</th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Title</th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Priority</th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { id: "TC-1234", title: "User can login with valid credentials", priority: "P0", status: "Passed" },
                          { id: "TC-1235", title: "Password reset email is sent", priority: "P1", status: "Failed" },
                          { id: "TC-1236", title: "Session expires after 30 minutes", priority: "P2", status: "Not Run" },
                          { id: "TC-1237", title: "OAuth login with Google works", priority: "P1", status: "Passed" },
                        ].map((tc, i) => (
                          <tr key={tc.id} className={`border-b border-border/50 ${i % 2 === 0 ? "" : "bg-muted/20"}`}>
                            <td className="px-4 py-3 font-mono text-xs text-primary">{tc.id}</td>
                            <td className="px-4 py-3">{tc.title}</td>
                            <td className="px-4 py-3 hidden sm:table-cell">
                              <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${
                                tc.priority === "P0" ? "bg-destructive/10 text-destructive" :
                                tc.priority === "P1" ? "bg-warning/10 text-warning" :
                                "bg-muted text-muted-foreground"
                              }`}>
                                {tc.priority}
                              </span>
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell">
                              <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${
                                tc.status === "Passed" ? "status-passed" :
                                tc.status === "Failed" ? "status-failed" :
                                "status-not-run"
                              }`}>
                                {tc.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
