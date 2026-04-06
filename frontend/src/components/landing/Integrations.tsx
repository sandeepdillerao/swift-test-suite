import { motion } from "framer-motion";

const integrations = [
  { name: "Jira", description: "Sync requirements & bugs" },
  { name: "GitHub", description: "Link automation scripts" },
  { name: "GitLab", description: "CI/CD integration" },
  { name: "Slack", description: "Run notifications" },
  { name: "Jenkins", description: "Pipeline triggers" },
  { name: "Azure DevOps", description: "Full sync support" },
];

const Integrations = () => {
  return (
    <section className="py-24 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-sm font-semibold uppercase tracking-wider text-primary">
              Integrations
            </span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Fits right into your workflow
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Connect with the tools you already use. Bi-directional sync with issue trackers, 
              automation frameworks, and CI/CD pipelines.
            </p>

            {/* Integration list */}
            <div className="mt-8 grid grid-cols-2 gap-4">
              {integrations.map((integration) => (
                <div
                  key={integration.name}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card/50 p-4"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <span className="text-lg font-bold text-primary">
                      {integration.name[0]}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium">{integration.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {integration.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Visual */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative"
          >
            <div className="glass-card rounded-2xl p-8">
              <div className="flex items-center gap-4 border-b border-border pb-4 mb-6">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">J</span>
                </div>
                <div>
                  <div className="font-medium">Jira Integration</div>
                  <div className="text-sm text-muted-foreground">Connected • Last sync 2m ago</div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-lg bg-muted/50 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">PROJ-1234</span>
                    <span className="text-xs bg-success/10 text-success px-2 py-0.5 rounded">Synced</span>
                  </div>
                  <div className="text-sm text-muted-foreground">User authentication fails on mobile devices</div>
                  <div className="mt-2 text-xs text-muted-foreground">Linked to TC-4521, TC-4522, TC-4523</div>
                </div>

                <div className="rounded-lg bg-muted/50 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">PROJ-1235</span>
                    <span className="text-xs bg-warning/10 text-warning px-2 py-0.5 rounded">Pending</span>
                  </div>
                  <div className="text-sm text-muted-foreground">Payment flow throws 500 error on retry</div>
                  <div className="mt-2 text-xs text-muted-foreground">Auto-created from failed test run</div>
                </div>
              </div>
            </div>

            {/* Decorative elements */}
            <div className="absolute -z-10 -top-4 -right-4 w-full h-full rounded-2xl bg-primary/5 border border-primary/10" />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Integrations;
