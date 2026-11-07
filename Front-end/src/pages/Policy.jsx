import { POLICIES } from '../data/policies'
import { usePageMeta } from '../hooks/usePageMeta'
import { whatsappChatLink } from '../lib/whatsapp'
import PageHeader from '../components/PageHeader'
import { WhatsAppIcon } from '../components/Layout'

export default function Policy({ slug }) {
  const { title, topic, sections } = POLICIES[slug]
  const ready = sections.length > 0
  usePageMeta(title, ready ? `${title} for Laceloft.` : undefined, { noindex: !ready })
  return (
    <>
      <PageHeader title={title} crumbs={[{ label: 'Home', to: '/' }, { label: title }]} compact />
      <div className="page-pad mx-auto max-w-[1500px] pb-20">
        {ready ? (
          <div className="max-w-2xl space-y-8">
            {sections.map((s) => (
              <section key={s.heading}>
                <h2 className="mb-3 font-display text-2xl leading-tight">{s.heading}</h2>
                <p className="whitespace-pre-line text-[15px] leading-relaxed text-muted">{s.body}</p>
              </section>
            ))}
          </div>
        ) : (
          <div className="max-w-xl">
            <p className="mb-7 text-[15px] leading-relaxed text-muted">Details on {topic} are available on request. Message Laceloft on WhatsApp and we will confirm them before you order.</p>
            <a href={whatsappChatLink(`Hi Laceloft, I have a question about ${topic}.`)} target="_blank" rel="noopener noreferrer" className="btn-primary no-underline"><WhatsAppIcon /> Ask on WhatsApp</a>
          </div>
        )}
      </div>
    </>
  )
}
