import { Link } from 'react-router-dom'
import { useShop } from '../context/ShopContext'
import { usePageMeta } from '../hooks/usePageMeta'
import { ABOUT_TEXT } from '../lib/config'
import { whatsappChatLink } from '../lib/whatsapp'
import PageHeader from '../components/PageHeader'
import Reveal from '../components/Reveal'
import EditorialPhotos from '../components/EditorialPhotos'
import { WhatsAppIcon } from '../components/Layout'

const PILLARS = [
  { title: 'Curated, not crowded', body: 'A focused selection of sneakers, sandals and everyday footwear, chosen for how well they fit into a daily rotation.' },
  { title: 'Clean and considered', body: 'Clear photos, prices in rupees and straightforward UK sizing, so choosing a pair stays simple.' },
  { title: 'Talk to a person', body: 'Questions about fit, availability or delivery? Message Laceloft on WhatsApp and we will help you choose.' },
]

export default function About() {
  const { products } = useShop()
  usePageMeta('About', 'Laceloft brings together sneakers, sandals and everyday footwear for people who enjoy expressing themselves through what they wear.')
  return (
    <>
      <PageHeader eyebrow="About Laceloft" title="Good Shoes. Great Rotation." crumbs={[{ label: 'Home', to: '/' }, { label: 'About' }]}>
        {ABOUT_TEXT}
      </PageHeader>

      <section className="page-pad mx-auto max-w-[1500px] pb-20">
        <Reveal><EditorialPhotos products={products} className="mb-14 max-w-4xl" /></Reveal>
        <div className="grid gap-4 md:grid-cols-3 md:gap-5">
          {PILLARS.map((x, i) => (
            <Reveal key={x.title} delay={i * 80}>
              <div className="h-full rounded-4xl bg-sand/60 p-8">
                <h2 className="mb-3 font-display text-2xl leading-tight">{x.title}</h2>
                <p className="text-[15px] leading-relaxed text-muted">{x.body}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal className="on-dark mt-5 rounded-[2rem] bg-espresso px-8 py-14 text-center text-ivory md:rounded-5xl md:py-20">
          <h2 className="font-display text-[clamp(2.2rem,5vw,3.6rem)] leading-none">Find Your Next Sole.</h2>
          <p className="mx-auto mt-5 max-w-md text-[15px] text-ivory/70">Your next favourite pair is just a step away.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/shop" className="inline-flex items-center rounded-full bg-ivory px-8 py-4 text-[12px] font-semibold uppercase tracking-[0.14em] text-espresso no-underline hover:bg-sand">Shop now</Link>
            <a href={whatsappChatLink()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-ivory/40 px-8 py-4 text-[12px] font-semibold uppercase tracking-[0.14em] text-ivory no-underline hover:bg-ivory/10"><WhatsAppIcon /> WhatsApp</a>
          </div>
        </Reveal>
      </section>
    </>
  )
}
