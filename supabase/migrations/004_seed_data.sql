-- ============================================================
-- Migration 004: Seed / Test Data — Ace Edu CBT
-- ============================================================

-- ============================================================
-- ADMIN SETTINGS
-- ============================================================
insert into admin_settings (
  id, whatsapp_number, bank_name, account_number,
  account_name, contact_email, contact_phone
)
values (
  1,
  '2348012345678',
  'First Bank Nigeria',
  '3012345678',
  'Ace Edu CBT Ltd',
  'support@aceeduc.com',
  '08012345678'
)
on conflict (id) do update set
  whatsapp_number = excluded.whatsapp_number,
  bank_name       = excluded.bank_name,
  account_number  = excluded.account_number,
  account_name    = excluded.account_name,
  contact_email   = excluded.contact_email,
  contact_phone   = excluded.contact_phone,
  updated_at      = now();

-- ============================================================
-- ADS
-- ============================================================
insert into ads (id, image_url, link_url, duration_seconds, is_active)
values
  ('a1000001-0000-0000-0000-000000000001', 'https://picsum.photos/seed/ace1/800/300', 'https://aceeduc.com/promo1', 5,  true),
  ('a1000001-0000-0000-0000-000000000002', 'https://picsum.photos/seed/ace2/800/300', 'https://aceeduc.com/promo2', 7,  true),
  ('a1000001-0000-0000-0000-000000000003', 'https://picsum.photos/seed/ace3/800/300', 'https://aceeduc.com/sale',   6,  false)
on conflict (id) do nothing;

-- ============================================================
-- QUIZZES
-- ============================================================
insert into quizzes (id, title, description, price, duration_minutes, pass_mark, is_published)
values
  (
    'b1000001-0000-0000-0000-000000000001',
    'WAEC Mathematics 2024',
    'Comprehensive past questions covering algebra, geometry, and statistics for WAEC candidates. Detailed explanations included.',
    500.00, 90, 50, true
  ),
  (
    'b1000001-0000-0000-0000-000000000002',
    'JAMB English Language',
    'Practice with comprehension passages and lexis & structure questions from past UTME papers. Sharpen your English skills.',
    300.00, 60, 50, true
  ),
  (
    'b1000001-0000-0000-0000-000000000003',
    'NECO Physics',
    'All topics from mechanics to modern physics, including calculations and theory with detailed explanations mapped to the NECO syllabus.',
    400.00, 75, 50, true
  ),
  (
    'b1000001-0000-0000-0000-000000000004',
    'WAEC Biology 2024',
    'Cell biology, genetics, ecology, and evolution covered in full, mapped to the current WAEC Biology syllabus.',
    400.00, 75, 50, true
  ),
  (
    'b1000001-0000-0000-0000-000000000005',
    'JAMB Chemistry',
    'Organic, inorganic, and physical chemistry with worked examples and explanations for UTME Chemistry candidates.',
    350.00, 60, 50, true
  ),
  (
    'b1000001-0000-0000-0000-000000000006',
    'NECO Government',
    'Nigerian government structure, history, and political theory with landmark questions and analysis for NECO SS3 students.',
    250.00, 60, 50, false
  )
on conflict (id) do nothing;

-- ============================================================
-- QUESTIONS — WAEC Mathematics 2024
-- ============================================================
insert into questions (id, quiz_id, question_text, options, correct_option_index, explanation, order_index)
values
  (
    'c1000001-0000-0000-0000-000000000001',
    'b1000001-0000-0000-0000-000000000001',
    'If 2x + 5 = 13, what is the value of x?',
    '[{"text":"3","image_url":null},{"text":"4","image_url":null},{"text":"6","image_url":null},{"text":"8","image_url":null}]',
    1, 'Subtract 5 from both sides: 2x = 8, then divide by 2: x = 4.', 0
  ),
  (
    'c1000001-0000-0000-0000-000000000002',
    'b1000001-0000-0000-0000-000000000001',
    'Simplify: 3² + 4²',
    '[{"text":"25","image_url":null},{"text":"49","image_url":null},{"text":"7","image_url":null},{"text":"12","image_url":null}]',
    0, '3² = 9 and 4² = 16. 9 + 16 = 25.', 1
  ),
  (
    'c1000001-0000-0000-0000-000000000003',
    'b1000001-0000-0000-0000-000000000001',
    'A train travels 120 km in 2 hours. What is its average speed?',
    '[{"text":"40 km/h","image_url":null},{"text":"60 km/h","image_url":null},{"text":"80 km/h","image_url":null},{"text":"100 km/h","image_url":null}]',
    1, 'Speed = Distance ÷ Time = 120 ÷ 2 = 60 km/h.', 2
  ),
  (
    'c1000001-0000-0000-0000-000000000004',
    'b1000001-0000-0000-0000-000000000001',
    'What is the area of a circle with radius 7 cm? (Take π = 22/7)',
    '[{"text":"44 cm²","image_url":null},{"text":"154 cm²","image_url":null},{"text":"22 cm²","image_url":null},{"text":"308 cm²","image_url":null}]',
    1, 'Area = πr² = (22/7) × 7² = 22 × 7 = 154 cm².', 3
  ),
  (
    'c1000001-0000-0000-0000-000000000005',
    'b1000001-0000-0000-0000-000000000001',
    'Which of the following is a prime number?',
    '[{"text":"1","image_url":null},{"text":"9","image_url":null},{"text":"11","image_url":null},{"text":"15","image_url":null}]',
    2, '11 is divisible only by 1 and itself, making it prime.', 4
  ),
  (
    'c1000001-0000-0000-0000-000000000006',
    'b1000001-0000-0000-0000-000000000001',
    'Convert 0.35 to a fraction in its lowest terms.',
    '[{"text":"35/100","image_url":null},{"text":"7/20","image_url":null},{"text":"1/4","image_url":null},{"text":"3/5","image_url":null}]',
    1, '0.35 = 35/100. Dividing both by 5 gives 7/20.', 5
  ),
  (
    'c1000001-0000-0000-0000-000000000007',
    'b1000001-0000-0000-0000-000000000001',
    'Find the gradient of the line passing through (2, 3) and (4, 7).',
    '[{"text":"1","image_url":null},{"text":"2","image_url":null},{"text":"3","image_url":null},{"text":"4","image_url":null}]',
    1, 'Gradient = (7 − 3) / (4 − 2) = 4 / 2 = 2.', 6
  ),
  (
    'c1000001-0000-0000-0000-000000000008',
    'b1000001-0000-0000-0000-000000000001',
    'The mode of the data set {3, 5, 5, 7, 7, 7, 9} is:',
    '[{"text":"5","image_url":null},{"text":"7","image_url":null},{"text":"9","image_url":null},{"text":"3","image_url":null}]',
    1, '7 appears three times — more than any other value.', 7
  )
on conflict (id) do nothing;

-- ============================================================
-- QUESTIONS — JAMB English Language
-- ============================================================
insert into questions (id, quiz_id, question_text, options, correct_option_index, explanation, order_index)
values
  (
    'c2000001-0000-0000-0000-000000000001',
    'b1000001-0000-0000-0000-000000000002',
    'Choose the word nearest in meaning to EBULLIENT.',
    '[{"text":"Sad","image_url":null},{"text":"Enthusiastic","image_url":null},{"text":"Tired","image_url":null},{"text":"Angry","image_url":null}]',
    1, 'Ebullient means cheerful and full of energy — nearest to enthusiastic.', 0
  ),
  (
    'c2000001-0000-0000-0000-000000000002',
    'b1000001-0000-0000-0000-000000000002',
    'Select the option that best completes: "Neither the students nor the teacher ___ present."',
    '[{"text":"were","image_url":null},{"text":"was","image_url":null},{"text":"are","image_url":null},{"text":"have been","image_url":null}]',
    1, 'With "neither…nor", the verb agrees with the closest subject — "the teacher" is singular, so "was" is correct.', 1
  ),
  (
    'c2000001-0000-0000-0000-000000000003',
    'b1000001-0000-0000-0000-000000000002',
    'Identify the figure of speech in: "The wind whispered through the trees."',
    '[{"text":"Simile","image_url":null},{"text":"Metaphor","image_url":null},{"text":"Personification","image_url":null},{"text":"Hyperbole","image_url":null}]',
    2, 'Giving the wind the human quality of whispering is personification.', 2
  ),
  (
    'c2000001-0000-0000-0000-000000000004',
    'b1000001-0000-0000-0000-000000000002',
    'Which of the following is an example of a gerund?',
    '[{"text":"Running fast","image_url":null},{"text":"She runs daily","image_url":null},{"text":"Running is good exercise","image_url":null},{"text":"He will run","image_url":null}]',
    2, '"Running" used as the subject of the sentence functions as a gerund (a verb used as a noun).', 3
  ),
  (
    'c2000001-0000-0000-0000-000000000005',
    'b1000001-0000-0000-0000-000000000002',
    'Select the correctly spelt word.',
    '[{"text":"Occurence","image_url":null},{"text":"Occurrence","image_url":null},{"text":"Ocurrence","image_url":null},{"text":"Occurrance","image_url":null}]',
    1, 'The correct spelling is "occurrence" — double c, double r.', 4
  )
on conflict (id) do nothing;

-- ============================================================
-- QUESTIONS — NECO Physics
-- ============================================================
insert into questions (id, quiz_id, question_text, options, correct_option_index, explanation, order_index)
values
  (
    'c3000001-0000-0000-0000-000000000001',
    'b1000001-0000-0000-0000-000000000003',
    'What is the SI unit of force?',
    '[{"text":"Joule","image_url":null},{"text":"Newton","image_url":null},{"text":"Watt","image_url":null},{"text":"Pascal","image_url":null}]',
    1, 'Force is measured in Newtons (N), named after Isaac Newton.', 0
  ),
  (
    'c3000001-0000-0000-0000-000000000002',
    'b1000001-0000-0000-0000-000000000003',
    'A body of mass 5 kg is accelerated at 3 m/s². What is the force applied?',
    '[{"text":"8 N","image_url":null},{"text":"15 N","image_url":null},{"text":"2 N","image_url":null},{"text":"1.67 N","image_url":null}]',
    1, 'F = ma = 5 × 3 = 15 N.', 1
  ),
  (
    'c3000001-0000-0000-0000-000000000003',
    'b1000001-0000-0000-0000-000000000003',
    'Which of the following is NOT a vector quantity?',
    '[{"text":"Velocity","image_url":null},{"text":"Displacement","image_url":null},{"text":"Speed","image_url":null},{"text":"Force","image_url":null}]',
    2, 'Speed has magnitude only (no direction), making it a scalar. Velocity, displacement, and force are vectors.', 2
  ),
  (
    'c3000001-0000-0000-0000-000000000004',
    'b1000001-0000-0000-0000-000000000003',
    'The frequency of a wave is 50 Hz and its wavelength is 4 m. What is its speed?',
    '[{"text":"12.5 m/s","image_url":null},{"text":"200 m/s","image_url":null},{"text":"54 m/s","image_url":null},{"text":"46 m/s","image_url":null}]',
    1, 'v = fλ = 50 × 4 = 200 m/s.', 3
  ),
  (
    'c3000001-0000-0000-0000-000000000005',
    'b1000001-0000-0000-0000-000000000003',
    'Which type of mirror is used as a rear-view mirror in vehicles?',
    '[{"text":"Concave","image_url":null},{"text":"Plane","image_url":null},{"text":"Convex","image_url":null},{"text":"Parabolic","image_url":null}]',
    2, 'Convex mirrors give a wider field of view, making them ideal for rear-view mirrors.', 4
  )
on conflict (id) do nothing;

-- ============================================================
-- CODES — sample batch for the first three quizzes
-- ============================================================
insert into codes (id, quiz_id, code, status)
values
  ('d1000001-0000-0000-0000-000000000001', 'b1000001-0000-0000-0000-000000000001', 'ACE-DEMO01', 'unused'),
  ('d1000001-0000-0000-0000-000000000002', 'b1000001-0000-0000-0000-000000000001', 'ACE-DEMO02', 'unused'),
  ('d1000001-0000-0000-0000-000000000003', 'b1000001-0000-0000-0000-000000000001', 'ACE-DEMO03', 'unused'),
  ('d1000001-0000-0000-0000-000000000004', 'b1000001-0000-0000-0000-000000000002', 'ACE-ENG001', 'unused'),
  ('d1000001-0000-0000-0000-000000000005', 'b1000001-0000-0000-0000-000000000002', 'ACE-ENG002', 'unused'),
  ('d1000001-0000-0000-0000-000000000006', 'b1000001-0000-0000-0000-000000000003', 'ACE-PHY001', 'unused'),
  ('d1000001-0000-0000-0000-000000000007', 'b1000001-0000-0000-0000-000000000003', 'ACE-PHY002', 'unused')
on conflict (id) do nothing;
    'quiz0001-0000-0000-0000-000000000003',
    'What is the SI unit of force?',
    '[{"text":"Joule","image_url":null},{"text":"Newton","image_url":null},{"text":"Watt","image_url":null},{"text":"Pascal","image_url":null}]',
    1,
    'Force is measured in Newtons (N), named after Isaac Newton.',
    0
  ),
  (
    'ques0003-0000-0000-0000-000000000002',
    'quiz0001-0000-0000-0000-000000000003',
    'A body of mass 5 kg is accelerated at 3 m/s². What is the force applied?',
    '[{"text":"8 N","image_url":null},{"text":"15 N","image_url":null},{"text":"2 N","image_url":null},{"text":"1.67 N","image_url":null}]',
    1,
    'F = ma = 5 × 3 = 15 N.',
    1
  ),
  (
    'ques0003-0000-0000-0000-000000000003',
    'quiz0001-0000-0000-0000-000000000003',
    'Which of the following is NOT a vector quantity?',
    '[{"text":"Velocity","image_url":null},{"text":"Displacement","image_url":null},{"text":"Speed","image_url":null},{"text":"Force","image_url":null}]',
    2,
    'Speed has magnitude only (no direction), making it a scalar. Velocity, displacement, and force are all vectors.',
    2
  ),
  (
    'ques0003-0000-0000-0000-000000000004',
    'quiz0001-0000-0000-0000-000000000003',
    'The frequency of a wave is 50 Hz and its wavelength is 4 m. What is its speed?',
    '[{"text":"12.5 m/s","image_url":null},{"text":"200 m/s","image_url":null},{"text":"54 m/s","image_url":null},{"text":"46 m/s","image_url":null}]',
    1,
    'v = fλ = 50 × 4 = 200 m/s.',
    3
  ),
  (
    'ques0003-0000-0000-0000-000000000005',
    'quiz0001-0000-0000-0000-000000000003',
    'Which type of mirror is used as a rear-view mirror in vehicles?',
    '[{"text":"Concave","image_url":null},{"text":"Plane","image_url":null},{"text":"Convex","image_url":null},{"text":"Parabolic","image_url":null}]',
    2,
    'Convex mirrors give a wider field of view, making them ideal for rear-view mirrors.',
    4
  )
on conflict (id) do nothing;

-- ============================================================
-- CODES — a small sample batch for quiz 1
-- (In practice generated via the admin dashboard)
-- ============================================================
insert into codes (id, quiz_id, code, status)
values
  ('code0001-0000-0000-0000-000000000001', 'quiz0001-0000-0000-0000-000000000001', 'ACE-DEMO01', 'unused'),
  ('code0001-0000-0000-0000-000000000002', 'quiz0001-0000-0000-0000-000000000001', 'ACE-DEMO02', 'unused'),
  ('code0001-0000-0000-0000-000000000003', 'quiz0001-0000-0000-0000-000000000001', 'ACE-DEMO03', 'unused'),
  ('code0001-0000-0000-0000-000000000004', 'quiz0001-0000-0000-0000-000000000002', 'ACE-ENG001', 'unused'),
  ('code0001-0000-0000-0000-000000000005', 'quiz0001-0000-0000-0000-000000000002', 'ACE-ENG002', 'unused'),
  ('code0001-0000-0000-0000-000000000006', 'quiz0001-0000-0000-0000-000000000003', 'ACE-PHY001', 'unused'),
  ('code0001-0000-0000-0000-000000000007', 'quiz0001-0000-0000-0000-000000000003', 'ACE-PHY002', 'unused')
on conflict (id) do nothing;
