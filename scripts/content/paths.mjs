// Paths, written by hand in all three languages. Each array is [English, Hindi, Marathi].
// Step shapes:
//   ["L", lessonId]                              a lesson from content/guide.json
//   ["A", title, body, link]                     a real-world action, finished with "I did it"
//   ["C", title, { q, o, a, why }]               a one-question check
// Run `node scripts/content/build.mjs` after editing to write content/paths.json.
export default [
  {
    id: "first-budget", icon: "list", cases: ["festival-spend", "room-deposit"],
    title: ["First budget", "पहला बजट", "पहिले बजेट"],
    summary: ["See where a week of money goes, then plan the next one.", "देखें कि एक हफ्ते का पैसा कहाँ जाता है, फिर अगले की योजना बनाएँ।", "एका आठवड्याचे पैसे कुठे जातात ते पाहा, मग पुढच्या आठवड्याचे नियोजन करा."],
    milestone: ["You can now plan a month of money on one page.", "अब आप महीने भर के पैसे की योजना एक पन्ने पर बना सकते हैं।", "आता तुम्ही महिन्याभराच्या पैशांचे नियोजन एका पानावर करू शकता."],
    steps: [
      ["L", "budget"],
      ["A", ["Log today's spending", "आज का खर्च लिखें", "आजचा खर्च नोंदवा"], ["Open Money Lab and log everything you spent today, even ₹10 for tea.", "मनी लैब खोलें और आज का हर खर्च लिखें, ₹10 की चाय भी।", "मनी लॅब उघडा आणि आजचा प्रत्येक खर्च नोंदवा, ₹10 चा चहासुद्धा."], "tracker"],
      ["L", "needs-wants"],
      ["A", ["Log three days in a row", "लगातार तीन दिन लिखें", "सलग तीन दिवस नोंदवा"], ["Keep logging for three days. On the third day Money Lab shows you one thing about your own spending.", "तीन दिन तक लिखते रहें। तीसरे दिन मनी लैब आपके अपने खर्च के बारे में एक बात दिखाएगा।", "तीन दिवस नोंदवत राहा. तिसऱ्या दिवशी मनी लॅब तुमच्या खर्चाबद्दल एक गोष्ट दाखवेल."], "tracker"],
      ["C", ["Quick check", "छोटी जाँच", "छोटी तपासणी"], {
        q: ["You have ₹600 for the week. Bus ₹210, lunch ₹280. What is free to spend?", "हफ्ते के लिए ₹600 हैं। बस ₹210, खाना ₹280। खुला पैसा कितना है?", "आठवड्यासाठी ₹600 आहेत. बस ₹210, जेवण ₹280. मोकळे पैसे किती?"],
        o: [["₹110", "₹110", "₹110"], ["₹320", "₹320", "₹320"], ["₹600", "₹600", "₹600"]], a: 0,
        why: ["600 minus 210 minus 280 leaves 110.", "600 में से 210 और 280 घटाएँ तो 110 बचते हैं।", "600 मधून 210 आणि 280 वजा केले की 110 उरतात."],
      }],
      ["L", "pay-yourself"],
    ],
  },
  {
    id: "loan-scam", icon: "shield", cases: ["payday-app", "whatsapp-tip"],
    title: ["Spot a loan scam", "कर्ज की ठगी पहचानें", "कर्जाची फसवणूक ओळखा"],
    summary: ["Learn the signs of a loan that is built to trap you.", "उस कर्ज के संकेत जानें जो फँसाने के लिए बना है।", "अडकवण्यासाठी बनवलेल्या कर्जाची लक्षणे जाणून घ्या."],
    milestone: ["You can now spot a loan that is built to trap.", "अब आप फँसाने वाले कर्ज को पहचान सकते हैं।", "आता तुम्ही अडकवणारे कर्ज ओळखू शकता."],
    steps: [
      ["L", "fake-loan-apps"],
      ["A", ["Read a real case", "एक असली मामला पढ़ें", "एक खरा प्रसंग वाचा"], ["Read the case about the app that wants the phone book, and pick what you would do.", "फोन बुक माँगने वाले ऐप का मामला पढ़ें और चुनें कि आप क्या करते।", "फोन बुक मागणाऱ्या अ‍ॅपचा प्रसंग वाचा आणि तुम्ही काय केले असते ते निवडा."], "case:payday-app"],
      ["L", "otp-pin"],
      ["A", ["Check your phone", "अपना फोन जाँचें", "तुमचा फोन तपासा"], ["Open your app list. If any loan app can read contacts or photos, remove that permission or the app.", "ऐप की सूची खोलें। कोई लोन ऐप कॉन्टैक्ट या फोटो पढ़ सकता हो तो वह इजाज़त या ऐप हटा दें।", "अ‍ॅपची यादी उघडा. एखादे लोन अ‍ॅप संपर्क किंवा फोटो वाचू शकत असेल तर ती परवानगी किंवा ते अ‍ॅप काढून टाका."], null],
      ["C", ["Quick check", "छोटी जाँच", "छोटी तपासणी"], {
        q: ["Which is the clearest sign of a scam loan?", "ठगी वाले कर्ज का सबसे साफ़ संकेत क्या है?", "फसव्या कर्जाचे सर्वात स्पष्ट लक्षण कोणते?"],
        o: [["It asks for a fee before giving the loan", "कर्ज देने से पहले शुल्क माँगता है", "कर्ज देण्याआधी शुल्क मागते"], ["It gives you a paper to read", "पढ़ने के लिए कागज़ देता है", "वाचायला कागद देते"], ["It has a branch office", "उसकी शाखा है", "त्याची शाखा आहे"]], a: 0,
        why: ["A real lender takes fees out of the loan. It does not ask you to send money first.", "असली कर्ज देने वाला शुल्क कर्ज में से काटता है। वह पहले पैसा भेजने को नहीं कहता।", "खरा कर्जदाता शुल्क कर्जातून कापतो. तो आधी पैसे पाठवायला सांगत नाही."],
      }],
    ],
  },
  {
    id: "first-loan-paper", icon: "file", cases: ["hidden-fees", "store-emi", "two-education-loans"],
    title: ["Read your first loan paper", "अपना पहला कर्ज का कागज़ पढ़ें", "तुमचा पहिला कर्जाचा कागद वाचा"],
    summary: ["Find the six things that decide what a loan costs.", "वे छह चीज़ें ढूँढें जो तय करती हैं कि कर्ज कितना महँगा है।", "कर्ज किती महाग आहे ते ठरवणाऱ्या सहा गोष्टी शोधा."],
    milestone: ["You can now spot a hidden fee.", "अब आप छिपा हुआ शुल्क पकड़ सकते हैं।", "आता तुम्ही लपलेले शुल्क ओळखू शकता."],
    steps: [
      ["L", "what-emi"],
      ["L", "flat-reducing"],
      ["A", ["Scan the sample loan", "नमूना कर्ज स्कैन करें", "नमुना कर्ज स्कॅन करा"], ["Open the personal loan sample. Look at the big number: the total you pay back.", "पर्सनल लोन का नमूना खोलें। बड़ा आँकड़ा देखें: कुल कितना लौटाना है।", "पर्सनल लोनचा नमुना उघडा. मोठा आकडा पाहा: एकूण किती परत द्यायचे."], "scan:personal-loan"],
      ["L", "fees"],
      ["A", ["Find the fee", "शुल्क ढूँढें", "शुल्क शोधा"], ["In the same sample, find both fee lines and add them. Check your answer against the fees Saath shows.", "उसी नमूने में दोनों शुल्क की लाइनें ढूँढें और जोड़ें। साथ जो शुल्क दिखाता है उससे मिलाएँ।", "त्याच नमुन्यात शुल्काच्या दोन्ही ओळी शोधा आणि मिळवा. साथ दाखवते त्या शुल्काशी ताडून पाहा."], "scan:personal-loan"],
      ["C", ["Quick check", "छोटी जाँच", "छोटी तपासणी"], {
        q: ["Loan ₹1,50,000. Fees ₹6,000 are cut first. How much do you receive?", "कर्ज ₹1,50,000। ₹6,000 शुल्क पहले कटता है। हाथ में कितना आता है?", "कर्ज ₹1,50,000. ₹6,000 शुल्क आधी कापले जाते. हातात किती येते?"],
        o: [["₹1,56,000", "₹1,56,000", "₹1,56,000"], ["₹1,50,000", "₹1,50,000", "₹1,50,000"], ["₹1,44,000", "₹1,44,000", "₹1,44,000"]], a: 2,
        why: ["Fees come out of the loan before it reaches you.", "शुल्क कर्ज में से आपके हाथ आने से पहले ही कट जाता है।", "शुल्क कर्ज तुमच्या हातात येण्याआधीच कापले जाते."],
      }],
      ["L", "before-you-sign"],
    ],
  },
  {
    id: "scholarship-safely", icon: "award", cases: ["blank-form"],
    title: ["Apply for a scholarship safely", "छात्रवृत्ति के लिए सुरक्षित आवेदन करें", "शिष्यवृत्तीसाठी सुरक्षितपणे अर्ज करा"],
    summary: ["Fill the form yourself, share only what is needed, pay nothing.", "फॉर्म खुद भरें, उतना ही बताएँ जितना ज़रूरी है, कोई पैसा न दें।", "अर्ज स्वतः भरा, गरजेपुरतीच माहिती द्या, पैसे देऊ नका."],
    milestone: ["You can now apply for support without paying a middleman.", "अब आप बिना बिचौलिये को पैसा दिए मदद के लिए आवेदन कर सकते हैं।", "आता तुम्ही मध्यस्थाला पैसे न देता मदतीसाठी अर्ज करू शकता."],
    steps: [
      ["L", "job-scams"],
      ["A", ["Scan the scheme form", "योजना का फॉर्म स्कैन करें", "योजनेचा अर्ज स्कॅन करा"], ["Open the scheme form sample. See which lines are still blank, and that it is support, not a loan.", "योजना के फॉर्म का नमूना खोलें। देखें कौन सी लाइनें खाली हैं, और यह कि यह मदद है, कर्ज नहीं।", "योजनेच्या अर्जाचा नमुना उघडा. कोणत्या ओळी रिकाम्या आहेत ते पाहा, आणि ही मदत आहे, कर्ज नाही हेही."], "scan:scheme-form"],
      ["L", "why-pan"],
      ["A", ["Ask one question at school", "स्कूल में एक सवाल पूछें", "शाळेत एक प्रश्न विचारा"], ["Ask a teacher or the office which scholarships students here have really received, and the official site for each.", "किसी शिक्षक या दफ़्तर से पूछें कि यहाँ के छात्रों को सच में कौन सी छात्रवृत्तियाँ मिली हैं, और हर एक की सरकारी साइट कौन सी है।", "शिक्षकांना किंवा कार्यालयात विचारा की इथल्या विद्यार्थ्यांना खरोखर कोणत्या शिष्यवृत्त्या मिळाल्या आहेत आणि प्रत्येकाची अधिकृत साइट कोणती."], null],
      ["A", ["Read the blank form case", "खाली फॉर्म वाला मामला पढ़ें", "रिकाम्या अर्जाचा प्रसंग वाचा"], ["Someone offers to fill the rest of the form for you. Decide what you would do.", "कोई कहता है कि बाकी फॉर्म वह भर देगा। तय करें कि आप क्या करते।", "कोणी म्हणते की उरलेला अर्ज तो भरून देईल. तुम्ही काय केले असते ते ठरवा."], "case:blank-form"],
      ["C", ["Quick check", "छोटी जाँच", "छोटी तपासणी"], {
        q: ["An agent will “guarantee” your scholarship for ₹800. You:", "एजेंट ₹800 में छात्रवृत्ति की “गारंटी” देता है। आप:", "एजंट ₹800 मध्ये शिष्यवृत्तीची “हमी” देतो. तुम्ही:"],
        o: [["Pay, it is a small amount", "दे दें, रकम छोटी है", "द्याल, रक्कम लहान आहे"], ["Apply yourself on the official site", "सरकारी साइट पर खुद आवेदन करें", "अधिकृत साइटवर स्वतः अर्ज कराल"], ["Give him your Aadhaar photo", "उसे आधार की फोटो दे दें", "त्याला आधारचा फोटो द्याल"]], a: 1,
        why: ["Nobody can guarantee a scholarship. Applying is free.", "छात्रवृत्ति की गारंटी कोई नहीं दे सकता। आवेदन मुफ्त है।", "शिष्यवृत्तीची हमी कोणीही देऊ शकत नाही. अर्ज मोफत असतो."],
      }],
    ],
  },
  {
    id: "emergency-jar", icon: "jar", cases: ["gold-emergency"],
    title: ["Build a ₹1,000 emergency jar", "₹1,000 का आपातकालीन डिब्बा बनाएँ", "₹1,000 चा आपत्कालीन डबा तयार करा"],
    summary: ["A small reserve keeps one bad week from turning into a loan.", "छोटी सी जमा एक बुरे हफ्ते को कर्ज बनने से रोकती है।", "थोडीशी शिल्लक एका वाईट आठवड्याचे कर्जात रूपांतर होऊ देत नाही."],
    milestone: ["You can now handle a small emergency without borrowing.", "अब आप छोटी मुसीबत बिना उधार लिए सँभाल सकते हैं।", "आता तुम्ही छोटी अडचण उधार न घेता सांभाळू शकता."],
    steps: [
      ["L", "emergency-fund"],
      ["A", ["Set the goal", "लक्ष्य रखें", "लक्ष्य ठेवा"], ["In Money Lab, set a savings goal of ₹1,000.", "मनी लैब में ₹1,000 की बचत का लक्ष्य रखें।", "मनी लॅबमध्ये ₹1,000 चे बचत लक्ष्य ठेवा."], "tracker"],
      ["A", ["Make the first deposit", "पहली जमा करें", "पहिली ठेव करा"], ["Put any amount aside today, even ₹20, and log it under Savings jar.", "आज कोई भी रकम अलग रखें, ₹20 भी चलेगा, और उसे बचत के डिब्बे में लिखें।", "आज कितीही रक्कम बाजूला ठेवा, ₹20 सुद्धा चालेल, आणि ती बचतीच्या डब्यात नोंदवा."], "tracker"],
      ["L", "where-savings"],
      ["A", ["Choose where it lives", "तय करें पैसा कहाँ रहेगा", "पैसे कुठे ठेवायचे ते ठरवा"], ["Decide one safe place for the jar: a savings account, or a box at home only you open.", "डिब्बे के लिए एक सुरक्षित जगह तय करें: बचत खाता, या घर का वह डिब्बा जो सिर्फ आप खोलें।", "डब्यासाठी एक सुरक्षित जागा ठरवा: बचत खाते, किंवा फक्त तुम्हीच उघडता असा घरातील डबा."], null],
      ["C", ["Quick check", "छोटी जाँच", "छोटी तपासणी"], {
        q: ["Saving ₹35 a week, about how long to reach ₹1,000?", "हफ्ते के ₹35 बचाएँ तो ₹1,000 तक पहुँचने में लगभग कितना समय लगेगा?", "आठवड्याला ₹35 वाचवले तर ₹1,000 व्हायला साधारण किती वेळ लागेल?"],
        o: [["About 7 months", "लगभग 7 महीने", "सुमारे 7 महिने"], ["About 2 years", "लगभग 2 साल", "सुमारे 2 वर्षे"], ["About 2 weeks", "लगभग 2 हफ्ते", "सुमारे 2 आठवडे"]], a: 0,
        why: ["1,000 divided by 35 is about 29 weeks.", "1,000 को 35 से भाग दें तो करीब 29 हफ्ते।", "1,000 भागिले 35 म्हणजे सुमारे 29 आठवडे."],
      }],
    ],
  },
  {
    id: "upi-without-fear", icon: "phone", cases: ["upi-pin"],
    title: ["Use UPI without fear", "बिना डर के यूपीआई चलाएँ", "न घाबरता यूपीआय वापरा"],
    summary: ["Three habits that stop almost every UPI trick.", "तीन आदतें जो यूपीआई की लगभग हर चाल रोक देती हैं।", "यूपीआयची जवळपास प्रत्येक फसवणूक थांबवणाऱ्या तीन सवयी."],
    milestone: ["You can now tell a real payment from a trick.", "अब आप असली भुगतान और चाल में फर्क कर सकते हैं।", "आता तुम्ही खरे पेमेंट आणि फसवणूक यांतील फरक ओळखू शकता."],
    steps: [
      ["L", "upi-safety"],
      ["A", ["Read the helpful caller case", "मददगार कॉलर वाला मामला पढ़ें", "मदत करणाऱ्या कॉलरचा प्रसंग वाचा"], ["A caller offers to fix a failed payment. Pick what you would do.", "एक कॉलर अटका हुआ भुगतान ठीक करने की बात करता है। चुनें कि आप क्या करते।", "एक कॉलर अडकलेले पेमेंट दुरुस्त करतो म्हणतो. तुम्ही काय केले असते ते निवडा."], "case:upi-pin"],
      ["L", "otp-pin"],
      ["A", ["Send ₹1 to someone you trust", "किसी भरोसे वाले को ₹1 भेजें", "विश्वासातल्या व्यक्तीला ₹1 पाठवा"], ["With a parent or friend beside you, send ₹1. Read the name on screen before you enter the PIN.", "माता-पिता या दोस्त को साथ बैठाकर ₹1 भेजें। पिन डालने से पहले स्क्रीन पर नाम पढ़ें।", "आईवडील किंवा मित्राला सोबत बसवून ₹1 पाठवा. पिन टाकण्याआधी स्क्रीनवरील नाव वाचा."], null],
      ["A", ["Set your own limit", "अपनी सीमा तय करें", "स्वतःची मर्यादा ठरवा"], ["Open your UPI app settings and look at the daily limit. Lower it if it is more than you ever send.", "यूपीआई ऐप की सेटिंग में रोज़ की सीमा देखें। जितना आप कभी भेजते नहीं, उससे ज़्यादा हो तो घटा दें।", "यूपीआय अ‍ॅपच्या सेटिंगमध्ये रोजची मर्यादा पाहा. तुम्ही कधीच पाठवत नाही त्यापेक्षा जास्त असेल तर कमी करा."], null],
      ["C", ["Quick check", "छोटी जाँच", "छोटी तपासणी"], {
        q: ["A QR code is sent to you “to receive a refund”. Scanning it will:", "“रिफंड पाने के लिए” आपको क्यूआर कोड भेजा गया। उसे स्कैन करने पर:", "“रिफंड मिळवण्यासाठी” तुम्हाला क्यूआर कोड पाठवला. तो स्कॅन केल्यावर:"],
        o: [["Bring money in", "पैसा आएगा", "पैसे येतील"], ["Send money out", "पैसा जाएगा", "पैसे जातील"], ["Do nothing", "कुछ नहीं होगा", "काही होणार नाही"]], a: 1,
        why: ["Scanning a QR code and entering a PIN always pays. It never receives.", "क्यूआर स्कैन करके पिन डालने से हमेशा पैसा जाता है, आता नहीं।", "क्यूआर स्कॅन करून पिन टाकल्यावर पैसे नेहमी जातात, येत नाहीत."],
      }],
    ],
  },
  {
    id: "salary-slip", icon: "briefcase", cases: ["fest-card"],
    title: ["Understand your first salary slip", "अपनी पहली सैलरी स्लिप समझें", "तुमची पहिली पगाराची स्लिप समजून घ्या"],
    summary: ["Know why the amount in your account is less than the amount promised.", "जानें कि खाते में आई रकम बताई गई रकम से कम क्यों है।", "खात्यात आलेली रक्कम सांगितलेल्या रकमेपेक्षा कमी का आहे ते जाणून घ्या."],
    milestone: ["You can now read a salary slip line by line.", "अब आप सैलरी स्लिप की हर लाइन पढ़ सकते हैं।", "आता तुम्ही पगाराच्या स्लिपची प्रत्येक ओळ वाचू शकता."],
    steps: [
      ["A", ["Gross and in-hand", "कुल और हाथ में", "एकूण आणि हातात"], ["Gross pay is what the job promises. In-hand pay is what reaches your account after cuts such as PF and tax. Ask someone at home to show you both on a real slip.", "कुल वेतन वह है जो नौकरी में बताया जाता है। हाथ का वेतन वह है जो पीएफ और कर जैसी कटौती के बाद खाते में आता है। घर में किसी से असली स्लिप पर दोनों दिखाने को कहें।", "एकूण पगार म्हणजे नोकरीत सांगितलेला. हातातला पगार म्हणजे पीएफ आणि कर यांसारख्या कपातीनंतर खात्यात येणारा. घरी कोणाला तरी खऱ्या स्लिपवर दोन्ही दाखवायला सांगा."], null],
      ["L", "tax-basics"],
      ["A", ["Find the PF line", "पीएफ की लाइन ढूँढें", "पीएफची ओळ शोधा"], ["PF is your own money, saved for later, with an equal part added by the employer. On a slip, find the PF cut and note the amount.", "पीएफ आपका अपना पैसा है जो आगे के लिए जमा होता है, और उतना ही हिस्सा कंपनी जोड़ती है। स्लिप पर पीएफ की कटौती ढूँढें और रकम नोट करें।", "पीएफ हे तुमचेच पैसे असतात, पुढच्यासाठी साठवलेले, आणि तेवढाच हिस्सा कंपनी घालते. स्लिपवर पीएफची कपात शोधा आणि रक्कम लिहून ठेवा."], null],
      ["L", "why-pan"],
      ["A", ["Log your income", "अपनी आय लिखें", "तुमचे उत्पन्न नोंदवा"], ["Log this month's income in Money Lab: salary, stipend or pocket money. Use the amount that reached your hand.", "इस महीने की आय मनी लैब में लिखें: वेतन, स्टाइपेंड या जेब खर्च। वही रकम लिखें जो हाथ में आई।", "या महिन्याचे उत्पन्न मनी लॅबमध्ये नोंदवा: पगार, स्टायपेंड किंवा खर्चाचे पैसे. हातात आलेली रक्कमच लिहा."], "tracker"],
      ["C", ["Quick check", "छोटी जाँच", "छोटी तपासणी"], {
        q: ["Gross pay ₹15,000. PF ₹1,800, other cuts ₹200. In-hand pay is:", "कुल वेतन ₹15,000। पीएफ ₹1,800, बाकी कटौती ₹200। हाथ में आएगा:", "एकूण पगार ₹15,000. पीएफ ₹1,800, इतर कपात ₹200. हातात येतील:"],
        o: [["₹15,000", "₹15,000", "₹15,000"], ["₹13,000", "₹13,000", "₹13,000"], ["₹17,000", "₹17,000", "₹17,000"]], a: 1,
        why: ["Take the cuts away from gross pay: 15,000 minus 2,000.", "कुल वेतन में से कटौती घटाएँ: 15,000 में से 2,000।", "एकूण पगारातून कपात वजा करा: 15,000 मधून 2,000."],
      }],
    ],
  },
  {
    id: "bank-visit", icon: "landmark", cases: ["insurance-missold"],
    title: ["Prepare for a bank visit", "बैंक जाने की तैयारी करें", "बँकेत जाण्याची तयारी करा"],
    summary: ["Walk in knowing what to carry, what to ask and what to refuse.", "यह जानकर जाएँ कि क्या ले जाना है, क्या पूछना है और क्या मना करना है।", "काय न्यायचे, काय विचारायचे आणि काय नाकारायचे ते जाणून जा."],
    milestone: ["You can now walk into a bank and ask for what you need.", "अब आप बैंक जाकर अपनी ज़रूरत की बात साफ़ कह सकते हैं।", "आता तुम्ही बँकेत जाऊन तुम्हाला हवे ते स्पष्टपणे मागू शकता."],
    steps: [
      ["L", "where-savings"],
      ["A", ["Pack the papers", "कागज़ तैयार रखें", "कागदपत्रे तयार ठेवा"], ["Put together an ID proof, an address proof, two photos and their copies. Ask at home if you are unsure which ones you have.", "पहचान का सबूत, पते का सबूत, दो फोटो और उनकी कॉपी एक साथ रखें। कौन से कागज़ हैं, पक्का न हो तो घर पर पूछें।", "ओळखीचा पुरावा, पत्त्याचा पुरावा, दोन फोटो आणि त्यांच्या प्रती एकत्र ठेवा. कोणते कागद आहेत याची खात्री नसेल तर घरी विचारा."], null],
      ["A", ["Write three questions", "तीन सवाल लिखें", "तीन प्रश्न लिहा"], ["Write down: Is there a minimum balance? What does the ATM card cost each year? Which charges can I avoid?", "लिख लें: क्या न्यूनतम बैलेंस रखना है? एटीएम कार्ड का सालाना शुल्क कितना है? कौन से शुल्क मैं बचा सकता हूँ?", "लिहून ठेवा: किमान शिल्लक ठेवावी लागते का? एटीएम कार्डाचे वार्षिक शुल्क किती? कोणती शुल्के मी टाळू शकतो?"], null],
      ["L", "what-insurance"],
      ["A", ["Read the mis-sold policy case", "गलत बेची गई पॉलिसी का मामला पढ़ें", "चुकीची विकलेली पॉलिसी हा प्रसंग वाचा"], ["A bank officer offers a policy that “works like a deposit”. Decide what you would say.", "बैंक अधिकारी ऐसी पॉलिसी देता है जो “एफडी जैसी” है। तय करें कि आप क्या कहते।", "बँक अधिकारी “ठेवीसारखी” पॉलिसी देऊ करतो. तुम्ही काय म्हणाला असता ते ठरवा."], "case:insurance-missold"],
      ["C", ["Quick check", "छोटी जाँच", "छोटी तपासणी"], {
        q: ["At the counter you are asked to sign a form you have not read. You:", "काउंटर पर ऐसे फॉर्म पर साइन माँगे जाते हैं जो आपने पढ़ा नहीं। आप:", "काउंटरवर न वाचलेल्या अर्जावर सही मागितली जाते. तुम्ही:"],
        o: [["Sign, the queue is long", "साइन कर दें, लाइन लंबी है", "सही कराल, रांग मोठी आहे"], ["Step aside and read it first", "एक तरफ हटकर पहले पढ़ें", "बाजूला होऊन आधी वाचाल"], ["Ask a stranger to fill it", "किसी अनजान से भरवा लें", "अनोळखी व्यक्तीकडून भरून घ्याल"]], a: 1,
        why: ["It is your right to read before you sign. The queue can wait.", "साइन से पहले पढ़ना आपका हक है। लाइन रुक सकती है।", "सही करण्यापूर्वी वाचणे हा तुमचा हक्क आहे. रांग थांबू शकते."],
      }],
    ],
  },
];
