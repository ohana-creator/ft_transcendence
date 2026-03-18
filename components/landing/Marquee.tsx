import { useI18n } from "@/locales"

const technologies = [
  {
    name: "React",
    logo: "/react.png"
  },
  {
    name: "Next.js",
    logo: "/next.png"
  },
  {
    name: "TypeScript",
    logo: "/typescript.png"
  },
  {
    name: "Tailwind CSS",
    logo: "/tailwindcss.png"
  },
  {
    name: "NestJS",
    logo: "/nest.png"
  },
  {
    name: "Figma",
    logo: "/figma.png"
  },
  {
    name: "PostgreSQL",
    logo: "/postgre.png"
  },
  {
    name: "Prisma",
    logo: "/prisma.png"
  },
  {
    name: "Node.js",
    logo: "/node.png"
  },
]

export function Marquee() {
  const { t } = useI18n()
  const landing = t.landing

  // Duplicate enough times for seamless loop
  const items = [...technologies, ...technologies, ...technologies, ...technologies]

  return (
    <section className="py-16">
      <div className="flex justify-center mb-10">
        <h2 className="text-3xl md:text-4xl font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
          {landing.tecnologias}
        </h2>
      </div>

      {/* Carousel container */}
      <div className="marquee-container relative w-full overflow-hidden">
        {/* Fade edges */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 z-10 bg-linear-to-r from-vaks-light-primary dark:from-vaks-dark-primary to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-24 z-10 bg-linear-to-l from-vaks-light-primary dark:from-vaks-dark-primary to-transparent" />

        {/* Scrolling track */}
        <div className="animate-marquee flex w-max gap-6 py-4" style={{ "--duration": "35s" } as React.CSSProperties}>
          {items.map((tech, i) => (
            <div
              key={`${tech}-${i}`}
              className="flex items-center gap-3 px-6 py-3 rounded-x transition-colors shrink-0">
              <img
                  src={tech.logo}
                  alt={tech.name}
                  width={200}
                  height={150}
                  className="shrink-0 object-contain"
                />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}