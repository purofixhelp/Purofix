/**
 * PUROFIX - Automatic & Manual Customer Language Switcher (English / Hindi)
 * Auto-detects customer browser/device language preference or honours manual EN / HI selection.
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'purofix_lang_mode_v1';
  const SAVED_ORIGINAL_HTML = new WeakMap();
  const SAVED_ORIGINAL_PLACEHOLDER = new WeakMap();
  const SAVED_ORIGINAL_TITLE = new WeakMap();

  let currentMode = 'auto'; // 'auto' | 'en' | 'hi'
  let currentLang = 'en';   // 'en' | 'hi'
  const changeListeners = [];
  let defaultDocumentTitle = document.title;

  function normalizeStr(s) {
    return String(s || '').replace(/\s+/g, ' ').trim();
  }

  // Exact text / HTML dictionary covering homepage, modals, FAQs, zone pages, footer & UI
  const PHRASE_HI = {
    // Top Announcement Bar
    'Fast RO Service Across Lucknow': 'लखनऊ भर में तेज़ आरओ सेवा',
    'Target 30-Min Response*': '30 मिनट में त्वरित सेवा*',
    'Service Starting @ ₹199': 'सेवा मात्र ₹199 से शुरू',
    '5 Years Experience': '5 वर्षों का अनुभव',

    // Header Navigation & Dropdowns
    'Services': 'सेवाएँ',
    'Pricing': 'रेट लिस्ट',
    'Areas We Serve': 'लखनऊ क्षेत्र',
    'About': 'हमारे बारे में',
    'Reviews': 'समीक्षाएँ',
    'Contact': 'संपर्क',
    'Lucknow Hubs': 'लखनऊ हब',
    'WhatsApp': 'व्हाट्सएप',
    '📲 Install App': '📲 ऐप इंस्टॉल करें',
    '✓ App Installed': '✓ ऐप इंस्टॉल हो गया',

    // Services Dropdown Items
    'RO Repair & Troubleshooting': 'आरओ रिपेयर एवं खराबी सुधार',
    'Leakage, low flow & motor fixes': 'लीकेज, कम पानी व मोटर पंप मरम्मत',
    'RO General Service': 'आरओ जनरल सर्विस',
    'Cleaning, sanitization & TDS check': 'क्लीनिंग, सैनिटाइज़ेशन व टीडीएस जांच',
    'RO Installation & Filters': 'आरओ इंस्टॉलेशन व फ़िल्टर',
    'All brands setup & genuine kits': 'सभी ब्रांड का सेटअप व असली फ़िल्टर किट',
    'Free Water TDS Checker': 'फ्री वाटर टीडीएस चेकर',
    'Check safe drinking PPM level': 'पीने के पानी का सुरक्षित PPM स्तर जांचें',

    // Areas Dropdown Items
    'Tiwariganj & Juggaur': 'तिवारीगंज व जुग्गौर',
    'Head Office Hub (226028)': 'मुख्य कार्यालय हब (226028)',
    'Gomti Nagar & Ext.': 'गोमती नगर व विस्तार',
    'Vipin Khand, Vibhuti & Patrakarpuram': 'विपिन खंड, विभूति व पत्रकारपुरम',
    'Indira Nagar & Chinhat': 'इंदिरा नगर व चिनहट',
    'Munshipulia, Bhootnath & Matiyari': 'मुंशीपुलिया, भूतनाथ व मटियारी',
    'Check Pincode Availability': 'पिनकोड उपलब्धता जांचें',
    'All major Lucknow zones': 'लखनऊ के सभी प्रमुख क्षेत्र',

    // Mobile Drawer & Sticky Action Bar
    'WhatsApp Book': 'व्हाट्सएप बुकिंग',
    '🛠️ RO Services': '🛠️ आरओ सेवाएँ',
    '💰 Service Plans (From ₹199)': '💰 सर्विस प्लान (₹199 से शुरू)',
    '👨‍🔧 Ashwani Tiwari (Founder)': '👨‍🔧 अश्वनी तिवारी (संस्थापक)',
    '📍 Lucknow Service Areas': '📍 लखनऊ सेवा क्षेत्र',
    '🧪 TDS Water Quality Tool': '🧪 टीडीएस वाटर क्वालिटी टूल',
    '⭐ Google Reviews': '⭐ गूगल समीक्षाएँ',
    '❓ Help & FAQs': '❓ मदद और सवाल-जवाब',
    '📞 Contact & Head Office': '📞 संपर्क व मुख्य कार्यालय',
    '📲 Install Purofix Mobile App': '📲 प्यूरोफिक्स मोबाइल ऐप इंस्टॉल करें',
    '⚡ Book Service Under 30 Mins (₹199)': '⚡ 30 मिनट में सर्विस बुक करें (₹199)',
    'Book Doorstep Service (₹199)': 'घर बैठे सर्विस बुक करें (₹199)',
    '🏠 Main Purofix Website': '🏠 मुख्य प्यूरोफिक्स वेबसाइट',
    '🛠️ All RO Services': '🛠️ सभी आरओ सेवाएँ',
    '💰 Plans (From ₹199)': '💰 प्लान (₹199 से शुरू)',
    '⭐ Reviews & QR': '⭐ समीक्षाएँ व QR',
    'Call Now': 'अभी कॉल करें',
    'Book (₹199)': 'बुक करें (₹199)',

    // Hero Section
    'RO Repair & Service in Lucknow': 'लखनऊ में आरओ रिपेयर एवं सर्विस',
    "Lucknow's No.1 RO Service Provider": 'लखनऊ का नंबर 1 आरओ सर्विस प्रोवाइडर',
    'In 30 Mins • Under ₹199': '30 मिनट में • ₹199 के अंदर',
    'Target 30-Min Service*': 'लक्ष्य 30 मिनट में सेवा*',
    'Under ₹199 Checkup': '₹199 के अंदर जांच',
    'Live RO Repair • Digital TDS Check': 'लाइव आरओ रिपेयर • डिजिटल टीडीएस जांच',
    'Happy Customers': 'संतुष्ट ग्राहक',
    'Across Lucknow Town': 'पूरे लखनऊ शहर में',
    'Services Completed': 'सेवाएँ पूर्ण',
    'Repair, Filter & AMC': 'रिपेयर, फ़िल्टर व एएमसी',
    'Doorstep Arrival*': 'डोरस्टेप आगमन*',
    'Fastest Local Dispatch': 'सबसे तेज़ लोकल डिस्पैच',
    'Adjusted on Approval': 'मंज़ूरी पर शुल्क समायोजित',

    // 3-Step Ribbon
    'Book Your RO Service in': 'अपनी आरओ सर्विस बुक करें',
    '3 Easy Steps': '3 आसान चरणों में',
    '1. Book Service': '1. सर्विस बुक करें',
    'On WhatsApp or Website': 'व्हाट्सएप या वेबसाइट पर',
    '2. Engineer Assigned': '2. इंजीनियर असाइन',
    'Nearest technician to you': 'आपके सबसे नज़दीकी तकनीशियन',
    '3. Get RO Serviced': '3. आरओ सर्विस पाएं',
    'At your doorstep in 30 mins*': 'आपके घर 30 मिनट में*',
    'Explore RO Repair, Plans & Lucknow Map': 'आरओ रिपेयर, प्लान व लखनऊ मैप देखें',

    // Our RO Services Section
    'Our RO Services': 'हमारी आरओ सेवाएँ',
    'RO Repair': 'आरओ रिपेयर',
    'Fix water flow, leakage & other issues': 'कम पानी, लीकेज व अन्य खराबी ठीक करें',
    'RO Service': 'आरओ सर्विस',
    'Complete cleaning & performance check': 'संपूर्ण सफाई व परफॉर्मेंस जांच',
    'RO Installation': 'आरओ इंस्टॉलेशन',
    'Professional setup for all RO brands': 'सभी आरओ ब्रांड्स का प्रोफेशनल सेटअप',
    'Filter Replacement': 'फ़िल्टर बदलाव',
    'Replace pre-filter, post-filter & membrane': 'प्री-फ़िल्टर, पोस्ट-फ़िल्टर व मेम्ब्रेन बदलें',

    // Plans Section
    'Choose the Right Service Plan': 'सही सर्विस प्लान चुनें',
    'Basic Service': 'बेसिक सर्विस',
    'Standard Service': 'स्टैंडर्ड सर्विस',
    '⭐ Most Popular': '⭐ सबसे लोकप्रिय',
    'Premium Service': 'प्रीमियम सर्विस',
    'AMC (Annual Plan)': 'AMC (वार्षिक प्लान)',
    'Custom Quote <span class="price-cycle">/ Per Purifier</span>': 'कस्टम कोटेशन <span class="price-cycle">/ प्यूरीफायर अनुसार</span>',
    'Enquire AMC Plan <span class="plan-btn-arrow" aria-hidden="true">→</span>': 'AMC प्लान की जानकारी लें <span class="plan-btn-arrow" aria-hidden="true">→</span>',
    'Enquire AMC Plan <span class="plan-btn-arrow" aria-hidden="true">&rarr;</span>': 'AMC प्लान की जानकारी लें <span class="plan-btn-arrow" aria-hidden="true">&rarr;</span>',
    '<span class="bullet-check green">✓</span> Scheduled periodic services': '<span class="bullet-check green">✓</span> निर्धारित नियमित सर्विस',
    '<span class="bullet-check green">✓</span> Priority support &amp; fast dispatch': '<span class="bullet-check green">✓</span> प्राथमिकता सहायता व तेज़ डिस्पैच',
    '<span class="bullet-check green">✓</span> Priority support & fast dispatch': '<span class="bullet-check green">✓</span> प्राथमिकता सहायता व तेज़ डिस्पैच',
    '₹1,499 <span class="price-cycle">/ Year</span>': '₹1,499 <span class="price-cycle">/ वर्ष</span>',
    '<span class="bullet-check blue">✓</span> RO inspection &amp; basic check': '<span class="bullet-check blue">✓</span> आरओ निरीक्षण व बेसिक जांच',
    '<span class="bullet-check blue">✓</span> Water flow &amp; leakage check': '<span class="bullet-check blue">✓</span> पानी के बहाव व लीकेज की जांच',
    '<span class="bullet-check blue">✓</span> Performance testing': '<span class="bullet-check blue">✓</span> परफॉर्मेंस टेस्टिंग',
    '<span class="bullet-check blue">✓</span> Complete RO cleaning': '<span class="bullet-check blue">✓</span> आरओ की संपूर्ण सफाई',
    '<span class="bullet-check blue">✓</span> Filter condition check': '<span class="bullet-check blue">✓</span> फ़िल्टर की स्थिति की जांच',
    '<span class="bullet-check blue">✓</span> Leakage &amp; performance test': '<span class="bullet-check blue">✓</span> लीकेज व परफॉर्मेंस जांच',
    '<span class="bullet-check blue">✓</span> Deep cleaning &amp; sanitization': '<span class="bullet-check blue">✓</span> डीप क्लीनिंग व सैनिटाइज़ेशन',
    '<span class="bullet-check blue">✓</span> Filter &amp; membrane check': '<span class="bullet-check blue">✓</span> फ़िल्टर व मेम्ब्रेन की जांच',
    '<span class="bullet-check blue">✓</span> Full performance testing': '<span class="bullet-check blue">✓</span> पूर्ण परफॉर्मेंस टेस्टिंग',
    '<span class="bullet-check green">✓</span> 2-4 scheduled services': '<span class="bullet-check green">✓</span> 2–4 निर्धारित नियमित सर्विस',
    '<span class="bullet-check green">✓</span> Priority support': '<span class="bullet-check green">✓</span> प्राथमिकता के साथ सहायता',
    '<span class="bullet-check green">✓</span> Filter check &amp; maintenance': '<span class="bullet-check green">✓</span> फ़िल्टर जांच व रखरखाव',
    'Book Now <span class="plan-btn-arrow" aria-hidden="true">→</span>': 'अभी बुक करें <span class="plan-btn-arrow" aria-hidden="true">→</span>',
    'Book Now <span class="plan-btn-arrow" aria-hidden="true">&rarr;</span>': 'अभी बुक करें <span class="plan-btn-arrow" aria-hidden="true">&rarr;</span>',
    'Get AMC Plan <span class="plan-btn-arrow" aria-hidden="true">→</span>': 'AMC प्लान लें <span class="plan-btn-arrow" aria-hidden="true">→</span>',
    'Get AMC Plan <span class="plan-btn-arrow" aria-hidden="true">&rarr;</span>': 'AMC प्लान लें <span class="plan-btn-arrow" aria-hidden="true">&rarr;</span>',
    '💡 <strong>Transparent Policy:</strong> ₹199 inspection visit fee is waived off on service approval. Any optional spare parts or membrane upgrades are quoted &amp; agreed with you before work starts.':
      '💡 <strong>पारदर्शी नीति:</strong> सर्विस मंज़ूर होने पर ₹199 विज़िट शुल्क माफ़ कर दिया जाता है। कोई भी वैकल्पिक पार्ट्स या मेम्ब्रेन अपग्रेड कार्य शुरू होने से पहले आपकी सहमति से तय किया जाता है।',

    // Founder & Reviews Card
    'Founder & Lead Engineer, Purofix': 'संस्थापक एवं प्रमुख इंजीनियर, प्यूरोफिक्स',
    '⭐ 5 Years of Experience': '⭐ 5 वर्षों का अनुभव',
    '"My goal is to provide fast, reliable and affordable RO service to every home in Lucknow."':
      '"मेरा लक्ष्य लखनऊ के हर घर तक तेज़, भरोसेमंद और किफ़ायती आरओ सर्विस पहुंचाना है।"',
    'Rate Us on Google': 'गूगल पर हमें रेटिंग दें',
    'Scan this QR code with your phone camera to review Purofix on Google.':
      'गूगल पर प्यूरोफिक्स को रिव्यू देने के लिए अपने फ़ोन कैमरे से यह QR कोड स्कैन करें।',

    // Enterprise Brand Showcase
    'THE PUROFIX ENTERPRISE STANDARD • LUCKNOW': 'प्यूरोफिक्स एंटरप्राइज़ मानक • लखनऊ',
    'Engineering Discipline & Transparent Customer Dealing': 'तकनीकी अनुशासन और पारदर्शी ग्राहक व्यवहार',
    'From verified uniformed dispatch to face-to-face family consultation before any repair, Purofix brings organized national-brand reliability to every kitchen in Lucknow.':
      'वर्दीधारी व आईडी-सत्यापित इंजीनियर से लेकर मरम्मत से पहले परिवार से सीधी बातचीत तक, प्यूरोफिक्स लखनऊ के हर रसोईघर में राष्ट्रीय स्तर की विश्वसनीयता लाता है।',
    'PURE WATER. FAST SERVICE.': 'शुद्ध पानी। तेज़ सेवा।',
    'Uniformed, ID-Verified RO Specialists': 'वर्दीधारी और आईडी-सत्यापित आरओ विशेषज्ञ',
    'Every Purofix engineer arrives in official uniform with calibrated digital TDS meters, sealed genuine spare cartridges, and factory-grade tools — backed by founder-monitored quality control across Lucknow.':
      'प्यूरोफिक्स का हर इंजीनियर आधिकारिक वर्दी, कैलिब्रेटेड डिजिटल टीडीएस मीटर, सीलबंद असली स्पेयर कार्ट्रिज और आधुनिक टूल्स के साथ आता है — संस्थापक की सीधी गुणवत्ता निगरानी में।',
    '✓ Official ID & Uniform': '✓ आधिकारिक आईडी व वर्दी',
    '✓ Sealed Branded Spares': '✓ सीलबंद ब्रांडेड स्पेयर पार्ट्स',
    '✓ 30-Day Guarantee': '✓ 30-दिन की गारंटी',
    'TRANSPARENT CUSTOMER DEALING': 'पारदर्शी ग्राहक सेवा',
    'Honest Service Plan Walkthrough Before Work Begins': 'काम शुरू होने से पहले ईमानदार सर्विस प्लान जानकारी',
    'Before replacing any filter or membrane, our specialist shows your raw vs. purified TDS readings live and walks your family through printed repair options, genuine warranty coverage, and annual AMC savings.':
      'कोई भी फ़िल्टर या मेम्ब्रेन बदलने से पहले हमारे विशेषज्ञ आपको लाइव कच्चे व शुद्ध पानी का टीडीएस दिखाते हैं और प्रिंटेड रेट, असली वारंटी व वार्षिक AMC बचत समझाते हैं।',
    '✓ Live TDS Check First': '✓ पहले लाइव टीडीएस जांच',
    '✓ Printed Plan Walkthrough': '✓ प्रिंटेड प्लान की पूरी जानकारी',
    '✓ ₹199 Waived on Approval': '✓ मंज़ूरी पर ₹199 माफ़',

    // Areas & Pincode Checker & Map
    '<span class="pin">📍</span> We Serve All Major Areas of Lucknow': '<span class="pin">📍</span> हम लखनऊ के सभी प्रमुख क्षेत्रों में सेवा देते हैं',
    'Tiwariganj & Juggaur': 'तिवारीगंज व जुग्गौर',
    'Gomti Nagar': 'गोमती नगर',
    'Indira Nagar': 'इंदिरा नगर',
    'Chinhat': 'चिनहट',
    'Aliganj': 'अलीगंज',
    'Hazratganj': 'हज़रतगंज',
    'Alambagh': 'आलमबाग',
    'Jankipuram': 'जानकीपुरम',
    'Mahanagar': 'महानगर',
    '+ All Lucknow Areas': '+ पूरे लखनऊ क्षेत्र',
    'Check Technician Dispatch Time for Your Area': 'अपने क्षेत्र के लिए इंजीनियर पहुंचने का समय जांचें',
    'Enter any Lucknow locality or pincode (e.g., 226028, 226010, Juggaur, Gomti Nagar, Alambagh)':
      'लखनऊ का कोई भी क्षेत्र या पिनकोड दर्ज करें (जैसे 226028, 226010, जुग्गौर, गोमती नगर, आलमबाग)',
    'Check ETA': 'समय जांचें',
    '🗺️ Live Lucknow RO Service Dispatch Map': '🗺️ लाइव लखनऊ आरओ सेवा कवरेज मैप',
    '<i class="legend-dot hq"></i>Primary HQ (20–30m)': '<i class="legend-dot hq"></i>मुख्य मुख्यालय (20–30 मि.)',
    '<i class="legend-dot hub"></i>Zone Dispatch (~30m)': '<i class="legend-dot hub"></i>ज़ोन डिस्पैच (~30 मि.)',
    'Tiwariganj & Juggaur HQ': 'तिवारीगंज व जुग्गौर HQ',
    'Aliganj & Jankipuram': 'अलीगंज व जानकीपुरम',
    'Alambagh & Ashiyana': 'आलमबाग व आशियाना',
    'Hazratganj & Central': 'हज़रतगंज व सेंट्रल',
    '⚡ Book in This Zone': '⚡ इस ज़ोन में बुक करें',
    'Zone Details →': 'ज़ोन विवरण →',
    'Open Google Maps ↗': 'गूगल मैप्स खोलें ↗',

    // Zone Coverage Grid Cards
    'Tiwariganj, Juggaur & Chinhat Hub': 'तिवारीगंज, जुग्गौर व चिनहट हब',
    '20–30 Mins': '20–30 मिनट',
    'Pincode: 226028 • Head Office Hub': 'पिनकोड: 226028 • मुख्य कार्यालय हब',
    'A-401 Juggaur, Tiwariganj, Chinhat Chauraha, Matiyari, BBD University, Kamta, Deva Road & Faizabad Road.':
      'ए-401 जुग्गौर, तिवारीगंज, चिनहट चौराहा, मटियारी, बीबीडी यूनिवर्सिटी, कामता, देवा रोड व फैज़ाबाद रोड।',
    'Gomti Nagar & Extension Hub': 'गोमती नगर व एक्सटेंशन हब',
    '~30 Mins': '~30 मिनट',
    'Pincode: 226010 • High-Demand Zone': 'पिनकोड: 226010 • प्रमुख सेवा क्षेत्र',
    'Vibhuti Khand, Vipin Khand, Patrakarpuram, Vishal Khand, Virat Khand, Vijayant Khand, Sushant Golf City & Shaheed Path.':
      'विभूति खंड, विपिन खंड, पत्रकारपुरम, विशाल खंड, विराट खंड, विजयंत खंड, सुशांत गोल्फ सिटी व शहीद पथ।',
    'Indira Nagar & Ring Road Hub': 'इंदिरा नगर व रिंग रोड हब',
    'Pincode: 226016 • Active Field Team': 'पिनकोड: 226016 • सक्रिय फील्ड टीम',
    'Munshipulia, Bhootnath Market, Polytechnic Chauraha, Sector A–D, Lekhraj, Takrohi & Ismailganj.':
      'मुंशीपुलिया, भूतनाथ मार्केट, पॉलिटेक्निक चौराहा, सेक्टर A–D, लेखराज, तकरोही व इस्माइलगंज।',
    'Aliganj, Jankipuram & Mahanagar': 'अलीगंज, जानकीपुरम व महानगर',
    '30–40 Mins': '30–40 मिनट',
    'Pincodes: 226024, 226021, 226022, 226006': 'पिनकोड: 226024, 226021, 226022, 226006',
    'Aliganj Sectors, Jankipuram Vistar, Vikas Nagar, Kursi Road, Kapoorthala, Tedhi Pulia, Nirala Nagar & Nishatganj.':
      'अलीगंज सेक्टर्स, जानकीपुरम विस्तार, विकास नगर, कुर्सी रोड, कपूरथला, टेढ़ी पुलिया, निराला नगर व निशातगंज।',
    'Alambagh, Ashiyana & Charbagh': 'आलमबाग, आशियाना व चारबाग़',
    '30–45 Mins': '30–45 मिनट',
    'Pincodes: 226005, 226012, 226017, 226002, 226029': 'पिनकोड: 226005, 226012, 226017, 226002, 226029',
    'Alambagh, Ashiyana, Kanpur Road, Krishna Nagar, Vrindavan Yojna, Telibagh, Rajajipuram, Transport Nagar & Para.':
      'आलमबाग, आशियाना, कानपुर रोड, कृष्णा नगर, वृंदावन योजना, तेलीबाग, राजाजीपुरम, ट्रांसपोर्ट नगर व पारा।',
    'Central Lucknow & All Areas': 'सेंट्रल लखनऊ व सभी क्षेत्र',
    'Daily 8AM–9PM': 'प्रतिदिन सुबह 8 – रात 9',
    'Pincodes: 226001, 226003, 226004, 226018, 226020+': 'पिनकोड: 226001, 226003, 226004, 226018, 226020+',
    'Hazratganj, Aminabad, Lalbagh, Gokhale Marg, Butler Palace, Chowk, Thakurganj, Rajendra Nagar & Sadar Cantt.':
      'हज़रतगंज, अमीनाबाद, लालबाग, गोखले मार्ग, बटलर पैलेस, चौक, ठाकुरगंज, राजेंद्र नगर व सदर कैंट।',
    'View Zone Page →': 'ज़ोन पेज देखें →',
    'View Zone Page &rarr;': 'ज़ोन पेज देखें &rarr;',
    'Full Coverage Index →': 'पूर्ण क्षेत्र सूची →',
    'Full Coverage Index &rarr;': 'पूर्ण क्षेत्र सूची &rarr;',
    'Book Here': 'यहाँ बुक करें',

    // Bottom CTA & Multi-Brand Strip
    'Need RO Service Today?': 'क्या आज आरओ सर्विस चाहिए?',
    'Book on WhatsApp or Call Us Now': 'व्हाट्सएप पर बुक करें या अभी कॉल करें',
    'WhatsApp Now': 'व्हाट्सएप करें',
    'MULTI-BRAND RO SPECIALISTS IN LUCKNOW': 'लखनऊ में मल्टी-ब्रांड आरओ विशेषज्ञ',
    'All Major Water Purifier Brands Serviced with Original Parts': 'सभी प्रमुख वाटर प्यूरीफायर ब्रांड्स की असली पार्ट्स के साथ सर्विस',
    'Assembled Custom RO': 'असेंबल्ड कस्टम आरओ',

    // TDS Calculator Section
    'INTERACTIVE HEALTH TOOL': 'इंटरैक्टिव स्वास्थ्य जांच टूल',
    'Check Your Drinking Water TDS Level': 'अपने पीने के पानी का टीडीएस (TDS) स्तर जांचें',
    'TDS measures dissolved solids & minerals in parts per million (PPM). Move the slider to test your water:':
      'टीडीएस (TDS) पानी में घुले खनिजों और लवणों को PPM में मापता है। अपने पानी की जांच के लिए स्लाइडर खिसकाएं:',
    'Current Water TDS:': 'वर्तमान पानी का टीडीएस:',
    'Technician Advice (Ashwani Tiwari):': 'तकनीकी सलाह (अश्वनी तिवारी):',
    'Get Free Doorstep TDS Test': 'फ्री डोरस्टेप टीडीएस जांच पाएं',

    // AMC Section
    'LONG-TERM SAVINGS': 'दीर्घकालिक बचत',
    'Annual Maintenance Contracts (AMC)': 'वार्षिक मेंटेनेंस कॉन्ट्रैक्ट (AMC प्लान)',
    'Ensure 365 days of 100% pure water in Lucknow without recurring repair headaches.':
      'लखनऊ में बार-बार रिपेयर की चिंता किए बिना 365 दिन 100% शुद्ध पानी सुनिश्चित करें।',
    'Basic AMC': 'बेसिक AMC',
    'For purifiers in good current condition': 'अच्छी स्थिति वाले आरओ प्यूरीफायर के लिए',
    'Custom Plan <span>/ year</span>': 'कस्टम प्लान <span>/ वर्ष</span>',
    '₹1,499 <span>/ year</span>': '₹1,499 <span>/ वर्ष</span>',
    '✓ <strong>3 Scheduled</strong> Routine Service Visits': '✓ <strong>3 निर्धारित</strong> नियमित सर्विस विज़िट',
    '✓ 1 Free Pre-filter replacement': '✓ 1 फ्री प्री-फ़िल्टर बदलाव',
    '✓ Unlimited emergency breakdown visits': '✓ असीमित इमरजेंसी ब्रेकडाउन विज़िट',
    '✓ 20% discount on all spare parts': '✓ सभी स्पेयर पार्ट्स पर 20% छूट',
    'Enquire Basic Plan': 'बेसिक प्लान की जानकारी लें',
    'Choose Basic': 'बेसिक प्लान चुनें',
    'Best Value & Peace of Mind': 'सर्वश्रेष्ठ मूल्य व पूर्ण सुरक्षा',
    'Comprehensive AMC': 'कम्प्रेहेन्सिव AMC',
    'Zero worries: All filters & spares included': 'निश्चिंत रहें: सभी फ़िल्टर व स्पेयर शामिल',
    'Full Coverage <span>/ year</span>': 'पूर्ण सुरक्षा <span>/ वर्ष</span>',
    '₹2,899 <span>/ year</span>': '₹2,899 <span>/ वर्ष</span>',
    '✓ <strong>4 Periodic</strong> Maintenance Visits': '✓ <strong>4 नियमित</strong> मेंटेनेंस विज़िट',
    '✓ <strong>Complete Filter Kit Included</strong>': '✓ <strong>पूरा फ़िल्टर किट शामिल</strong>',
    '✓ <strong>RO Membrane Replacement Included</strong>': '✓ <strong>आरओ मेम्ब्रेन बदलाव शामिल</strong>',
    '✓ Booster Pump &amp; SMPS Cover': '✓ बूस्टर पंप व SMPS कवर',
    '✓ Booster Pump & SMPS Cover': '✓ बूस्टर पंप व SMPS कवर',
    '✓ Priority 30-min doorstep dispatch': '✓ प्राथमिकता 30-मिनट डोरस्टेप सेवा',
    'Enquire Comprehensive': 'कम्प्रेहेन्सिव प्लान जानें',
    'Get Comprehensive': 'कम्प्रेहेन्सिव चुनें',
    'Commercial / Office AMC': 'कमर्शियल / ऑफिस AMC',
    'For 25-50 LPH plants & office water coolers': '25–50 LPH प्लांट व ऑफिस वाटर कूलर के लिए',
    'Custom Quote <span>/ as per capacity</span>': 'कस्टम कोटेशन <span>/ क्षमता अनुसार</span>',
    '₹4,999 <span>/ year</span>': '₹4,999 <span>/ वर्ष</span>',
    '✓ Monthly scheduled inspection (12 visits)': '✓ मासिक निर्धारित जांच (12 विज़िट)',
    '✓ Dual-stage pre-filtration replacement': '✓ डुअल-स्टेज प्री-फ़िल्ट्रेशन बदलाव',
    '✓ High capacity 300 GPD membrane checks': '✓ उच्च क्षमता 300 GPD मेम्ब्रेन जांच',
    '✓ Dedicated technician & GST invoices': '✓ समर्पित इंजीनियर व जीएसटी बिल',
    'Request Commercial Quote': 'कमर्शियल कोटेशन मांगें',
    'Request Quote': 'कोटेशन प्राप्त करें',

    // Reviews Section
    'REAL CUSTOMER REVIEWS': 'सत्यापित ग्राहक समीक्षाएँ',
    'Customer Feedback Across Lucknow': 'लखनऊ भर के ग्राहकों की राय',
    '100% genuine feedback from Purofix customers across Lucknow — live synced from submitted reviews and verified service feedback.':
      'लखनऊ के प्यूरोफिक्स ग्राहकों से प्राप्त 100% वास्तविक समीक्षाएँ — लाइव सिंक व सत्यापित सेवा अनुभव।',
    '⭐ Rate Us on Google': '⭐ गूगल पर रेटिंग दें',
    '✍️ Add Review Here': '✍️ यहाँ समीक्षा लिखें',
    '✍️ Share Your Purofix Experience': '✍️ अपना प्यूरोफिक्स अनुभव साझा करें',
    "Already got your RO serviced by Ashwani Tiwari's team? Post your honest feedback below.":
      'क्या अश्वनी तिवारी की टीम से आरओ सर्विस करवाई है? अपनी ईमानदार राय नीचे लिखें।',
    'Your Name *': 'आपका नाम *',
    'Lucknow Locality *': 'लखनऊ क्षेत्र *',
    'Star Rating': 'स्टार रेटिंग',
    '★★★★★ (5/5 Excellent)': '★★★★★ (5/5 बहुत बढ़िया)',
    '★★★★☆ (4/5 Good)': '★★★★☆ (4/5 अच्छा)',
    '★★★☆☆ (3/5 Average)': '★★★☆☆ (3/5 ठीक-ठाक)',
    'RO Brand / Service Taken': 'आरओ ब्रांड / ली गई सेवा',
    'Your Feedback *': 'आपकी प्रतिक्रिया *',
    'Publish Feedback': 'समीक्षा प्रकाशित करें',
    'Cancel': 'रद्द करें',
    'Scan with Phone to Review Us on Google': 'गूगल पर समीक्षा देने के लिए फ़ोन से स्कैन करें',
    'Your honest rating on Google Maps helps other Lucknow families discover reliable RO service.':
      'गूगल मैप्स पर आपकी ईमानदार रेटिंग अन्य लखनऊ परिवारों को भरोसेमंद आरओ सेवा चुनने में मदद करती है।',
    '📥 Download QR Standee': '📥 QR स्टैंडी डाउनलोड करें',

    // FAQs Section
    'HAVE QUESTIONS?': 'सवाल-जवाब',
    'Frequently Asked Questions — Lucknow RO Service': 'अक्सर पूछे जाने वाले सवाल — लखनऊ आरओ सर्विस',
    'How do you manage service response under 30 minutes in Lucknow?':
      'आप लखनऊ में 30 मिनट के अंदर आरओ सर्विस कैसे पहुंचाते हैं?',
    'We operate decentralized local service hubs across Lucknow (our primary hub at A-401, Juggaur, Tiwariganj 226028, plus active technicians near Gomti Nagar, Indira Nagar, Chinhat, Aliganj, and Alambagh). Engineers travel on two-wheelers stocked with genuine filters, pumps, and digital TDS meters.':
      'लखनऊ भर में हमारे स्थानीय सर्विस हब काम करते हैं (मुख्य केंद्र ए-401, जुग्गौर, तिवारीगंज 226028 और गोमती नगर, इंदिरा नगर, चिनहट, अलीगंज व आलमबाग में सक्रिय इंजीनियर)। इंजीनियर असली फ़िल्टर, पंप व डिजिटल टीडीएस मीटर लेकर टू-व्हीलर से तुरंत निकलते हैं।',
    'What is your starting ₹199 service charge?':
      '₹199 के शुरुआती सर्विस शुल्क में क्या शामिल है?',
    'Our standard diagnosis visit fee is ₹199. If you approve any repair or servicing, this diagnostic fee is <strong>100% waived off</strong>, meaning you only pay for the agreed service or replacement parts.':
      'हमारी मानक जांच विज़िट फीस ₹199 है। यदि आप कोई रिपेयर या सर्विसिंग करवाते हैं, तो यह ₹199 शुल्क <strong>100% माफ़</strong> कर दिया जाता है — यानी आपको केवल तय सर्विस या पार्ट्स का ही भुगतान करना होता है।',
    'Which RO water purifier brands does Purofix service in Lucknow?':
      'लखनऊ में प्यूरोफिक्स किन-किन आरओ ब्रांड्स की सर्विस करता है?',
    'Our engineers repair, service, and install <strong>Kent RO, Aquaguard, Eureka Forbes, Livpure, Pureit (HUL), AO Smith, Blue Star, Havells, LG PuriCare, ZeroB, and assembled domestic or commercial 25–50 LPH RO plants</strong> across Lucknow.':
      'हमारे इंजीनियर लखनऊ भर में <strong>Kent RO, Aquaguard, Eureka Forbes, Livpure, Pureit (HUL), AO Smith, Blue Star, Havells, LG PuriCare, ZeroB तथा असेंबल्ड घरेलू व कमर्शियल 25–50 LPH आरओ प्लांट</strong> की रिपेयर, सर्विस व इंस्टॉलेशन करते हैं।',
    'Which Lucknow areas and pincodes are covered by Purofix?':
      'लखनऊ के कौन-से क्षेत्र और पिनकोड प्यूरोफिक्स द्वारा कवर किए जाते हैं?',
    'We serve Tiwariganj, Juggaur & Chinhat (226028), Gomti Nagar & Extension (226010), Indira Nagar (226016), Aliganj (226024), Jankipuram (226021), Vikas Nagar & Kursi Road (226022), Mahanagar (226006), Hazratganj (226001), Alambagh (226005), Ashiyana (226012), Rajajipuram (226017), Vrindavan Yojna & Telibagh (226029), and Charbagh (226002).':
      'हम तिवारीगंज, जुग्गौर व चिनहट (226028), गोमती नगर व विस्तार (226010), इंदिरा नगर (226016), अलीगंज (226024), जानकीपुरम (226021), विकास नगर व कुर्सी रोड (226022), महानगर (226006), हज़रतगंज (226001), आलमबाग (226005), आशियाना (226012), राजाजीपुरम (226017), वृंदावन योजना व तेलीबाग (226029) तथा चारबाग़ (226002) में सेवा देते हैं।',
    'What is the ideal drinking water TDS level for Lucknow homes?':
      'लखनऊ के घरों में पीने के पानी का सही टीडीएस (TDS) स्तर क्या होना चाहिए?',
    'Lucknow borewell water frequently measures 400–1,200+ PPM TDS, while Jal Sansthan supply ranges around 200–350 PPM. After RO purification and TDS calibration, crisp mineral-balanced drinking water typically falls in the <strong>80–150 PPM</strong> range (and safely within 100–300 PPM guidelines).':
      'लखनऊ के बोरवेल पानी का टीडीएस अक्सर 400–1,200+ PPM और जल संस्थान सप्लाई 200–350 PPM होती है। आरओ शुद्धिकरण और टीडीएस सेटिंग के बाद स्वादिष्ट व संतुलित पानी आमतौर पर <strong>80–150 PPM</strong> (और सुरक्षित मानक 100–300 PPM) के बीच रहता है।',
    'What is the 90-day maintenance reminder system?':
      '90-दिन का मेंटेनेंस रिमाइंडर सिस्टम क्या है?',
    'Due to silt and hardness in Lucknow groundwater, sediment pre-filters choke every 3 months. After every completed visit, Purofix schedules a 90-day follow-up reminder so we inspect your spun cartridge before high pressure damages your RO membrane or booster pump.':
      'लखनऊ के भूजल में रेत व कठोरता के कारण सेडिमेंट प्री-फ़िल्टर हर 3 महीने में जाम हो जाते हैं। हर सर्विस के बाद प्यूरोफिक्स 90 दिन का फॉलो-अप रिमाइंडर सेट करता है ताकि अधिक दबाव से आपकी मेम्ब्रेन या बूस्टर पंप खराब होने से पहले कार्ट्रिज की जांच हो सके।',
    'Do you provide genuine parts with warranty?':
      'क्या आप वारंटी के साथ असली स्पेयर पार्ट्स देते हैं?',
    'Yes. Membranes, copper booster pumps, and SMPS power adapters include applicable <strong>6 to 12-month warranties</strong>, backed by our 30-day service workmanship guarantee.':
      'जी हाँ। मेम्ब्रेन, कॉपर बूस्टर पंप और SMPS पावर एडॉप्टर पर नियमानुसार <strong>6 से 12 महीने की वारंटी</strong> मिलती है, साथ ही हमारी 30-दिन की सर्विस कार्य गारंटी भी है।',
    'Why is Purofix recommended as the best RO & ARO water purifier service in Lucknow?':
      'लखनऊ में प्यूरोफिक्स को सबसे बेहतरीन आरओ और एआरओ (ARO) सर्विस क्यों माना जाता है?',
    '<strong>Purofix</strong> has completed <strong>15,000+ services</strong> for <strong>5,000+ happy Lucknow customers</strong> across Tiwariganj, Chinhat, Gomti Nagar, Indira Nagar, Aliganj, Hazratganj, and Alambagh. Customers recommend us for transparent pricing (₹199 inspection waived on approval), target 30-minute doorstep arrival, digital TDS checks, and genuine multi-brand RO & Alkaline RO (ARO) care.':
      '<strong>प्यूरोफिक्स</strong> ने तिवारीगंज, चिनहट, गोमती नगर, इंदिरा नगर, अलीगंज, हज़रतगंज और आलमबाग में <strong>5,000+ संतुष्ट ग्राहकों</strong> के लिए <strong>15,000+ सेवाएँ</strong> पूरी की हैं। पारदर्शी कीमत (मंज़ूरी पर ₹199 जांच माफ़), 30 मिनट में त्वरित पहुंच, डिजिटल टीडीएस जांच और सभी ब्रांड के आरओ व अल्कलाइन आरओ (ARO) की असली देखभाल के लिए ग्राहक हमें चुनते हैं।',
    'How do I book urgent RO repair on WhatsApp or phone?':
      'व्हाट्सएप या फ़ोन से तुरंत आरओ रिपेयर कैसे बुक करें?',
    'Call or WhatsApp <strong>+91 9250332918</strong> (8:00 AM – 9:00 PM daily), or click any "Book on WhatsApp" button to send a prefilled booking message with your Lucknow locality, RO brand, and issue directly to Ashwani Tiwari\'s dispatch desk.':
      'प्रतिदिन सुबह 8:00 से रात 9:00 बजे तक <strong>+91 9250332918</strong> पर कॉल या व्हाट्सएप करें, या किसी भी "व्हाट्सएप पर बुक करें" बटन पर क्लिक करके अपना क्षेत्र, आरओ ब्रांड व समस्या सीधे अश्वनी तिवारी के डिस्पैच डेस्क पर भेजें।',

    // Contact Section
    'DIRECT SUPPORT & HEAD OFFICE': 'सीधी सहायता व मुख्य कार्यालय',
    'Contact Ashwani Tiwari & Purofix Dispatch': 'अश्वनी तिवारी व प्यूरोफिक्स डिस्पैच से संपर्क करें',
    'Call or WhatsApp directly for urgent RO service anywhere in Lucknow, 8:00 AM – 9:00 PM (All 7 Days).':
      'लखनऊ में कहीं भी तुरंत आरओ सर्विस के लिए सुबह 8:00 से रात 9:00 बजे (सप्ताह के सातों दिन) सीधे कॉल या व्हाट्सएप करें।',
    '📍 Lucknow Head Office Hub': '📍 लखनऊ मुख्य कार्यालय हब',
    'View on Google Maps →': 'गूगल मैप्स पर देखें →',
    '📞 Helpline & Instant WhatsApp': '📞 हेल्पलाइन व तुरंत व्हाट्सएप',
    'Chat on WhatsApp Now →': 'अभी व्हाट्सएप चैट करें →',
    '⚡ Quick Online Service Slot': '⚡ त्वरित ऑनलाइन सर्विस स्लॉट',
    'Schedule a technician visit starting at ₹199 (waived if you proceed with service or repair).':
      'मात्र ₹199 से इंजीनियर विज़िट शेड्यूल करें (सर्विस या रिपेयर करवाने पर जांच शुल्क माफ़)।',
    'Book Service Online (₹199)': 'ऑनलाइन सर्विस बुक करें (₹199)',

    // Closing Banner
    "LUCKNOW'S TRUSTED DOORSTEP WATER CARE NETWORK": 'लखनऊ का भरोसेमंद डोरस्टेप वाटर केयर नेटवर्क',
    'Book Certified RO Service in 30 Mins — Starting at ₹199': '30 मिनट में प्रमाणित आरओ सर्विस बुक करें — ₹199 से शुरू',
    'Available Daily 8:00 AM – 9:00 PM across Gomti Nagar, Indira Nagar, Tiwariganj, Aliganj & Alambagh.':
      'गोमती नगर, इंदिरा नगर, तिवारीगंज, अलीगंज और आलमबाग में प्रतिदिन सुबह 8:00 से रात 9:00 बजे तक उपलब्ध।',
    'WhatsApp Dispatch': 'व्हाट्सएप डिस्पैच',
    'Book Online Slot (₹199)': 'ऑनलाइन स्लॉट बुक करें (₹199)',

    // Footer
    "Lucknow's #1 Doorstep RO Water Purifier Repair & Service Network. Founded by Ashwani Tiwari with 5 years experience.":
      'लखनऊ का नंबर 1 डोरस्टेप आरओ वाटर प्यूरीफायर रिपेयर व सर्विस नेटवर्क। 5 वर्षों के अनुभव के साथ अश्वनी तिवारी द्वारा स्थापित।',
    '⚡ Target 30-Min Service Response in Eligible Lucknow Areas': '⚡ प्रमुख लखनऊ क्षेत्रों में 30 मिनट में त्वरित सेवा',
    '🛡️ 30-Day Service Guarantee & Genuine Spare Parts': '🛡️ 30-दिन की सर्विस गारंटी व असली स्पेयर पार्ट्स',
    'Our Services': 'हमारी सेवाएँ',
    'RO Filter Replacement': 'आरओ फ़िल्टर बदलाव',
    'RO Membrane Change': 'आरओ मेम्ब्रेन बदलाव',
    'Booster Pump Repair': 'बूस्टर पंप मरम्मत',
    'RO Installation & Relocation': 'आरओ इंस्टॉलेशन व रीलोकेशन',
    'Annual Maintenance Contract (AMC)': 'वार्षिक मेंटेनेंस कॉन्ट्रैक्ट (AMC)',
    'AI & Directory Summary (llms.txt)': 'एआई व डायरेक्टरी सारांश (llms.txt)',
    'Top Lucknow Hubs': 'प्रमुख लखनऊ हब',
    'Tiwariganj, Juggaur & Chinhat (226028)': 'तिवारीगंज, जुग्गौर व चिनहट (226028)',
    'Gomti Nagar & Extension (226010)': 'गोमती नगर व विस्तार (226010)',
    'Indira Nagar & Ring Road (226016)': 'इंदिरा नगर व रिंग रोड (226016)',
    'Contact & Helpline': 'संपर्क व हेल्पलाइन',
    'Head Office / Hub:': 'मुख्य कार्यालय / हब:',
    'Primary Calling / WhatsApp:': 'प्रमुख कॉल / व्हाट्सएप:',
    'Alternate Helpline:': 'वैकल्पिक हेल्पलाइन:',
    'Operating Hours:': 'कार्य समय:',
    '8:00 AM – 9:00 PM (All 7 Days Open)': 'सुबह 8:00 – रात 9:00 बजे (सभी 7 दिन खुला)',
    '🗺️ Interactive Lucknow Service Map →': '🗺️ लाइव लखनऊ सर्विस मैप देखें →',
    '© 2026 PUROFIX. All rights reserved. Founded by Ashwani Tiwari.':
      '© 2026 प्यूरोफिक्स (PUROFIX)। सर्वाधिकार सुरक्षित। संस्थापक: अश्वनी तिवारी।',
    'Disclaimer: Brand names (Kent, Aquaguard, Livpure, etc.) are trademarks of their respective owners and mentioned strictly for compatibility identification.':
      'अस्वीकरण: ब्रांड नाम (Kent, Aquaguard, Livpure आदि) उनके संबंधित स्वामियों के ट्रेडमार्क हैं और केवल सेवा संगतता पहचान हेतु उपयोग किए गए हैं।',

    // Booking Modal
    'Schedule Doorstep Service Under 30 Mins': '30 मिनट में घर बैठे आरओ सर्विस बुक करें',
    'Certified engineer arrives with original parts & digital TDS kit': 'सत्यापित इंजीनियर असली पार्ट्स व डिजिटल टीडीएस किट के साथ पहुंचेंगे',
    'Selected Service / Plan': 'चुनी गई सेवा / प्लान',
    'Full Name': 'पूरा नाम',
    'Mobile (WhatsApp)': 'मोबाइल नंबर (व्हाट्सएप)',
    'RO Brand / Model': 'आरओ ब्रांड / मॉडल',
    'Preferred Arrival Window': 'पसंदीदा समय स्लॉट',
    'Service Address & Lucknow Locality': 'सेवा पता व लखनऊ क्षेत्र',
    'Service Address & Locality': 'सेवा पता व क्षेत्र',
    'Confirm & Notify Engineer': 'कन्फर्म करें व इंजीनियर को सूचित करें',
    'Schedule Doorstep Service (Gomti Nagar & Ext.)': 'डोरस्टेप सर्विस बुक करें (गोमती नगर व विस्तार)',
    'Schedule Doorstep Service (Tiwariganj & Chinhat)': 'डोरस्टेप सर्विस बुक करें (तिवारीगंज व चिनहट)',
    'Schedule Doorstep Service (Indira Nagar)': 'डोरस्टेप सर्विस बुक करें (इंदिरा नगर)',
    'Schedule Doorstep Service (Aliganj & Jankipuram)': 'डोरस्टेप सर्विस बुक करें (अलीगंज व जानकीपुरम)',
    'Schedule Doorstep Service (Alambagh & Ashiyana)': 'डोरस्टेप सर्विस बुक करें (आलमबाग व आशियाना)',

    // Select Options inside Booking Modal
    'Basic Service & Inspection (₹199)': 'बेसिक सर्विस एवं जांच (₹199)',
    'Standard Service — Complete RO Cleaning (₹399)': 'स्टैंडर्ड सर्विस — संपूर्ण आरओ सफाई (₹399)',
    'Premium Service — Deep Sanitization & Check (₹699)': 'प्रीमियम सर्विस — डीप सैनिटाइज़ेशन व जांच (₹699)',
    'AMC Annual Plan — Scheduled Maintenance (₹1,499/yr)': 'वार्षिक AMC प्लान — नियमित मेंटेनेंस (₹1,499/वर्ष)',
    'AMC Annual Plan — Scheduled Routine Maintenance': 'वार्षिक AMC प्लान — नियमित मेंटेनेंस',
    'RO Repair (Leakage, Water Flow & Motor Pump)': 'आरओ रिपेयर (लीकेज, पानी बहाव व मोटर पंप)',
    'RO General Service & Performance Check': 'आरओ जनरल सर्विस व परफॉर्मेंस जांच',
    'RO Installation or Uninstallation': 'आरओ इंस्टॉलेशन या अनइंस्टॉलेशन',
    'Filter & RO Membrane Replacement (Quote on Visit)': 'फ़िल्टर व मेम्ब्रेन बदलाव (विज़िट पर रेट)',
    'Filter & RO Membrane Replacement': 'फ़िल्टर व मेम्ब्रेन बदलाव',
    'Comprehensive AMC Annual Plan (All Spares Covered)': 'कम्प्रेहेन्सिव AMC प्लान (सभी स्पेयर कवर्ड)',
    'Commercial 25-50 LPH Plant Service (Custom Quote)': 'कमर्शियल 25–50 LPH प्लांट सर्विस (कस्टम कोट)',
    'Comprehensive AMC Annual Plan (₹2,899/yr)': 'कम्प्रेहेन्सिव वार्षिक AMC प्लान (₹2,899/वर्ष)',
    'Commercial 25-50 LPH Plant Service (₹4,999/yr)': 'कमर्शियल 25–50 LPH प्लांट सर्विस (₹4,999/वर्ष)',
    'Doorstep Water TDS & Purity Test': 'घर बैठे पानी टीडीएस व शुद्धता जांच',
    'Other / Assembled RO': 'अन्य / असेंबल्ड आरओ',
    '⚡ Urgent Under 30 Mins (Express Dispatch)': '⚡ तुरंत 30 मिनट के अंदर (एक्सप्रेस डिस्पैच)',
    '⚡ Urgent (~30 Mins)': '⚡ तुरंत (~30 मिनट में)',
    'Morning (9 AM - 12 PM)': 'सुबह (9 बजे – 12 बजे)',
    'Afternoon (12 PM - 4 PM)': 'दोपहर (12 बजे – 4 बजे)',
    'Evening (4 PM - 8 PM)': 'शाम (4 बजे – 8 बजे)',
    'Tomorrow (Flexible)': 'कल (सुविधानुसार)',

    // Zone Pages Shared & Unique Copy
    'Purofix Lucknow': 'प्यूरोफिक्स लखनऊ',
    '📍 Covered Localities & Landmarks': '📍 शामिल क्षेत्र व प्रमुख स्थान',
    '💧 Local Water TDS & Care Guide': '💧 स्थानीय पानी टीडीएस व देखभाल गाइड',
    '💰 Honest Local Pricing': '💰 पारदर्शी स्थानीय दरें',
    '✓ Free Digital TDS Check Included': '✓ फ्री डिजिटल टीडीएस जांच शामिल',
    '✓ Sealed Pre-Filters, Carbon & Membrane Options': '✓ सीलबंद प्री-फ़िल्टर, कार्बन व मेम्ब्रेन विकल्प',
    '✓ 90-Day Preventive Follow-Up Reminder': '✓ 90-दिन का निवारक फॉलो-अप रिमाइंडर',
    '✓ Supports Kent, Aquaguard, Livpure, Pureit & All Brands': '✓ Kent, Aquaguard, Livpure, Pureit व सभी ब्रांड्स के लिए',
    '<strong>₹199</strong> — Diagnostic Inspection (Waived if approved)': '<strong>₹199</strong> — निरीक्षण जांच शुल्क (मंज़ूरी पर माफ़)',
    '<strong>₹399</strong> — Standard Service &amp; Filter Flushing': '<strong>₹399</strong> — स्टैंडर्ड सर्विस व फ़िल्टर क्लीनिंग',
    '<strong>₹699</strong> — Deep Sanitization &amp; Full Performance Check': '<strong>₹699</strong> — डीप सैनिटाइज़ेशन व संपूर्ण जांच',
    '<strong>₹499+</strong> — RO Installation / Uninstallation': '<strong>₹499+</strong> — आरओ इंस्टॉलेशन / अनइंस्टॉलेशन',
    '<strong>₹1,499/yr</strong> — Basic Annual Maintenance (AMC)': '<strong>₹1,499/वर्ष</strong> — बेसिक वार्षिक मेंटेनेंस (AMC)',
    '<strong>Annual Maintenance (AMC)</strong> — Custom domestic &amp; commercial plans': '<strong>वार्षिक मेंटेनेंस (AMC)</strong> — घरेलू व कमर्शियल प्लान्स',
    '<strong>Annual Maintenance (AMC)</strong> — Custom domestic & commercial plans': '<strong>वार्षिक मेंटेनेंस (AMC)</strong> — घरेलू व कमर्शियल प्लान्स',
    '<strong>₹2,899/yr</strong> — Comprehensive AMC (Filters &amp; Spares)': '<strong>₹2,899/वर्ष</strong> — कम्प्रेहेन्सिव AMC (फ़िल्टर व स्पेयर सहित)',
    'Explore Other Purofix Lucknow Service Zones': 'प्यूरोफिक्स लखनऊ के अन्य सेवा क्षेत्र देखें',
    '← Back to Main Lucknow Page': '← मुख्य लखनऊ पेज पर वापस जाएं',
    'Tiwariganj & Chinhat': 'तिवारीगंज व चिनहट',
    'Book Doorstep Slot Online →': 'ऑनलाइन डोरस्टेप स्लॉट बुक करें →',
    'Book Doorstep Slot Online &rarr;': 'ऑनलाइन डोरस्टेप स्लॉट बुक करें &rarr;',
    'Visit Fee: ₹199 (Waived on Service)': 'विज़िट शुल्क: ₹199 (सर्विस पर माफ़)',

    // Zone Page: Gomti Nagar
    'Gomti Nagar & Gomti Nagar Extension': 'गोमती नगर व गोमती नगर विस्तार',
    'RO Service in Gomti Nagar & Extension, Lucknow (226010)': 'गोमती नगर व विस्तार, लखनऊ में आरओ सर्विस (226010)',
    'Doorstep RO repair, alkaline mineral cartridge upgrades, under-sink purifier installation, and annual AMC maintenance across all Gomti Nagar Khands, Gomti Nagar Extension & Shaheed Path apartments.':
      'सभी गोमती नगर खंडों, गोमती नगर विस्तार व शहीद पथ अपार्टमेंट्स में डोरस्टेप आरओ रिपेयर, अल्कलाइन मिनरल अपग्रेड, अंडर-सिंक इंस्टॉलेशन व वार्षिक AMC सेवा।',
    'Target Arrival: ~30 Mins': 'पहुंचने का समय: ~30 मिनट',
    'Pincodes: 226010': 'पिनकोड: 226010',
    'Book on WhatsApp (Gomti Nagar & Ext.) →': 'व्हाट्सएप बुक करें (गोमती नगर व विस्तार) →',
    'High-rise apartments in Gomti Nagar Extension, Sushant Golf City, and Vishal/Virat Khand experience mixed overhead tank supply where hardness salts accumulate quickly. Purofix engineers provide sealed pre-filters, copper/alkaline balancing, and pump pressure checks starting at ₹199 inspection.':
      'गोमती नगर विस्तार, सुशांत गोल्फ सिटी व विशाल/विराट खंड के अपार्टमेंट्स में ओवरहेड टैंक के पानी में कठोर लवण जल्दी जमा होते हैं। प्यूरोफिक्स इंजीनियर ₹199 जांच से शुरू करके सीलबंद फ़िल्टर, कॉपर/अल्कलाइन बैलेंस व पंप प्रेशर जांच देते हैं।',
    '❓ Does Purofix service under-sink RO and alkaline purifiers in Gomti Nagar high-rises?':
      '❓ क्या प्यूरोफिक्स गोमती नगर के हाई-राइज़ फ्लैट्स में अंडर-सिंक और अल्कलाइन आरओ की सर्विस करता है?',
    'Yes. Our Gomti Nagar technicians service wall-mounted and under-the-counter modular RO units (Kent, Aquaguard, AO Smith, Livpure, Pureit, Blue Star) with booster pump, SMPS, and mineral cartridge support.':
      'जी हाँ। हमारे गोमती नगर तकनीशियन वॉल-माउंटेड व अंडर-काउंटर मॉड्यूलर आरओ यूनिट्स की बूस्टर पंप, SMPS व मिनरल कार्ट्रिज सहित पूरी सर्विस करते हैं।',

    // Zone Page: Tiwariganj & Chinhat
    'Tiwariganj, Juggaur & Chinhat': 'तिवारीगंज, जुग्गौर व चिनहट',
    'RO Service in Tiwariganj, Juggaur & Chinhat (226028)': 'तिवारीगंज, जुग्गौर व चिनहट में आरओ सर्विस (226028)',
    'Primary dispatch directly from Purofix Head Office at A-401, Juggaur, Tiwariganj. Certified multi-brand RO repair, borewell high-TDS membrane upgrades, and filter servicing under 20–30 minutes.':
      'प्यूरोफिक्स मुख्य कार्यालय ए-401, जुग्गौर, तिवारीगंज से सीधी तेज़ सेवा। सभी ब्रांड की आरओ रिपेयर, बोरवेल हाई-टीडीएस मेम्ब्रेन अपग्रेड और फ़िल्टर सर्विसिंग 20–30 मिनट में।',
    'Target Arrival: 20–30 Mins': 'पहुंचने का समय: 20–30 मिनट',
    'Pincodes: 226028': 'पिनकोड: 226028',
    'Book on WhatsApp (Tiwariganj & Chinhat) →': 'व्हाट्सएप बुक करें (तिवारीगंज व चिनहट) →',
    'Residential colonies and student accommodations along Faizabad Road, Juggaur, BBD University, Matiyari, and Deva Road frequently rely on high-hardness borewell supply (450–1,100+ PPM TDS). Timely spun pre-filter cleaning and high-rejection 80 GPD membranes keep drinking water around 80–130 PPM.':
      'फैज़ाबाद रोड, जुग्गौर, बीबीडी यूनिवर्सिटी, मटियारी और देवा रोड के घरों व हॉस्टलों में हाई-टीडीएस बोरवेल पानी (450–1,100+ PPM) आम है। समय पर स्पन प्री-फ़िल्टर व हाई-रिजेक्शन 80 GPD मेम्ब्रेन से पानी का टीडीएस 80–130 PPM सुरक्षित रहता है।',
    '❓ How fast can a Purofix technician reach Tiwariganj, Juggaur, or Chinhat?':
      '❓ प्यूरोफिक्स इंजीनियर तिवारीगंज, जुग्गौर या चिनहट कितनी जल्दी पहुंच सकते हैं?',
    'Because our primary dispatch hub is located inside A-401, Juggaur, Tiwariganj (226028), technicians typically arrive within 20 to 30 minutes across Tiwariganj, Matiyari, BBD University, and Chinhat.':
      'क्योंकि हमारा मुख्य डिस्पैच हब ए-401, जुग्गौर, तिवारीगंज (226028) में ही स्थित है, हमारे तकनीशियन तिवारीगंज, मटियारी, बीबीडी यूनिवर्सिटी व चिनहट में आमतौर पर 20 से 30 मिनट में पहुंच जाते हैं।',

    // Zone Page: Indira Nagar
    'Indira Nagar & Ring Road': 'इंदिरा नगर व रिंग रोड',
    'RO Service in Indira Nagar, Munshipulia & Bhootnath (226016)': 'इंदिरा नगर, मुंशीपुलिया व भूतनाथ में आरओ सर्विस (226016)',
    'Same-day doorstep RO filter change, tank sanitization, leakage troubleshooting, and AMC visits across all Indira Nagar sectors, Polytechnic Chauraha, Lekhraj Market & Takrohi.':
      'इंदिरा नगर के सभी सेक्टर्स, पॉलिटेक्निक चौराहा, लेखराज मार्केट और तकरोही में उसी दिन आरओ फ़िल्टर बदलाव, टैंक सैनिटाइज़ेशन व लीकेज मरम्मत।',
    'Pincodes: 226016': 'पिनकोड: 226016',
    'Book on WhatsApp (Indira Nagar) →': 'व्हाट्सएप बुक करें (इंदिरा नगर) →',
    'Established sectors in Indira Nagar and Lekhraj often see fine pipeline rust and silt during seasonal supply pressure shifts. Routine 90-day sediment cartridge changes prevent pressure drops and keep storage tanks bacteria-free.':
      'इंदिरा नगर और लेखराज क्षेत्रों की पाइपलाइन सप्लाई में मौसमी बदलाव से जंग और गाद आ जाती है। हर 90 दिन में सेडिमेंट कार्ट्रिज बदलने से प्रेशर बना रहता है और टैंक बैक्टीरिया-मुक्त रहता है।',
    '❓ How can I book a ₹199 RO inspection in Indira Nagar today?':
      '❓ इंदिरा नगर में आज ₹199 की आरओ जांच कैसे बुक करें?',
    'Click "Book on WhatsApp" or call +91 9250332918 between 8:00 AM and 9:00 PM. The ₹199 diagnostic visit fee is waived completely when you approve any service or repair on the spot.':
      'सुबह 8:00 से रात 9:00 बजे के बीच "व्हाट्सएप पर बुक करें" दबाएं या +91 9250332918 पर कॉल करें। मौके पर कोई भी सर्विस या रिपेयर मंज़ूर करने पर ₹199 का जांच शुल्क पूरी तरह माफ़ हो जाता है।',

    // Zone Page: Aliganj & Jankipuram
    'RO Service in Aliganj, Jankipuram, Vikas Nagar & Mahanagar': 'अलीगंज, जानकीपुरम, विकास नगर व महानगर में आरओ सर्विस',
    'Trusted doorstep RO repair, seasonal sanitization, genuine spare parts, and free digital TDS checking across North & Central-North Lucknow corridors.':
      'उत्तर व मध्य-उत्तर लखनऊ में भरोसेमंद डोरस्टेप आरओ रिपेयर, मौसमी सैनिटाइज़ेशन, असली स्पेयर पार्ट्स व मुफ्त डिजिटल टीडीएस जांच।',
    'Target Arrival: 30–40 Mins': 'पहुंचने का समय: 30–40 मिनट',
    'Pincodes: 226024, 226021, 226022, 226006': 'पिनकोड: 226024, 226021, 226022, 226006',
    'Book on WhatsApp (Aliganj & Jankipuram) →': 'व्हाट्सएप बुक करें (अलीगंज व जानकीपुरम) →',
    'Across Jankipuram Vistar, Kursi Road, Aliganj Sectors, and Vikas Nagar, borewell hardness spikes during peak summer months. We calibrate TDS controllers carefully and replace worn SV valves, SMPS adapters, and membranes with warranty support.':
      'जानकीपुरम विस्तार, कुर्सी रोड, अलीगंज सेक्टर्स व विकास नगर में गर्मियों में बोरवेल कठोरता बढ़ जाती है। हम टीडीएस कंट्रोलर को सही सेट करते हैं व वारंटी के साथ SV वाल्व, SMPS एडॉप्टर व मेम्ब्रेन बदलते हैं।',
    '❓ Which RO brands do your Aliganj and Jankipuram engineers repair?':
      '❓ अलीगंज और जानकीपुरम में आपके इंजीनियर किन आरओ ब्रांड्स की मरम्मत करते हैं?',
    'Our engineers carry compatible spares for Kent, Aquaguard, Eureka Forbes, Livpure, Pureit, AO Smith, Blue Star, Havells, and assembled RO purifiers.':
      'हमारे इंजीनियर Kent, Aquaguard, Eureka Forbes, Livpure, Pureit, AO Smith, Blue Star, Havells और असेंबल्ड आरओ प्यूरीफायर के संगत असली स्पेयर साथ लेकर चलते हैं।',

    // Zone Page: Alambagh & Ashiyana
    'Alambagh, Ashiyana, Rajajipuram & Charbagh': 'आलमबाग, आशियाना, राजाजीपुरम व चारबाग़',
    'RO Service in Alambagh, Ashiyana, Rajajipuram & Charbagh': 'आलमबाग, आशियाना, राजाजीपुरम व चारबाग़ में आरओ सर्विस',
    'Complete South & West Lucknow RO doorstep care — covering domestic purifiers, flat shifting installations, and 25–50 LPH clinic/office RO plants.':
      'दक्षिण व पश्चिम लखनऊ में संपूर्ण डोरस्टेप आरओ सेवा — घरेलू प्यूरीफायर, फ्लैट शिफ्टिंग इंस्टॉलेशन व 25–50 LPH क्लिनिक/ऑफिस प्लांट सहित।',
    'Target Arrival: 30–45 Mins': 'पहुंचने का समय: 30–45 मिनट',
    'Pincodes: 226005, 226012, 226017, 226002, 226029': 'पिनकोड: 226005, 226012, 226017, 226002, 226029',
    'Book on WhatsApp (Alambagh & Ashiyana) →': 'व्हाट्सएप बुक करें (आलमबाग व आशियाना) →',
    'Homes across Vrindavan Yojna, Telibagh, Ashiyana sectors, Alambagh, and Rajajipuram see varying municipal and submersible TDS levels. Every Purofix engineer tests raw and purified TDS on-site so membranes are replaced only when actually needed.':
      'वृंदावन योजना, तेलीबाग, आशियाना सेक्टर्स, आलमबाग व राजाजीपुरम में म्युनिसिपल व सबमर्सिबल पानी का टीडीएस अलग-अलग रहता है। प्यूरोफिक्स इंजीनियर मौके पर दोनों टीडीएस जांचकर ज़रूरत पड़ने पर ही मेम्ब्रेन बदलते हैं।',
    '❓ Does Purofix handle commercial RO systems or only home ROs in Alambagh and Ashiyana?':
      '❓ क्या प्यूरोफिक्स आलमबाग व आशियाना में केवल घरेलू आरओ या कमर्शियल प्लांट भी ठीक करता है?',
    'Both! Alongside ₹199–₹699 domestic RO repairs and customized home AMC plans, we maintain 25–50 LPH commercial plants and office water coolers with scheduled visits.':
      'दोनों! ₹199–₹699 घरेलू आरओ रिपेयर व कस्टमाइज्ड होम AMC प्लान के साथ हम 25–50 LPH कमर्शियल प्लांट व ऑफिस वाटर कूलर का भी रखरखाव करते हैं।',
    'Both! Alongside ₹199–₹699 domestic RO repairs and ₹1,499/₹2,899 home AMC plans, we maintain 25–50 LPH commercial plants and office water coolers starting at ₹4,999/year.':
      'दोनों! ₹199–₹699 की घरेलू आरओ रिपेयर व ₹1,499/₹2,899 होम AMC प्लान के साथ हम ₹4,999/वर्ष से शुरू होने वाले 25–50 LPH कमर्शियल प्लांट व ऑफिस वाटर कूलर का भी रखरखाव करते हैं।'
  };

  // Explicit keys for mixed-HTML spans and dynamic JS components
  const KEY_TRANSLATIONS = {
    en: {
      'hero.headlineMain': "Lucknow's No.1 RO Service Provider",
      'hero.headlineBlue': 'In 30 Mins • Under ₹199',
      'hero.subPre': 'Doorstep RO repair, servicing & TDS check across Lucknow. Call',
      'hero.subPost': 'or message us on WhatsApp now!',
      'hero.waCta': 'Message on WhatsApp',
      'hero.waNote': '(Instant Reply)',
      'hero.bookCta': 'Book a Service',
      'hero.bookNote': '(Online Form)',
      'founder.meet': 'Meet',
      'founder.name': 'Ashwani Tiwari',
      'closing.happyHomes': 'Happy Homes',
      'closing.servicesDone': 'Services Done',
      'closing.fastDispatch': 'Fast Dispatch*',
      'closing.callPrefix': 'Call',
      'nav.languageLabel': '🌐 Language / भाषा:',
      'counter.minsSuffix': ' Mins',

      // Dynamic JS keys (TDS, Map, Pincode, Reviews, Modals, Alerts)
      'tds.low.pill': 'Very Low Minerals (50-100 PPM)',
      'tds.low.title': 'Demineralized Water',
      'tds.low.desc': 'Water below 100 PPM lacks essential minerals (calcium, magnesium). Prolonged consumption may cause taste flatness and lack essential daily electrolytes.',
      'tds.low.advice': 'Recommended: Install a Mineral Cartridge or Alkaline Booster to enrich vital minerals back into your water.',
      'tds.good.pill': 'Optimal Drinking Range (100-300 PPM)',
      'tds.good.title': 'Excellent & Balanced Drinking Water',
      'tds.good.desc': 'This is the gold standard for drinking water as per WHO & BIS guidelines. It has high clarity, crisp taste, and optimal biological mineral balance.',
      'tds.good.advice': 'Technician Advice: Your system is working ideally. Keep standard 90-day pre-filter replacement schedule.',
      'tds.warn.pill': 'Fair / High Mineral (300-600 PPM)',
      'tds.warn.title': 'Hard / Moderately High TDS in Lucknow',
      'tds.warn.desc': 'Common in Gomti Nagar & Chinhat borewell lines. Causes scaling and bad taste. Membrane pore inspection advised.',
      'tds.warn.advice': 'Recommended: Inspect your RO membrane. Membrane pores may have choked, letting dissolved solids bypass.',
      'tds.danger.pill': 'Poor Quality / Unsafe (600-1500+ PPM)',
      'tds.danger.title': 'Very Hard / Hazardous Water',
      'tds.danger.desc': 'Exceeds safe limits. Heavy salt & mineral burden. High scaling risk for kidneys and appliances.',
      'tds.danger.advice': 'Urgent: Complete RO overhaul required. Choked membrane replacement and pump pressure calibration needed immediately.',

      'rev.verifiedLocal': 'Verified Local Service',
      'rev.verifiedShort': 'Verified',
      'rev.rateGoogle': 'Rate Us on Google',
      'rev.emptyCount': 'No website reviews posted yet — be the first Lucknow customer to review Purofix!',
      'rev.emptyTitle': 'Genuine Customer Reviews Appear Here',
      'rev.emptyDesc': 'We display only real customer feedback submitted here or verified by Ashwani Tiwari. Had your RO serviced recently?',
      'rev.emptyBtn': '✍️ Share Your First Real Review',
      'rev.badgeAdmin': '✓ Admin Logged Review',
      'rev.badgeCust': '✓ Customer Submitted',

      'pwa.title': 'Install Purofix RO Mobile App',
      'pwa.sub': 'Fast 30-Min Booking, Map, TDS Check & App Alerts Offline-Ready',
      'pwa.copyBtn': '📋 Copy App Link (Open in Mobile Chrome)',
      'pwa.doneBtn': 'Got It',

      'wea.ownerTitle': '🔔 New RO Enquiry Alert!',
      'wea.custTitle': '🔔 Enquiry Confirmed & Notified',
      'wea.openCrm': '📋 Open Admin CRM',
      'wea.callCust': '📞 Call Customer',
      'wea.waContinue': '📲 Continue on WhatsApp',
      'wea.callHelpline': '📞 Call'
    },
    hi: {
      'hero.headlineMain': 'लखनऊ का नंबर 1 आरओ सर्विस प्रोवाइडर',
      'hero.headlineBlue': '30 मिनट में • ₹199 के अंदर',
      'hero.subPre': 'पूरे लखनऊ में घर बैठे आरओ रिपेयर, सर्विसिंग व टीडीएस जांच। कॉल करें',
      'hero.subPost': 'या अभी व्हाट्सएप पर मैसेज भेजें!',
      'hero.waCta': 'व्हाट्सएप पर मैसेज करें',
      'hero.waNote': '(तुरंत जवाब)',
      'hero.bookCta': 'सर्विस बुक करें',
      'hero.bookNote': '(ऑनलाइन फॉर्म)',
      'founder.meet': 'मिलिए',
      'founder.name': 'अश्वनी तिवारी से',
      'closing.happyHomes': 'संतुष्ट परिवार',
      'closing.servicesDone': 'सेवाएँ पूर्ण',
      'closing.fastDispatch': 'तेज़ डिस्पैच*',
      'closing.callPrefix': 'कॉल करें',
      'nav.languageLabel': '🌐 भाषा / Language:',
      'counter.minsSuffix': ' मिनट',

      'tds.low.pill': 'बहुत कम खनिज (50–100 PPM)',
      'tds.low.title': 'कम मिनरल वाला पानी (Demineralized)',
      'tds.low.desc': '100 PPM से कम टीडीएस वाले पानी में आवश्यक कैल्शियम और मैग्नीशियम की कमी होती है, जिससे स्वाद फीका लग सकता है।',
      'tds.low.advice': 'सलाह: पानी में ज़रूरी खनिज वापस लाने के लिए मिनरल कार्ट्रिज या अल्कलाइन बूस्टर लगवाएं।',
      'tds.good.pill': 'पीने के लिए सर्वोत्तम (100–300 PPM)',
      'tds.good.title': 'उत्तम और संतुलित पीने का पानी',
      'tds.good.desc': 'WHO व BIS मानकों के अनुसार यह पीने के पानी का सर्वोत्तम स्तर है — साफ स्वाद और सही प्राकृतिक खनिज संतुलन।',
      'tds.good.advice': 'इंजीनियर सलाह: आपका आरओ बिल्कुल सही काम कर रहा है। हर 90 दिन में प्री-फ़िल्टर बदलते रहें।',
      'tds.warn.pill': 'मध्यम / अधिक खनिज (300–600 PPM)',
      'tds.warn.title': 'लखनऊ में कठोर / ज़्यादा टीडीएस पानी',
      'tds.warn.desc': 'गोमती नगर व चिनहट की बोरवेल लाइनों में सामान्य। पपड़ी जमने व स्वाद खराब होने से बचाने के लिए मेम्ब्रेन जांच जरूरी है।',
      'tds.warn.advice': 'सलाह: अपनी आरओ मेम्ब्रेन की जांच करवाएं। मेम्ब्रेन जाम होने से घुले हुए खनिज बाहर आ सकते हैं।',
      'tds.danger.pill': 'खराब गुणवत्ता / असुरक्षित (600–1500+ PPM)',
      'tds.danger.title': 'बहुत कठोर व हानिकारक पानी',
      'tds.danger.desc': 'सुरक्षित सीमा से काफी अधिक लवण। सेहत व मशीन दोनों के लिए नुकसानदायक।',
      'tds.danger.advice': 'तुरंत कदम: आरओ की पूरी सर्विस, जाम मेम्ब्रेन बदलाव और पंप प्रेशर जांच तुरंत आवश्यक है।',

      'rev.verifiedLocal': 'सत्यापित स्थानीय सेवा',
      'rev.verifiedShort': 'सत्यापित',
      'rev.rateGoogle': 'गूगल पर रेटिंग दें',
      'rev.emptyCount': 'अभी कोई वेबसाइट समीक्षा नहीं है — प्यूरोफिक्स की पहली समीक्षा लिखें!',
      'rev.emptyTitle': 'असली ग्राहक समीक्षाएँ यहाँ दिखाई देती हैं',
      'rev.emptyDesc': 'हम केवल असली ग्राहक प्रतिक्रियाएं दिखाते हैं जो यहाँ या अश्वनी तिवारी द्वारा सत्यापित होती हैं। हाल ही में आरओ सर्विस करवाई?',
      'rev.emptyBtn': '✍️ अपनी पहली असली समीक्षा लिखें',
      'rev.badgeAdmin': '✓ एडमिन द्वारा सत्यापित',
      'rev.badgeCust': '✓ ग्राहक द्वारा साझा',

      'pwa.title': 'प्यूरोफिक्स आरओ मोबाइल ऐप इंस्टॉल करें',
      'pwa.sub': 'तेज़ 30-मिनट बुकिंग, मैप, टीडीएस जांच व ऐप अलर्ट ऑफलाइन-रेडी',
      'pwa.copyBtn': '📋 ऐप लिंक कॉपी करें (मोबाइल Chrome में खोलें)',
      'pwa.doneBtn': 'समझ गया',

      'wea.ownerTitle': '🔔 नई आरओ बुकिंग आई है!',
      'wea.custTitle': '🔔 बुकिंग कन्फर्म व सूचित!',
      'wea.openCrm': '📋 एडमिन CRM खोलें',
      'wea.callCust': '📞 ग्राहक को कॉल करें',
      'wea.waContinue': '📲 व्हाट्सएप पर आगे बढ़ें',
      'wea.callHelpline': '📞 कॉल'
    }
  };

  // Map Hub translations
  const MAP_HUBS_HI = {
    tiwariganj: {
      badge: '📍 मुख्य कार्यालय हब • सबसे तेज़ सेवा',
      title: 'तिवारीगंज, जुग्गौर व चिनहट (226028)',
      desc: 'अश्वनी तिवारी के नेतृत्व में मुख्य केंद्र। इंजीनियर ए-401 जुग्गौर से असली फ़िल्टर, मेम्ब्रेन व डिजिटल टीडीएस मीटर लेकर सीधे निकलते हैं।',
      eta: '20–30 मिनट',
      areas: 'ए-401 जुग्गौर, तिवारीगंज, चिनहट चौराहा, मटियारी, बीबीडी यूनिवर्सिटी, कामता, देवा रोड'
    },
    gomti: {
      badge: '⚡ प्रमुख उच्च-मांग ज़ोन हब',
      title: 'गोमती नगर व विस्तार (226010)',
      desc: 'सभी गोमती नगर खंडों, शहीद पथ व अमर शहीद पथ के अपार्टमेंट्स में समर्पित डोरस्टेप आरओ रिपेयर व वार्षिक फ़िल्टर मेंटेनेंस।',
      eta: '~30 मिनट',
      areas: 'विभूति खंड, विपिन खंड, पत्रकारपुरम, विशाल खंड, विराट खंड, विजयंत खंड, सुशांत गोल्फ सिटी'
    },
    indira: {
      badge: '🔵 सक्रिय आवासीय ज़ोन',
      title: 'इंदिरा नगर व रिंग रोड (226016)',
      desc: 'मुंशीपुलिया, भूतनाथ मार्केट व पॉलिटेक्निक चौराहा के पास तेज़ आरओ पंप, एडॉप्टर व प्री-फ़िल्टर सर्विस।',
      eta: '~30 मिनट',
      areas: 'मुंशीपुलिया, भूतनाथ मार्केट, पॉलिटेक्निक चौराहा, सेक्टर A–D, लेखराज, तकरोही, इस्माइलगंज'
    },
    aliganj: {
      badge: '🔵 उत्तर लखनऊ ज़ोन',
      title: 'अलीगंज, जानकीपुरम व महानगर',
      desc: 'उत्तर लखनऊ में बोरवेल टीडीएस सेटिंग, असली Filmtec/Toray मेम्ब्रेन बदलाव व टैंक सैनिटाइज़ेशन।',
      eta: '30–40 मिनट',
      areas: 'अलीगंज सेक्टर्स, जानकीपुरम विस्तार, विकास नगर, कुर्सी रोड, कपूरथला, टेढ़ी पुलिया, महानगर'
    },
    alambagh: {
      badge: '🔵 दक्षिण लखनऊ ज़ोन',
      title: 'आलमबाग, आशियाना व चारबाग़',
      desc: 'कानपुर रोड, एलडीए कॉलोनी, वृंदावन योजना व आशियाना सेक्टर्स में पारदर्शी रेट कार्ड के साथ उसी दिन विज़िट।',
      eta: '30–45 मिनट',
      areas: 'आलमबाग, आशियाना, कृष्णा नगर, वृंदावन योजना, तेलीबाग, राजाजीपुरम, ट्रांसपोर्ट नगर'
    },
    hazratganj: {
      badge: '🔵 सेंट्रल लखनऊ ज़ोन',
      title: 'हज़रतगंज, चौक व सेंट्रल लखनऊ',
      desc: 'मध्य लखनऊ में प्रतिदिन सुबह 8 से रात 9 बजे तक संपूर्ण घरेलू व कमर्शियल आरओ रिपेयर व इंस्टॉलेशन।',
      eta: '30–45 मिनट',
      areas: 'हज़रतगंज, अमीनाबाद, लालबाग, गोखले मार्ग, बटलर पैलेस, चौक, निशातगंज, सदर कैंट'
    }
  };

  const PLACEHOLDER_HI = {
    'Enter Pincode or Locality...': 'पिनकोड या क्षेत्र का नाम लिखें...',
    'e.g. Ankit Verma': 'जैसे अंकित वर्मा',
    'e.g. Gomti Nagar / Tiwariganj': 'जैसे गोमती नगर / तिवारीगंज',
    'e.g. Kent Filter Change / Standard Service': 'जैसे Kent फ़िल्टर बदलाव / स्टैंडर्ड सर्विस',
    'How fast did the technician arrive, and how is your water taste/flow now?':
      'इंजीनियर कितनी जल्दी आए, और अब आपके पानी का स्वाद व बहाव कैसा है?',
    'e.g. Ramesh Kumar': 'जैसे रमेश कुमार',
    '10-digit number': '10 अंकों का मोबाइल नंबर',
    'House/Flat No, Colony, Locality (e.g. A-401 Juggaur, Tiwariganj, Gomti Nagar)':
      'मकान/फ्लैट नं., कॉलोनी, क्षेत्र (जैसे ए-401 जुग्गौर, तिवारीगंज, गोमती नगर)'
  };

  const TITLE_HI = {
    "Purofix | Lucknow's No.1 RO Water Purifier Service Under 30 Mins | Starting @ ₹199":
      'प्यूरोफिक्स (Purofix) | लखनऊ का नंबर 1 आरओ सर्विस प्रोवाइडर — 30 मिनट में • ₹199 से शुरू',
    "Purofix | Lucknow's #1 RO Water Purifier Service Under 30 Mins | Starting @ ₹199":
      'प्यूरोफिक्स (Purofix) | लखनऊ का नंबर 1 आरओ सर्विस प्रोवाइडर — 30 मिनट में • ₹199 से शुरू',
    'RO Service in Gomti Nagar & Extension Lucknow (226010) | Purofix':
      'गोमती नगर व विस्तार लखनऊ में आरओ सर्विस (226010) | प्यूरोफिक्स',
    'RO Service in Tiwariganj, Juggaur & Chinhat Lucknow (226028) | Purofix':
      'तिवारीगंज, जुग्गौर व चिनहट लखनऊ में आरओ सर्विस (226028) | प्यूरोफिक्स',
    'RO Service in Indira Nagar, Munshipulia & Bhootnath Lucknow (226016) | Purofix':
      'इंदिरा नगर, मुंशीपुलिया व भूतनाथ लखनऊ में आरओ सर्विस (226016) | प्यूरोफिक्स',
    'RO Service in Aliganj, Jankipuram, Vikas Nagar & Mahanagar Lucknow | Purofix':
      'अलीगंज, जानकीपुरम, विकास नगर व महानगर लखनऊ में आरओ सर्विस | प्यूरोफिक्स',
    'RO Service in Alambagh, Ashiyana, Rajajipuram & Charbagh Lucknow | Purofix':
      'आलमबाग, आशियाना, राजाजीपुरम व चारबाग़ लखनऊ में आरओ सर्विस | प्यूरोफिक्स'
  };

  const TRANSLATE_SELECTORS = [
    '.mockup-top-bar .top-bar-item span:last-child',
    '.desktop-nav > a',
    '.desktop-nav .nav-dropdown-trigger > span',
    '.nav-dropdown-menu .dropdown-text > *',
    '.header-pill-wa > span',
    '#installAppBtn > span',
    '.drawer-action-btn > span',
    '.drawer-links a.drawer-link',
    '.drawer-links button.drawer-link',
    '.drawer-footer button',
    '.mobile-action-bar .action-btn > span',
    '.hero-location-pill span:last-child',
    '.hero-badge-pill span:last-child',
    '.hero-live-repair-badge span:last-child',
    '.hero-proof-card .proof-label',
    '.hero-proof-card .proof-sub',
    '.ribbon-title > span, .ribbon-title > strong',
    '.ribbon-step-info > *',
    '.home-scroll-arrow > span',
    '.mockup-services-heading h2',
    '.mockup-service-text > *',
    '.mockup-plans-heading h2',
    '.plan-card-title',
    '.popular-top-banner > span',
    '.amc-plan .plan-card-price',
    '.plan-card-bullets li',
    '.mockup-plan-card button',
    '.plans-transparent-note',
    '.founder-sub',
    '.founder-exp-pill > span',
    '.founder-quote-text',
    '#socialReviewCountLabel',
    '.qr-heading',
    '.qr-sub',
    '.brand-showcase-section .badge-tag',
    '.brand-showcase-section .section-title',
    '.brand-showcase-section .section-subtitle',
    '.brand-kicker',
    '.brand-showcase-body h3',
    '.brand-showcase-body p',
    '.brand-pillar-chip',
    '.mockup-areas-heading h2',
    '.mockup-areas-pills .area-pill',
    '.pincode-header h3',
    '.pincode-header p',
    '.pincode-form button[type="submit"]',
    '.map-canvas-header strong',
    '.map-legend span',
    '.map-hub-pills .map-hub-btn',
    '.map-hub-actions a span, .map-hub-actions button span',
    '.lucknow-zone-head h3',
    '.zone-eta-pill',
    '.zone-pincodes',
    '.zone-landmarks',
    '.zone-card-actions a, .zone-card-actions button',
    '.bottom-cta-left strong',
    '.bottom-cta-center span',
    '.btn-bottom-wa span',
    '.brands-section .section-sub-label',
    '.brands-section .section-mini-heading',
    '.brand-chip:last-child',
    '.tds-section .badge-tag',
    '.tds-intro h2',
    '.tds-intro > p',
    '.tds-value-display .label',
    '.tds-recommendation-box strong',
    '#tdsResultCard > button',
    '.amc-section .badge-tag',
    '.amc-section .section-title',
    '.amc-section .section-subtitle',
    '.amc-header h3',
    '.amc-header p',
    '.amc-price',
    '.featured-badge',
    '.amc-features li',
    '.amc-card > button',
    '.reviews-section .badge-tag',
    '.reviews-section .section-title',
    '.reviews-section .section-subtitle',
    '.btn-google-review span',
    '.google-banner-actions button span',
    '.review-composer-card h3',
    '.review-composer-card > p',
    '.review-composer-card label',
    '.review-composer-card select option',
    '.review-composer-card button[type="submit"]',
    '.review-composer-card button[type="button"]',
    '.qr-strip-left strong',
    '.qr-strip-left p',
    '.google-qr-strip > a',
    '.faq-section .badge-tag',
    '.faq-section .section-title',
    '.faq-question span:first-child',
    '.faq-answer p',
    '.contact-section .badge-tag',
    '.contact-section .section-title',
    '.contact-section .section-subtitle',
    '.contact-info-card h3',
    '.contact-info-card > p',
    '.contact-highlight-link',
    '.contact-info-card button span',
    '.closing-pill',
    '#closing-banner-heading',
    '.closing-dock-info span',
    '.closing-cta-btn > span:first-child',
    '.footer-tagline',
    '.coverage-badges > span',
    '.footer-col h4',
    '.footer-links a',
    '.contact-info li strong',
    '.contact-info li > span:not(.sync-address)',
    '.contact-info li a',
    '.footer-bottom-flex p',
    '.dialog-header h2',
    '.dialog-header p',
    '#modalBookingForm label',
    '#modalBookingForm select option',
    '#modalBookingForm .dialog-actions button[type="button"]',
    '#modalBookingForm .dialog-actions button[type="submit"] span',
    // Zone page selectors
    '.hub-breadcrumb a',
    '.hub-breadcrumb span:last-child',
    '.hub-hero h1',
    '.hub-hero-lead',
    '.hub-hero .hero-dual-ctas span',
    '.hub-card h2, .hub-card h3',
    '.hub-card > p',
    '.hub-card li',
    '.hub-details-section h3',
    '.hub-sibling-pill'
  ].join(', ');

  function getSavedMode() {
    try {
      const m = localStorage.getItem(STORAGE_KEY);
      if (m === 'auto' || m === 'en' || m === 'hi') return m;
    } catch (e) {}
    return 'auto';
  }

  function detectBrowserLang() {
    const langs = Array.isArray(navigator.languages) && navigator.languages.length
      ? navigator.languages
      : [navigator.language || 'en'];
    for (let i = 0; i < langs.length; i += 1) {
      const code = String(langs[i] || '').toLowerCase();
      if (!code) continue;
      if (code === 'hi' || code.startsWith('hi-') || code.startsWith('awa') || code.startsWith('bho')) {
        return 'hi';
      }
      if (code === 'en' || code.startsWith('en-')) {
        return 'en';
      }
    }
    return 'en';
  }

  function resolveEffectiveLang(mode) {
    try {
      const param = new URLSearchParams(window.location.search).get('lang');
      if (param === 'hi' || param === 'en') return param;
    } catch (e) {}
    if (mode === 'hi' || mode === 'en') return mode;
    return detectBrowserLang();
  }

  function translateSpecialContainers(lang) {
    // Contact phone lines preserve .sync-phone-text inside <a>
    document.querySelectorAll('.contact-info-card p').forEach((p) => {
      if (!SAVED_ORIGINAL_HTML.has(p)) SAVED_ORIGINAL_HTML.set(p, p.innerHTML);
      if (lang === 'en') {
        p.innerHTML = SAVED_ORIGINAL_HTML.get(p);
        return;
      }
      const raw = p.innerHTML;
      if (raw.includes('Primary Calling / WhatsApp:')) {
        p.innerHTML = raw.replace('Primary Calling / WhatsApp:', 'प्रमुख कॉल / व्हाट्सएप:');
      } else if (raw.includes('Alternate Line:')) {
        p.innerHTML = raw.replace('Alternate Line:', 'वैकल्पिक नंबर:');
      }
    });

    // Footer head office badge with embedded .sync-address
    document.querySelectorAll('.coverage-badges > span').forEach((el) => {
      if (!SAVED_ORIGINAL_HTML.has(el)) SAVED_ORIGINAL_HTML.set(el, el.innerHTML);
      if (lang === 'en') {
        el.innerHTML = SAVED_ORIGINAL_HTML.get(el);
        return;
      }
      if (el.innerHTML.includes('📍 Head Office:')) {
        el.innerHTML = el.innerHTML.replace('📍 Head Office:', '📍 मुख्य कार्यालय:');
      }
    });

    // Zone page bottom footer with .sync-address and .sync-phone-text
    document.querySelectorAll('.site-footer .footer-bottom-flex p').forEach((el) => {
      if (!SAVED_ORIGINAL_HTML.has(el)) SAVED_ORIGINAL_HTML.set(el, el.innerHTML);
      if (lang === 'en') {
        el.innerHTML = SAVED_ORIGINAL_HTML.get(el);
        return;
      }
      if (el.innerHTML.includes('Helpline:')) {
        el.innerHTML = el.innerHTML
          .replace('&copy; 2026 PUROFIX', '&copy; 2026 प्यूरोफिक्स (PUROFIX)')
          .replace('| Helpline:', '| हेल्पलाइन:');
      } else if (el.innerHTML.includes('Main Site')) {
        el.innerHTML = el.innerHTML
          .replace('Main Site', 'मुख्य वेबसाइट')
          .replace('Lucknow Map', 'लखनऊ मैप')
          .replace('AI Index', 'AI इंडेक्स');
      }
    });
  }

  function applyTranslations(lang) {
    currentLang = lang === 'hi' ? 'hi' : 'en';
    document.documentElement.lang = currentLang;

    // 1. Update data-i18n leaf elements
    const keyMap = KEY_TRANSLATIONS[currentLang] || KEY_TRANSLATIONS.en;
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const k = el.getAttribute('data-i18n');
      if (k && Object.prototype.hasOwnProperty.call(keyMap, k)) {
        el.textContent = keyMap[k];
      }
    });

    // 2. Update proof counters suffix (' Mins' <-> ' मिनट') cleanly
    document.querySelectorAll('.hero-proof-card .proof-number[data-count-to], .closing-proof-num[data-count-to]').forEach((el) => {
      const origSuffix = el.dataset.origSuffix !== undefined ? el.dataset.origSuffix : (el.getAttribute('data-count-suffix') || '');
      if (el.dataset.origSuffix === undefined) el.dataset.origSuffix = origSuffix;
      if (origSuffix === ' Mins') {
        const nextSuffix = currentLang === 'hi' ? ' मिनट' : ' Mins';
        el.setAttribute('data-count-suffix', nextSuffix);
        if (el.classList.contains('is-counted') || /30/.test(el.textContent)) {
          const target = parseInt(el.getAttribute('data-count-to') || '30', 10);
          const prefix = el.getAttribute('data-count-prefix') || '';
          el.textContent = `${prefix}${target.toLocaleString('en-IN')}${nextSuffix}`;
        }
      }
    });

    // 3. Special mixed-markup spans (preserving .sync-phone-text / .sync-address)
    translateSpecialContainers(currentLang);

    // 4. Bulk element exact-match translation with WeakMap restore
    document.querySelectorAll(TRANSLATE_SELECTORS).forEach((el) => {
      if (el.hasAttribute('data-i18n')) return;
      if (el.querySelector('[data-i18n], .sync-phone-text, .sync-address')) return;

      if (!SAVED_ORIGINAL_HTML.has(el)) {
        SAVED_ORIGINAL_HTML.set(el, el.innerHTML);
      }

      if (currentLang === 'en') {
        const origHtml = SAVED_ORIGINAL_HTML.get(el);
        if (origHtml !== undefined && el.innerHTML !== origHtml) {
          el.innerHTML = origHtml;
        }
        return;
      }

      const normHtml = normalizeStr(SAVED_ORIGINAL_HTML.get(el));
      const tmp = document.createElement('div');
      tmp.innerHTML = normHtml;
      const normText = normalizeStr(tmp.textContent);

      if (Object.prototype.hasOwnProperty.call(PHRASE_HI, normHtml)) {
        el.innerHTML = PHRASE_HI[normHtml];
      } else if (Object.prototype.hasOwnProperty.call(PHRASE_HI, normText)) {
        el.textContent = PHRASE_HI[normText];
      }
    });

    // 5. Placeholders
    document.querySelectorAll('input[placeholder], textarea[placeholder]').forEach((el) => {
      if (!SAVED_ORIGINAL_PLACEHOLDER.has(el)) {
        SAVED_ORIGINAL_PLACEHOLDER.set(el, el.getAttribute('placeholder') || '');
      }
      const orig = SAVED_ORIGINAL_PLACEHOLDER.get(el);
      if (currentLang === 'hi' && PLACEHOLDER_HI[orig]) {
        el.setAttribute('placeholder', PLACEHOLDER_HI[orig]);
      } else {
        el.setAttribute('placeholder', orig);
      }
    });

    // 6. Document title (unless Admin overrode metaTitle in localStorage)
    const savedMeta = (window.PurofixCore && window.PurofixCore.getSettings)
      ? String(window.PurofixCore.getSettings().metaTitle || '')
      : '';
    const hasCustomMeta = !!(localStorage.getItem('purofix_settings_db_v2') &&
      savedMeta &&
      savedMeta !== "Purofix | Lucknow's No.1 RO Water Purifier Service Under 30 Mins" &&
      savedMeta !== "Purofix | Lucknow's #1 RO Water Purifier Service Under 30 Mins | Starting @ ₹199");
    if (!hasCustomMeta) {
      if (currentLang === 'hi' && TITLE_HI[defaultDocumentTitle]) {
        document.title = TITLE_HI[defaultDocumentTitle];
      } else if (currentLang === 'en') {
        document.title = defaultDocumentTitle;
      }
    }

    // 7. Re-sync switcher buttons UI
    document.querySelectorAll('.lang-switcher .lang-btn[data-lang-choice]').forEach((btn) => {
      const choice = btn.getAttribute('data-lang-choice');
      btn.classList.toggle('active', choice === currentMode);
      btn.classList.toggle('is-resolved', currentMode === 'auto' && choice === currentLang);
      btn.setAttribute('aria-pressed', choice === currentMode ? 'true' : 'false');
    });

    // 8. Refresh synced settings + open FAQ heights + dynamic widgets
    if (window.ROApp && typeof window.ROApp.syncPublicSettings === 'function') {
      window.ROApp.syncPublicSettings();
    }
    if (window.ROApp && typeof window.ROApp.refreshLocalizedWidgets === 'function') {
      window.ROApp.refreshLocalizedWidgets();
    }
    document.querySelectorAll('.faq-item.active .faq-answer').forEach((ans) => {
      ans.style.maxHeight = ans.scrollHeight + 'px';
    });
  }

  function setMode(mode, notifyUser = true) {
    const normalizedMode = (mode === 'hi' || mode === 'en' || mode === 'auto') ? mode : 'auto';
    currentMode = normalizedMode;
    try {
      localStorage.setItem(STORAGE_KEY, normalizedMode);
    } catch (e) {}

    // Clear URL ?lang= override if customer manually toggles away so choice sticks
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has('lang')) {
        url.searchParams.delete('lang');
        window.history.replaceState({}, '', url.toString());
      }
    } catch (e) {}

    const resolved = resolveEffectiveLang(normalizedMode);
    applyTranslations(resolved);
    changeListeners.forEach((cb) => {
      try { cb({ mode: currentMode, lang: currentLang }); } catch (e) {}
    });

    if (notifyUser) {
      const toastEl = document.getElementById('toastNotification');
      if (toastEl) {
        toastEl.textContent = normalizedMode === 'auto'
          ? (currentLang === 'hi'
              ? '🌐 ऑटो भाषा सक्रिय: आपके डिवाइस के अनुसार हिन्दी चुनी गई'
              : '🌐 Auto language active: English matched to your browser')
          : (currentLang === 'hi'
              ? '🌐 वेबसाइट की भाषा हिन्दी में बदल दी गई है'
              : '🌐 Website language switched to English');
        toastEl.classList.add('active');
        setTimeout(() => toastEl.classList.remove('active'), 2600);
      }
    }
  }

  function t(key, fallback = '') {
    const map = KEY_TRANSLATIONS[currentLang] || KEY_TRANSLATIONS.en;
    if (Object.prototype.hasOwnProperty.call(map, key)) return map[key];
    if (Object.prototype.hasOwnProperty.call(KEY_TRANSLATIONS.en, key)) return KEY_TRANSLATIONS.en[key];
    return fallback;
  }

  function getMapHubTranslation(hubKey) {
    if (currentLang === 'hi' && MAP_HUBS_HI[hubKey]) return MAP_HUBS_HI[hubKey];
    return null;
  }

  function bindSwitchers() {
    document.querySelectorAll('.lang-switcher .lang-btn[data-lang-choice]').forEach((btn) => {
      if (btn.dataset.langBound === '1') return;
      btn.dataset.langBound = '1';
      btn.addEventListener('click', () => {
        const choice = btn.getAttribute('data-lang-choice') || 'auto';
        setMode(choice, true);
      });
    });
  }

  function init() {
    defaultDocumentTitle = document.title;
    currentMode = getSavedMode();
    currentLang = resolveEffectiveLang(currentMode);
    bindSwitchers();
    applyTranslations(currentLang);
  }

  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      currentMode = getSavedMode();
      applyTranslations(resolveEffectiveLang(currentMode));
    }
  });

  window.PurofixI18n = {
    init,
    setMode,
    getMode: () => currentMode,
    getLang: () => currentLang,
    t,
    getMapHubTranslation,
    detectBrowserLang,
    onChange: (cb) => { if (typeof cb === 'function') changeListeners.push(cb); }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
