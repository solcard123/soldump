"use client"

import { useEffect, useMemo, useState } from "react"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BadgeCheck, Car } from "lucide-react"

type Slide = {
  src: string
  alt: string
  caption: string
  tag?: string
}

// Textos de ejemplo solicitados. Puedes personalizarlos luego.
const slides: Slide[] = [
  {
    src: "/1.jpeg",
    alt: "GT3RS",
    caption:
      "JEY from Atlanta, USA: I got this GT3RS with my wallet by selling meme coin trading formations. I was one of the first to join 1day1car. These people are crazy. I don't know how they do it, but ggs.",
    tag: "GT3RS",
  },
  { src: "/2jpeg.jpeg", alt: "BMW M4", caption: "CARLOS from Madrid, ES: My previous pick was an M4, and with the 1day1car wallet the flow was seamless—reviews came in, deals closed, ggs.", tag: "M4" },
  { src: "/3.jpeg", alt: "Result 3", caption: "SAM from Austin, USA: I used the wallet to manage sales and it just works. Straight to the point, no fluff.", tag: "Member Result" },
  { src: "/4.jpeg", alt: "Result 4", caption: "LI from Singapore: Joined early, learned fast, and shipped quicker than ever. Community is on fire.", tag: "Member Result" },
  { src: "/5.jpeg", alt: "Result 5", caption: "ALEX from London, UK: The wallet gave me a clear edge. Deals closed, targets hit, next stop: supercar post.", tag: "Member Result" },
  { src: "/6jpeg.jpeg", alt: "Result 6", caption: "NOAH from Toronto, CA: I came for the tools, stayed for the speed. 1day1car delivers.", tag: "Member Result" },
  { src: "/7.jpeg", alt: "Result 7", caption: "ELLA from LA, USA: Plugged in, executed, and the results speak for themselves. Be part of it.", tag: "Member Result" },
]

export function ResultsCarousel() {
  const [api, setApi] = useState<CarouselApi | null>(null)
  const [paused, setPaused] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const total = useMemo(() => api?.scrollSnapList().length ?? slides.length, [api])

  // Autoplay suave
  useEffect(() => {
    if (!api || paused) return
    const id = setInterval(() => {
      api.scrollNext()
    }, 3500)
    return () => clearInterval(id)
  }, [api, paused])

  // Actualizar índice actual para los puntos
  useEffect(() => {
    if (!api) return
    const onSelect = () => setSelectedIndex(api.selectedScrollSnap())
    api.on('select', onSelect)
    onSelect()
    return () => {
      api.off('select', onSelect)
    }
  }, [api])

  return (
    <section className="px-4 lg:px-8 pt-8 pb-16 bg-background">
      <div className="container mx-auto">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Latest Results</h2>
            <p className="text-muted-foreground">Swipe to see what members are posting</p>
          </div>
        </div>

        <Carousel
          opts={{ align: "start", loop: true }}
          setApi={setApi}
          className="relative"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <CarouselContent className="-ml-2 md:-ml-4">
            {slides.map((s, i) => (
              <CarouselItem key={i} className="pl-2 md:pl-4 basis-full md:basis-1/2 lg:basis-1/3 p-4">
                <Card className="group overflow-hidden h-full border border-border/60 rounded-2xl bg-card shadow-sm hover:shadow-xl transition ring-1 ring-transparent hover:ring-primary/20">
                  <CardContent className="p-0">
                    <div className="relative aspect-[4/3] w-full overflow-hidden">
                      <img src={s.src} alt={s.alt} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      {/* Overlay degradado para legibilidad */}
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                      {/* Tag del coche o tipo de resultado */}
                      {s.tag && (
                        <div className="absolute top-3 left-3 z-10">
                          <span className="inline-flex items-center gap-1 rounded-full bg-white/90 dark:bg-black/50 backdrop-blur px-2.5 py-1 text-[11px] font-semibold text-primary border border-border/60 shadow-sm">
                            <Car className="h-3.5 w-3.5" /> {s.tag}
                          </span>
                        </div>
                      )}
                      {/* Caption sobre la imagen */}
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <div className="rounded-lg bg-black/45 backdrop-blur-sm px-3 py-2 border border-white/10 shadow-md">
                          <p className="text-[13px] md:text-sm leading-relaxed text-white/95">{s.caption}</p>
                        </div>
                      </div>
                    </div>
                    {/* Meta inferior */}
                    <div className="flex items-center justify-between px-4 py-3 border-t border-border/60 bg-card/60">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <BadgeCheck className="h-4 w-4 text-primary" />
                        <span>Verified member</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground/80">1day1car</div>
                    </div>
                  </CardContent>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden md:flex bg-background/70 backdrop-blur border-border hover:bg-background" />
          <CarouselNext className="hidden md:flex bg-background/70 backdrop-blur border-border hover:bg-background" />
        </Carousel>

        {/* Indicadores de paginación */}
        <div className="mt-4 flex items-center justify-center gap-2">
          {Array.from({ length: total }).map((_, i) => (
            <button
              key={i}
              aria-label={`Go to slide ${i + 1}`}
              className={`h-2 rounded-full transition-all ${i === selectedIndex ? 'w-6 bg-primary' : 'w-2 bg-muted-foreground/30'}`}
              onClick={() => api?.scrollTo(i)}
            />
          ))}
        </div>

        <div className="mt-8 text-center">
          <div className="mx-auto max-w-3xl text-pretty">
            <p className="text-base md:text-lg text-muted-foreground mt-2">
              WE WHO HAVE CREATED THIS PLATFORM ARE PEOPLE WHO HAVE CREATED THIS FOR YOU FROM THE USA. WE HAVE BEEN
              WORKING FOR 6 YEARS TO GIVE YOU THE MOST POWERFUL WALLET ON THE MARKET, READY FOR EVERYONE WHO WANTS TO BE
              PART OF THIS PROJECT. BE THE NEXT TO POST A PHOTO WITH A SUPER CAR.
            </p>
          </div>
          <div className="mt-4">
            <Button size="lg" className="bg-[#00bfff] hover:bg-[#00bfff]/85 text-black shadow-[0_10px_25px_rgba(0,191,255,0.35)]">Access for only $19.99</Button>
          </div>
        </div>
      </div>
    </section>
  )
}
