-- =====================================================================
-- Daksha Sewa seed: default CMS content. Safe to re-run (idempotent).
-- Everything here is editable from /admin. Prices are PLACEHOLDERS.
-- =====================================================================

insert into public.site_settings (key, value) values
('brand', $j${
  "name_en": "Daksha Sewa", "name_ne": "दक्ष सेवा",
  "tagline_en": "Skilled hands for your home", "tagline_ne": "तपाईंको घरमा दक्ष हात",
  "city_en": "Dhangadhi, Kailali", "city_ne": "धनगढी, कैलाली", "logo_url": ""
}$j$),
('theme', $j${
  "default_mode": "dark", "radius": 14,
  "dark":  { "background": "#111216", "surface": "#17181D", "elevated": "#1F2128", "foreground": "#FEEED5", "muted": "#A8A196",
             "line": "#2B2D35", "primary": "#FABA8D", "primary_foreground": "#1A1209", "accent": "#D9B779",
             "success": "#7BD3A0", "danger": "#F2766B", "warning": "#F5C26B" },
  "light": { "background": "#FBF5EA", "surface": "#FFFFFF", "elevated": "#F4ECDD", "foreground": "#17181C", "muted": "#6B655B",
             "line": "#E6DCCB", "primary": "#BF561B", "primary_foreground": "#FFFFFF", "accent": "#9A7A33",
             "success": "#1F8F55", "danger": "#C8402F", "warning": "#B57A12" }
}$j$),
('hero', $j${
  "eyebrow_en": "Now booking in Dhangadhi", "eyebrow_ne": "धनगढीमा बुकिङ सुरु",
  "title_en": "Skilled hands for your home.", "title_ne": "तपाईंको घरमा दक्ष हात।",
  "subtitle_en": "Cleaning, kitchen help, birthday set-ups and tuition from verified people in Dhangadhi. Pin your door on the map, then watch them arrive.",
  "subtitle_ne": "धनगढीका प्रमाणित सहयोगीबाट घर सफाइ, भान्सा सहयोग, जन्मदिन सजावट र ट्युसन। नक्सामा आफ्नो ठेगाना राख्नुहोस्, उहाँ आउँदै गरेको हेर्नुहोस्।",
  "cta_primary_en": "Book a service", "cta_primary_ne": "सेवा बुक गर्नुहोस्",
  "cta_secondary_en": "How it works", "cta_secondary_ne": "कसरी काम गर्छ",
  "image_url": ""
}$j$),
('announcement', $j${
  "enabled": true,
  "text_en": "Launching soon in Dhangadhi. First booking gets Rs 200 off with code DAKSHA200.",
  "text_ne": "धनगढीमा छिट्टै सुरु हुँदैछ। पहिलो बुकिङमा DAKSHA200 कोडले रु २०० छुट।",
  "link": "/services"
}$j$),
('contact', $j${
  "phone_primary": "9800670880", "phone_secondary": "9800670660", "whatsapp": "9779800670880", "email": "",
  "address_en": "Dhangadhi, Kailali, Sudurpaschim Province", "address_ne": "धनगढी, कैलाली, सुदूरपश्चिम प्रदेश",
  "hours_en": "Every day, 7 am to 7 pm", "hours_ne": "हरेक दिन, बिहान ७ देखि साँझ ७ बजेसम्म",
  "facebook": "", "instagram": "", "tiktok": ""
}$j$),
('seo', $j${
  "title": "Daksha Sewa (दक्ष सेवा) | Home services in Dhangadhi",
  "description": "Book verified cleaners, cooking helpers, birthday decorators and tutors in Dhangadhi, Kailali. Fair prices, a signed agreement, and live arrival tracking."
}$j$),
('booking', $j${
  "min_notice_hours": 1, "max_advance_days": 45, "commission_percent": 15, "vat_percent": 0,
  "tracking_window_minutes": 240, "pending_expiry_hours": 12, "free_cancel_hours": 2
}$j$),
('payments', $j${
  "enabled": { "cash": true, "esewa": true, "khalti": true, "stripe": false },
  "stripe_currency": "usd", "stripe_npr_per_unit": 133
}$j$),
('features', $j${ "bookings_open": true, "live_tracking": true, "reviews": true }$j$),
('home_layout', $j${
  "sections": [
    {"id": "services", "enabled": true}, {"id": "how", "enabled": true}, {"id": "tracking", "enabled": true},
    {"id": "workers", "enabled": true}, {"id": "offers", "enabled": true}, {"id": "testimonials", "enabled": true},
    {"id": "faq", "enabled": true}, {"id": "areas", "enabled": true}, {"id": "contact", "enabled": true}
  ]
}$j$),
('copy', '{}'::jsonb)
on conflict (key) do nothing;

with v(name_en, name_ne, center_lat, center_lng, radius_km, is_active, sort_order) as (values
  ('Dhangadhi', 'धनगढी',  28.6833, 80.6000, 12, true,  1),
  ('Tikapur',   'टीकापुर', 28.5278, 81.1167,  8, false, 2))
insert into public.service_areas (name_en, name_ne, center_lat, center_lng, radius_km, is_active, sort_order)
select * from v where not exists (select 1 from public.service_areas a where a.name_en = v.name_en);

insert into public.service_categories
  (slug, name_en, name_ne, tagline_en, tagline_ne, description_en, description_ne, icon, base_price, price_unit, min_hours, default_hours, is_active, is_featured, sort_order) values
 ('house-cleaning', 'House Cleaning', 'घर सफाइ',
  'Floors, kitchens, bathrooms. Done properly.', 'भुइँ, भान्सा, बाथरुम। राम्ररी सफा।',
  'A trained cleaner works through your home room by room. Tell us what matters most when you book.',
  'तालिम प्राप्त सफाइकर्मीले तपाईंको घर कोठा-कोठा गरेर सफा गर्छन्। बुक गर्दा कुन ठाउँ बढी महत्त्वपूर्ण छ बताउनुहोस्।',
  'Sparkles', 300, 'hour', 2, 3, true, true, 1),
 ('kitchen-help', 'Kitchen Prep & Cooking Help', 'भान्सा तयारी र खाना पकाउन सहयोग',
  'Chopping, grinding, cooking, clearing up.', 'काट्ने, पिस्ने, पकाउने, सफा गर्ने।',
  'For festival days, guests or a busy week. Someone to prep and cook while you host.',
  'चाडपर्व, पाहुना वा व्यस्त हप्ताका लागि। तपाईं पाहुना सम्हाल्दा तयारी र खाना पकाउने साथी।',
  'ChefHat', 350, 'hour', 2, 3, true, true, 2),
 ('birthday-decoration', 'Birthday Decoration', 'जन्मदिन सजावट',
  'Balloons, backdrops and a tidy-up after.', 'बेलुन, ब्याकड्रप र सकिएपछि सफाइ।',
  'Arches, banners and table styling set up at home before the guests arrive. Share the theme and the room.',
  'पाहुना आउनु अघि घरमै बेलुन आर्च, ब्यानर र टेबल सजावट। थिम र कोठा बताउनुहोस्।',
  'PartyPopper', 3500, 'fixed', 2, 3, true, true, 3),
 ('tuition', 'Tuition (Online / Offline)', 'ट्युसन (अनलाइन / अफलाइन)',
  'At your table or on a video call.', 'घरमै वा भिडियो कलमा।',
  'School subjects for classes 1 to 10. Pin your home as the base and note in the booking if you prefer video.',
  'कक्षा १ देखि १० सम्मका विषय। घरलाई आधार ठेगाना बनाउनुहोस्, भिडियो चाहिए बुकिङको टिप्पणीमा लेख्नुहोस्।',
  'GraduationCap', 400, 'hour', 1, 1, true, true, 4),
 ('babysitting', 'Babysitting', 'बालबालिका स्याहार',
  'Coming soon.', 'छिट्टै आउँदैछ।', 'Careful, background-checked sitters for a few hours at home.', 'केही घण्टाका लागि भरपर्दो स्याहारकर्ता।',
  'Baby', 300, 'hour', 2, 3, false, false, 5),
 ('plumbing', 'Plumbing', 'प्लम्बिङ',
  'Coming soon.', 'छिट्टै आउँदैछ।', 'Leaks, taps and fittings fixed by a skilled plumber.', 'चुहावट, धारा र फिटिङ मर्मत।',
  'Wrench', 500, 'hour', 1, 2, false, false, 6),
 ('elderly-companionship', 'Elderly Companionship', 'वृद्ध साथी सेवा',
  'Caring company and gentle support for your elders.', 'तपाईंका वृद्ध आफन्तका लागि मायालु साथ र सहयोग।',
  'A caring and patient companion visits your elderly family member at home — for conversation, light activities, medication reminders, and emotional support. All companions are background-checked and trained in elder care.',
  'एक दयालु र धैर्यशील साथी तपाईंका वृद्ध परिवारको सदस्यलाई घरमै भेट्छन् — कुराकानी, हल्का गतिविधि, औषधि याद दिलाउने र भावनात्मक सहयोगका लागि। सबै साथीहरू पृष्ठभूमि जाँचिएका र वृद्ध हेरचाहमा तालिम प्राप्त छन्।',
  'HeartHandshake', 350, 'hour', 2, 3, true, true, 7),
 ('child-care-companionship', 'Child Care Companionship', 'बाल स्याहार साथी सेवा',
  'Attentive, nurturing care for your little ones.', 'तपाईंका साना बच्चाहरूका लागि ध्यानपूर्ण, स्नेही हेरचाह।',
  'A trained child-care companion spends quality time with your children at home — play, storytelling, homework help, meals and safe supervision. Ideal while parents work or run errands.',
  'एक तालिम प्राप्त बाल स्याहार साथी तपाईंका बच्चाहरूसँग घरमा गुणस्तरीय समय बिताउँछन् — खेल, कथा, गृहकार्य सहयोग, खाना र सुरक्षित निगरानी। आमाबाबु काम वा काज गर्दा आदर्श।',
  'Baby', 300, 'hour', 2, 3, true, true, 8)
on conflict (slug) do nothing;

insert into public.promo_offers (code, title_en, title_ne, description_en, description_ne, discount_type, discount_value, min_order, per_user_limit, show_on_home) values
 ('DAKSHA200', 'First booking, Rs 200 off', 'पहिलो बुकिङमा रु २०० छुट',
  'Valid on orders of Rs 600 or more. One use per customer.', 'रु ६०० वा सोभन्दा बढीको अर्डरमा लागू। एक ग्राहकले एक पटक।',
  'flat', 200, 600, 1, true)
on conflict (code) do nothing;

insert into public.contract_templates (kind, version, title_en, title_ne, body_en, body_ne, is_active) values
('service_agreement', 1, 'Service Agreement', 'सेवा सम्झौता',
$en$Booking {{booking_code}}

1. Parties
This agreement is between {{customer_name}} ("the Customer") and {{worker_name}} ("the Worker"), connected through the {{platform}} platform.

2. The service
Service: {{service}}
Date and time: {{date}}, {{time}}
Booked duration: {{duration}}
Address: {{address}} (landmark: {{landmark}})

3. Price and payment
Total payable: {{total}}, paid by {{payment_method}}. The price was calculated by the platform at booking time and covers the booked duration. Extra time needs the Customer's agreement and is charged at the same rate.

4. Cancellation
The Customer may cancel free of charge before the Worker confirms. After confirmation, please cancel as early as possible and at least 2 hours before the start time. Repeated late cancellations may lead to account restrictions.

5. Conduct and safety
The Worker will arrive on time, behave respectfully and use only tools and materials agreed beforehand. The Customer will provide a safe place to work and will not ask for anything unsafe, unlawful or outside the booked service. Either side may stop the visit if they feel unsafe.

6. Start PIN and live location
To keep every visit verifiable, the Worker shares live location with the Customer while travelling and starts the job by entering the 4-digit PIN shown to the Customer. Location sharing stops when the job starts.

7. Damage and complaints
Report any damage or complaint in the app within 24 hours of the visit. Daksha Sewa will hear both sides and may mediate, or arrange a refund where the service was not delivered as booked.

8. Privacy
Phone numbers are shared only while a booking is active. Personal data is handled as described on the Privacy page.

9. Governing law
This agreement is governed by the laws of Nepal.

By typing your name and ticking the box you confirm that you have read and accept this agreement.$en$,
$ne$बुकिङ {{booking_code}}

१. पक्षहरू
यो सम्झौता {{customer_name}} ("ग्राहक") र {{worker_name}} ("सेवाप्रदायक") बीच {{platform}} मार्फत भएको हो।

२. सेवा
सेवा: {{service}}
मिति र समय: {{date}}, {{time}}
अवधि: {{duration}}
ठेगाना: {{address}} (चिनारी: {{landmark}})

३. मूल्य र भुक्तानी
कुल भुक्तानी रकम: {{total}}, भुक्तानी तरिका: {{payment_method}}। मूल्य बुकिङका बेला प्लेटफर्मले हिसाब गरेको हो र बुक गरिएको अवधिलाई समेट्छ। थप समय आवश्यक परे ग्राहकको सहमति चाहिन्छ र त्यही दरमा शुल्क लाग्छ।

४. रद्द गर्ने नियम
सेवाप्रदायकले स्वीकार गर्नु अघि ग्राहकले निःशुल्क रद्द गर्न सक्छन्। स्वीकार भएपछि सकेसम्म चाँडो, कम्तीमा सुरु हुनुभन्दा २ घण्टा अघि रद्द गर्नुहोस्। बारम्बार ढिलो रद्द गर्दा खाता सीमित हुन सक्छ।

५. आचरण र सुरक्षा
सेवाप्रदायक समयमै आउनेछन्, सम्मानपूर्वक व्यवहार गर्नेछन् र पहिले सहमति भएका सामग्री मात्र प्रयोग गर्नेछन्। ग्राहकले सुरक्षित कार्यस्थल दिनेछन् र असुरक्षित, गैरकानुनी वा बुक गरिएको सेवाबाहिरको काम लगाउने छैनन्। असुरक्षित महसुस भएमा दुवै पक्षले भेट रोक्न सक्छन्।

६. सुरु गर्ने PIN र प्रत्यक्ष स्थान
हरेक भेट प्रमाणित रहोस् भनेर सेवाप्रदायकले यात्रा गर्दा आफ्नो प्रत्यक्ष स्थान ग्राहकसँग साझा गर्छन्, र ग्राहकलाई देखाइएको ४ अंकको PIN हालेर काम सुरु गर्छन्। काम सुरु भएपछि स्थान साझा गर्ने कार्य रोकिन्छ।

७. क्षति र उजुरी
कुनै क्षति वा उजुरी भए भेट भएको २४ घण्टाभित्र एपमार्फत जानकारी दिनुहोस्। दक्ष सेवाले दुवै पक्षको कुरा सुनेर मध्यस्थता गर्न वा सेवा बुकिङ अनुसार नभएको ठहरिए रकम फिर्ता मिलाउन सक्छ।

८. गोपनीयता
फोन नम्बर बुकिङ सक्रिय रहेसम्म मात्र साझा हुन्छ। व्यक्तिगत विवरण गोपनीयता पृष्ठमा उल्लेख भए अनुसार सम्हालिन्छ।

९. लागू हुने कानुन
यो सम्झौता नेपालको कानुन अनुसार चल्नेछ।

आफ्नो नाम टाइप गरी बाकसमा चिन्ह लगाउँदा तपाईंले यो सम्झौता पढेर स्वीकार गर्नुभएको मानिन्छ।$ne$, true)
on conflict (kind, version) do nothing;

with v(q_en, q_ne, a_en, a_ne, sort_order) as (values
 ('How do I book?', 'बुक कसरी गर्ने?',
  'Pick a service, choose a worker, set a time, drop a pin on your home and confirm. It takes about two minutes.',
  'सेवा छान्नुहोस्, सेवाप्रदायक रोज्नुहोस्, समय तोक्नुहोस्, नक्सामा घरको स्थान राख्नुहोस् र पक्का गर्नुहोस्। लगभग दुई मिनेट लाग्छ।', 1),
 ('Are the workers verified?', 'सेवाप्रदायक प्रमाणित हुन्छन्?',
  'Every worker submits ID and is reviewed by our team before they can take bookings. You can see their rating and past jobs on their profile.',
  'हरेक सेवाप्रदायकले परिचयपत्र बुझाउँछन् र बुकिङ लिनु अघि हाम्रो टोलीले जाँच गर्छ। प्रोफाइलमा रेटिङ र पुराना काम हेर्न सकिन्छ।', 2),
 ('Can I see where the worker is?', 'सेवाप्रदायक कहाँ छन् हेर्न सकिन्छ?',
  'Yes. Once the worker starts travelling, you see them moving on the map with an estimated arrival time. Location sharing stops when the job starts.',
  'सकिन्छ। सेवाप्रदायक यात्रा सुरु गरेपछि नक्सामा चल्दै गरेको र अनुमानित आइपुग्ने समय देखिन्छ। काम सुरु भएपछि स्थान साझा गर्न रोकिन्छ।', 3),
 ('How do I pay?', 'भुक्तानी कसरी गर्ने?',
  'Pay cash after the job, or online with eSewa or Khalti. The price you see at the end of booking is the price you pay.',
  'काम सकिएपछि नगद, वा eSewa / Khalti बाट अनलाइन। बुकिङको अन्त्यमा देखिएको मूल्य नै तिर्ने मूल्य हो।', 4),
 ('What if I need to cancel?', 'रद्द गर्नुपरे के गर्ने?',
  'You can cancel from your booking page until the worker is on the way. Please cancel at least 2 hours ahead when you can.',
  'सेवाप्रदायक यात्रा सुरु गर्नु अघिसम्म बुकिङ पृष्ठबाट रद्द गर्न सकिन्छ। सकेसम्म २ घण्टा अघि रद्द गर्नुहोस्।', 5))
insert into public.faqs (q_en, q_ne, a_en, a_ne, sort_order)
select * from v where not exists (select 1 from public.faqs f where f.q_en = v.q_en);

insert into public.pages (slug, title_en, title_ne, body_en, body_ne) values
 ('about', 'About Daksha Sewa', 'दक्ष सेवाको बारेमा',
  E'Daksha Sewa connects households in Dhangadhi with skilled, verified people for everyday work at home.\n\nWe started in Sudurpaschim because good help is hard to find and harder to trust. Every worker is checked, every price is shown before you book, and every visit can be followed on the map.',
  E'दक्ष सेवाले धनगढीका घरपरिवारलाई घरायसी काम गर्ने दक्ष र प्रमाणित मानिससँग जोड्छ।\n\nभरपर्दो सहयोग पाउन गाह्रो र भरोसा गर्न झन् गाह्रो भएकाले हामीले सुदूरपश्चिमबाट सुरु गरेका हौं। हरेक सेवाप्रदायकको जाँच हुन्छ, बुक गर्नु अघि मूल्य देखिन्छ, र हरेक भेट नक्सामा हेर्न सकिन्छ।'),
 ('terms', 'Terms of Use', 'प्रयोगका शर्तहरू',
  E'## Using Daksha Sewa\n\nBy creating an account you agree to use the platform honestly and to follow the Service Agreement shown at each booking.\n\n## Accounts\n\nKeep your login private. Tell us if you think someone else has used it.\n\n## Bookings and payments\n\nPrices are calculated by the platform at booking time. Disputes can be raised from the booking page within 24 hours of the visit.\n\nThis page is a template. Have it reviewed by a lawyer before launch.',
  E'## दक्ष सेवा प्रयोग गर्दा\n\nखाता बनाउँदा तपाईंले प्लेटफर्म इमानदारीपूर्वक प्रयोग गर्न र हरेक बुकिङमा देखाइने सेवा सम्झौता पालना गर्न सहमत हुनुहुन्छ।\n\nयो पृष्ठ नमुना हो। सुरु गर्नु अघि वकिलबाट जाँच गराउनुहोस्।'),
 ('privacy', 'Privacy Policy', 'गोपनीयता नीति',
  E'## What we collect\n\nName, phone, email, saved addresses and booking history. Workers also share ID documents, stored privately.\n\n## Location\n\nYour pinned address is used for the booking. A worker\'s live location is visible only to the customer of an active booking and stops when the job starts.\n\n## Payments\n\nWe never store card numbers. Online payments are handled by eSewa, Khalti or Stripe.\n\nThis page is a template. Have it reviewed by a lawyer before launch.',
  E'## हामीले के संकलन गर्छौं\n\nनाम, फोन, इमेल, सुरक्षित ठेगाना र बुकिङ इतिहास। सेवाप्रदायकले परिचयपत्र पनि बुझाउँछन्, जुन निजी रूपमा राखिन्छ।\n\n## स्थान\n\nतपाईंले राखेको ठेगाना बुकिङका लागि प्रयोग हुन्छ। सेवाप्रदायकको प्रत्यक्ष स्थान सक्रिय बुकिङको ग्राहकले मात्र देख्छन् र काम सुरु भएपछि रोकिन्छ।\n\nयो पृष्ठ नमुना हो। सुरु गर्नु अघि वकिलबाट जाँच गराउनुहोस्।')
on conflict (slug) do nothing;

-- Demo testimonials ship INACTIVE. Replace with real customer words before enabling.
with v(name, location, quote_en, quote_ne, is_active, sort_order) as (values
 ('Sample customer', 'Dhangadhi', 'Replace this with a real review from a real customer.', 'यसलाई वास्तविक ग्राहकको वास्तविक प्रतिक्रियाले बदल्नुहोस्।', false, 1))
insert into public.testimonials (name, location, quote_en, quote_ne, is_active, sort_order)
select * from v where not exists (select 1 from public.testimonials t where t.name = v.name and t.quote_en = v.quote_en);
