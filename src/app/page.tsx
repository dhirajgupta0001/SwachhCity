import Link from "next/link";
import { ArrowRight, MapPin, Recycle, ShieldCheck, Trash2, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/navbar";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-primary/5 py-20 px-4 text-center md:py-32">
          <div className="mx-auto max-w-3xl space-y-6">
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
              Cleaner Cities. <span className="text-primary">Smarter Waste Management.</span>
            </h1>
            <p className="text-lg text-gray-600 md:text-xl max-w-2xl mx-auto">
              SwachhCity connects citizens, waste collectors, and municipal authorities in one digital platform to improve urban cleanliness and operational efficiency.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link href="/report">
                <Button size="lg" className="w-full sm:w-auto gap-2">
                  <MapPin className="h-4 w-4" /> Report an Issue
                </Button>
              </Link>
              <Link href="/pickup">
                <Button size="lg" variant="outline" className="w-full sm:w-auto gap-2">
                  <Trash2 className="h-4 w-4" /> Request Waste Pickup
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-20 px-4 md:px-8 bg-white">
          <div className="mx-auto max-w-6xl space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold text-gray-900">How It Works</h2>
              <p className="text-gray-500 max-w-2xl mx-auto">A seamless ecosystem designed for all stakeholders in municipal waste management.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="flex flex-col items-center text-center space-y-4 p-6 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <MapPin className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Citizens</h3>
                <p className="text-gray-600">Report sanitation problems with photos and location data, and track resolution progress.</p>
              </div>

              <div className="flex flex-col items-center text-center space-y-4 p-6 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <Truck className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold">Waste Collectors</h3>
                <p className="text-gray-600">Receive verified assignments, route to locations, and update tasks with completion proof.</p>
              </div>

              <div className="flex flex-col items-center text-center space-y-4 p-6 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="h-16 w-16 bg-indigo-100 rounded-full flex items-center justify-center">
                  <ShieldCheck className="h-8 w-8 text-indigo-600" />
                </div>
                <h3 className="text-xl font-semibold">Municipal Authorities</h3>
                <p className="text-gray-600">Monitor city-wide operations, manage resources efficiently, and analyze complaint trends.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Sustainability Section */}
        <section className="py-20 px-4 md:px-8 bg-primary text-primary-foreground">
          <div className="mx-auto max-w-4xl text-center space-y-8">
            <Recycle className="h-16 w-16 mx-auto opacity-90" />
            <h2 className="text-3xl font-bold">Driving Environmental Sustainability</h2>
            <p className="text-lg opacity-90 max-w-2xl mx-auto leading-relaxed">
              Digital waste management supports cleaner neighborhoods, improved collection efficiency, and better waste segregation. By actively participating, you contribute directly to a healthier ecosystem and sustainable urban living.
            </p>
            <div className="pt-4">
              <Link href="/dashboard">
                <Button size="lg" variant="secondary" className="gap-2 text-primary font-semibold">
                  Get Involved Today <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-gray-900 text-gray-400 py-8 text-center text-sm">
        <p>&copy; {new Date().getFullYear()} SwachhCity. All rights reserved.</p>
      </footer>
    </div>
  );
}
