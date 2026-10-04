"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { Mic, Send, Square } from "lucide-react";
import { sendFeedback, serviceConfigured } from "@/lib/service";
import { canHear, dictate, tap } from "@/lib/speech";
import { useI18n } from "./providers";
import { useSession } from "./session";

const COPY = {
  en: { title: "Feedback", lead: "Your feedback goes directly to the Saath team.", name: "Your name", label: "What would you like us to know?", placeholder: "Write your feedback", send: "Send feedback", sending: "Sending…", listen: "Dictate feedback", stop: "Stop listening", listening: "Listening… You can edit the words before sending.", sent: "Thank you. We received your feedback.", failed: "Couldn't send your feedback. Please try again.", offline: "Feedback delivery is not connected in this build yet." },
  hi: { title: "प्रतिक्रिया", lead: "आपकी प्रतिक्रिया सीधे साथ टीम तक जाती है।", name: "आपका नाम", label: "आप हमें क्या बताना चाहते हैं?", placeholder: "अपनी प्रतिक्रिया लिखें", send: "प्रतिक्रिया भेजें", sending: "भेज रहे हैं…", listen: "बोलकर प्रतिक्रिया लिखें", stop: "सुनना बंद करें", listening: "सुन रहे हैं… भेजने से पहले शब्द बदल सकते हैं।", sent: "धन्यवाद। हमें आपकी प्रतिक्रिया मिल गई।", failed: "आपकी प्रतिक्रिया नहीं भेजी जा सकी। फिर कोशिश करें।", offline: "इस बिल्ड में प्रतिक्रिया भेजने की सेवा अभी जुड़ी नहीं है।" },
  mr: { title: "अभिप्राय", lead: "तुमचा अभिप्राय थेट साथ टीमकडे जातो.", name: "तुमचे नाव", label: "तुम्हाला आम्हाला काय सांगायचे आहे?", placeholder: "तुमचा अभिप्राय लिहा", send: "अभिप्राय पाठवा", sending: "पाठवत आहे…", listen: "बोलून अभिप्राय लिहा", stop: "ऐकणे थांबवा", listening: "ऐकत आहे… पाठवण्याआधी शब्द बदलता येतील.", sent: "धन्यवाद. आम्हाला तुमचा अभिप्राय मिळाला.", failed: "तुमचा अभिप्राय पाठवता आला नाही. पुन्हा प्रयत्न करा.", offline: "या बिल्डमध्ये अभिप्राय पाठवण्याची सेवा अजून जोडलेली नाही." },
} as const;

export function FeedbackPanel() {
  const { code } = useI18n();
  const { account } = useSession();
  const copy = COPY[code];
  const [name, setName] = useState(account?.display ?? "");
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const mic = useMemo(() => canHear(), []);

  function toggleVoice() {
    tap();
    if (listening) return stopRef.current?.();
    setListening(true);
    stopRef.current = dictate(code, {
      onText: (text) => setFeedback(text),
      onEnd: () => { setListening(false); stopRef.current = null; },
      onError: () => { setListening(false); stopRef.current = null; setNote({ ok: false, text: copy.failed }); },
    });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!account || name.trim().length < 3 || feedback.trim().length < 5 || busy) return;
    setBusy(true);
    setNote(null);
    try {
      const requestId = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      await sendFeedback({ username: name.trim(), feedback: feedback.trim(), requestId });
      setFeedback("");
      setNote({ ok: true, text: copy.sent });
    } catch {
      setNote({ ok: false, text: serviceConfigured() ? copy.failed : copy.offline });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="stack-sm feedback-panel" aria-labelledby="feedback-title" data-testid="feedback-section">
      <div className="stack-xs">
        <h2 id="feedback-title" data-testid="feedback-title">{copy.title}</h2>
        <p className="faint" data-testid="feedback-description">{copy.lead}</p>
      </div>
      <form className="stack-sm" onSubmit={submit} data-testid="feedback-form">
        <label>
          <span className="label">{copy.name}</span>
          <input className="field text boxed" value={name} maxLength={20} onChange={(event) => setName(event.target.value.replace(/[^\p{L}\p{M}\p{N}._-]/gu, ""))} data-testid="feedback-name-input" />
        </label>
        <label>
          <span className="label">{copy.label}</span>
          <textarea className="field boxed feedback-box" value={feedback} maxLength={2000} placeholder={copy.placeholder} onChange={(event) => setFeedback(event.target.value)} data-testid="feedback-message-input" />
        </label>
        {mic && <button type="button" className="btn btn-secondary" aria-pressed={listening} onClick={toggleVoice} data-testid="feedback-dictate-button">{listening ? <Square aria-hidden size={16} /> : <Mic aria-hidden size={18} />}{listening ? copy.stop : copy.listen}</button>}
        {listening && <p className="note" role="status" data-testid="feedback-listening-status">{copy.listening}</p>}
        <button type="submit" className="btn btn-primary" disabled={busy || name.trim().length < 3 || feedback.trim().length < 5} data-testid="feedback-submit-button"><Send aria-hidden size={18} />{busy ? copy.sending : copy.send}</button>
        {note && <p className={`note ${note.ok ? "ok" : "err"}`} role="status" data-testid="feedback-delivery-status">{note.text}</p>}
      </form>
    </section>
  );
}