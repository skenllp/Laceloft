import { useState } from 'react'
import { usePageMeta } from '../hooks/usePageMeta'
import { whatsappChatLink } from '../lib/whatsapp'
import { WHATSAPP_DISPLAY } from '../lib/config'
import PageHeader from '../components/PageHeader'
import { WhatsAppIcon } from '../components/Layout'

const TOPICS = ['Sizing', 'Availability', 'Delivery', 'An existing enquiry', 'Something else']

export default function Contact() {
  usePageMeta('Contact', 'Message Laceloft on WhatsApp about sizing, availability or delivery.')
  const [form, setForm] = useState({ name: '', topic: TOPICS[0], message: '' })
  const [opened, setOpened] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = (e) => {
    e.preventDefault()
    const text = [
      'Hi Laceloft,',
      '',
      `Name: ${form.name.trim()}`,
      `Topic: ${form.topic}`,
      '',
      form.message.trim(),
    ].join('\n')
    window.open(whatsappChatLink(text), '_blank', 'noopener,noreferrer')
    setOpened(true)
  }

  return (
    <>
      <PageHeader eyebrow="Contact" title="Say hello." crumbs={[{ label: 'Home', to: '/' }, { label: 'Contact' }]}>
        The quickest way to reach Laceloft is WhatsApp — ask about sizing, availability or delivery.
      </PageHeader>

      <div className="page-pad mx-auto grid max-w-[1500px] gap-5 pb-20 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-[2rem] bg-sand/60 p-8 sm:p-10 md:rounded-5xl">
          <WhatsAppIcon width="30" height="30" className="mb-6 text-olive-deep" />
          <h2 className="font-display text-3xl leading-tight">Chat on WhatsApp</h2>
          <p className="mb-8 mt-3 text-[15px] leading-relaxed text-muted">{WHATSAPP_DISPLAY}</p>
          <a href={whatsappChatLink()} target="_blank" rel="noopener noreferrer" className="btn-primary no-underline">Chat on WhatsApp <span aria-hidden="true">↗</span></a>
        </div>

        <form onSubmit={submit} className="rounded-[2rem] border border-hairline bg-white p-8 sm:p-10 md:rounded-5xl">
          <h2 className="mb-6 font-display text-3xl leading-tight">Or write your message here</h2>
          <div className="grid gap-5">
            <div>
              <label htmlFor="c-name" className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Your name</label>
              <input id="c-name" required value={form.name} onChange={set('name')} className="input-field" autoComplete="name" />
            </div>
            <div>
              <label htmlFor="c-topic" className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Topic</label>
              <select id="c-topic" value={form.topic} onChange={set('topic')} className="input-field">
                {TOPICS.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="c-msg" className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Message</label>
              <textarea id="c-msg" required rows={5} value={form.message} onChange={set('message')} className="input-field !rounded-3xl" />
            </div>
            <button type="submit" className="btn-primary w-full sm:w-auto sm:self-start">Continue on WhatsApp <span aria-hidden="true">↗</span></button>
            {opened && <p className="text-[13px] text-muted" role="status">WhatsApp should have opened with your message ready — press send there to reach Laceloft.</p>}
          </div>
        </form>
      </div>
    </>
  )
}
