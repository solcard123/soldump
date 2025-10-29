"use client"

import { FuzzyText } from "@/components/fuzzy-text"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Zap, ArrowRight } from "lucide-react"
import { ReactNode } from "react"
import WalletCustomButton from "@/blockchain/components/WalletCustomButton"

interface HeroSectionProps {
	videoSrc?: string
	imageSrc?: string
	/** Texto CTA principal */
	primaryCta?: string
	/** Acción al pulsar CTA principal */
	onPrimary?: () => void
	tagline?: ReactNode
	youtubeVideoId?: string
}

/**
 * HeroSection
 * Diseño neo elegante con dos columnas.
 * - Izquierda: titular animado + CTA.
 * - Derecha: contenedor de video horizontal (16:9) con efectos neón.
 * Para usar un video real coloca el archivo en `public/hero-demo.mp4` (por ejemplo)
 * y pasa la prop `videoSrc="/hero-demo.mp4"`.
 */
export function HeroSection({
	videoSrc,
	imageSrc,
	primaryCta = "CONNECT WALLET",
	onPrimary,
	tagline = (
		<>
			Only available until <span className="font-semibold text-primary">December 11th</span>
		</>
	),
	youtubeVideoId,
}: HeroSectionProps) {
	return (
		<section className="relative pt-32 pb-24 overflow-hidden">
			{/* Decoración fondo radial */}
			<div className="pointer-events-none absolute inset-0">
				{/* <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
				<div className="absolute -bottom-40 -right-20 w-[500px] h-[500px] rounded-full bg-primary/10 blur-3xl" /> */}
			</div>
			<div className="container mx-auto max-w-7xl px-2 sm:px-4 relative">
				<div className="flex flex-col items-center space-y-8">
					{/* Título y badge arriba del video */}
					<div className="text-center space-y-4">
						<Badge
							variant="outline"
							className="border-primary/40 text-primary tracking-wide backdrop-blur-sm bg-background/60 hero-badge text-sm"
						>
							<Sparkles className="w-3 h-3 mr-2" /> {tagline}
						</Badge>

						<div className="leading-tight font-black text-balance">
							<FuzzyText
								fontSize="clamp(2rem, 4vw, 2.5rem)"
								fontWeight={900}
								color="#FFFF33"
								baseIntensity={0.07}
								hoverIntensity={0.28}
								enableHover={false}
								className="neon-glow block"
							>
								The ultimate rugpull machine
							</FuzzyText>
							<FuzzyText
								fontSize="clamp(2rem, 4vw, 2.5rem)"
								fontWeight={900}
								color="#FFFF33"
								baseIntensity={0.07}
								hoverIntensity={0.28}
								enableHover={false}
								className="neon-glow block -mt-2"
							>
								Working for you 24/7
							</FuzzyText>
						</div>
					</div>

					{/* Video centrado en grande */}
					<div className="relative w-full max-w-[1000px]">
						<div className="relative group w-full aspect-[16/9] rounded-3xl overflow-hidden neon-frame before:content-[''] before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,51,0.15),transparent_60%)]">
							{imageSrc ? (
								<img
									src={imageSrc}
									alt="Rugpull Machine"
									className="absolute inset-0 w-full h-full object-contain opacity-90"
								/>
							) : videoSrc ? (
								<video
									src={videoSrc}
									autoPlay
									muted
									className="absolute inset-0 w-full h-full object-cover opacity-90"
								/>
							) : youtubeVideoId ? (
								<iframe
									className="youtube-iframe absolute inset-0 w-full h-full"
									src={`https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&mute=1&loop=1&playlist=${youtubeVideoId}&controls=0&showinfo=0&rel=0&modestbranding=1`}
									title="YouTube video player"
									frameBorder="0"
									allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
									allowFullScreen
								></iframe>
							) : (
								<div className="absolute inset-0 flex items-center justify-center bg-secondary/40 backdrop-blur-sm">
									<div className="text-center space-y-4">
										<div className="w-24 h-24 rounded-full border-2 border-primary/40 flex items-center justify-center relative">
											<div className="absolute inset-0 rounded-full border border-primary/30 animate-ping" />
											<Zap className="w-10 h-10 text-primary" />
										</div>
										<p className="text-sm text-muted-foreground">Video demo pronto</p>
									</div>
								</div>
							)}

							{/* Overlay UI decorativo */}
							<div className="absolute inset-0 pointer-events-none mix-blend-screen">
								<div className="absolute top-0 left-0 w-full h-10 bg-gradient-to-b from-background/60 to-transparent" />
								<div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-background/60 to-transparent" />
								<div className="absolute inset-0 hero-scanlines opacity-20" />
							</div>
						</div>
						{/* Halo exterior */}
						<div className="absolute -inset-4 rounded-[2.2rem] bg-[conic-gradient(from_0deg,rgba(255,255,51,0.08),transparent_65%)] blur-2xl" />
					</div>

					{/* Contenido abajo del video */}
					<div className="text-center space-y-6 max-w-2xl">
						<p className="text-lg md:text-xl text-muted-foreground/90 leading-relaxed">
							Set it up once, run the rugpull machine, and start dumping all kinds of memecoins with 1 click
						</p>

						<div className="flex flex-col sm:flex-row gap-4 justify-center">
							<WalletCustomButton
								connectButtonText="CONNECT WALLET"
								buyButtonText="Get Your Rugpull business Now"
								className="bg-[#FFFF33] text-black font-bold px-8 py-6 text-base md:text-lg hover:bg-[#FFFF33]/90 hover:translate-y-[-2px] transition-all duration-300 shadow-[0_0_20px_rgba(255,255,51,0.5)] hover:shadow-[0_0_30px_rgba(255,255,51,0.8)]"
							/>
						</div>
					</div>
				</div>
			</div>
		</section>
	)
}

export default HeroSection

