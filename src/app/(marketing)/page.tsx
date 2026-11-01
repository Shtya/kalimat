import type { Metadata } from "next";
import Link from "next/link";
import { LandingFx } from "@/components/landing/LandingFx";
import { TryWheel } from "@/components/landing/TryWheel";
import { Icon } from "@/components/play/Icon";
import { Medal, Progress, Stars } from "@/components/play/ui";
import { seededRandom } from "@/lib/arabic";
import { CURRICULUM } from "@/lib/quran/curriculum";
import { KIND_LABEL, KINDS } from "@/lib/quran/labels";
import { whatsappLink } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "كلمات قرآنية — لعبة تعلّم معاني القرآن للمدارس ومراكز التحفيظ" },
  description:
    "لعبة كلمات تفاعلية تمشي مع منهج القرآن الكريم سورةً سورة: الطالب يتعلم المعاني والقصص والقيم وهو يلعب، والمدرس يعرف ما فهمه كل طالب.",
};

// ── Hero sky: letters scattered like stars (deterministic so server and client agree) ──
const SKY_LETTERS = Array.from("بسمالرحنيقلهوفتصعدكطذزشغجضظث");
const sky = (() => {
  const rand = seededRandom("kalimat-sky");
  return Array.from({ length: 34 }, (_, i) => ({
    l: SKY_LETTERS[i % SKY_LETTERS.length],
    x: Math.round(rand() * 96 + 2),
    y: Math.round(rand() * 88 + 4),
    z: Number((0.35 + rand() * 0.65).toFixed(2)), // depth: near tiles are bigger, brighter, move more
    d: Math.round(9 + rand() * 10), // drift duration (s)
    r: Math.round(rand() * 40 - 20),
  }));
})();
/** «اقرأ» — the first word revealed. Each tile starts somewhere in the sky (offsets in vw/vh). */
const WORD = [
  { l: "ا", fx: -34, fy: -30 },
  { l: "ق", fx: 28, fy: -36 },
  { l: "ر", fx: -40, fy: 26 },
  { l: "أ", fx: 36, fy: 30 },
];

const GAMES = [
  { name: "عجلة الحروف", text: "يسحب الطالب الحروف المرتبة على دائرة ليكوّن الكلمة.", art: "wheel" },
  { name: "شبكة الحروف", text: "يبحث عن كلمات السورة المخفية داخل مربع من الحروف.", art: "grid" },
  { name: "التوصيل", text: "يصل كل كلمة قرآنية بمعناها الصحيح.", art: "match" },
  { name: "أكمل الكلمة", text: "يختار الحرف الناقص ليكمل الكلمة كما في الآية.", art: "missing" },
];

/** The scroll story: one phone, five moments of a student's session. */
const STORY = [
  { title: "رحلة واضحة", text: "ست محطات بالترتيب. الطالب يعرف دائمًا أين هو، وما الخطوة التالية." },
  { title: "خريطة تتسلّق للأعلى", text: "كل مستوى من سورة. يُفتح التالي بعد إنهاء الحالي، فلا يقفز الطالب فوق ما لم يفهمه." },
  { title: "يلعب بالحروف", text: "عجلة، شبكة، توصيل، أو حرف ناقص. أربعة أشكال تكسر الملل." },
  { title: "يتعلّم بعد كل كلمة", text: "بطاقة «هل تعلم؟» تشرح المعنى وتذكر السورة والآية." },
  { title: "ويحتفل بإنجازه", text: "نجوم ونقاط واحتفال يجعل الطالب يريد مستوى آخر." },
];

const WHEEL_DEMO = ["ك", "و", "ث", "ر", "ل", "ا"];
const MAP_DEMO = [
  { x: 50, s: "done", t: "سورة الفاتحة" },
  { x: 72, s: "done", t: "قصار السور" },
  { x: 50, s: "current", t: "الفيل وقريش" },
  { x: 28, s: "locked", t: "سورة الماعون" },
  { x: 50, s: "locked", t: "النصر والمسد" },
];

function Cta({ wa, external, children, className = "" }: { wa: string; external: boolean; children?: React.ReactNode; className?: string }) {
  return (
    <a href={wa} className={`lp-btn lp-btn-gold ${className}`} data-magnetic {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
      <Icon name="whatsapp" size={22} /> {children ?? "اطلب عرضًا لمركزك"}
    </a>
  );
}

export default function LandingPage() {
  const wa = whatsappLink();
  const external = wa.startsWith("http");

  return (
    <>
      <LandingFx />
      <div className="lp-cursor" aria-hidden />
      <noscript>
        <style>{`.lp-hero .lp-hero-text, .lp-hero .lp-hero-demo { opacity: 1 !important; transform: none !important; } .lp-intro { display: none !important; }`}</style>
      </noscript>

      <header className="lp-nav">
        <Link href="/" className="lp-brand" aria-label="كلمات قرآنية">
          <span className="lp-logo" aria-hidden>
            ك
          </span>
          كلمات قرآنية
        </Link>
        <nav className="lp-links" aria-label="أقسام الصفحة">
          <a href="#story">التطبيق</a>
          <a href="#path">المنهج</a>
          <a href="#teacher">لوحة المدرس</a>
        </nav>
        <a href={wa} className="lp-btn lp-btn-gold lp-btn-sm" data-magnetic {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
          <Icon name="whatsapp" size={18} /> تواصل معنا
        </a>
      </header>

      {/* ───── Hero: letters gather into «اقرأ», then become the playable wheel ───── */}
      <section className="lp-hero" data-stage="intro">
        <div className="lp-sky" aria-hidden>
          {sky.map((t, i) => (
            <span key={i} className="sky-tile" style={{ "--x": `${t.x}%`, "--y": `${t.y}%`, "--z": t.z, "--d": `${t.d}s`, "--r": `${t.r}deg` } as React.CSSProperties}>
              <i>{t.l}</i>
            </span>
          ))}
        </div>

        <div className="lp-intro" aria-hidden>
          <div className="intro-word">
            {WORD.map((w, i) => (
              <span key={i} className="intro-tile" style={{ "--fx": `${w.fx}vw`, "--fy": `${w.fy}vh`, "--i": i } as React.CSSProperties}>
                {w.l}
              </span>
            ))}
          </div>
          <p className="intro-card">«اقرأ» أول كلمة نزلت من القرآن</p>
        </div>

        <div className="lp-hero-grid">
          <div className="lp-hero-text">
            <h1>
              طلابك يحفظون الآيات…
              <br />
              فهل يفهمون كلماتها؟
            </h1>
            <p>«كلمات قرآنية» لعبة تحوّل معاني القرآن وقصصه وقيمه إلى مستويات ممتعة، تمشي مع منهج مركزك سورةً سورة، وتقيس لك ما فهمه كل طالب.</p>
            <div className="lp-cta">
              <Cta wa={wa} external={external} />
              <Link href="/app" className="lp-btn lp-btn-glass" data-magnetic>
                <Icon name="play" size={20} filled /> جرّب اللعبة
              </Link>
            </div>
            <ul className="lp-hero-facts">
              <li>بدون إعلانات</li>
              <li>اسم الطالب الأول فقط</li>
              <li>يعمل بدون إنترنت</li>
            </ul>
          </div>
          <div className="lp-hero-demo">
            <div className="phone is-hero">
              <div className="phone-screen-live">
                <TryWheel />
              </div>
            </div>
            <p className="demo-hint">جرّبها بنفسك ☝️</p>
          </div>
        </div>
        <a href="#story" className="lp-scroll-cue" aria-label="انزل لتتعرف على التطبيق">
          <span />
        </a>
      </section>

      {/* ───── Numbers ───── */}
      <section className="lp-numbers" aria-label="المنهج بالأرقام" data-reveal>
        <div>
          <b data-count="114">١١٤</b>سورة يغطيها المنهج كاملًا
        </div>
        <div>
          <b data-count="24">٢٤</b>مرحلة في ٦ محطات
        </div>
        <div>
          <b data-count="4">٤</b>أشكال لعب مختلفة
        </div>
        <div>
          <b data-count="5">٥</b>أنواع معرفة تُقاس لكل طالب
        </div>
      </section>

      {/* ───── Sticky story: the phone stays, the screen changes as you scroll ───── */}
      <section className="lp-story" id="story" data-steps={STORY.length} data-step="0" style={{ "--steps": STORY.length } as React.CSSProperties}>
        <div className="story-sticky">
          <div className="story-text">
            <h2>جلسة واحدة مع «كلمات قرآنية»</h2>
            <ol className="story-steps">
              {STORY.map((s, i) => (
                <li key={s.title} className="story-step" data-i={i}>
                  <span className="story-num">{(i + 1).toLocaleString("ar-EG")}</span>
                  <span>
                    <b>{s.title}</b>
                    <small>{s.text}</small>
                  </span>
                </li>
              ))}
            </ol>
            <span className="story-bar" aria-hidden>
              <i />
            </span>
          </div>

          <div className="story-phone">
            <div className="story-halo" aria-hidden />
            <div className="phone">
              {/* 1 — Journey */}
              <div className="phone-screen kid kid-preview story-screen" data-i={0}>
                <div className="mock-pad">
                  <div className="continue">
                    <span className="continue-text">
                      <small>أكمل من حيث توقفت</small>
                      <b>سورتا الفيل وقريش</b>
                    </span>
                    <span className="continue-play">
                      <Icon name="play" size={26} filled />
                    </span>
                  </div>
                  <h2 className="section-title">المحطات</h2>
                  <ol className="trail">
                    {CURRICULUM.slice(0, 4).map((st, i) => (
                      <li key={st.order} className={`trail-step is-${i === 0 ? "current" : i === 1 ? "open" : "locked"}`}>
                        <div className="trail-link" style={{ "--c": st.color } as React.CSSProperties}>
                          <Medal color={st.color} size={60} state={i === 0 ? "current" : i === 1 ? "open" : "locked"}>
                            <span className="medal-emoji">{st.icon}</span>
                          </Medal>
                          <span className="trail-card">
                            <small className="trail-kicker">المحطة {(i + 1).toLocaleString("ar-EG")}</small>
                            <b className="trail-title">{st.title}</b>
                            {i < 2 && (
                              <span className="trail-meta">
                                <Progress value={i === 0 ? 3 : 0} total={6} color={st.color} />
                              </span>
                            )}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              {/* 2 — Level map, climbing upward */}
              <div className="phone-screen kid kid-preview story-screen" data-i={1}>
                <div className="mock-pad">
                  <div className="page-head">
                    <div className="page-head-text">
                      <h1 className="page-title">يقظة الفطرة والعبودية</h1>
                      <p className="page-sub">المرحلة ١ · ٢ من ٦ مستويات</p>
                    </div>
                  </div>
                  <div className="map" style={{ height: 600 }}>
                    <svg className="map-path" viewBox="0 0 100 600" preserveAspectRatio="none" aria-hidden>
                      <path d="M 50 540 C 50 485, 72 485, 72 430 C 72 375, 50 375, 50 320 C 50 265, 28 265, 28 210 C 28 155, 50 155, 50 100" fill="none" stroke="#ffffff" strokeWidth="20" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                      <path d="M 50 540 C 50 485, 72 485, 72 430 C 72 375, 50 375, 50 320 C 50 265, 28 265, 28 210 C 28 155, 50 155, 50 100" fill="none" stroke="#e9b949" strokeOpacity=".75" strokeWidth="4" strokeDasharray="1 14" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                    </svg>
                    {MAP_DEMO.map((n, i) => (
                      <div key={i} className={`map-node is-${n.s} ${n.x >= 50 ? "title-left" : "title-right"}`} style={{ left: `${n.x}%`, top: 540 - i * 110 }}>
                        {n.s === "current" && <span className="here-flag">ابدأ هنا</span>}
                        <span className="node-btn">{n.s === "locked" ? <Icon name="lock" size={20} /> : n.s === "current" ? <Icon name="play" size={24} filled /> : (i + 1).toLocaleString("ar-EG")}</span>
                        {n.s === "done" && <Stars count={i === 0 ? 3 : 2} size={14} />}
                        <span className="node-title">{n.t}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3 — Playing */}
              <div className="phone-screen kid kid-preview story-screen" data-i={2}>
                <div className="mock-pad game-mock">
                  <div className="segments">
                    <i className="is-on" />
                    <i className="is-on" />
                    <i className="is-now" />
                    <i />
                  </div>
                  <div className="question">
                    <small>المرحلة ١ · قصار السور</small>
                    <p>نهر في الجنة أعطاه الله للنبي ﷺ</p>
                  </div>
                  <div className="slots">
                    {["ا", "", "", "", "", ""].map((l, i) => (
                      <span key={i} className={`slot${l ? " is-hint" : ""}`}>
                        {l}
                      </span>
                    ))}
                  </div>
                  <div className="preview-word">
                    <span>ال</span>
                  </div>
                  <div className="wheel-wrap">
                    <div className="wheel">
                      <svg viewBox="0 0 100 100" aria-hidden>
                        <polyline points="19,32 19,68 40,80" fill="none" stroke="#1f63c6" strokeOpacity=".75" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {WHEEL_DEMO.map((l, i) => {
                        const a = (i / WHEEL_DEMO.length) * Math.PI * 2 - Math.PI / 2;
                        return (
                          <span key={i} className={`tile${i === 4 || i === 5 ? " is-hot" : ""}`} style={{ left: `${50 + 36 * Math.cos(a)}%`, top: `${50 + 36 * Math.sin(a)}%` }}>
                            {l}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* 4 — Fact card */}
              <div className="phone-screen kid kid-preview story-screen" data-i={3}>
                <div className="mock-pad sheet-mock">
                  <div className="sheet">
                    <span className="sheet-handle" />
                    <div className="solved-word">
                      {["ا", "ل", "ك", "و", "ث", "ر"].map((l, i) => (
                        <span key={i} className="tile is-solved">
                          {l}
                        </span>
                      ))}
                    </div>
                    <h2 className="sheet-title">أحسنت!</h2>
                    <div className="fact-card">
                      <span className="fact-card-head">
                        <Icon name="book" size={18} /> هل تعلم؟
                      </span>
                      <p>سورة الكوثر من أقصر سور القرآن، وآياتها ثلاث.</p>
                      <small className="fact-source">سورة الكوثر · آية ١</small>
                    </div>
                    <span className="btn btn-gold btn-block btn-lg">الكلمة التالية</span>
                  </div>
                </div>
              </div>

              {/* 5 — Result */}
              <div className="phone-screen kid kid-preview story-screen" data-i={4}>
                <div className="mock-pad sheet-mock">
                  <div className="sheet is-result">
                    <div className="result-rays" aria-hidden />
                    <div className="result-stars">
                      {[46, 62, 46].map((s, i) => (
                        <span key={i} className="is-on" style={{ "--i": i + 1 } as React.CSSProperties}>
                          <Icon name="star" size={s} filled />
                        </span>
                      ))}
                    </div>
                    <h2 className="sheet-title">ممتاز! ثلاث نجوم</h2>
                    <div className="result-stats">
                      <span>
                        <b>٤٢٠</b>نقطة
                      </span>
                      <span>
                        <b>٠:٤١</b>الوقت
                      </span>
                      <span>
                        <b>٠</b>تلميحات
                      </span>
                    </div>
                    <span className="btn btn-gold btn-block btn-lg">المستوى التالي</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-band" data-reveal>
        <p>جرّبها على طلابك قبل أن تقرر.</p>
        <Cta wa={wa} external={external}>
          اطلب نسخة تجريبية
        </Cta>
      </section>

      {/* ───── Games ───── */}
      <section className="lp-section lp-games-wrap">
        <div className="lp-head" data-reveal>
          <h2>أربع ألعاب، والهدف واحد: أن يفهم الطالب الكلمة</h2>
          <p>يختار المعلم شكل اللعب لكل مستوى، فيتنوّع اليوم الدراسي ولا يملّ الطالب.</p>
        </div>
        <div className="lp-games">
          {GAMES.map((g, i) => (
            <article key={g.name} className="lp-game" data-reveal data-tilt style={{ "--d": `${i * 80}ms` } as React.CSSProperties}>
              <div className={`game-art art-${g.art}`} aria-hidden>
                {g.art === "wheel" && ["ص", "م", "د", "ل"].map((l, k) => <i key={k}>{l}</i>)}
                {g.art === "grid" &&
                  Array.from("فيلبحرسجيلقمر")
                    .slice(0, 12)
                    .map((l, k) => (
                      <i key={k} className={k < 3 ? "on" : ""} style={{ "--k": k } as React.CSSProperties}>
                        {l}
                      </i>
                    ))}
                {g.art === "match" && (
                  <>
                    <i>الفلق</i>
                    <i>الصبح</i>
                  </>
                )}
                {g.art === "missing" &&
                  ["ك", "و", "", "ر"].map((l, k) => (
                    <i key={k} className={l ? "" : "gap"}>
                      {l || "؟"}
                    </i>
                  ))}
              </div>
              <h3>{g.name}</h3>
              <p>{g.text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ───── Curriculum path: lights up station by station as you scroll ───── */}
      <section className="lp-section lp-path-wrap" id="path">
        <div className="lp-head" data-reveal>
          <h2>منهج كامل في ست محطات</h2>
          <p>مبني على «العناقيد القيمية» في منهج «نحو جيل قرآني»: من التأسيس الإيماني إلى الاستخلاف والقيادة، ويغطي سور القرآن الـ١١٤.</p>
        </div>
        <ol className="lp-path">
          <span className="path-rail" aria-hidden>
            <i />
          </span>
          {CURRICULUM.map((st, i) => (
            <li key={st.order} className="path-station" data-at={((i + 0.4) / CURRICULUM.length).toFixed(2)} style={{ "--c": st.color } as React.CSSProperties}>
              <Medal color={st.color} size={64}>
                <span className="medal-emoji">{st.icon}</span>
              </Medal>
              <div className="path-card">
                <small>المحطة {st.order.toLocaleString("ar-EG")}</small>
                <b>{st.title}</b>
                <p>{st.goal}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ───── Teacher ───── */}
      <section className="lp-section lp-teacher" id="teacher">
        <div className="lp-teacher-text" data-reveal>
          <h2>لوحة المدرس: تعرف ما فهمه كل طالب، لا ما لعبه فقط</h2>
          <ul className="lp-checks">
            <li>
              <Icon name="upload" size={20} />
              <span>
                <b>ارفع أسئلتك من ملف Excel.</b> قالب جاهز، وفحص للملف قبل الحفظ.
              </span>
            </li>
            <li>
              <Icon name="chart" size={20} />
              <span>
                <b>قياس لكل سورة ومرحلة.</b> نسبة الإتقان، وأكثر الأسئلة خطأً لتعيد شرحها في الجلسة.
              </span>
            </li>
            <li>
              <Icon name="users" size={20} />
              <span>
                <b>متابعة كل طالب.</b> آخر مستوى، النجوم، المحاولات، ونوع المعرفة الأضعف عنده.
              </span>
            </li>
          </ul>
          <Cta wa={wa} external={external}>
            شاهد لوحة المدرس في عرض مباشر
          </Cta>
        </div>
        <div className="lp-dash" data-reveal data-tilt aria-hidden>
          <div className="lp-dash-top">
            <span />
            <span />
            <span />
          </div>
          <div className="lp-dash-kpis">
            <div>
              <b data-count="48">٤٨</b>طالب
            </div>
            <div>
              <b data-count="82" data-suffix="٪">
                ٨٢٪
              </b>
              إتقان
            </div>
            <div>
              <b data-count="6">٦</b>مراحل جاهزة
            </div>
          </div>
          <div className="lp-dash-matrix">
            {[92, 81, 64, 0, 77, 48, 0, 0].map((v, i) => (
              <i key={i} className={v === 0 ? "empty" : v >= 75 ? "good" : v >= 50 ? "mid" : "low"} style={{ "--k": i } as React.CSSProperties}>
                {v ? `${v.toLocaleString("ar-EG")}٪` : ""}
              </i>
            ))}
          </div>
          <div className="lp-dash-kinds">
            {KINDS.slice(0, 4).map((k, i) => (
              <span key={k} style={{ "--w": `${[86, 64, 91, 58][i]}%`, "--k": i } as React.CSSProperties}>
                {KIND_LABEL[k].icon} {KIND_LABEL[k].name}
                <i />
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ───── Safety ───── */}
      <section className="lp-section lp-safe">
        {[
          { icon: "lock" as const, title: "آمن للأطفال", text: "بدون إعلانات أو روابط خارجية أو تتبع." },
          { icon: "user" as const, title: "بدون بيانات شخصية", text: "يكفي الاسم الأول. الحفظ برقم أو بريد اختياري." },
          { icon: "wifiOff" as const, title: "يعمل بدون إنترنت", text: "النتائج تُحفظ على الجهاز وتُرسل عند عودة الاتصال." },
          { icon: "star" as const, title: "على أي جهاز", text: "موبايل أو تابلت أو كمبيوتر، ويُثبَّت كتطبيق." },
        ].map((f, i) => (
          <div key={f.title} className="lp-safe-item" data-reveal style={{ "--d": `${i * 80}ms` } as React.CSSProperties}>
            <span className="lp-safe-icon">
              <Icon name={f.icon} size={22} />
            </span>
            <h3>{f.title}</h3>
            <p>{f.text}</p>
          </div>
        ))}
      </section>

      {/* ───── Final CTA ───── */}
      <section className="lp-final" id="contact" data-reveal>
        <div className="lp-final-tiles" aria-hidden>
          {["ق", "ر", "آ", "ن"].map((l, i) => (
            <span key={i} className="lp-tile" style={{ "--i": i } as React.CSSProperties}>
              {l}
            </span>
          ))}
        </div>
        <h2>جاهز تبدأ مع طلابك؟</h2>
        <p>نجهّز لك عرضًا على منهج مركزك، ونساعدك في رفع أسئلتك الأولى.</p>
        <Cta wa={wa} external={external}>
          تواصل معنا على واتساب
        </Cta>
        {!external && <p className="lp-note">رقم واتساب لم يُضبط بعد (NEXT_PUBLIC_WHATSAPP_NUMBER).</p>}
      </section>

      <footer className="lp-footer">
        <span>© كلمات قرآنية</span>
        <span>منهج «نحو جيل قرآني»</span>
        <Link href="/admin/login">دخول المدرس</Link>
      </footer>

      {/* Mobile: a persistent CTA once the hero is out of view */}
      <div className="lp-mobile-cta">
        <a href={wa} className="lp-btn lp-btn-gold" {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
          <Icon name="whatsapp" size={20} /> اطلب عرضًا لمركزك
        </a>
      </div>
    </>
  );
}
