# Apex Liquid Glass Design System

> **Apple-szintű „liquid glass” formanyelv és reszponzív architektúra** az Apex platformhoz (mobil, tablet, laptop).

---

## 1. Tervezési Alapelvek (Design Principles)

1. **Tartalom az első (Content First):**
   - Az üvegfelület (**glass**) a *funkcionális rétegre* van fenntartva, amely a tartalom fölött lebeg: lebegő tab bar, oldalsáv, top bar, lapok (sheets), popoverek, modális ablakok és lebegő gombok.
   - A tartalmi felületek (kártyák, listák, diagramok, űrlapok) csendes, finoman áttetsző vagy tiszta felületek maradnak a maximális olvashatóság érdekében.
   - **Soha ne rétegezzünk 2-3 elmosott rétegnél többet** a képernyőn; nagy görgethető listákat és diagramokat **tilos elmosni** (a 60 fps görgetési sebesség megőrzése érdekében).
2. **Képernyőnként egy tiszta cél (One Idea Per Screen):**
   - Minden nézeten egyértelmű az elsődleges művelet, progresszív feltárás (alapértelmezetten tiszta, részletek kérésre).
   - Generózus térközök, nagy olvasható számok (tabular numerals), csendes króm.
3. **Prémium sportolói érzet (Precise, Calm, Fast):**
   - A szín csak ott jelenik meg, ahol funkciója és jelentése van: regeneráció, terhelési állapot, elsődleges művelet.

---

## 2. Design Tokenek (`src/shared/ui/tokens/`)

### 2.1 Színek (`colors.ts`)
| Token | Sötét téma (Alapértelmezett) | Világos téma | Leírás |
|---|---|---|---|
| `base` | `#07080B` | `#F2F4F8` | Alapháttér |
| `surface` | `rgba(255, 255, 255, 0.05)` | `#FFFFFF` | Tartalmi felület (kártyák) |
| `surface-solid` | `#14161B` | `#FFFFFF` | Tartalmi felület szilárd fallback |
| `elevated` | `#1C1F26` | `#FFFFFF` | Kiemelt elemek (drop-down, modal) |
| `separator` | `rgba(255, 255, 255, 0.08)` | `rgba(11, 12, 15, 0.08)` | Elválasztó vonalak |
| `text.primary` | `#F5F6F8` | `#0B0C0F` | Elsődleges szöveg |
| `text.secondary` | `#A3AAB6` | `#4F5663` | Másodlagos szöveg |
| `text.tertiary` | `#6F7785` | `#7C8493` | Harmadlagos / segédszöveg |
| `accent.primary` | `#3D7BFF` | `#3D7BFF` | Apex kék akcentus |
| `accent.hover` | `#2A67EE` | `#2A67EE` | Akcentus hover |
| `status.ready` | `#34D399` | `#10B981` | Optimális regeneráció (zöld) |
| `status.caution` | `#FBBF24` | `#F59E0B` | Figyelmeztetés / közepes terhelés (sárga) |
| `status.rest` | `#F87171` | `#EF4444` | Pihenő szükséges / magas terhelés (piros) |

### 2.2 Folyékony Üveg Rétegek (`glass.ts`)
- **`glass-thin`**: 20px blur, 180% saturating tint. Lebegő alsó navigációs sávhoz (tab bar) és top bar-hoz.
- **`glass-regular`**: 28px blur, 180% saturating tint. Lapokhoz (sheets), toastokhoz és popoverekhez.
- **`glass-thick`**: 40px blur, 180% saturating tint. Modális ablakokhoz, párbeszédpanelekhez.
- **`glass-sheen`**: Finom 1px belső csillanás a felső élen (`inset 0 1px 1px rgba(255, 255, 255, 0.15)`).
- **`glass-lens`**: Fénytörő mozgó lencse indikátor a szegmensválasztók és lapok mögött.
- **Hardver és akkumulátorkímélő szintek:**
  - `full`: Teljes valós idejű elmosás és csillanás.
  - `reduced`: 8px blur, kromatikus telítettség nélkül.
  - `none`: Szilárd felületek, 0px backdrop-filter.

### 2.3 Tipográfia (`typography.ts`)
- Fluid rem-alapú méretezés `clamp()` használatával a képernyőszélesség függvényében:
  - `caption`: 0.75rem (12px)
  - `body`: 1rem (16px) mobilon (megelőzi a Safari auto-zoomot), 0.875rem (14px) desktopon
  - `headline`: 1.125rem - 1.25rem (18-20px)
  - `title`: 1.5rem - 2rem (24-32px)
  - `heroMetric`: 2.5rem - 4rem (40-64px), tabular-nums
- **Nyelvi beállítás:** `lang="hu"`, automatikus szóelválasztás (`hyphens: auto`), és `overflow-wrap: anywhere` a hosszú magyar összetett szavakhoz.

### 2.4 Koncentrikus Lekerekítések (`radii.ts`)
- Matematikai szabály: `Belső sugár = Külső sugár - Térköz`
- `capsule`: `9999px` (gombok, tab bar, chipek, tagek)
- `card`: `28px` (tartalmi kártyák)
- `sheet`: `32px` (mobil alsó lapok)
- `control`: `14px` (input mezők, drop-downok)

### 2.5 Mozgás és Rugózó Fizika (`motion.ts`)
- Rugózó görbe (Apple Spring): `cubic-bezier(0.22, 1, 0.36, 1)`
- Időtartamok:
  - `press`: 120ms (scale 0.97 lenyomáskor)
  - `normal`: 280ms (ablakok, lencse átcsúszás)
  - `slow`: 420ms (teljes képernyős lapok)
- `reduced-motion`: Bekapcsolt mozgáscsökkentésnél azonnali vagy <=150ms gyors átmenetek, rugózás nélkül.

---

## 3. Komponens Primitívek (`src/shared/ui/`)

| Komponens | Változatok / Funkció |
|---|---|
| `Button` | Kapszula forma, `primary` (akcentussal színezett üveg / szilárd akcentus), `secondary`, `plain`, `destructive`, 44px min. érintési cél |
| `Card` | Csendes tartalmi felület, 28px koncentrikus lekerekítés, finom szegély |
| `GlassCard` | Lebegő vagy kiemelt felületek liquid glass anyaggal (`thin`, `regular`, `thick`, `interactive`) |
| `SegmentedControl` | Folyékony üveg kapszula simán csúszó belső lencse indikátorral (`glass-lens`) |
| `Tabs` | Szegmensválasztóhoz hasonló lencse pill módban és animált alsó vonal line módban |
| `Toggle` | iOS stílusú rugózó kapcsoló tapintható gombbal |
| `Slider` | Üvegcsatorna és tapintható szabályzógomb |
| `Stepper` | Tapintható állapotindikátorok összekötő vonallal |
| `Input` / `NumberInput` / `Select` | Inset felület, finom üvegszegély, akcentus fény gyűrű, mobilon >=16px betűméret |
| `ListRow` | Apple Inset Grouped stílus 16px-es behúzott elválasztó vonallal és értékkel a jobb oldalon |
| `BottomSheet` | 32px mobil felső sarkok, fogantyú, rugózó fizika, detentek (peek/half/full); desktopon modális ablak |
| `Toast` | Lebegő üvegkapszula opcionális visszavonás (undo) gombbal |
| `StatTile` / `ProgressRing` | Nagy formátumú biometrikus számkijelzés (tabular-nums) |
| `ChartFrame` | Standard diagram konténer üveg fejléccel és szűretlen tiszta rajzvászonnal |

---

## 4. Alkalmazáshéj és Navigáció (`AppLayout.tsx`)

### 4.1 Telefon (<640px)
- **Lebegő folyékony üveg kapszula tab bar:**
  - 12px távolság az aljától és 12px oldalsó margók (`fixed bottom-3 left-3 right-3`).
  - Automatikus `safe-area-inset-bottom` kezelés.
  - 5 fő célállomás: Ma, Terv, Étrend, Regeneráció, Profil.
  - Csúszó belső üveglencse (`glass-lens`) a kiválasztott elem mögött.
- **Top Bar:** Csendes üvegsáv, görgetéskor finoman összehúzódó címmel és kontextuális gyorsművelet (`+`) gombbal.

### 4.2 Laptop & Desktop (>=1024px)
- **Bal oldali összecsukható üvegoldalsáv:**
  - Finomított „APEX” logó akcentus vonallal.
  - Váltás ikon-sín (80px) és teljes oldalsáv (256px) között; állapot mentése `localStorage`-ba (`apex_sidebar_collapsed`).
- **Felső üvegsáv:**
  - Gyorskereső gomb (`⌘K`).
  - Szerepkör választó, nyelvváltó, témaváltó, billentyűzet súgó (`?`), értesítések.
- **Központosított tartalom:** Maximum 1120px széles (nagyméretű monitorokon 1280px), oldalsó paddingekkel.
- **Gyorsbillentyűk:**
  - `⌘K`: Keresés
  - `N`: Új edzésnapló / edzés
  - `G` majd `M`: Ma képernyő
  - `G` majd `T`: Edzésterv
  - `G` majd `E`: Étrend
  - `G` majd `R`: Regeneráció
  - `G` majd `S`: Beállítások
  - `?`: Gyorsbillentyűk súgó modal

---

## 5. Reszponzivitás és Tesztelési Mátrix (`e2e/responsiveHarness.spec.ts`)

A Playwright tesztmátrix automatikusan ellenőrzi a felületet **11 nézetméretben**, sötét és világos témában:
1. **Telefonok:** 320x568 (SE 1), 360x780 (Android), 375x667 (SE 2/3), 390x844 (iPhone 14), 412x915 (Pixel 7), 430x932 (iPhone Pro Max).
2. **Tabletek:** 768x1024 (iPad vert), 820x1180 (iPad Air), 1024x768 (iPad horiz).
3. **Laptopok:** 1280x800 (13"), 1440x900 (14"), 1920x1080 (FHD).

### Automatizált Ellenőrzések:
- **0 vízszintes görgetés:** `scrollWidth <= innerWidth`.
- **Túlcsordulás detektor:** Elemek bounding box vizsgálata a szülőkhöz képest.
- **Érintési célméret:** Mobilon legalább 44x44px hatásos terület.
- **Vizuális pillanatképek:** `test-results/screenshots/` mappába mentve (gitignored).

---

## 6. Három Pontszám Gyűrű (Three Score Rings) — Ma Képernyő

A Ma képernyő vezérlőkártyája (Hero Card) három harmonikus gyűrű köré épül:
1. **Regeneráció (Recovery):** 0–100 skála, színkódolt zónákkal (zöld $\ge 67$, borostyán 34–66, vörös $< 34$), megbízhatósági százalékkal és a 3 legfontosabb befolyásoló tényezővel.
2. **Terhelés (Strain):** 0–100 skála exponenciális telítődési görbével ($\text{Strain} = 100 \times (1 - \exp(-\text{Load} / k))$). A gyűrűn áttetsző célsáv ív jelenik meg a napi terv vagy a regenerációs ajánlás alapján.
3. **Alvás (Sleep):** 0–100 alvásteljesítmény, dinamikus alvásszükséglet számítással (alap + terhelési többlet + 7 napos adósságtörlesztés - szundikálások).

### Stabilitási Alapszabályok (React #185 védelem):
- **SVG / CSS animációk:** A gyűrűk kizárólag natív SVG `stroke-dashoffset` és CSS `transition` réteget használnak; nincs képkockánkénti (`requestAnimationFrame` vagy `setInterval`) React `setState` frissítés.
- **Memoizált szelektorok:** Minden származtatott érték tiszta függvényekből (`src/shared/lib/scores/`) és memoizált szelektorokból származik.
- **Reszponzivitás:** Flexibilis konténer és `clamp()` méretezés a 320px-es telefontól a 4K-s monitorig vízszintes túlcsordulás nélkül.

