import { Navbar } from "@/components/navbar"
import { HeroSection } from "@/components/hero-section"
import { ShopSection } from "@/components/shop-section"
import { ResultsCarousel } from "@/components/results-carousel"

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <HeroSection />
      {/* Resultados visibles con un pequeño scroll */}
      <ResultsCarousel />
      <ShopSection />
    </main>
  )
}
