/* البوصلة — بنك المقاييس التربوية (مشترك بين المنصة وصفحة الطالب scale.html).
   ٣ لغات (ar/en/fr) و٤ مستويات: k رياض الأطفال والصفوف الأولية (وجوه)، p الابتدائية العليا، m المتوسطة، s الثانوية.
   عبارات مؤلفة للاستخدام المدرسي الإرشادي (ليست اختبارات تشخيصية مقننة). كل بُعد = متوسط عباراته ٪.
   العبارة: [البعد، ar، en، fr، المستويات؟] — المستويات الافتراضية = مستويات المقياس عدا k. */
(function () {
  const L5 = { ar: ['لا تنطبق أبداً', 'نادراً', 'أحياناً', 'غالباً', 'تنطبق تماماً'], en: ['Never', 'Rarely', 'Sometimes', 'Often', 'Always'], fr: ['Jamais', 'Rarement', 'Parfois', 'Souvent', 'Toujours'] };
  const L3 = { ar: ['😟 لا', '😐 أحياناً', '😀 نعم'], en: ['😟 No', '😐 Sometimes', '😀 Yes'], fr: ['😟 Non', '😐 Parfois', '😀 Oui'] };
  const LEVELS = { k: { ar: 'رياض الأطفال والصفوف الأولية', en: 'KG & early grades', fr: 'Maternelle et premières classes' }, p: { ar: 'الابتدائية العليا', en: 'Upper primary', fr: 'Primaire supérieur' }, m: { ar: 'المتوسطة', en: 'Middle school', fr: 'Collège' }, s: { ar: 'الثانوية', en: 'High school', fr: 'Lycée' } };
  const BAND = v => v >= 75 ? { ar: 'مرتفع', en: 'High', fr: 'Élevé', c: '#2E8B57' } : v >= 50 ? { ar: 'متوسط', en: 'Moderate', fr: 'Moyen', c: '#C9A44C' } : { ar: 'يحتاج تنمية', en: 'Developing', fr: 'À développer', c: '#E0675A' };
  // d = [الاسم ar,en,fr] , c = لون , x = وصف [ar,en,fr] , h = دعم/نصيحة للطالب وولي الأمر [ar,en,fr] , t = توصية للمعلم (ar)
  const D = (n, c, x, h, t) => ({ n, c, x, h, t });
  const S = [
    { key: 'styles', icon: '🧭', lv: 'kpms', name: ['أنماط التعلم', 'Learning Styles', "Styles d'apprentissage"],
      about: ['يكشف الطريقة التي يفضّل الطالب التعلم بها ليُنوّع المعلم استراتيجياته.', 'Reveals how the student prefers to learn so teaching can be varied.', "Révèle comment l'élève préfère apprendre pour diversifier l'enseignement."],
      dims: {
        v: D(['بصري', 'Visual', 'Visuel'], '#005499', ['يتعلم بالصور والمخططات والألوان والخرائط الذهنية.', 'Learns through images, diagrams, colours and mind maps.', 'Apprend avec des images, des schémas, des couleurs et des cartes mentales.'], ['استخدم الخرائط الذهنية والألوان والبطاقات المصورة عند المذاكرة.', 'Use mind maps, colours and picture cards when studying.', 'Utilise des cartes mentales, des couleurs et des cartes illustrées pour réviser.'], 'استخدم الخرائط الذهنية والمخططات والفيديو.'),
        a: D(['سمعي', 'Auditory', 'Auditif'], '#3AB1DB', ['يتعلم بالاستماع والشرح والنقاش.', 'Learns through listening, explanation and discussion.', "Apprend par l'écoute, l'explication et la discussion."], ['اقرأ بصوت مسموع، وسجّل ملخصاتك واستمع إليها، وناقش ما تعلمته.', 'Read aloud, record and replay your summaries, and talk about what you learn.', 'Lis à voix haute, enregistre tes résumés et réécoute-les, discute de ce que tu apprends.'], 'نوّع بالشرح المسموع والنقاش والتسميع.'),
        r: D(['قرائي/كتابي', 'Read/Write', 'Lecture/Écriture'], '#2E8B57', ['يتعلم بالقراءة وتدوين الملاحظات والملخصات.', 'Learns through reading, note-taking and summaries.', 'Apprend en lisant, en prenant des notes et en résumant.'], ['اكتب ملخصات وقوائم، وأعد صياغة الدرس بكلماتك.', 'Write summaries and lists, and rewrite the lesson in your own words.', 'Écris des résumés et des listes, reformule la leçon avec tes mots.'], 'وفّر نصوصاً وملخصات ومهام كتابية.'),
        k: D(['حركي/عملي', 'Kinesthetic', 'Kinesthésique'], '#E0675A', ['يتعلم بالتجربة والحركة والعمل اليدوي.', 'Learns through hands-on practice, movement and doing.', 'Apprend par la pratique, le mouvement et la manipulation.'], ['ذاكر في فترات قصيرة مع حركة، واستخدم النماذج والتجارب والبطاقات.', 'Study in short bursts with movement; use models, experiments and cards.', 'Révise par courtes périodes en bougeant ; utilise maquettes, expériences et cartes.'], 'أدخل التجارب والأنشطة الحركية ولعب الأدوار.') },
      items: [
        ['v', 'أفهم الدرس أكثر عندما أرى صوراً أو رسوماً.', 'I understand a lesson better when I see pictures or drawings.', 'Je comprends mieux une leçon quand je vois des images ou des dessins.', 'kpms'],
        ['a', 'أتذكر ما أسمعه من المعلم أكثر مما أقرؤه.', 'I remember what I hear from the teacher more than what I read.', "Je retiens mieux ce que j'entends du professeur que ce que je lis."],
        ['r', 'أحب أن أكتب ملخصاً بعد كل درس.', 'I like writing a summary after each lesson.', "J'aime écrire un résumé après chaque leçon."],
        ['k', 'أتعلم أفضل عندما أجرب بيدي.', 'I learn best when I try things with my hands.', "J'apprends mieux quand j'essaie avec mes mains.", 'kpms'],
        ['v', 'أستخدم الألوان لتنظيم ملاحظاتي.', 'I use colours to organise my notes.', "J'utilise des couleurs pour organiser mes notes."],
        ['a', 'أحب أن أشرح لزملائي بصوت عالٍ.', 'I like explaining things to my classmates out loud.', "J'aime expliquer à voix haute à mes camarades."],
        ['r', 'أفضّل قراءة الكتاب على مشاهدة فيديو.', 'I prefer reading the book to watching a video.', 'Je préfère lire le livre plutôt que regarder une vidéo.'],
        ['k', 'يصعب عليّ الجلوس طويلاً دون حركة.', 'It is hard for me to sit still for a long time.', "J'ai du mal à rester assis longtemps sans bouger.", 'kpms'],
        ['v', 'أتخيل الأشياء في ذهني كأنها صورة.', 'I picture things in my mind like an image.', "J'imagine les choses dans ma tête comme une image."],
        ['a', 'أستفيد من النقاش الجماعي.', 'I learn from group discussions.', "J'apprends grâce aux discussions de groupe."],
        ['r', 'أحب القوائم والنقاط المكتوبة.', 'I like lists and written bullet points.', "J'aime les listes et les points écrits."],
        ['k', 'أحب الأنشطة والألعاب التعليمية.', 'I enjoy educational activities and games.', "J'aime les activités et les jeux éducatifs.", 'kpms'],
        ['v', 'أفضّل الخرائط الذهنية والمخططات على النص الطويل.', 'I prefer mind maps and diagrams to long text.', 'Je préfère les cartes mentales et les schémas aux longs textes.'],
        ['a', 'أحب أن يقرأ لي أحد القصة.', 'I like someone reading a story to me.', "J'aime qu'on me lise une histoire.", 'kp'],
        ['r', 'أفهم التعليمات المكتوبة أفضل من الشفهية.', 'I understand written instructions better than spoken ones.', 'Je comprends mieux les consignes écrites que les consignes orales.'],
        ['k', 'أفهم أكثر عندما أبني نموذجاً أو مجسماً.', 'I understand more when I build a model.', 'Je comprends mieux quand je construis une maquette.'],
        ['v', 'أتذكر مكان المعلومة في الصفحة أو السبورة.', 'I remember where information was on the page or board.', "Je me souviens de l'endroit où était l'information sur la page ou le tableau."],
        ['a', 'أكرر المعلومة بصوتي لأحفظها.', 'I repeat information aloud to memorise it.', "Je répète l'information à voix haute pour la mémoriser.", 'kpms'],
        ['r', 'أحب أن أكتب الكلمات الجديدة في دفتري.', 'I like writing new words in my notebook.', "J'aime écrire les nouveaux mots dans mon cahier.", 'kpms'],
        ['k', 'أحب التجارب في المختبر.', 'I like experiments in the lab.', "J'aime les expériences au laboratoire."],
        ['v', 'أحب مشاهدة الفيديو التعليمي لفهم الفكرة.', 'I like watching educational videos to understand an idea.', "J'aime regarder des vidéos éducatives pour comprendre une idée.", 'kpms'],
        ['a', 'أستمع إلى التسجيلات الصوتية للمراجعة.', 'I listen to audio recordings to revise.', "J'écoute des enregistrements audio pour réviser."],
        ['r', 'أبحث عن معنى الكلمات في القاموس أو الإنترنت.', 'I look up word meanings in a dictionary or online.', 'Je cherche le sens des mots dans le dictionnaire ou sur Internet.'],
        ['k', 'أتحرك أو أمشي وأنا أراجع.', 'I move or walk around while revising.', 'Je bouge ou je marche pendant que je révise.']] },

    { key: 'mi', icon: '💡', lv: 'kpms', name: ['الذكاءات المتعددة', 'Multiple Intelligences', 'Intelligences multiples'],
      about: ['يُبرز مواطن القوة لدى الطالب في ثمانية ذكاءات لتوجيه الأنشطة والمشاريع.', "Highlights the student's strengths across eight intelligences to guide activities and projects.", "Met en valeur les forces de l'élève dans huit intelligences pour orienter activités et projets."],
      dims: {
        ling: D(['لغوي', 'Linguistic', 'Linguistique'], '#005499', ['قوة في القراءة والكتابة والتعبير.', 'Strong in reading, writing and expression.', "Fort en lecture, écriture et expression."], ['اقرأ يومياً واكتب يومياتك وشارك في الإلقاء.', 'Read daily, keep a journal and take part in public speaking.', "Lis chaque jour, tiens un journal et participe à l'expression orale."], 'مشاريع كتابة وإلقاء ومناظرات.'),
        logic: D(['منطقي رياضي', 'Logical-mathematical', 'Logico-mathématique'], '#082B5A', ['قوة في الأرقام والتحليل وحل المسائل.', 'Strong in numbers, analysis and problem solving.', 'Fort en nombres, analyse et résolution de problèmes.'], ['جرّب الألغاز والشطرنج وتحديات الرياضيات والبرمجة.', 'Try puzzles, chess, maths challenges and coding.', 'Essaie les énigmes, les échecs, les défis de maths et la programmation.'], 'مسائل تحدٍّ وتحليل بيانات وبرمجة.'),
        spat: D(['بصري مكاني', 'Visual-spatial', 'Visuo-spatial'], '#3AB1DB', ['قوة في الرسم والتصميم والخرائط.', 'Strong in drawing, design and maps.', 'Fort en dessin, design et cartes.'], ['صمّم ملصقات وخرائط ذهنية وجرّب التصميم الرقمي.', 'Design posters and mind maps; try digital design.', 'Conçois des affiches et des cartes mentales ; essaie le design numérique.'], 'تصميم ملصقات وإنفوجرافيك ونماذج.'),
        body: D(['جسمي حركي', 'Bodily-kinesthetic', 'Corporelle-kinesthésique'], '#E0675A', ['قوة في الرياضة والعمل اليدوي والتمثيل.', 'Strong in sport, handwork and acting.', 'Fort en sport, travaux manuels et théâtre.'], ['شارك في الرياضة والمسرح والأعمال اليدوية والتجارب.', 'Join sports, drama, crafts and experiments.', 'Participe au sport, au théâtre, aux travaux manuels et aux expériences.'], 'نماذج يدوية وأنشطة ميدانية ولعب أدوار.'),
        mus: D(['إيقاعي', 'Musical-rhythmic', 'Musicale-rythmique'], '#AE95DA', ['حساسية للأصوات والإيقاع والنغمة.', 'Sensitive to sounds, rhythm and tone.', 'Sensible aux sons, au rythme et au ton.'], ['احفظ بالإيقاع والأناشيد وشارك في الإنشاد والإلقاء.', 'Memorise with rhythm and chants; join recitation.', 'Mémorise avec le rythme et les chants ; participe à la récitation.'], 'أناشيد وإيقاع للحفظ وإلقاء.'),
        inter: D(['اجتماعي', 'Interpersonal', 'Interpersonnelle'], '#C9A44C', ['قوة في التعاون والتواصل وقيادة المجموعات.', 'Strong in cooperation, communication and leading groups.', 'Fort en coopération, communication et animation de groupe.'], ['انضم إلى الأندية والعمل التطوعي ومجموعات الدراسة.', 'Join clubs, volunteering and study groups.', "Rejoins des clubs, du bénévolat et des groupes d'étude."], 'تعلم تعاوني وأدوار قيادية.'),
        intra: D(['ذاتي', 'Intrapersonal', 'Intrapersonnelle'], '#2F855A', ['قوة في التأمل ومعرفة الذات وتحديد الأهداف.', 'Strong in reflection, self-knowledge and goal setting.', 'Fort en réflexion, connaissance de soi et fixation d’objectifs.'], ['دوّن أهدافك وتأملاتك واعمل على مشاريع شخصية.', 'Write down goals and reflections; work on personal projects.', 'Note tes objectifs et réflexions ; mène des projets personnels.'], 'سجل تعلم ذاتي وأهداف شخصية.'),
        nat: D(['طبيعي', 'Naturalist', 'Naturaliste'], '#1F6B44', ['اهتمام بالطبيعة والكائنات والتصنيف.', 'Interest in nature, living things and classification.', 'Intérêt pour la nature, le vivant et la classification.'], ['استكشف الطبيعة، وازرع نباتاً، وصنّف ما تجمعه.', 'Explore nature, grow a plant and classify what you collect.', 'Explore la nature, fais pousser une plante et classe ce que tu collectes.'], 'تصنيف ورحلات واستكشاف.') },
      items: [
        ['ling', 'أستمتع بالقراءة والقصص.', 'I enjoy reading and stories.', "J'aime la lecture et les histoires.", 'kpms'],
        ['logic', 'أحب الألغاز والمسائل الحسابية.', 'I like puzzles and maths problems.', "J'aime les énigmes et les problèmes de maths.", 'kpms'],
        ['spat', 'أرسم أو أصمم بسهولة.', 'I draw or design easily.', 'Je dessine ou je conçois facilement.', 'kpms'],
        ['body', 'أحب الرياضة والأعمال اليدوية.', 'I love sports and handicrafts.', "J'aime le sport et les travaux manuels.", 'kpms'],
        ['mus', 'أتذكر الأناشيد والإيقاعات بسرعة.', 'I remember chants and rhythms quickly.', 'Je retiens vite les chants et les rythmes.', 'kpms'],
        ['inter', 'أحب العمل مع مجموعة.', 'I like working in a group.', "J'aime travailler en groupe.", 'kpms'],
        ['intra', 'أحب أن أعمل وحدي أحياناً لأفكر.', 'I sometimes like working alone to think.', "J'aime parfois travailler seul pour réfléchir.", 'kpms'],
        ['nat', 'أهتم بالنباتات والحيوانات.', 'I care about plants and animals.', "Je m'intéresse aux plantes et aux animaux.", 'kpms'],
        ['ling', 'أعبّر عن أفكاري بالكلمات جيداً.', 'I express my ideas well in words.', "J'exprime bien mes idées avec des mots."],
        ['logic', 'أسأل «لماذا» و«كيف» كثيراً.', 'I often ask “why” and “how”.', 'Je demande souvent « pourquoi » et « comment ».'],
        ['spat', 'أفهم الخرائط والمخططات بسهولة.', 'I understand maps and charts easily.', 'Je comprends facilement les cartes et les graphiques.'],
        ['body', 'أفكر أفضل وأنا أتحرك.', 'I think better when I move.', 'Je réfléchis mieux en bougeant.'],
        ['mus', 'ألاحظ الأصوات من حولي.', 'I notice the sounds around me.', 'Je remarque les sons autour de moi.'],
        ['inter', 'يلجأ إليّ زملائي للمساعدة.', 'My classmates come to me for help.', "Mes camarades viennent me demander de l'aide."],
        ['intra', 'أعرف نقاط قوتي وضعفي.', 'I know my strengths and weaknesses.', 'Je connais mes points forts et mes points faibles.'],
        ['nat', 'أحب تصنيف الأشياء ومقارنتها.', 'I like classifying and comparing things.', "J'aime classer et comparer les choses."],
        ['ling', 'أحب الكتابة الإبداعية أو الشعر.', 'I like creative writing or poetry.', "J'aime l'écriture créative ou la poésie."],
        ['logic', 'أحب ترتيب الأشياء بخطوات منطقية.', 'I like putting things in logical steps.', "J'aime organiser les choses en étapes logiques."],
        ['spat', 'أحب ألعاب التركيب والمكعبات.', 'I like building games and blocks.', "J'aime les jeux de construction et les cubes."],
        ['body', 'أتقن الحركات الجديدة بسرعة.', 'I master new movements quickly.', 'Je maîtrise vite de nouveaux mouvements.'],
        ['mus', 'أحفظ المعلومات أسهل إذا كانت بإيقاع.', 'I memorise information more easily with a rhythm.', 'Je mémorise plus facilement avec un rythme.'],
        ['inter', 'أفهم مشاعر الآخرين بسرعة.', 'I quickly understand how others feel.', 'Je comprends vite ce que ressentent les autres.'],
        ['intra', 'أضع أهدافاً لنفسي وأتابعها.', 'I set goals for myself and follow them.', 'Je me fixe des objectifs et je les suis.'],
        ['nat', 'أستمتع بالرحلات في الطبيعة.', 'I enjoy trips in nature.', "J'aime les sorties dans la nature."],
        ['ling', 'أتعلم كلمات جديدة بسرعة.', 'I learn new words quickly.', "J'apprends vite de nouveaux mots."],
        ['logic', 'أستمتع بالألعاب الاستراتيجية مثل الشطرنج.', 'I enjoy strategy games like chess.', "J'aime les jeux de stratégie comme les échecs."],
        ['spat', 'أتذكر الطرق والأماكن بسهولة.', 'I remember routes and places easily.', 'Je me souviens facilement des chemins et des lieux.'],
        ['body', 'أحب التمثيل ولعب الأدوار.', 'I like acting and role-play.', "J'aime le théâtre et les jeux de rôle."],
        ['mus', 'أميّز اختلاف نغمة الصوت والإلقاء.', 'I can tell differences in tone of voice and delivery.', 'Je distingue les différences de ton et de diction.'],
        ['inter', 'أنجح في حل الخلافات بين زملائي.', 'I am good at solving disagreements between classmates.', 'Je réussis à régler les désaccords entre camarades.'],
        ['intra', 'أتأمل في ما تعلمته بعد الدرس.', 'I reflect on what I learned after the lesson.', "Je réfléchis à ce que j'ai appris après la leçon."],
        ['nat', 'ألاحظ تغيّر الطقس والفصول.', 'I notice changes in weather and seasons.', 'Je remarque les changements de temps et de saisons.']] },

    { key: 'riasec', icon: '🎯', lv: 'ms', name: ['الميول المهنية', 'Career Interests (RIASEC)', 'Intérêts professionnels (RIASEC)'],
      about: ['يساعد في التوجيه المهني واختيار المسارات بستة أنماط للميول.', 'Supports career guidance and pathway choice through six interest types.', "Aide à l'orientation et au choix des filières selon six types d'intérêts."],
      dims: {
        R: D(['واقعي', 'Realistic', 'Réaliste'], '#E0675A', ['يميل إلى الأعمال التقنية والميدانية والأدوات.', 'Drawn to technical, hands-on and field work.', 'Attiré par le travail technique, pratique et de terrain.'], ['استكشف الهندسة التطبيقية والتقنية والروبوتات.', 'Explore applied engineering, technology and robotics.', "Explore l'ingénierie appliquée, la technologie et la robotique."], 'المسارات التقنية والهندسية التطبيقية.'),
        I: D(['بحثي', 'Investigative', 'Investigateur'], '#005499', ['يميل إلى العلوم والبحث والتحليل.', 'Drawn to science, research and analysis.', "Attiré par les sciences, la recherche et l'analyse."], ['شارك في المسابقات العلمية ومشاريع البحث.', 'Join science competitions and research projects.', 'Participe aux concours scientifiques et aux projets de recherche.'], 'المسارات العلمية والصحية والبحثية.'),
        A: D(['فني', 'Artistic', 'Artistique'], '#AE95DA', ['يميل إلى الإبداع والتصميم والفنون.', 'Drawn to creativity, design and the arts.', 'Attiré par la création, le design et les arts.'], ['طوّر مَعرض أعمال (Portfolio) في التصميم أو الكتابة أو الإعلام.', 'Build a portfolio in design, writing or media.', 'Constitue un portfolio en design, écriture ou médias.'], 'التصميم والإعلام والفنون.'),
        S: D(['اجتماعي', 'Social', 'Social'], '#2E8B57', ['يميل إلى التعليم والمساعدة والرعاية.', 'Drawn to teaching, helping and caring.', 'Attiré par l’enseignement, l’aide et le soin.'], ['تطوّع وجرّب أدوار الإرشاد ومساعدة الآخرين.', 'Volunteer and try mentoring and helping roles.', "Fais du bénévolat et essaie des rôles d'accompagnement."], 'التعليم والإرشاد والخدمات الصحية.'),
        E: D(['ريادي', 'Enterprising', 'Entreprenant'], '#C9A44C', ['يميل إلى القيادة والأعمال والإقناع.', 'Drawn to leadership, business and persuasion.', 'Attiré par le leadership, les affaires et la persuasion.'], ['شارك في برامج ريادة الأعمال ومجالس الطلاب.', 'Join entrepreneurship programmes and student councils.', "Participe aux programmes d'entrepreneuriat et au conseil des élèves."], 'إدارة الأعمال والريادة والقانون.'),
        C: D(['تنظيمي', 'Conventional', 'Conventionnel'], '#082B5A', ['يميل إلى التنظيم والبيانات والإدارة.', 'Drawn to organisation, data and administration.', "Attiré par l'organisation, les données et la gestion."], ['تعلّم الجداول الإلكترونية وإدارة المشاريع الصغيرة.', 'Learn spreadsheets and small project management.', 'Apprends les tableurs et la gestion de petits projets.'], 'المحاسبة والإدارة ونظم المعلومات.') },
      items: [
        ['R', 'أحب إصلاح الأجهزة أو تركيبها.', 'I like fixing or assembling devices.', "J'aime réparer ou assembler des appareils."],
        ['I', 'أستمتع بإجراء التجارب العلمية.', 'I enjoy doing science experiments.', "J'aime faire des expériences scientifiques."],
        ['A', 'أحب التصميم أو الكتابة الإبداعية.', 'I like design or creative writing.', "J'aime le design ou l'écriture créative."],
        ['S', 'أحب مساعدة الآخرين وتعليمهم.', 'I like helping and teaching others.', "J'aime aider et enseigner aux autres."],
        ['E', 'أحب قيادة المشاريع وإقناع الآخرين.', 'I like leading projects and persuading others.', "J'aime diriger des projets et convaincre les autres."],
        ['C', 'أحب ترتيب الملفات والبيانات بدقة.', 'I like organising files and data precisely.', "J'aime classer les fichiers et les données avec précision."],
        ['R', 'أفضّل العمل الميداني على العمل المكتبي.', 'I prefer fieldwork to office work.', 'Je préfère le travail de terrain au travail de bureau.'],
        ['I', 'أقرأ عن الاكتشافات العلمية.', 'I read about scientific discoveries.', 'Je lis sur les découvertes scientifiques.'],
        ['A', 'أحب الرسم أو التصوير أو المونتاج.', 'I like drawing, photography or video editing.', "J'aime le dessin, la photo ou le montage vidéo."],
        ['S', 'أهتم بمشاعر الآخرين ومشكلاتهم.', "I care about others' feelings and problems.", 'Je me soucie des sentiments et des problèmes des autres.'],
        ['E', 'أفكر في بدء مشروعي الخاص.', 'I think about starting my own business.', 'Je pense à créer ma propre entreprise.'],
        ['C', 'أتبع الخطوات والتعليمات بدقة.', 'I follow steps and instructions precisely.', 'Je suis les étapes et les consignes avec précision.'],
        ['R', 'أحب استخدام الأدوات والآلات.', 'I like using tools and machines.', "J'aime utiliser des outils et des machines."],
        ['I', 'أحب حل المشكلات المعقدة.', 'I like solving complex problems.', "J'aime résoudre des problèmes complexes."],
        ['A', 'أعبّر عن نفسي بطرق غير تقليدية.', 'I express myself in unconventional ways.', "Je m'exprime de façon originale."],
        ['S', 'أحب العمل التطوعي.', 'I like volunteering.', "J'aime le bénévolat."],
        ['E', 'أحب البيع والتسويق والتفاوض.', 'I like selling, marketing and negotiating.', "J'aime vendre, faire du marketing et négocier."],
        ['C', 'أحب العمل على الحاسب والجداول.', 'I like working with computers and spreadsheets.', "J'aime travailler sur ordinateur et avec des tableaux."],
        ['R', 'أهتم بالسيارات أو الطائرات أو الروبوتات.', 'I am interested in cars, planes or robots.', "Je m'intéresse aux voitures, aux avions ou aux robots."],
        ['I', 'أحب تحليل البيانات والأرقام.', 'I like analysing data and numbers.', "J'aime analyser des données et des chiffres."],
        ['A', 'أهتم بالألوان والتصميم الجميل.', 'I care about colours and beautiful design.', 'Je fais attention aux couleurs et au beau design.'],
        ['S', 'أستمتع بالعمل ضمن فريق.', 'I enjoy working in a team.', "J'aime travailler en équipe."],
        ['E', 'أتحمل المسؤولية وأتخذ القرارات.', 'I take responsibility and make decisions.', 'Je prends des responsabilités et des décisions.'],
        ['C', 'أنظّم وقتي وأدواتي جيداً.', 'I organise my time and things well.', "J'organise bien mon temps et mes affaires."],
        ['R', 'أحب الأنشطة الخارجية والعمل البدني.', 'I like outdoor activities and physical work.', "J'aime les activités en plein air et le travail physique."],
        ['I', 'أطرح أسئلة عن أسباب الظواهر.', 'I ask questions about the causes of phenomena.', 'Je pose des questions sur les causes des phénomènes.'],
        ['A', 'أحب ابتكار أفكار جديدة لمشروعات.', 'I like coming up with new ideas for projects.', "J'aime inventer de nouvelles idées de projets."],
        ['S', 'أحب الاهتمام بصحة الناس ورعايتهم.', "I like caring for people's health and wellbeing.", "J'aime prendre soin de la santé des gens."],
        ['E', 'أحب المنافسة وتحقيق الأهداف.', 'I like competition and reaching goals.', "J'aime la compétition et atteindre des objectifs."],
        ['C', 'أحب الحسابات والميزانيات.', 'I like calculations and budgets.', "J'aime les calculs et les budgets."]] },

    { key: 'study', icon: '📚', lv: 'pms', name: ['مهارات الدراسة', 'Study Skills', "Méthodes de travail"],
      about: ['يقيس عادات الطالب الدراسية ليُبنى عليها برنامج دعم وإرشاد.', "Measures the student's study habits to build a support plan.", "Mesure les habitudes de travail de l'élève pour bâtir un plan d'accompagnement."],
      dims: {
        time: D(['إدارة الوقت', 'Time management', 'Gestion du temps'], '#005499', ['التخطيط والالتزام بالمواعيد.', 'Planning and meeting deadlines.', 'Planifier et respecter les délais.'], ['ضع جدولاً أسبوعياً واقعياً وابدأ بالأهم.', 'Make a realistic weekly plan and start with what matters most.', 'Fais un planning hebdomadaire réaliste et commence par l’essentiel.'], 'تدريب على الجدولة الأسبوعية.'),
        focus: D(['التركيز', 'Focus', 'Concentration'], '#3AB1DB', ['الانتباه وتجنب المشتتات.', 'Attention and avoiding distractions.', 'Attention et gestion des distractions.'], ['جرّب طريقة بومودورو: ٢٥ دقيقة تركيز و٥ راحة، والجوال بعيد.', 'Try Pomodoro: 25 minutes focus, 5 rest, phone away.', 'Essaie Pomodoro : 25 min de concentration, 5 de pause, téléphone éloigné.'], 'استراتيجيات تقليل المشتتات (بومودورو).'),
        notes: D(['التدوين', 'Note-taking', 'Prise de notes'], '#2E8B57', ['تنظيم الملاحظات والمراجعة.', 'Organising notes and reviewing.', 'Organiser ses notes et réviser.'], ['استخدم طريقة كورنيل وراجع ملاحظاتك في اليوم نفسه.', 'Use the Cornell method and review notes the same day.', 'Utilise la méthode Cornell et relis tes notes le jour même.'], 'تعليم طريقة كورنيل للتدوين.'),
        exam: D(['الاستعداد للاختبار', 'Exam readiness', "Préparation aux examens"], '#E0675A', ['المراجعة المبكرة وضبط القلق.', 'Early revision and managing anxiety.', "Révision précoce et gestion du stress."], ['راجع مبكراً وحل نماذج سابقة وتدرّب على التنفس الهادئ.', 'Revise early, practise past papers and calm breathing.', "Révise tôt, entraîne-toi sur d'anciens sujets et respire calmement."], 'برنامج إرشادي لقلق الاختبار.') },
      items: [
        ['time', 'أضع جدولاً أسبوعياً للمذاكرة.', 'I make a weekly study schedule.', 'Je fais un planning de révision hebdomadaire.'],
        ['focus', 'أبعد الجوال عني وقت المذاكرة.', 'I keep my phone away while studying.', 'Je garde mon téléphone loin de moi quand je révise.'],
        ['notes', 'أدوّن ملاحظات منظمة في الحصة.', 'I take organised notes in class.', 'Je prends des notes organisées en classe.'],
        ['exam', 'أبدأ المراجعة قبل الاختبار بوقت كافٍ.', 'I start revising well before the exam.', "Je commence à réviser bien avant l'examen."],
        ['time', 'أسلّم واجباتي في موعدها.', 'I hand in my homework on time.', 'Je rends mes devoirs à temps.'],
        ['focus', 'أستطيع التركيز ٣٠ دقيقة متصلة.', 'I can focus for 30 minutes in a row.', 'Je peux me concentrer 30 minutes de suite.'],
        ['notes', 'أراجع ملاحظاتي في اليوم نفسه.', 'I review my notes the same day.', 'Je relis mes notes le jour même.'],
        ['exam', 'أتحكم في توتري أثناء الاختبار.', 'I control my stress during the exam.', "Je gère mon stress pendant l'examen."],
        ['time', 'أبدأ بالمهام الأهم أولاً.', 'I start with the most important tasks first.', 'Je commence par les tâches les plus importantes.'],
        ['focus', 'أذاكر في مكان هادئ ومنظم.', 'I study in a quiet, tidy place.', 'Je révise dans un endroit calme et rangé.'],
        ['notes', 'أكتب الأفكار الرئيسة بكلماتي.', 'I write the main ideas in my own words.', "J'écris les idées principales avec mes propres mots."],
        ['exam', 'أحل نماذج اختبارات سابقة.', 'I practise with past exam papers.', "Je m'entraîne avec d'anciens sujets d'examen."],
        ['time', 'لا أؤجل المذاكرة إلى آخر لحظة.', "I don't leave studying to the last minute.", 'Je ne repousse pas mes révisions à la dernière minute.'],
        ['focus', 'أنتبه للمعلم طوال الحصة.', 'I pay attention to the teacher throughout the lesson.', 'Je suis attentif au professeur pendant tout le cours.'],
        ['notes', 'أستخدم العناوين والرموز في ملاحظاتي.', 'I use headings and symbols in my notes.', "J'utilise des titres et des symboles dans mes notes."],
        ['exam', 'أقرأ السؤال جيداً قبل الإجابة.', 'I read the question carefully before answering.', 'Je lis bien la question avant de répondre.'],
        ['time', 'أوازن بين الدراسة والراحة.', 'I balance study and rest.', "J'équilibre études et repos."],
        ['focus', 'أعود للمهمة بسرعة إذا تشتت.', 'I get back to the task quickly if distracted.', 'Je reviens vite à la tâche si je suis distrait.'],
        ['notes', 'أسأل عمّا لم أفهمه.', "I ask about what I didn't understand.", "Je pose des questions sur ce que je n'ai pas compris."],
        ['exam', 'أراجع إجاباتي قبل التسليم.', 'I check my answers before handing in.', 'Je vérifie mes réponses avant de rendre ma copie.']] },

    { key: 'motive', icon: '🔥', lv: 'kpms', name: ['الدافعية للتعلم', 'Motivation to Learn', "Motivation à apprendre"],
      about: ['يقيس دافعية الطالب الداخلية والخارجية ومثابرته.', "Measures the student's intrinsic and extrinsic motivation and persistence.", "Mesure la motivation intrinsèque et extrinsèque de l'élève et sa persévérance."],
      dims: {
        inner: D(['دافعية داخلية', 'Intrinsic motivation', 'Motivation intrinsèque'], '#2E8B57', ['حب التعلم والفضول.', 'Love of learning and curiosity.', "Goût d'apprendre et curiosité."], ['اختر موضوعاً تحبه وتعمّق فيه بمشروع صغير.', 'Pick a topic you love and go deeper with a small project.', 'Choisis un sujet que tu aimes et approfondis-le avec un petit projet.'], 'ربط الدروس باهتماماته وتحديات إثرائية.'),
        outer: D(['دافعية خارجية', 'Extrinsic motivation', 'Motivation extrinsèque'], '#C9A44C', ['التحفيز بالدرجات والتقدير.', 'Driven by marks and recognition.', 'Motivé par les notes et la reconnaissance.'], ['ضع مكافآت صغيرة لإنجازاتك وتابع تقدمك بلوحة مرئية.', 'Set small rewards for achievements and track progress visually.', 'Fixe-toi de petites récompenses et suis tes progrès de façon visuelle.'], 'نظام تعزيز ونقاط واضح.'),
        pers: D(['المثابرة', 'Persistence', 'Persévérance'], '#005499', ['الاستمرار أمام الصعوبة.', 'Keeping going when things get hard.', 'Continuer face à la difficulté.'], ['قسّم المهمة الصعبة إلى خطوات صغيرة واحتفل بكل خطوة.', 'Break hard tasks into small steps and celebrate each one.', 'Découpe les tâches difficiles en petites étapes et célèbre chacune.'], 'أهداف قصيرة ومتابعة تقدّم مرئية.') },
      items: [
        ['inner', 'أتعلم لأنني أستمتع بمعرفة الجديد.', 'I learn because I enjoy discovering new things.', "J'apprends parce que j'aime découvrir des choses nouvelles.", 'kpms'],
        ['outer', 'أجتهد لأحصل على درجات عالية.', 'I work hard to get high marks.', 'Je travaille dur pour avoir de bonnes notes.'],
        ['pers', 'لا أستسلم عندما يصعب عليّ الحل.', "I don't give up when a problem is hard.", "Je n'abandonne pas quand c'est difficile.", 'kpms'],
        ['inner', 'أبحث عن معلومات إضافية بنفسي.', 'I look for extra information on my own.', 'Je cherche des informations supplémentaires par moi-même.'],
        ['outer', 'يحفزني ثناء المعلم ووالديّ.', 'Praise from my teacher and parents motivates me.', 'Les félicitations de mon professeur et de mes parents me motivent.', 'kpms'],
        ['pers', 'أعيد المحاولة حتى أنجح.', 'I try again until I succeed.', "Je réessaie jusqu'à réussir.", 'kpms'],
        ['inner', 'أشعر بالسعادة عندما أفهم شيئاً صعباً.', 'I feel happy when I understand something hard.', 'Je suis content quand je comprends quelque chose de difficile.', 'kpms'],
        ['outer', 'أحب الجوائز والشهادات.', 'I like prizes and certificates.', "J'aime les prix et les certificats.", 'kpms'],
        ['pers', 'أكمل واجباتي حتى لو كانت طويلة.', 'I finish my homework even when it is long.', 'Je termine mes devoirs même quand ils sont longs.'],
        ['inner', 'أحب الأسئلة التي تتحدى تفكيري.', 'I like questions that challenge my thinking.', "J'aime les questions qui défient ma réflexion."],
        ['outer', 'أذاكر حتى لا أتأخر عن زملائي.', "I study so I don't fall behind my classmates.", 'Je révise pour ne pas être en retard sur mes camarades.'],
        ['pers', 'أتعلم من أخطائي.', 'I learn from my mistakes.', "J'apprends de mes erreurs."],
        ['inner', 'أتعلم حتى لو لم يكن هناك اختبار.', 'I learn even when there is no test.', "J'apprends même quand il n'y a pas d'examen."],
        ['outer', 'يهمني ترتيبي بين زملائي.', 'My rank among classmates matters to me.', 'Mon classement parmi mes camarades compte pour moi.'],
        ['pers', 'أضع لنفسي تحديات جديدة.', 'I set myself new challenges.', 'Je me lance de nouveaux défis.']] },

    { key: 'eq', icon: '💞', lv: 'pms', name: ['الذكاء الوجداني', 'Emotional Intelligence', 'Intelligence émotionnelle'],
      about: ['يقيس وعي الطالب بمشاعره وإدارتها وتعاطفه ومهاراته الاجتماعية.', "Measures the student's emotional awareness, self-regulation, empathy and social skills.", "Mesure la conscience émotionnelle, la maîtrise de soi, l'empathie et les compétences sociales."],
      dims: {
        self: D(['الوعي بالذات', 'Self-awareness', 'Conscience de soi'], '#005499', ['معرفة المشاعر وأسبابها والثقة بالنفس.', 'Knowing one’s feelings, their causes, and self-confidence.', 'Connaître ses émotions, leurs causes, et avoir confiance en soi.'], ['سمِّ مشاعرك يومياً واكتب ما أثارها.', 'Name your feelings daily and write what triggered them.', "Nomme tes émotions chaque jour et note ce qui les a provoquées."], 'تمارين تسمية المشاعر ويوميات التأمل.'),
        manage: D(['إدارة الانفعالات', 'Self-regulation', 'Maîtrise de soi'], '#3AB1DB', ['الهدوء والتفكير قبل التصرف وتقبل النقد.', 'Staying calm, thinking before acting, accepting feedback.', 'Rester calme, réfléchir avant d’agir, accepter les critiques.'], ['جرّب التنفس العميق والعد إلى عشرة قبل الرد.', 'Try deep breathing and counting to ten before reacting.', 'Essaie la respiration profonde et compte jusqu’à dix avant de réagir.'], 'استراتيجيات التهدئة وركن الهدوء.'),
        empathy: D(['التعاطف', 'Empathy', 'Empathie'], '#2E8B57', ['فهم مشاعر الآخرين واحترام اختلافهم.', 'Understanding others’ feelings and respecting differences.', 'Comprendre les autres et respecter leurs différences.'], ['استمع لصديقك حتى النهاية واسأله عن شعوره.', 'Listen to your friend fully and ask how they feel.', 'Écoute ton ami jusqu’au bout et demande-lui ce qu’il ressent.'], 'لعب أدوار ونقاش مواقف وقصص.'),
        social: D(['المهارات الاجتماعية', 'Social skills', 'Compétences sociales'], '#C9A44C', ['تكوين العلاقات والتعاون وحل الخلافات.', 'Building relationships, cooperating and resolving conflicts.', 'Créer des liens, coopérer et résoudre les conflits.'], ['شارك في عمل جماعي وتدرّب على الحوار الهادئ.', 'Join group work and practise calm dialogue.', 'Participe au travail de groupe et pratique le dialogue calme.'], 'تعلم تعاوني بأدوار واضحة.') },
      items: [
        ['self', 'أعرف ما أشعر به ولماذا.', 'I know what I feel and why.', 'Je sais ce que je ressens et pourquoi.'],
        ['manage', 'أهدأ بسرعة بعد الغضب.', 'I calm down quickly after getting angry.', 'Je me calme vite après une colère.'],
        ['empathy', 'ألاحظ إذا كان زميلي حزيناً.', 'I notice if a classmate is sad.', 'Je remarque si un camarade est triste.'],
        ['social', 'أكوّن صداقات بسهولة.', 'I make friends easily.', 'Je me fais des amis facilement.'],
        ['self', 'أعرف ما يغضبني أو يحزنني.', 'I know what makes me angry or sad.', 'Je sais ce qui me met en colère ou me rend triste.'],
        ['manage', 'أفكر قبل أن أتصرف.', 'I think before I act.', "Je réfléchis avant d'agir."],
        ['empathy', 'أضع نفسي مكان الآخرين.', "I put myself in others' shoes.", 'Je me mets à la place des autres.'],
        ['social', 'أستمع للآخرين دون مقاطعة.', 'I listen to others without interrupting.', "J'écoute les autres sans les interrompre."],
        ['self', 'أستطيع وصف مشاعري بالكلمات.', 'I can describe my feelings in words.', 'Je peux décrire mes émotions avec des mots.'],
        ['manage', 'أتعامل مع الضغط دون أن أنفعل.', 'I handle pressure without losing my temper.', "Je gère la pression sans m'énerver."],
        ['empathy', 'أحترم الآراء المختلفة عن رأيي.', 'I respect opinions different from mine.', 'Je respecte les avis différents du mien.'],
        ['social', 'أتعاون مع زملائي لإنجاز المهام.', 'I cooperate with classmates to get tasks done.', 'Je coopère avec mes camarades pour accomplir les tâches.'],
        ['self', 'أثق بقدراتي.', 'I trust my abilities.', "J'ai confiance en mes capacités."],
        ['manage', 'أتقبل النقد بهدوء.', 'I accept criticism calmly.', "J'accepte les critiques calmement."],
        ['empathy', 'أواسي من يحتاج إلى مساعدة.', 'I comfort those who need help.', "Je réconforte ceux qui ont besoin d'aide."],
        ['social', 'أحل الخلافات بالحوار.', 'I resolve conflicts through dialogue.', 'Je règle les conflits par le dialogue.']] },

    { key: 'creative', icon: '🎨', lv: 'pms', name: ['التفكير الإبداعي', 'Creative Thinking', 'Pensée créative'],
      about: ['تقدير ذاتي لمهارات الإبداع الأربع: الطلاقة والمرونة والأصالة وحب الاستطلاع.', 'Self-rating of four creativity skills: fluency, flexibility, originality and curiosity.', 'Auto-évaluation de quatre compétences créatives : fluidité, flexibilité, originalité et curiosité.'],
      dims: {
        flu: D(['الطلاقة', 'Fluency', 'Fluidité'], '#005499', ['إنتاج أفكار كثيرة بسرعة.', 'Producing many ideas quickly.', "Produire beaucoup d'idées rapidement."], ['تحدَّ نفسك بذكر عشرة أفكار لأي مشكلة في خمس دقائق.', 'Challenge yourself to list ten ideas for any problem in five minutes.', 'Défie-toi de trouver dix idées pour un problème en cinq minutes.'], 'عصف ذهني بأزمنة محددة.'),
        flex: D(['المرونة', 'Flexibility', 'Flexibilité'], '#3AB1DB', ['النظر من زوايا مختلفة وتغيير الطريقة.', 'Seeing from different angles and switching approaches.', "Voir sous différents angles et changer d'approche."], ['اسأل نفسك: كيف يرى هذه المشكلة عالمٌ أو فنانٌ أو طفل؟', 'Ask: how would a scientist, an artist or a child see this?', 'Demande-toi : comment un scientifique, un artiste ou un enfant verrait cela ?'], 'قبعات التفكير الست.'),
        orig: D(['الأصالة', 'Originality', 'Originalité'], '#AE95DA', ['أفكار جديدة غير مألوفة.', 'New, unusual ideas.', 'Des idées nouvelles et inhabituelles.'], ['دوّن أفكارك الغريبة ولا تحكم عليها مبكراً.', 'Write down your unusual ideas and don’t judge them too early.', 'Note tes idées étranges sans les juger trop vite.'], 'مهام مفتوحة ومشاريع ابتكار.'),
        curious: D(['حب الاستطلاع', 'Curiosity & risk-taking', 'Curiosité et audace'], '#2E8B57', ['السؤال والتجريب وعدم الخوف من الخطأ.', 'Asking, experimenting and not fearing mistakes.', "Questionner, expérimenter et ne pas craindre l'erreur."], ['جرّب شيئاً جديداً كل أسبوع واسأل «ماذا لو؟».', 'Try something new each week and ask “what if?”.', 'Essaie quelque chose de nouveau chaque semaine et demande « et si ? ».'], 'مختبرات استقصاء وأسئلة «ماذا لو».') },
      items: [
        ['flu', 'تأتيني أفكار كثيرة بسرعة.', 'Many ideas come to me quickly.', "Beaucoup d'idées me viennent rapidement."],
        ['flex', 'أنظر للمشكلة من زوايا مختلفة.', 'I look at a problem from different angles.', 'Je regarde un problème sous différents angles.'],
        ['orig', 'أفكاري تختلف عن أفكار زملائي.', "My ideas are different from my classmates'.", 'Mes idées sont différentes de celles de mes camarades.'],
        ['curious', 'أسأل كثيراً عن كيفية عمل الأشياء.', 'I often ask how things work.', 'Je demande souvent comment les choses fonctionnent.'],
        ['flu', 'أستطيع ذكر حلول عديدة لمشكلة واحدة.', 'I can list many solutions to one problem.', 'Je peux proposer plusieurs solutions à un même problème.'],
        ['flex', 'أغيّر طريقتي إذا لم تنجح.', "I change my approach if it doesn't work.", 'Je change de méthode si elle ne marche pas.'],
        ['orig', 'أحب ابتكار أشياء لم يصنعها أحد.', 'I like inventing things no one has made.', "J'aime inventer des choses que personne n'a faites."],
        ['curious', 'أحب تجربة ما لم أجربه من قبل.', "I like trying things I've never tried.", "J'aime essayer ce que je n'ai jamais essayé."],
        ['flu', 'أكتب أو أرسم أفكاري دون توقف.', 'I write or draw my ideas without stopping.', "J'écris ou je dessine mes idées sans m'arrêter."],
        ['flex', 'أجد استخدامات مختلفة للشيء الواحد.', 'I find different uses for the same object.', 'Je trouve différents usages pour un même objet.'],
        ['orig', 'أضيف لمستي الخاصة لأي عمل.', 'I add my own touch to any work.', "J'ajoute ma touche personnelle à tout travail."],
        ['curious', 'لا أخشى أن تكون فكرتي غريبة.', "I'm not afraid my idea might seem strange.", "Je n'ai pas peur que mon idée paraisse étrange."],
        ['flu', 'أقترح أفكاراً كثيرة في النقاش.', 'I suggest many ideas in discussions.', "Je propose beaucoup d'idées dans les discussions."],
        ['flex', 'أتقبل الأفكار الجديدة بسهولة.', 'I accept new ideas easily.', "J'accepte facilement les idées nouvelles."],
        ['orig', 'أحب القصص والحلول غير المتوقعة.', 'I like unexpected stories and solutions.', "J'aime les histoires et les solutions inattendues."],
        ['curious', 'أفكك الأشياء لأعرف ما بداخلها.', 'I take things apart to see what is inside.', "Je démonte les objets pour voir ce qu'il y a dedans."]] },

    { key: 'gifted', icon: '⭐', lv: 'pms', name: ['سمات الموهبة (ترشيح ذاتي)', 'Gifted Traits (self-nomination)', 'Traits de douance (auto-désignation)'],
      about: ['ترشيح ذاتي يرصد مؤشرات الحلقات الثلاث للموهبة والقيادة، ويُضم إلى ملف الطالب في رعاية الموهوبين.', 'A self-nomination screening the three-ring indicators of giftedness and leadership; feeds the gifted-care file.', "Une auto-désignation repérant les indicateurs des trois anneaux de la douance et du leadership."],
      dims: {
        abil: D(['القدرة العقلية', 'Above-average ability', 'Capacité supérieure'], '#082B5A', ['سرعة التعلم وفهم المجرد والربط بين المعارف.', 'Fast learning, abstract understanding, connecting knowledge.', "Apprentissage rapide, compréhension de l'abstrait, liens entre les savoirs."], ['ابحث عن تحديات أعلى من مستواك: مسابقات وقراءات متقدمة.', 'Seek challenges above your level: competitions and advanced reading.', 'Cherche des défis au-dessus de ton niveau : concours et lectures avancées.'], 'تسريع المحتوى وضغط المنهج.'),
        commit: D(['الالتزام بالمهمة', 'Task commitment', 'Engagement dans la tâche'], '#005499', ['الانغماس والمثابرة ومعايير الجودة العالية.', 'Absorption, persistence and high standards.', 'Implication, persévérance et exigence de qualité.'], ['اختر مشروعاً طويلاً يهمك وأنجزه بمراحل.', 'Choose a long project you care about and complete it in stages.', 'Choisis un long projet qui te tient à cœur et réalise-le par étapes.'], 'مشاريع بحثية فردية ممتدة.'),
        creat: D(['الإبداع', 'Creativity', 'Créativité'], '#AE95DA', ['حلول غير مألوفة وخيال وتطوير الأفكار.', 'Unusual solutions, imagination and developing ideas.', 'Solutions inhabituelles, imagination et développement des idées.'], ['شارك في مسابقات الابتكار وسجّل أفكارك.', 'Enter innovation competitions and log your ideas.', "Participe aux concours d'innovation et note tes idées."], 'برامج الابتكار والمسابقات.'),
        lead: D(['القيادة', 'Leadership', 'Leadership'], '#C9A44C', ['تنظيم الآخرين وتحمل المسؤولية والإقناع.', 'Organising others, responsibility and persuasion.', 'Organiser les autres, responsabilité et persuasion.'], ['تولَّ دوراً قيادياً في نادٍ أو مشروع.', 'Take a leading role in a club or project.', 'Prends un rôle de leader dans un club ou un projet.'], 'أدوار قيادية ومجالس طلابية.') },
      items: [
        ['abil', 'أتعلم الأشياء الجديدة أسرع من أقراني.', 'I learn new things faster than my peers.', "J'apprends les choses nouvelles plus vite que mes camarades."],
        ['commit', 'أنغمس طويلاً في المهمة التي تثير اهتمامي.', 'I get absorbed for a long time in tasks that interest me.', "Je m'absorbe longtemps dans une tâche qui m'intéresse."],
        ['creat', 'أقترح حلولاً غير مألوفة.', 'I suggest unusual solutions.', 'Je propose des solutions inhabituelles.'],
        ['lead', 'يختارني زملائي لقيادة المجموعة.', 'My classmates choose me to lead the group.', 'Mes camarades me choisissent pour diriger le groupe.'],
        ['abil', 'أفهم الأفكار المجردة والمعقدة.', 'I understand abstract and complex ideas.', 'Je comprends les idées abstraites et complexes.'],
        ['commit', 'أضع معايير عالية لعملي.', 'I set high standards for my work.', "Je fixe des exigences élevées pour mon travail."],
        ['creat', 'أحب تحسين الأشياء وتطويرها.', 'I like improving and developing things.', "J'aime améliorer et développer les choses."],
        ['lead', 'أنظّم الأنشطة وأوزع الأدوار.', 'I organise activities and assign roles.', "J'organise les activités et je distribue les rôles."],
        ['abil', 'لدي معلومات واسعة في موضوعات تهمني.', 'I have broad knowledge in topics that interest me.', "J'ai de vastes connaissances dans les sujets qui m'intéressent."],
        ['commit', 'أكمل مشاريعي حتى النهاية.', 'I finish my projects to the end.', "Je termine mes projets jusqu'au bout."],
        ['creat', 'أتخيل أفكاراً جديدة باستمرار.', 'I constantly imagine new ideas.', "J'imagine sans cesse de nouvelles idées."],
        ['lead', 'أتحمل المسؤولية بثقة.', 'I take on responsibility with confidence.', 'Je prends des responsabilités avec confiance.'],
        ['abil', 'أربط بين المعلومات من مواد مختلفة.', 'I connect information from different subjects.', 'Je relie des informations de différentes matières.'],
        ['commit', 'أبحث في ما يهمني دون أن يطلب مني أحد.', 'I research what interests me without being asked.', "Je fais des recherches sur ce qui m'intéresse sans qu'on me le demande."],
        ['creat', 'لدي حس فكاهي وأفكار طريفة.', 'I have a sense of humour and witty ideas.', "J'ai le sens de l'humour et des idées amusantes."],
        ['lead', 'أقنع الآخرين بأفكاري.', 'I persuade others with my ideas.', 'Je convaincs les autres de mes idées.']] },

    { key: 'wellbeing', icon: '🌱', lv: 'kp', faces: true, name: ['الرضا والمناخ الصفي', 'Wellbeing & Class Climate', 'Bien-être et climat de classe'],
      about: ['مقياس مبسط بالوجوه عن شعور الطالب في المدرسة والصف.', 'A simple faces scale on how the student feels at school and in class.', "Une échelle simple à visages sur le ressenti de l'élève à l'école et en classe."],
      dims: {
        happy: D(['السعادة بالمدرسة', 'Happiness at school', "Bonheur à l'école"], '#2E8B57', ['الاستمتاع بالمدرسة والحصص.', 'Enjoying school and lessons.', "Aimer l'école et les cours."], ['تحدث مع طفلك يومياً عن أجمل ما حدث في المدرسة.', 'Talk daily with your child about the best thing at school.', "Parlez chaque jour avec votre enfant du meilleur moment à l'école."], 'أنشطة ترحيبية وتحفيز يومي.'),
        safe: D(['الأمان', 'Feeling safe', 'Sécurité'], '#005499', ['الشعور بالأمان وعدم الخوف من الخطأ.', 'Feeling safe and unafraid of mistakes.', "Se sentir en sécurité et ne pas craindre l'erreur."], ['طمئن طفلك أن الخطأ جزء من التعلم وتواصل مع المدرسة عند أي قلق.', 'Reassure your child that mistakes are part of learning; contact school with any worry.', "Rassurez votre enfant : l'erreur fait partie de l'apprentissage ; contactez l'école en cas d'inquiétude."], 'تواصل مع الموجه الطلابي.'),
        friends: D(['العلاقة بالزملاء', 'Friendships', 'Relations avec les camarades'], '#3AB1DB', ['الصداقة واللعب والتعاون.', 'Friendship, play and cooperation.', 'Amitié, jeu et coopération.'], ['شجّع طفلك على دعوة صديق واللعب الجماعي.', 'Encourage your child to invite a friend and play in groups.', 'Encouragez votre enfant à inviter un ami et à jouer en groupe.'], 'دمج في مجموعات تعاونية.'),
        teacher: D(['العلاقة بالمعلم', 'Relationship with teacher', 'Relation avec le professeur'], '#C9A44C', ['الثقة بالمعلم والراحة في السؤال.', 'Trust in the teacher and ease in asking.', 'Confiance envers le professeur et aisance à poser des questions.'], ['تحدث بإيجابية عن المعلم وشجّع طفلك على السؤال.', 'Speak positively about the teacher and encourage questions.', 'Parlez positivement du professeur et encouragez les questions.'], 'لقاء فردي قصير مع المعلم.') },
      items: [
        ['happy', 'أحب المجيء إلى المدرسة.', 'I like coming to school.', "J'aime venir à l'école."],
        ['safe', 'أشعر بالأمان في المدرسة.', 'I feel safe at school.', "Je me sens en sécurité à l'école."],
        ['friends', 'لدي أصدقاء في صفي.', 'I have friends in my class.', "J'ai des amis dans ma classe."],
        ['teacher', 'معلمي يسمعني ويساعدني.', 'My teacher listens to me and helps me.', "Mon professeur m'écoute et m'aide."],
        ['happy', 'أستمتع بالحصص.', 'I enjoy my lessons.', "J'aime mes cours."],
        ['safe', 'أعرف لمن ألجأ إذا ضايقني أحد.', 'I know who to go to if someone bothers me.', "Je sais à qui m'adresser si quelqu'un m'embête."],
        ['friends', 'زملائي يلعبون معي.', 'My classmates play with me.', 'Mes camarades jouent avec moi.'],
        ['teacher', 'معلمي يشجعني.', 'My teacher encourages me.', "Mon professeur m'encourage."],
        ['happy', 'أشعر بالفخر بما أتعلمه.', 'I feel proud of what I learn.', "Je suis fier de ce que j'apprends."],
        ['safe', 'لا أخاف من الخطأ في الصف.', 'I am not afraid of making mistakes in class.', "Je n'ai pas peur de me tromper en classe."],
        ['friends', 'أساعد زملائي ويساعدونني.', 'I help my classmates and they help me.', "J'aide mes camarades et ils m'aident."],
        ['teacher', 'أستطيع أن أسأل معلمي بسهولة.', 'I can ask my teacher questions easily.', 'Je peux poser des questions à mon professeur facilement.']] },
  ];
  const LI = { ar: 0, en: 1, fr: 2 };
  const pick = (a, lang) => Array.isArray(a) ? (a[LI[lang] ?? 0] || a[0]) : a;
  const raw = k => S.find(x => x.key === k);
  const itemLv = (s, it) => it[4] || (s.faces ? s.lv : s.lv.replace('k', ''));
  // نسخة جاهزة للعرض: مستوى ولغة محددان. المستوى الفارغ = كل عبارات المستويات p/m/s (توافق التطبيقات القديمة)
  function view(key, lv, lang) {
    const s = raw(key); if (!s) return null; lang = LI[lang] != null ? lang : 'ar';
    const L = lv && s.lv.includes(lv) ? lv : null;
    const items = s.items.filter(it => { const l = itemLv(s, it); return L ? l.includes(L) : /[pms]/.test(l) || s.lv === 'kp'; });
    const faces = !!s.faces || L === 'k';
    const dims = {}; Object.entries(s.dims).forEach(([k, d]) => { dims[k] = [pick(d.n, lang), d.c, pick(d.x, lang), pick(d.h, lang), d.t]; });
    return { key, icon: s.icon, lv: L, lang, dir: lang === 'ar' ? 'rtl' : 'ltr', name: pick(s.name, lang), about: pick(s.about, lang), levels: s.lv.split(''), faces,
      scale: (faces ? L3 : L5)[lang], dims, items: items.map(it => [it[0], it[1 + (LI[lang] || 0)]]), count: items.length };
  }
  function score(sc, ans) { const max = sc.scale.length; const out = {}; Object.keys(sc.dims).forEach(d => { const v = sc.items.map((it, i) => it[0] === d ? +ans[i] : null).filter(x => x != null && !isNaN(x)); out[d] = v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length - 1) / (max - 1) * 100) : 0; }); return out; }
  function top(sc, sco) { return Object.entries(sco || {}).filter(([k]) => sc.dims[k]).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ k, v, n: sc.dims[k][0], c: sc.dims[k][1], d: sc.dims[k][2], h: sc.dims[k][3], t: sc.dims[k][4], band: BAND(v) })); }
  // المستوى المقترح من مرحلة الفصل
  function levelFor(stage, grade) {
    const s = String(stage || '') + ' ' + String(grade || '');
    if (/روضة|رياض|تمهيدي|KG/i.test(s)) return 'k';
    if (/ثانوي/.test(s)) return 's'; if (/متوسط/.test(s)) return 'm';
    if (/ابتدائ/.test(s)) return /الأول|الثاني|الثالث|أول|ثاني|ثالث/.test(s) ? 'k' : 'p';
    return 'p';
  }
  // رسم رادار SVG (يُستخدم في التقارير)
  function radar(sc, sco, opt) {
    opt = opt || {}; const ks = Object.keys(sc.dims), n = ks.length, W = opt.size || 300, c = W / 2, R = W / 2 - (n > 6 ? 64 : 66);
    const pt = (i, v) => { const a = -Math.PI / 2 + i * 2 * Math.PI / n; return [c + Math.cos(a) * R * v / 100, c + Math.sin(a) * R * v / 100]; };
    const ring = f => ks.map((_, i) => pt(i, f).join(',')).join(' ');
    const poly = (s, col, op, dash) => `<polygon points="${ks.map((k, i) => pt(i, Math.max(4, (s || {})[k] || 0)).join(',')).join(' ')}" fill="${col}" fill-opacity="${op}" stroke="${col}" stroke-width="2.4" ${dash ? 'stroke-dasharray="5 4"' : ''} stroke-linejoin="round"/>`;
    const lab = ks.map((k, i) => { const [x, y] = pt(i, n > 6 ? 128 : 124); return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" font-size="${n > 6 ? 10 : 12}" font-weight="700" fill="#082B5A">${String(sc.dims[k][0]).replace(/[<&]/g, '')}</text>`; }).join('');
    return `<svg viewBox="0 0 ${W} ${W}" width="100%" style="max-width:${W}px;overflow:visible" role="img" aria-label="${String(sc.name).replace(/"/g, '')}">${[25, 50, 75, 100].map(f => `<polygon points="${ring(f)}" fill="${f === 100 ? '#F5F9FD' : 'none'}" stroke="#D5E1F0" stroke-width="1"/>`).join('')}${ks.map((_, i) => { const [x, y] = pt(i, 100); return `<line x1="${c}" y1="${c}" x2="${x}" y2="${y}" stroke="#D5E1F0"/>`; }).join('')}${opt.cmp ? poly(opt.cmp, '#9AA9BC', .08, true) : ''}${poly(sco, opt.color || '#005499', .22)}${ks.map((k, i) => { const [x, y] = pt(i, Math.max(4, (sco || {})[k] || 0)); return `<circle cx="${x}" cy="${y}" r="4" fill="${sc.dims[k][1]}" stroke="#fff" stroke-width="1.5"/>`; }).join('')}${lab}</svg>`;
  }
  const T = {
    ar: { pick: 'اختر اسمك', name: 'اسمك', start: 'ابدأ', next: 'التالي', prev: 'السابق', send: 'إرسال', answered: 'أجبت', of: 'من', left: 'عبارة بقيت دون إجابة', thanks: 'شكراً', intro: 'لا توجد إجابة صحيحة أو خاطئة، أجب بما ينطبق عليك.', top: 'أبرز ما يميزك', tips: 'نصائح تناسبك', profile: 'ملفك', report: 'تقرير الطالب', save: 'حفظ صورة', print: 'طباعة / PDF', wa: 'إرسال لولي الأمر (واتساب)', phone: 'جوال ولي الأمر', card: 'بطاقة التعلم', classAvg: 'متوسط الفصل', level: 'المستوى', date: 'التاريخ', closed: 'المقياس غير متاح', closedT: 'قد يكون أُغلق. تواصل مع معلمك.', badLink: 'رابط غير مكتمل', badLinkT: 'افتح الرابط أو امسح الرمز الذي أرسله معلمك.', note: 'نتيجة إرشادية تساعد على فهم الطالب ودعمه، وليست تشخيصاً.', school: 'مدارس دينا العالمية', choose: '— اختر —', again: 'مقياس جديد', pick2: 'اختر اسمك أولاً', type: 'اكتب اسمك', xschool: 'المدرسة', xgrade: 'الصف', xphone: 'جوال ولي الأمر (واتساب) — اختياري' },
    en: { pick: 'Choose your name', name: 'Your name', start: 'Start', next: 'Next', prev: 'Back', send: 'Submit', answered: 'Answered', of: 'of', left: 'statements still unanswered', thanks: 'Thank you', intro: 'There are no right or wrong answers — answer what is true for you.', top: 'Your standout strength', tips: 'Tips for you', profile: 'Your profile', report: 'Student report', save: 'Save image', print: 'Print / PDF', wa: 'Send to parent (WhatsApp)', phone: "Parent's mobile", card: 'Learning card', classAvg: 'Class average', level: 'Level', date: 'Date', closed: 'Scale not available', closedT: 'It may have been closed. Contact your teacher.', badLink: 'Incomplete link', badLinkT: 'Open the link or scan the code from your teacher.', note: 'A guidance result to understand and support the student — not a diagnosis.', school: 'Dina International Schools', choose: '— choose —', again: 'New scale', pick2: 'Choose your name first', type: 'Type your name', xschool: 'School', xgrade: 'Grade', xphone: "Parent's WhatsApp — optional" },
    fr: { pick: 'Choisis ton nom', name: 'Ton nom', start: 'Commencer', next: 'Suivant', prev: 'Retour', send: 'Envoyer', answered: 'Répondu', of: 'sur', left: 'affirmations sans réponse', thanks: 'Merci', intro: "Il n'y a pas de bonne ou de mauvaise réponse — réponds selon ce qui te correspond.", top: 'Ton point fort', tips: 'Conseils pour toi', profile: 'Ton profil', report: "Rapport de l'élève", save: "Enregistrer l'image", print: 'Imprimer / PDF', wa: 'Envoyer au parent (WhatsApp)', phone: 'Mobile du parent', card: "Carte d'apprentissage", classAvg: 'Moyenne de la classe', level: 'Niveau', date: 'Date', closed: 'Échelle indisponible', closedT: 'Elle a peut-être été fermée. Contacte ton professeur.', badLink: 'Lien incomplet', badLinkT: 'Ouvre le lien ou scanne le code de ton professeur.', note: "Un résultat d'orientation pour comprendre et accompagner l'élève — pas un diagnostic.", school: 'Écoles internationales Dina', choose: '— choisir —', again: 'Nouvelle échelle', pick2: "Choisis d'abord ton nom", type: 'Écris ton nom', xschool: 'École', xgrade: 'Classe', xphone: 'WhatsApp du parent — facultatif' },
  };
  // واتساب: رقم سعودي محلي ← دولي
  const waNum = p => { let d = String(p || '').replace(/[^\d]/g, ''); if (/^05\d{8}$/.test(d)) d = '966' + d.slice(1); else if (/^5\d{8}$/.test(d)) d = '966' + d; else if (d.startsWith('00')) d = d.slice(2); return d; };
  function waText(sc, sco, name, lang) {
    const t = T[lang] || T.ar, tp = top(sc, sco);
    return [`${sc.icon} ${sc.name} — ${name}`, ...tp.map(x => `• ${x.n}: ${x.v}% (${x.band[lang] || x.band.ar})`), '', `⭐ ${t.top}: ${tp[0] ? tp[0].n : ''}`, tp[0] ? `💡 ${tp[0].h}` : '', '', t.note, t.school].join('\n');
  }
  const list = S.map(s => view(s.key, null, 'ar'));
  window.DinaScales = { list, raw: S, LEVELS, T, BAND, get: (k, lv, lang) => view(k, lv, lang), view, score, top, levelFor, radar, waNum, waText };
})();
