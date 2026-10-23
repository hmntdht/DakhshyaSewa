export interface GuidelineItem {
  en: string;
  ne: string;
}

export interface ServicePackage {
  id: string;
  name_en: string;
  name_ne: string;
  description_en?: string;
  description_ne?: string;
  specificIncluded?: GuidelineItem[];
  specificNotIncluded?: GuidelineItem[];
}

export interface ServiceGuideline {
  slug: string;
  title_en: string;
  title_ne: string;
  label_en?: string; // e.g. "Non-Medical Service"
  label_ne?: string;
  version: string;
  packages?: ServicePackage[];
  included: GuidelineItem[];
  notIncluded: GuidelineItem[];
  importantNote?: GuidelineItem;
  disclaimer?: GuidelineItem;
  keyExclusionsSummary: {
    en: string;
    ne: string;
  };
}

export const SERVICE_GUIDELINES: Record<string, ServiceGuideline> = {
  // 1. Childcare
  'child-care-companionship': {
    slug: 'child-care-companionship',
    title_en: 'Childcare & Companionship',
    title_ne: 'बालबालिका स्याहार तथा साथी सेवा',
    version: '1.0',
    keyExclusionsSummary: {
      en: 'No medical/nursing care · No unauthorized outings · No heavy household chores',
      ne: 'चिकित्सीय हेरचाह छैन · अनुमति बिना बाहिर लैजान मिल्दैन · भारी घरायसी काम छैन',
    },
    included: [
      {
        en: 'Supervise and look after the child during the booked hours.',
        ne: 'बुक गरिएको समय अवधिभर बालबालिकाको उचित निगरानी र हेरचाह गर्ने।',
      },
      {
        en: 'Engage the child in age-appropriate games, drawing, storytelling, and activities.',
        ne: 'बालबालिकाको उमेर सुहाउँदा खेल, चित्रकला, कथा वाचन तथा रचनात्मक क्रियाकलापमा संलग्न गराउने।',
      },
      {
        en: 'Help with simple learning activities and reading.',
        ne: 'सामान्य सिकाइ गतिविधि, गृहकार्य अभ्यास र पढाइमा सहयोग गर्ने।',
      },
      {
        en: 'Assist with ordinary mealtime routines and serve prepared food.',
        ne: 'सामान्य खाना खाने तालिकामा सहयोग गर्ने र तयार गरिएको खाना खुवाउने।',
      },
      {
        en: 'Help the child maintain basic hygiene, such as washing hands.',
        ne: 'हात धुने, मुख सफा गर्ने जस्ता आधारभूत व्यक्तिगत सरसफाइमा सहयोग गर्ने।',
      },
      {
        en: "Follow the parent's agreed daily routine and instructions.",
        ne: 'अभिभावकले दिएका निर्देशन र दैनिक तालिका पूर्ण रूपमा पालना गर्ने।',
      },
      {
        en: "Inform the parent about the child's activities and any concerns during the service.",
        ne: 'सेवा अवधिमा बालबालिकाका गतिविधि तथा आवश्यक विषयबारे अभिभावकलाई नियमित जानकारी दिने।',
      },
    ],
    notIncluded: [
      {
        en: 'Provide medical treatment, nursing, or administer medication.',
        ne: 'चिकित्सीय उपचार, नर्सिङ सेवा वा डाक्टरको सल्लाह बिना औषधि खुवाउने कार्य नगर्ने।',
      },
      {
        en: 'Physically punish, threaten, or mistreat the child.',
        ne: 'बालबालिकालाई कुनै पनि प्रकारको शारीरिक सजाय, धम्की वा दुर्व्यवहार नगर्ने।',
      },
      {
        en: 'Take the child outside the agreed location without guardian authorization.',
        ne: 'अभिभावकको स्पष्ट पूर्वस्वीकृति बिना बालबालिकालाई तोकिएको स्थान बाहिर नलैजाने।',
      },
      {
        en: 'Hand the child over to an unauthorized person.',
        ne: 'अभिभावकले तोकेका बाहेक कुनै पनि अन्य अपरिचित व्यक्तिलाई जिम्मा नदिने।',
      },
      {
        en: 'Perform heavy household chores unrelated to childcare.',
        ne: 'बालबालिका स्याहार बाहेकका अन्य भारी घरायसी काम नगर्ने।',
      },
      {
        en: 'Leave the child unattended when supervision is required.',
        ne: 'निगरानी आवश्यक परेको अवस्थामा बालबालिकालाई एक्लै नछोड्ने।',
      },
      {
        en: 'Take responsibility for additional children who were not included in the booking.',
        ne: 'बुकिङमा समावेश नगरिएका अतिरिक्त बच्चाहरूको जिम्मेवारी नलिनु।',
      },
    ],
    importantNote: {
      en: 'Please inform the caregiver in advance of your child’s daily routine, meal habits, and any specific preferences.',
      ne: 'कृपया बालबालिकाको दैनिक तालिका, खानपान बानी र विशेष प्राथमिकताहरू सेवा सुरु हुनु अगावै जानकारी गराउनुहोला।',
    },
  },

  // Babysitting fallback mapping
  'babysitting': {
    slug: 'babysitting',
    title_en: 'Childcare & Babysitting',
    title_ne: 'बालबालिका स्याहार (बेबीसिटिङ)',
    version: '1.0',
    keyExclusionsSummary: {
      en: 'No medical/nursing care · No unauthorized outings · No heavy household chores',
      ne: 'चिकित्सीय हेरचाह छैन · अनुमति बिना बाहिर लैजान मिल्दैन · भारी घरायसी काम छैन',
    },
    included: [
      {
        en: 'Supervise and look after the child during the booked hours.',
        ne: 'बुक गरिएको समय अवधिभर बालबालिकाको उचित निगरानी र हेरचाह गर्ने।',
      },
      {
        en: 'Engage the child in age-appropriate games, drawing, storytelling, and activities.',
        ne: 'बालबालिकाको उमेर सुहाउँदा खेल, चित्रकला, कथा वाचन तथा रचनात्मक क्रियाकलापमा संलग्न गराउने।',
      },
      {
        en: 'Help with simple learning activities and reading.',
        ne: 'सामान्य सिकाइ गतिविधि, गृहकार्य अभ्यास र पढाइमा सहयोग गर्ने।',
      },
      {
        en: 'Assist with ordinary mealtime routines and serve prepared food.',
        ne: 'सामान्य खाना खाने तालिकामा सहयोग गर्ने र तयार गरिएको खाना खुवाउने।',
      },
      {
        en: 'Help the child maintain basic hygiene, such as washing hands.',
        ne: 'हात धुने, मुख सफा गर्ने जस्ता आधारभूत व्यक्तिगत सरसफाइमा सहयोग गर्ने।',
      },
      {
        en: "Follow the parent's agreed daily routine and instructions.",
        ne: 'अभिभावकले दिएका निर्देशन र दैनिक तालिका पूर्ण रूपमा पालना गर्ने।',
      },
      {
        en: "Inform the parent about the child's activities and any concerns during the service.",
        ne: 'सेवा अवधिमा बालबालिकाका गतिविधि तथा आवश्यक विषयबारे अभिभावकलाई नियमित जानकारी दिने।',
      },
    ],
    notIncluded: [
      {
        en: 'Provide medical treatment, nursing, or administer medication.',
        ne: 'चिकित्सीय उपचार, नर्सिङ सेवा वा डाक्टरको सल्लाह बिना औषधि खुवाउने कार्य नगर्ने।',
      },
      {
        en: 'Physically punish, threaten, or mistreat the child.',
        ne: 'बालबालिकालाई कुनै पनि प्रकारको शारीरिक सजाय, धम्की वा दुर्व्यवहार नगर्ने।',
      },
      {
        en: 'Take the child outside the agreed location without guardian authorization.',
        ne: 'अभिभावकको स्पष्ट पूर्वस्वीकृति बिना बालबालिकालाई तोकिएको स्थान बाहिर नलैजाने।',
      },
      {
        en: 'Hand the child over to an unauthorized person.',
        ne: 'अभिभावकले तोकेका बाहेक कुनै पनि अन्य अपरिचित व्यक्तिलाई जिम्मा नदिने।',
      },
      {
        en: 'Perform heavy household chores unrelated to childcare.',
        ne: 'बालबालिका स्याहार बाहेकका अन्य भारी घरायसी काम नगर्ने।',
      },
      {
        en: 'Leave the child unattended when supervision is required.',
        ne: 'निगरानी आवश्यक परेको अवस्थामा बालबालिकालाई एक्लै नछोड्ने।',
      },
      {
        en: 'Take responsibility for additional children who were not included in the booking.',
        ne: 'बुकिङमा समावेश नगरिएका अतिरिक्त बच्चाहरूको जिम्मेवारी नलिनु।',
      },
    ],
  },

  // 2. Elderly People Companionship (Non-Medical)
  'elderly-companionship': {
    slug: 'elderly-companionship',
    title_en: 'Elderly People Companionship',
    title_ne: 'वृद्ध साथी सेवा (अचिकित्सीय)',
    label_en: 'Non-Medical Service',
    label_ne: 'गैर-चिकित्सीय सेवा',
    version: '1.0',
    keyExclusionsSummary: {
      en: 'Non-medical companion only · No clinical care / injections · No financial transactions',
      ne: 'गैर-चिकित्सीय साथी मात्र · सुई वा औषधि व्यवस्थापन छैन · आर्थिक कारोबार छैन',
    },
    included: [
      {
        en: 'Spend time talking with the elderly person and provide friendly companionship.',
        ne: 'ज्येष्ठ नागरिकसँग आत्मीय कुराकानी गर्ने र मायालु साथीको रूपमा समय बिताउने।',
      },
      {
        en: 'Read books, newspapers, or other materials together.',
        ne: 'किताब, पत्रपत्रिका, धार्मिक ग्रन्थ वा रुचि अनुसारका सामग्री पढेर सुनाउने।',
      },
      {
        en: 'Play games and participate in simple recreational activities.',
        ne: 'लुडो, चेस वा अन्य सामान्य मनोरञ्जनात्मक खेलहरू सँगै खेल्ने।',
      },
      {
        en: 'Accompany the person on safe, agreed walks when appropriate.',
        ne: 'सहमति अनुसार घर वरपर वा सुरक्षित ठाउँमा बिस्तारै हिँडडुल गर्न साथ दिने।',
      },
      {
        en: 'Help organize everyday personal belongings.',
        ne: 'दैनिक प्रयोगका व्यक्तिगत सामानहरू मिलाएर राख्न सहयोग गर्ने।',
      },
      {
        en: 'Assist with simple tasks such as setting up a phone call or arranging reading materials.',
        ne: 'आफन्तलाई फोन डायल गरिदिने वा पढ्ने सामग्री खोजिदिने जस्ता सानातिना काममा सघाउने।',
      },
      {
        en: 'Help serve prepared meals or drinks if included in the booking.',
        ne: 'तयार पारिएको खाना वा पानी/चिया समयमै खुवाउन वा पुर्‍याउन सहयोग गर्ने।',
      },
      {
        en: "Inform the designated family member about relevant concerns, respecting the person's privacy and consent.",
        ne: 'गोपनीयताको सम्मान गर्दै कुनै स्वास्थ्य वा सुरक्षा चिन्ता भए परिवारका सदस्यलाई जानकारी दिने।',
      },
    ],
    notIncluded: [
      {
        en: 'Provide nursing, medical treatment, injections, or medical advice.',
        ne: 'नर्सिङ, सुई लगाउने, घाउ ड्रेसिङ वा चिकित्सीय सल्लाह प्रदान नगर्ने।',
      },
      {
        en: 'Administer or manage medication.',
        ne: 'कुनै पनि औषधिको मात्रा तोक्ने वा औषधि व्यवस्थापन गर्ने कार्य नगर्ने।',
      },
      {
        en: 'Lift or transfer a person who requires specialized physical assistance.',
        ne: 'विशेष शारीरिक सहारा वा ह्विलचेयर लिफ्टिङ चाहिने बिरामीलाई उचाल्ने काम नगर्ने।',
      },
      {
        en: 'Perform bathing, toileting, or other intimate personal care under the standard companionship service.',
        ne: 'नुहाइदिने वा शौचालय लैजाने जस्ता व्यक्तिगत हेरचाहका काम यस सामान्य साथी सेवामा समावेश छैनन्।',
      },
      {
        en: 'Diagnose illnesses or provide physiotherapy.',
        ne: 'रोगको निदान गर्ने वा फिजियोथेरापी दिने काम नगर्ने।',
      },
      {
        en: 'Make financial transactions or handle bank cards, PINs, or passwords.',
        ne: 'कुनै पनि आर्थिक कारोबार गर्ने वा बैंक कार्ड, पिन र पासवर्ड प्रयोग नगर्ने।',
      },
      {
        en: 'Make medical, legal, or financial decisions on behalf of the elderly person.',
        ne: 'ज्येष्ठ नागरिकको तर्फबाट कुनै पनि कानुनी, स्वास्थ्य वा आर्थिक निर्णय नगर्ने।',
      },
    ],
    disclaimer: {
      en: 'This service provides companionship and agreed everyday assistance only. It does not replace a qualified healthcare professional or specialized caregiver.',
      ne: 'यो सेवा केवल आत्मीय साथी र सामान्य दैनिक सहयोगका लागि हो। यसले दक्ष स्वास्थ्यकर्मी वा विशेष बिरामी कुरुवाको विकल्प प्रदान गर्दैन।',
    },
  },

  // 3. Home Cleaning
  'house-cleaning': {
    slug: 'house-cleaning',
    title_en: 'Home Cleaning',
    title_ne: 'घर सफाइ सेवा',
    version: '1.0',
    keyExclusionsSummary: {
      en: 'No hazardous heights · No electrical/plumbing repairs · No opening private locked drawers',
      ne: 'खतरनाक उचाइ छैन · मर्मत वा प्लम्बिङ छैन · व्यक्तिगत दराज खोलिने छैन',
    },
    included: [
      {
        en: 'Sweep and mop floors.',
        ne: 'कोठा तथा भुइँ कुचो लगाउने र पोछा लगाउने।',
      },
      {
        en: 'Dust accessible furniture and surfaces.',
        ne: 'सजिलै पुग्न सकिने फर्निचर र सतहहरूको धुलो पुछ्ने।',
      },
      {
        en: 'Clean tables, shelves, and other agreed household surfaces.',
        ne: 'टेबल, र्याक र सहमति भएका घरायसी सतहहरू सफा गर्ने।',
      },
      {
        en: 'Clean accessible mirrors and windows from safe positions.',
        ne: 'सुरक्षित उचाइबाट ऐना र झ्यालका सिसाहरू सफा गर्ने।',
      },
      {
        en: 'Clean kitchen counters and sinks.',
        ne: 'भान्साको ओदान, काउन्टर र सिङ्क सफा गर्ने।',
      },
      {
        en: 'Wash dishes if included in the selected package.',
        ne: 'बुकिङमा समावेश भए अनुसार जुठा भाँडाकुँडा धुने।',
      },
      {
        en: 'Clean ordinary bathroom surfaces and toilets.',
        ne: 'बाथरुमको भुइँ, बेसिन र ट्वाइलेट सफा गर्ने।',
      },
      {
        en: 'Tidy rooms and make beds.',
        ne: 'ओछ्यान मिलाउने र कोठाहरू चिटिक्क पार्ने।',
      },
      {
        en: 'Collect ordinary household waste and place it in the designated disposal area.',
        ne: 'घरायसी फोहोर जम्मा गरी तोकिएको डस्टबिन वा ठाउँमा राख्ने।',
      },
    ],
    notIncluded: [
      {
        en: 'Repair electrical systems, plumbing, gas connections, or appliances.',
        ne: 'बिजुली, प्लम्बिङ, ग्यास पाइप वा घरायसी उपकरणहरू मर्मत नगर्ने।',
      },
      {
        en: 'Clean exterior windows at dangerous heights.',
        ne: 'बाहिरी भाग वा खतरनाक उचाइमा गएर सिसा सफा नगर्ने।',
      },
      {
        en: 'Move heavy furniture or appliances without prior approval and safe arrangements.',
        ne: 'पूर्वस्वीकृति र सुरक्षित व्यवस्था बिना धेरै भारी फर्निचर सार्ने काम नगर्ने।',
      },
      {
        en: 'Handle hazardous waste, needles, or dangerous chemicals.',
        ne: 'चिकित्सीय फोहोर, सिरिन्ज वा खतरनाक रसायन हात नहाल्ने।',
      },
      {
        en: 'Open personal cupboards, drawers, or luggage without permission.',
        ne: 'ग्राहकको अनुमति बिना व्यक्तिगत दराज, लकर वा झोला नखोल्ने।',
      },
      {
        en: 'Dispose of valuables, documents, or personal belongings without approval.',
        ne: 'स्वीकृति बिना कुनै पनि महत्त्वपूर्ण कागजात, सामान वा सामग्री फोहोरमा नफाल्ने।',
      },
      {
        en: 'Perform pest control or specialized deep cleaning unless separately offered and booked.',
        ne: 'कीरा नियन्त्रण वा विशेष रासायनिक डिप क्लिनिङ नगर्ने।',
      },
    ],
    importantNote: {
      en: 'Please specify the exact rooms and primary cleaning priorities when booking to ensure time is used effectively.',
      ne: 'कृपया बुकिङ गर्दा कुन कुन कोठा र कुन कामलाई प्राथमिकता दिने हो स्पष्ट उल्लेख गर्नुहोस्।',
    },
  },

  // 4. Kitchen Preparation Help
  'kitchen-help': {
    slug: 'kitchen-help',
    title_en: 'Kitchen Preparation Help',
    title_ne: 'भान्सा तयारी तथा खाना पकाउने सहयोग',
    version: '1.0',
    keyExclusionsSummary: {
      en: 'No medical diet prescribing · Inform allergies beforehand · No appliance repairs',
      ne: 'चिकित्सीय डाइट सल्लाह छैन · एलर्जी पहिले बताउनुहोस् · उपकरण मर्मत छैन',
    },
    included: [
      {
        en: 'Wash and prepare vegetables and fruits.',
        ne: 'तरकारी र फलफूल राम्ररी पखाल्ने र सफा गर्ने।',
      },
      {
        en: 'Peel, chop, and slice ingredients.',
        ne: 'तरकारी, प्याज, लसुन, अदुवा आदि ताछ्ने, काट्ने र टुक्रा पार्ने।',
      },
      {
        en: "Measure ingredients according to the customer's instructions.",
        ne: 'ग्राहकको स्वाद र सल्लाह अनुसार मसला तथा सामग्रीको मात्रा मिलाउने।',
      },
      {
        en: 'Help prepare everyday meals and simple dishes.',
        ne: 'दैनिक दाल-भात, तरकारी, रोटी वा अन्य परिकार तयार गर्न सहयोग गर्ने।',
      },
      {
        en: 'Assist with basic cooking tasks included in the booking.',
        ne: 'बुकिङमा तोकिएका आधारभूत खाना पकाउने कार्यहरूमा सघाउने।',
      },
      {
        en: 'Prepare tea, coffee, or other ordinary beverages.',
        ne: 'चिया, कफी वा सामान्य पेय पदार्थहरू बनाउने।',
      },
      {
        en: 'Wash dishes and clean food-preparation surfaces if included.',
        ne: 'खाना पकाउँदा प्रयोग भएका भाँडाकुँडा धुने र स्ल्याब सफा गर्ने।',
      },
      {
        en: 'Organize ingredients and store food appropriately.',
        ne: 'बाँकी रहेका सामग्री र खानालाई सुरक्षित तरिकाले मिलाएर राख्ने।',
      },
      {
        en: 'Follow communicated food preferences and dietary restrictions.',
        ne: 'ग्राहकले जानकारी गराएका खानाका नियम र परहेजहरू पालना गर्ने।',
      },
    ],
    notIncluded: [
      {
        en: 'Provide medical nutrition advice or prescribe a diet for a health condition.',
        ne: 'स्वास्थ्य अवस्थाका लागि कुनै पोषण वा डाइटिङ सल्लाह नदिने।',
      },
      {
        en: 'Use spoiled or unsafe ingredients.',
        ne: 'सडेगलेका वा अस्वस्थकर खाद्य सामग्री प्रयोग नगर्ने।',
      },
      {
        en: 'Ignore known food allergies or dietary restrictions.',
        ne: 'ग्राहकले जानकारी गराएका एलर्जी वा परहेजलाई बेवास्ता नगर्ने।',
      },
      {
        en: 'Prepare elaborate catering or large quantities of food unless included in the booking.',
        ne: 'बुकिङमा पूर्वसहमति नभई ठूलो भोज वा क्याटरिङ जस्तो धेरै खाना नपकाउने।',
      },
      {
        en: "Purchase groceries using the customer's money without authorization.",
        ne: 'पूर्वस्वीकृति बिना ग्राहकको पैसा लिएर बजारबाट सामान खरिद नगर्ने।',
      },
      {
        en: 'Repair gas connections or electrical appliances.',
        ne: 'ग्यास चुलो, सिलिन्डर पाइप वा माइक्रोवेभ/मिक्सर मर्मत नगर्ने।',
      },
      {
        en: 'Perform unrelated household cleaning tasks that are not part of the booking.',
        ne: 'भान्सा बाहेकका अन्य घरायसी सरसफाइ नगर्ने।',
      },
    ],
    importantNote: {
      en: 'Customers must inform the worker about food allergies, dietary restrictions, and the dishes they want prepared before the service begins.',
      ne: 'ग्राहकले खानामा हुने कुनै पनि एलर्जी, परहेज र बनाउनुपर्ने परिकारहरूको सूची काम सुरु हुनु अघि नै अनिवार्य रूपमा बताउनुपर्छ।',
    },
  },

  // 5. Birthday Decoration
  'birthday-decoration': {
    slug: 'birthday-decoration',
    title_en: 'Birthday Decoration',
    title_ne: 'जन्मदिन तथा उत्सव सजावट',
    version: '1.0',
    keyExclusionsSummary: {
      en: 'Decorations only · No catering / photography · No fireworks or wall damage',
      ne: 'सजावट मात्र · खाना वा फोटो छैन · पटका वा भित्तामा प्वाल पार्ने छैन',
    },
    included: [
      {
        en: 'Decorate the agreed area with balloons, ribbons, banners, and approved decorations.',
        ne: 'तोकिएको स्थानमा बेलुन, रिबन, ब्यानर र स्वीकृत सामग्रीले सुन्दर सजावट गर्ने।',
      },
      {
        en: 'Arrange the birthday backdrop and photo corner.',
        ne: 'फोटो खिच्नका लागि आकर्षक ब्याकड्रप र सेल्फी कर्नर तयार गर्ने।',
      },
      {
        en: 'Set up a decorative table and lightweight props.',
        ne: 'केक काट्ने टेबल र हलुका सजावटी सामग्रीहरू सजाउने।',
      },
      {
        en: 'Arrange decorations according to the selected theme and colors.',
        ne: 'ग्राहकले रोजेको रङ र थिम अनुसार सजावट संयोजन गर्ने।',
      },
      {
        en: 'Inflate balloons and organize decoration materials.',
        ne: 'बेलुन फुलाउने र सामग्रीहरूको व्यवस्थित संयोजन गर्ने।',
      },
      {
        en: 'Place decorations in agreed locations using safe methods.',
        ne: 'भित्ता नबिग्रने सुरक्षित टेप वा स्ट्यान्ड प्रयोग गरी सजावट झुन्ड्याउने।',
      },
      {
        en: 'Remove decoration waste if cleanup is included in the booking.',
        ne: 'बुकिङमा समावेश भए अनुसार कार्यक्रम सकिएपछि सजावटका फोहोरहरू सफा गर्ने।',
      },
    ],
    notIncluded: [
      {
        en: 'Provide catering, photography, or entertainment unless separately booked.',
        ne: 'छुट्टै बुकिङ बिना खाना, फोटोग्राफी, डिजे वा मनोरञ्जन कार्यक्रम नदिने।',
      },
      {
        en: 'Perform electrical installation or repair work.',
        ne: 'बिजुलीको तार जोड्ने वा नयाँ स्वीच जडान गर्ने काम नगर्ने।',
      },
      {
        en: 'Use fireworks, pyrotechnics, or hazardous special effects.',
        ne: 'आतिशबाजी, पटका वा कुनै पनि जोखिमपूर्ण आगोका सामग्री प्रयोग नगर्ने।',
      },
      {
        en: 'Climb onto unsafe furniture or work at dangerous heights.',
        ne: 'असुरक्षित टेबल/कुर्सी चढेर वा खतरनाक उचाइमा गएर काम नगर्ने।',
      },
      {
        en: 'Drill into walls or damage surfaces without authorization.',
        ne: 'घरधनीको अनुमति बिना भित्तामा किला ठोक्ने वा प्वाल पार्ने काम नगर्ने।',
      },
      {
        en: 'Purchase additional materials without customer approval.',
        ne: 'ग्राहकको स्पष्ट सहमति बिना थप सामग्री आफैं किनेर पैसा माग नगर्ने।',
      },
      {
        en: 'Provide venue rental, furniture rental, or expensive decoration materials unless explicitly included in the selected package.',
        ne: 'प्याकेजमा उल्लेख नभए सम्म हल भाडा वा महँगा फर्निचर उपलब्ध नगराउने।',
      },
    ],
    importantNote: {
      en: 'Customers should specify the theme, location, expected number of guests, and decoration requirements when booking.',
      ne: 'ग्राहकले बुकिङ गर्दा सजावटको थिम, कोठाको आकार, पाहुना संख्या र विशेष आवश्यकता स्पष्ट खुलाउनुहोस्।',
    },
  },

  // 6. Tuition — Offline and Online
  'tuition': {
    slug: 'tuition',
    title_en: 'Tuition — Offline and Online',
    title_ne: 'ट्युसन — अफलाइन तथा अनलाइन',
    version: '1.0',
    keyExclusionsSummary: {
      en: 'No exam proxy/dishonest homework · No grade guarantees · Educational support only',
      ne: 'परीक्षा प्रोक्सी छैन · अंकको ग्यारेन्टी छैन · शैक्षिक सहयोग मात्र',
    },
    packages: [
      {
        id: 'offline',
        name_en: 'Offline Home Tuition',
        name_ne: 'अफलाइन घरमै ट्युसन',
        description_en: 'Tutor visits your home or agreed location for in-person instruction.',
        description_ne: 'शिक्षक तपाईंकै घरमा आएर प्रत्यक्ष रूपमा पढाउनुहुन्छ।',
        specificIncluded: [
          {
            en: 'Teach at the agreed home or approved location.',
            ne: 'सहमति भएको घर वा तोकिएको स्थानमा उपस्थित भई पढाउने।',
          },
          {
            en: 'Bring teaching materials only if included in the arrangement.',
            ne: 'पूर्वसहमति अनुसार आवश्यक शैक्षिक सामग्रीहरू साथमा ल्याउने।',
          },
        ],
      },
      {
        id: 'online',
        name_en: 'Online Tuition',
        name_ne: 'अनलाइन ट्युसन',
        description_en: 'Interactive live video classes via Google Meet / Zoom.',
        description_ne: 'गुगल मिट वा जुम मार्फत प्रत्यक्ष अन्तर्क्रियात्मक अनलाइन कक्षा।',
        specificIncluded: [
          {
            en: 'Conduct lessons through the agreed online platform.',
            ne: 'सहमति भएको अनलाइन भिडियो प्लेटफर्म मार्फत कक्षाहरू सञ्चालन गर्ने।',
          },
          {
            en: 'Explain topics using screen sharing, digital notes, or other suitable learning tools.',
            ne: 'स्क्रिन सेयरिङ, डिजिटल ह्वाइटबोर्ड वा उपयुक्त साधनहरू प्रयोग गरी विषय बुझाउने।',
          },
          {
            en: 'Provide digital learning materials when agreed.',
            ne: 'सहमति अनुसार पिडिएफ वा डिजिटल अभ्यास सामग्रीहरू उपलब्ध गराउने।',
          },
        ],
      },
    ],
    included: [
      {
        en: 'Teach the selected subject at the agreed academic level.',
        ne: 'सहमति भएको कक्षा र विषयको पाठ्यक्रम अनुसार प्रभावकारी अध्यापन गराउने।',
      },
      {
        en: 'Explain difficult concepts in a simple way.',
        ne: 'जटिल सूत्र तथा विषयवस्तुलाई सरल र व्यावहारिक उदाहरण दिएर प्रष्ट पार्ने।',
      },
      {
        en: 'Help students practice problems and exercises.',
        ne: 'विद्यार्थीलाई प्रश्नोत्तर तथा अभ्यास गर्न लगाउने र गल्ती सच्याइदिने।',
      },
      {
        en: 'Support homework understanding and revision.',
        ne: 'गृहकार्य बुझ्न र पुराना पाठहरूको दोहोर्‍याइ (रिभिजन) गर्न मद्दत गर्ने।',
      },
      {
        en: 'Prepare practice questions and learning materials.',
        ne: 'विद्यार्थीको क्षमता अभिवृद्धिका लागि अभ्यास प्रश्नहरू तयार गर्ने।',
      },
      {
        en: 'Conduct quizzes and revision sessions.',
        ne: 'समय समयमा साना परीक्षा वा क्विज लिई मूल्याङ्कन गर्ने।',
      },
      {
        en: 'Provide feedback on learning progress.',
        ne: 'विद्यार्थीको सिकाइ प्रगतिबारे अभिभावकलाई नियमित जानकारी दिने।',
      },
      {
        en: 'Follow the agreed timetable and teaching plan.',
        ne: 'तोकिएको समय तालिका र शैक्षिक योजना पूर्ण रूपमा पालना गर्ने।',
      },
    ],
    notIncluded: [
      {
        en: 'Complete examinations or assignments dishonestly on behalf of students.',
        ne: 'विद्यार्थीको सट्टामा आफैं परीक्षा दिने वा उत्तरहरू ठगी गरेर लेखिदिने काम नगर्ने।',
      },
      {
        en: 'Guarantee marks, grades, scholarships, or examination success.',
        ne: 'परीक्षामा यति नै नम्बर आउँछ वा छात्रवृत्ति मिल्छ भनी ग्यारेन्टी नगर्ने।',
      },
      {
        en: 'Teach subjects beyond their competence while claiming expertise.',
        ne: 'आफूलाई नआउने वा अध्ययन नभएको विषयमा गलत दाबी गरेर नपढाउने।',
      },
      {
        en: 'Engage in inappropriate behavior or communication with students.',
        ne: 'विद्यार्थीसँग कुनै पनि किसिमको अमर्यादित बोली वा दुर्व्यवहार नगर्ने।',
      },
      {
        en: 'Share student information without appropriate authorization.',
        ne: 'विद्यार्थीको व्यक्तिगत विवरण वा नतिजा अरूलाई नबाँड्ने।',
      },
      {
        en: 'Provide unrelated household services.',
        ne: 'पढाउने बाहेक अन्य कुनै घरायसी काम नगर्ने।',
      },
      {
        en: 'Guarantee admission to any school, college, or university.',
        ne: 'कुनै पनि विद्यालय, कलेज वा विश्वविद्यालयमा भर्ना गराइदिने ग्यारेन्टी नदिने।',
      },
    ],
    importantNote: {
      en: "Customers must specify the student's class or level, subject, preferred schedule, and whether they require online or offline tuition.",
      ne: 'ग्राहकले बुकिङ गर्दा विद्यार्थीको कक्षा, विषय, मनपर्ने समय र अनलाइन वा अफलाइन कुन माध्यम चाहिएको हो प्रष्ट उल्लेख गर्नुपर्छ।',
    },
  },
};

export function getServiceGuidelines(slug: string): ServiceGuideline | null {
  return SERVICE_GUIDELINES[slug] ?? null;
}
