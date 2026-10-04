import type { Copy } from "./content-types";
import type { Effects, Episode, JourneyFile, Sim } from "./journey";

export type ChapterSeed = {
  id: string;
  source?: string;
  stage: Episode["stage"];
  topic: Episode["topic"];
  age: number;
  place: string;
  title: Copy;
  setup?: Copy;
  action?: Copy;
  sim?: ({ kind: "inspect" } | { kind: "budget"; income: number; needs: number } | { kind: "grow"; monthly: number; rate: number; years: number[] } | { kind: "emi"; principal: number; rate: number; months: number[] });
  delta?: Effects;
  guide: string;
  /** Chapter-specific scene, question, weaker choices, outcomes and lesson. Generic wording is used only where these are missing. */
  more?: Copy;
  question?: Copy;
  okay?: Copy;
  costly?: Copy;
  goodOutcome?: Copy;
  okayOutcome?: Copy;
  costlyOutcome?: Copy;
  lesson?: Copy;
};

export type ChaptersFile = { reviewed: string; chapters: ChapterSeed[] };

const C = (en: string, hi: string, mr: string): Copy => ({ en, hi, mr });

const PHRASES = {
  bridge: C(
    "What Verena chose earlier still matters. This chapter adds one more pressure, one more trade-off and one more chance to build resilience.",
    "वेरेना के पुराने फ़ैसले अब भी मायने रखते हैं। यह अध्याय नया दबाव, नया समझौता और मज़बूती बनाने का नया मौका लाता है।",
    "वेरेनाचे आधीचे निर्णय अजूनही महत्त्वाचे आहेत. हा अध्याय नवा दबाव, नवी तडजोड आणि लवचिकता वाढवण्याची नवी संधी आणतो.",
  ),
  moment: C(
    "There is no perfect answer. The useful question is what this choice solves today, what it costs later and whether the plan can survive a surprise.",
    "कोई एक सही उत्तर नहीं है। काम का सवाल है: यह आज क्या हल करता है, बाद में क्या कीमत होगी और क्या योजना अचानक झटका सह सकेगी।",
    "एकच परिपूर्ण उत्तर नाही. उपयोगी प्रश्न असा: हा निर्णय आज काय सोडवतो, पुढे किती किंमत मोजावी लागते आणि योजना धक्का सहन करू शकते का.",
  ),
  question: C("What should Verena do?", "वेरेना को क्या करना चाहिए?", "वेरेनाने काय करावे?"),
  okay: C(
    "Solve only the urgent part now, then revisit the rest next month.",
    "अभी सिर्फ़ तत्काल हिस्सा हल करें और बाकी अगले महीने देखें।",
    "आत्ता फक्त तातडीचा भाग सोडवा आणि उरलेले पुढच्या महिन्यात पाहा.",
  ),
  costly: C(
    "Choose the quickest route without comparing the full cost or risk.",
    "पूरी लागत या जोखिम की तुलना किए बिना सबसे तेज़ रास्ता चुनें।",
    "पूर्ण खर्च किंवा जोखीम न पाहता सर्वात जलद मार्ग निवडा.",
  ),
  goodOutcome: C(
    "She meets the immediate need and keeps room for what comes next. The stronger plan is not painless, but it is visible and manageable.",
    "वह आज की ज़रूरत पूरी करती है और आगे के लिए जगह बचाती है। मज़बूत योजना आसान नहीं, पर साफ़ और संभालने योग्य है।",
    "ती आजची गरज पूर्ण करते आणि पुढच्यासाठी जागा ठेवते. मजबूत योजना सोपी नसते, पण ती स्पष्ट आणि सांभाळता येते.",
  ),
  okayOutcome: C(
    "The immediate problem is handled, but next month has less room. Verena will need to review the plan before another cost appears.",
    "तत्काल समस्या हल हो जाती है, लेकिन अगले महीने जगह कम है। अगला खर्च आने से पहले योजना फिर देखनी होगी।",
    "तातडीची अडचण सुटते, पण पुढच्या महिन्यात कमी जागा राहते. पुढचा खर्च येण्याआधी योजना पुन्हा पाहावी लागेल.",
  ),
  costlyOutcome: C(
    "It feels easier today, but the hidden cost or risk appears later. A future chapter will have to absorb what this choice postponed.",
    "आज यह आसान लगता है, पर छिपी लागत या जोखिम बाद में आता है। आगे का अध्याय इस टाले हुए असर को उठाएगा।",
    "आज हे सोपे वाटते, पण लपलेला खर्च किंवा धोका पुढे दिसतो. पुढच्या अध्यायाला या पुढे ढकललेल्या परिणामाचा भार घ्यावा लागेल.",
  ),
  lesson: C(
    "A sound financial decision connects the immediate need to total cost, risk, time and the next obligation. Trade-offs are real; making them visible is the skill.",
    "मज़बूत आर्थिक फ़ैसला आज की ज़रूरत को कुल लागत, जोखिम, समय और अगली ज़िम्मेदारी से जोड़ता है। समझौते सच हैं; उन्हें साफ़ देखना ही कौशल है।",
    "भक्कम आर्थिक निर्णय आजची गरज एकूण खर्च, जोखीम, वेळ आणि पुढच्या जबाबदारीशी जोडतो. तडजोड खरी असते; ती स्पष्ट पाहणे हेच कौशल्य आहे.",
  ),
};

const CHECKS = [
  {
    question: C("Which part of this decision matters beyond today?", "इस फ़ैसले का कौन सा हिस्सा आज के बाद भी मायने रखता है?", "या निर्णयाचा कोणता भाग आजनंतरही महत्त्वाचा आहे?"),
    options: [C("Only how it looks", "सिर्फ़ यह कैसा दिखता है", "फक्त ते कसे दिसते"), C("Its carry-forward effect", "आगे चलने वाला असर", "पुढे जाणारा परिणाम"), C("How quickly she tapped", "उसने कितनी जल्दी टैप किया", "तिने किती पटकन टॅप केले")], answer: 1,
    why: C("Cash flow, risk and obligations continue into later chapters.", "नकदी, जोखिम और ज़िम्मेदारियाँ आगे के अध्यायों में चलती हैं।", "रोख प्रवाह, जोखीम आणि जबाबदाऱ्या पुढच्या अध्यायांत चालू राहतात."),
  },
  {
    question: C("What should she inspect before agreeing?", "हाँ कहने से पहले उसे क्या देखना चाहिए?", "मान्य करण्याआधी तिने काय तपासावे?"),
    options: [C("Only the headline", "सिर्फ़ शीर्षक", "फक्त मथळा"), C("What friends picked", "दोस्तों ने क्या चुना", "मित्रांनी काय निवडले"), C("Full cost, terms and risk", "पूरी लागत, शर्तें और जोखिम", "पूर्ण खर्च, अटी आणि जोखीम")], answer: 2,
    why: C("The smallest visible number rarely tells the whole story.", "सबसे छोटा दिखने वाला आँकड़ा पूरी कहानी नहीं बताता।", "सर्वात लहान दिसणारा आकडा संपूर्ण गोष्ट सांगत नाही."),
  },
  {
    question: C("When money is tight, what comes first?", "पैसे कम हों तो पहले क्या आता है?", "पैसे कमी असतील तर आधी काय?"),
    options: [C("Protect essentials and compare options", "ज़रूरतें बचाएँ और विकल्प तुलना करें", "आवश्यक गोष्टी जपा आणि पर्याय तुलना करा"), C("Ignore the statement", "स्टेटमेंट न देखें", "स्टेटमेंट दुर्लक्षित करा"), C("Add another impulse purchase", "एक और अचानक खरीद करें", "आणखी अचानक खरेदी करा")], answer: 0,
    why: C("Essentials create a safe floor from which trade-offs can be made.", "ज़रूरतें सुरक्षित आधार बनाती हैं जहाँ से समझौते किए जा सकते हैं।", "आवश्यक गोष्टी सुरक्षित पाया देतात, जिथून तडजोड करता येते."),
  },
  {
    question: C("What makes the strongest option strong?", "मज़बूत विकल्प को मज़बूत क्या बनाता है?", "भक्कम पर्याय भक्कम कशामुळे होतो?"),
    options: [C("It promises no discomfort", "वह कोई परेशानी नहीं बताता", "तो त्रास नसल्याचे सांगतो"), C("It shows the trade-off and keeps the plan workable", "वह समझौता दिखाकर योजना को चलने योग्य रखता है", "तो तडजोड दाखवून योजना चालण्याजोगी ठेवतो"), C("It hides the future", "वह भविष्य छिपाता है", "तो भविष्य लपवतो")], answer: 1,
    why: C("Good choices are often trade-offs made with clear information.", "अच्छे फ़ैसले अक्सर साफ़ जानकारी के साथ किए समझौते होते हैं।", "चांगले निर्णय अनेकदा स्पष्ट माहितीसह केलेल्या तडजोडी असतात."),
  },
  {
    question: C("What should Verena do after the consequence?", "नतीजे के बाद वेरेना को क्या करना चाहिए?", "परिणामानंतर वेरेनाने काय करावे?"),
    options: [C("Pretend it did not happen", "मान लें कुछ हुआ ही नहीं", "काही झालेच नाही असे माना"), C("Reset her whole life", "पूरी ज़िंदगी रीसेट कर दें", "संपूर्ण आयुष्य रीसेट करा"), C("Review, learn and adjust the next decision", "देखें, सीखें और अगला फ़ैसला सुधारें", "पाहा, शिका आणि पुढचा निर्णय सुधारा")], answer: 2,
    why: C("Financial resilience grows through review and correction, not perfection.", "आर्थिक मज़बूती पूर्णता से नहीं, समीक्षा और सुधार से बढ़ती है।", "आर्थिक लवचिकता परिपूर्णतेने नाही, आढावा आणि सुधारणेने वाढते."),
  },
];

function okayEffects(effects: Effects): Effects {
  return Object.fromEntries(Object.entries(effects).map(([key, value]) => [key, Math.round((value ?? 0) * ((value ?? 0) < 0 ? 1.15 : 0.35))])) as Effects;
}

function costlyEffects(effects: Effects): Effects {
  return Object.fromEntries(Object.entries(effects).map(([key, raw]) => {
    const value = raw ?? 0;
    if (key === "dependents") return [key, value];
    if (value < 0) return [key, Math.round(value * 1.4)];
    if (key === "debt") return [key, Math.round(value * 1.5)];
    if (key === "cash") return [key, Math.round(value * -0.3)];
    return [key, Math.round(value * -0.5)];
  })) as Effects;
}

function mergeEffects(base: Effects, extra: Effects): Effects {
  const out = { ...base };
  for (const [key, value] of Object.entries(extra)) {
    const name = key as keyof Effects;
    out[name] = (out[name] ?? 0) + (value ?? 0);
  }
  return out;
}

function makeSim(seed: ChapterSeed): Sim {
  const sim = seed.sim ?? { kind: "inspect" as const };
  const title = C("Try the numbers before deciding", "फ़ैसले से पहले आँकड़े आज़माएँ", "निर्णयाआधी आकडे वापरून पाहा");
  const hint = C("This is an educational example. Change or inspect the values to make the trade-off visible.", "यह शैक्षिक उदाहरण है। समझौता साफ़ देखने के लिए आँकड़े बदलें या जाँचें।", "हे शैक्षणिक उदाहरण आहे. तडजोड स्पष्ट दिसण्यासाठी आकडे बदला किंवा तपासा.");
  if (sim.kind === "budget") return { ...sim, title, hint };
  if (sim.kind === "grow") return { ...sim, title, hint };
  if (sim.kind === "emi") return { ...sim, title, hint };
  return {
    kind: "inspect", title, hint,
    lines: [
      { label: C("Immediate need", "तत्काल ज़रूरत", "तातडीची गरज"), value: C("Today", "आज", "आज"), note: seed.setup ?? PHRASES.moment },
      { label: C("Trade-off", "समझौता", "तडजोड"), value: C("Compare", "तुलना", "तुलना"), note: PHRASES.moment, flag: true },
      { label: C("Carry-forward effect", "आगे का असर", "पुढचा परिणाम"), value: C("Next chapter", "अगला अध्याय", "पुढचा अध्याय"), note: PHRASES.bridge },
    ],
  };
}

function generated(seed: ChapterSeed, index: number): Episode {
  const delta = seed.delta ?? { confidence: 3 };
  const variants = [
    { text: seed.action ?? PHRASES.okay, outcome: seed.goodOutcome ?? PHRASES.goodOutcome, verdict: "good" as const, effects: delta },
    { text: seed.okay ?? PHRASES.okay, outcome: seed.okayOutcome ?? PHRASES.okayOutcome, verdict: "okay" as const, effects: okayEffects(delta) },
    { text: seed.costly ?? PHRASES.costly, outcome: seed.costlyOutcome ?? PHRASES.costlyOutcome, verdict: "costly" as const, effects: costlyEffects(delta) },
  ];
  const shift = index % variants.length;
  const options = [...variants.slice(shift), ...variants.slice(0, shift)];
  return {
    id: seed.id,
    stage: seed.stage,
    topic: seed.topic,
    age: seed.age,
    place: seed.place,
    title: seed.title,
    story: seed.more ? [seed.setup ?? PHRASES.moment, seed.more, PHRASES.bridge] : [seed.setup ?? PHRASES.moment, PHRASES.bridge, PHRASES.moment],
    sim: makeSim(seed),
    question: seed.question ?? PHRASES.question,
    options,
    lesson: seed.lesson ?? PHRASES.lesson,
    drill: CHECKS,
    guides: [seed.guide],
  };
}

/** Builds the complete 45-part journey while preserving the strongest hand-authored chapters from the original curriculum. */
export function completeJourney(base: JourneyFile, file: ChaptersFile): JourneyFile {
  const originals = new Map(base.episodes.map((episode) => [episode.id, episode]));
  const episodes = file.chapters.map((seed, index) => {
    const original = seed.source ? originals.get(seed.source) : undefined;
    if (!original) return generated(seed, index);
    return {
      ...original,
      id: seed.id,
      stage: seed.stage,
      topic: seed.topic,
      age: seed.age,
      place: seed.place,
      title: seed.title,
      options: original.options.map((option) => ({
        ...option,
        effects: mergeEffects(option.effects, option.verdict === "good" ? (seed.delta ?? {}) : option.verdict === "okay" ? okayEffects(seed.delta ?? {}) : costlyEffects(seed.delta ?? {})),
      })),
      drill: [...original.drill, ...CHECKS].slice(0, 5),
      guides: [...new Set([seed.guide, ...original.guides])],
    };
  });
  return { ...base, reviewed: file.reviewed, episodes };
}