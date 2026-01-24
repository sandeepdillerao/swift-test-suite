import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import Stats from "@/components/landing/Stats";
import Workflow from "@/components/landing/Workflow";
import Integrations from "@/components/landing/Integrations";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background dark">
      <Navbar />
      <main>
        <Hero />
        <Stats />
        <Features />
        <Workflow />
        <Integrations />
        <CTA />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
