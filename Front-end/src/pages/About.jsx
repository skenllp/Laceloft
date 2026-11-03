import { Link } from 'react-router-dom'
import { usePageMeta } from '../hooks/usePageMeta'
import { whatsappChatLink } from '../lib/whatsapp'
import PageHeader from '../components/PageHeader'
import Reveal from '../components/Reveal'
import { WhatsAppIcon } from '../components/Layout'

const PILLARS = [
  { n: '01', title: 'Curated, not crowded', body: 'A focused selection of sneakers, boots and everyday footwear, chosen for how well they fit into a daily rotation.' },
  { n: '02', title: 'Clean and considered', body: 'Clear photos, prices in rupees and straightforward UK sizing, so choosing a pair stays simple.' },
  { n: '03', title: 'Talk to a person', body: 'Questions about fit, availability or delivery? Message Laceloft on WhatsApp and we will help you choose.' },
]

export default function About() {
  usePageMeta('About', 'Laceloft brings together sneakers, boots and everyday footwear for people who enjoy expressing themselves through what they wear.')
  return (
    <>
      <PageHeader eyebrow="About Laceloft" title="Good Shoes. Great Rotation." crumbs={[{ label: 'Home', to: '/' }, { label: 'About' }]}>
        The right pair can change how an outfit feels. Laceloft brings together sneakers, boots and everyday footwear for people who like to express themselves through what they wear.
      </PageHeader>

      <section className="page-pad mx-auto max-w-[1500px] pb-20">
        <div className="grid gap-4 md:grid-cols-3 md:gap-5">
          {PILLARS.map((x, i) => (
            <Reveal key={x.n} delay={i * 80}>
              <div className="h-full rounded-4xl bg-sand/60 p-8">
                <span className="font-display text-3xl text-olive-deep">{x.n}</span>
                <h2 className="mb-3 mt-6 font-display text-2xl leading-tight">{x.title}</h2>
                <p className="text-[15px] leading-relaxed text-muted">{x.body}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal className="on-dark mt-5 rounded-[2rem] bg-espresso px-8 py-14 text-center text-ivory md:rounded-5xl md:py-20">
          <h2 className="font-display text-[clamp(2.2rem,5vw,3.6rem)] leading-none">Find Your Next Sole.</h2>
          <p className="mx-auto mt-5 max-w-md text-[15px] text-ivory/70">Your next favourite pair is just a step away.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/shop" className="inline-flex items-center rounded-full bg-ivory px-8 py-4 text-[12px] font-semibold uppercase tracking-[0.14em] text-espresso no-underline hover:bg-sand">Shop now ↗</Link>
            <a href={whatsappChatLink()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-ivory/40 px-8 py-4 text-[12px] font-semibold uppercase tracking-[0.14em] text-ivory no-underline hover:bg-ivory/10"><WhatsAppIcon /> WhatsApp</a>
          </div>
        </Reveal>
      </section>
    </>
  )
}
