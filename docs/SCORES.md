# Apex Pontszámítási Rendszer (Scores Engine)

> **Dokumentáció sporttudósok, edzők és fejlesztők számára**  
> Konfiguráció forrása: [`src/shared/lib/scores/config.ts`](file:///Users/zsombi/Downloads/oly/src/shared/lib/scores/config.ts)  
> Implementáció: [`src/shared/lib/scores/`](file:///Users/zsombi/Downloads/oly/src/shared/lib/scores/)  
> **Fontos jogi és etikai nyilatkozat:** Az Apex mutatói és ajánlásai nem minősülnek orvostechnikai eszköznek vagy orvosi diagnózisnak. Céljuk kizárólag a sportolói terhelésmenedzsment, a regeneráció támogatása és az élettani adaptáció optimalizálása.

---

## 1. Áttekintés

Az Apex három egymással szoros kölcsönhatásban lévő napi pontszámra épül:
1. **Regeneráció (Recovery)**: A szervezet autonóm idegrendszeri és szubjektív kipihentsége (0–100 skála, zöld/sárga/piros sávok).
2. **Terhelés (Strain)**: A nap során végzett összes edzésmunka és aktivitás kumulatív élettani terhelése (0–100 csökkenő hozadékú görbe), amelyhez egy célzott **Célsáv** tartozik.
3. **Alvás (Sleep)**: Az elmúlt éjszaka alvásmennyisége és minősége a személyre szabott napi alvásigényhez viszonyítva (0–100 skála), kiegészítve esti lefekvési ajánlással.

```
                    ┌───────────────────────────┐
                    │       Regeneráció         │
                    │   (0-100%, zöld/sárga/piros) │
                    └─────────────┬─────────────┘
                                  │
                  Meghatározza az ajánlott célsávot
                  (ha nincs előre beírt edzésterv)
                                  ▼
┌───────────────────────────┐           ┌───────────────────────────┐
│         Terhelés          │           │           Alvás           │
│   (0-100, progresszív)    │           │ (0-100%, igény vs valóság)│
│       [ Célsáv ]          │           │     [ Ajánlott lefekvés ] │
└─────────────┬─────────────┘           └─────────────▲─────────────┘
              │                                       │
              └────── Növeli a ma esti alvásigényt ───┘
```

---

## 2. Regeneráció (Recovery)

- **Skála:** 0 – 100 pont (egész szám).
- **Megjelenési sávok:**
  - **Zöld (Optimális adaptáció):** $\ge 67$ pont. A paraszimpatikus tónus és a szubjektív frissesség magas; a szervezet ideális állapotban van a minőségi kulcsedzéshez.
  - **Sárga (Közepes terhelhetőség):** 34 – 66 pont. Mérsékelt autonóm fáradtság; szubmaximális aerob vagy technikai terhelés javasolt.
  - **Piros (Regeneráció fókusz):** $< 34$ pont. Jelentős fiziológiai vagy izomzati kimerültség; az aktív pihenés, nyújtás és alvás élvez prioritást.
- **Bemenő adatok:**
  - *Objektív (biometrikus):* Nyugalmi pulzusszám (RHR) és pulzusvariabilitás (HRV rMSSD) eltérése a 28 napos egyéni bázisátlagtól (Z-score normalizáció).
  - *Szubjektív (Hooper-Mackinnon skála):* Alvásminőség, izomláz (Soreness), fáradtság (Fatigue), stressz és mentális motiváció.
- **Kettős útvonal:** Eszköz nélkül automatikusan tiszta manuális úton számol, okosórával hibrid vagy biometrikus úton.

---

## 3. Terhelés (Strain) és Célsáv

### 3.1 A terhelési görbe (Strain Formula)
A terhelés nem lineáris, hanem egy **csökkenő határhasznú (diminishing returns)** telítési görbét követ az egyéni kapacitáshoz képest:

$$\text{Strain} = 100 \times \left(1 - \exp\left(-\frac{\text{Napi Összes Terhelés}}{k}\right)\right)$$

Ahol $k$ a sportoló kapacitási együtthatója.

### 3.2 Kapacitási Együttható ($k$)
A $k$ értéke biztosítja, hogy ugyanaz az edzés (pl. 80 TSS) egy hobbi sportolónak jóval nagyobb megterhelést jelentsen (magasabb pont), míg egy élvonalbeli versenyzőnek mérsékeltebbet:

| Szint | Alapértelmezett $k$ | Napi 25 TSS (könnyű) | Napi 55 TSS (normál) | Napi 150 TSS (nagyon nehéz) |
|---|---|---|---|---|
| **Hobby** | 70 | 30 pont | 54 pont | 88 pont |
| **Amatőr versenyző** | 100 | 22 pont | 42 pont | 78 pont |
| **Országos keret** | 135 | 17 pont | 34 pont | 67 pont |
| **Válogatott keret** | 160 | 14 pont | 29 pont | 61 pont |
| **Olimpikon** | 185 | 13 pont | 26 pont | 56 pont |

Amennyiben az edzésnaplóban elérhető a krónikus terhelési szint (CTL / Fitness), a $k$ dinamikusan alkalmazkodik a sportoló pillanatnyi formájához:
$$k = \max(50, \, k_{\text{szint}} \times 0.4 + 1.6 \times \text{CTL} \times 0.6)$$

### 3.3 A Célsáv (Target Range) Prioritási Sorrendje
A célsáv a Terhelési körön egy lágy áttetsző ívként jelenik meg:
1. **Elsődleges prioritás – Napi edzésterv (`plan`):**
   - Ha a naptárban vagy az edző által kiírt edzés szerepel mára, annak tervezett terheléséből kiszámítjuk a várható pontszámot, és $\pm 8$ pontos sávot határozunk meg köré:
     $$[\text{Várható Pont} - 8, \; \text{Várható Pont} + 8]$$
2. **Másodlagos prioritás – Regeneráció alapú ajánlás (`recovery`):**
   - Ha nincs edzésterv, a mai Regenerációs sáv határozza meg a célsávot:
     - **Zöld:** $55 - 80$ pont (produktív zóna).
     - **Sárga:** $35 - 60$ pont (mérsékelt zóna).
     - **Piros:** $10 - 35$ pont (regenerációs zóna).
   - **Szezonfázis módosítás:** Versenyhéten és formábahozáskor (taper/peak) $-12 \dots -15$ ponttal csökken, építő blokkban $+5$ ponttal emelkedik.
   - **ACWR (Akut-krónikus arány) védelem:** Ha a heti terhelési arány túllépi az 1.3-at, a felső határ mérséklődik; 1.5 felett sérülésmegelőző regenerációs sávra vált.
3. **Kíméletes figyelmeztetés:** Ha az edzői terv túllépi a regeneráció által javasolt szintet, az app diszkrét megjegyzést mutat (*"A mai terv erősebb, mint amit a regenerációd javasol"*), de soha nem bírálja felül az edzőt és nem tiltja le a munkát.

---

## 4. Alvás (Sleep) és Alvásigény

### 4.1 Napi Alvásigény Kiszámítása
A ma éjszakai alvásigény nem fix 8 óra, hanem négy tényező összege:
$$\text{Alvásigény} = \text{Személyes Bázis} + \text{Tegnapi Terhelési Többlet} + \text{Alvásadósság Törlesztés} - \text{Nappali Szundikálás}$$

1. **Személyes bázis:** Alapértelmezetten 8.0 óra (480 perc), a Profilban szerkeszthető.
2. **Tegnapi terhelési többlet:** A tegnapi Strain minden pontja után 0.6 perc extra alvás szükséges (maximum 60 perc többlet).
3. **7 napos alvásadósság törlesztése:** Az elmúlt 7 nap felhalmozott alváshiányának 25%-át törleszti naponta, maximum napi 45 percet hozzáadva.
4. **Nappali szundi:** A napközben rögzített alvás percről percre csökkenti az esti alvásigényt.
5. **Egészséges határok:** Az alvásigény minimum 6.0 óra (360 perc) és maximum 10.0 óra (600 perc).

### 4.2 Alvási Pontszám (0–100)
- **Eszközzel (okosóra / alvásszenzor):**
  - Alvásmennyiség az igényhez képest: 40% súly.
  - Alváshatékonyság (ágyban töltött idő vs tényleges alvás): 25% súly.
  - Alvási ritmus konzisztenciája (lefekvés/ébredés szórása az elmúlt 7 napban): 20% súly.
  - Regeneráló alvásfázisok aránya (Mélyalvás + REM $\ge 40\%$): 15% súly.
- **Kézi rögzítéssel (Manuális mód):**
  - Alvásmennyiség az igényhez képest: 50% súly.
  - Szubjektív minőségi osztályzat (1–5 Hooper): 30% súly.
  - Konzisztencia: 20% súly.

### 4.3 Esti Lefekvési Időpont Javaslat (Bedtime Recommendation)
A célzott ébredési időből (alapértelmezetten 07:00, vagy egyéni beállítás) levonjuk a kiszámított teljes alvásigényt és egy 15 perces elalvási latenciát:
$$\text{Javasolt Lefekvés} = \text{Cél Ébredés} - \text{Alvásigény} - 15 \text{ perc}$$
*Példa:* 07:00 ébredéshez 8 óra 15 perc igény esetén a javaslat: **22:30**.

---

## 5. Napi Ritmus Állapotgép (Daily Rhythm)

A Ma képernyő a nap 24 órájában dinamikusan alkalmazkodik az élettani állapothoz:

1. **Reggel check-in előtt (`morning_pending`):**
   - Az alvás gyűrű ki van töltve a tegnap éjszakai adatokból.
   - A regeneráció gyűrű „Függőben” állapotban pulzál.
   - Elsődleges művelet: Nagy méretű „Reggeli check-in” gomb.
2. **Reggel check-in után (`morning_ready`):**
   - A regeneráció gyűrű animálva kitöltődik.
   - A terhelési célsáv élesedik; megjelenik a mai edzésterv kártyája.
3. **Napközben (`daytime_training`):**
   - A terhelési gyűrű edzésenként progresszíven telítődik.
   - Kijelzi a célsávig hátralévő pontokat (*"még kb. 18 pont a célsávig"*).
4. **Edzés után (`post_training`):**
   - Megjelenik az azonnali regenerációs javaslatkártya (nyújtás, +500 ml víz, fehérjebevitel).
5. **Este 20:00 után (`evening_winddown`):**
   - Lefekvési ajánlás kártya és alvás-előkészítő fókuszmondat.

### Pihenőnap = Siker
A rendszer soha nem bünteti a pihenőnapokat és nem követeli meg a „gyűrűk bezárását”. Ha a célsáv regenerációs sávban van vagy a regeneráció piros, a célsávban maradás **100%-os sikernek** számít (*"Sikeres regenerációs nap a célsávban"*). Törékeny sorozatok (streaks) helyett az elmúlt 7 vagy 30 nap célsávban töltött napjainak arányát mutatjuk.

---

## 6. Heti Kör ("Weekly Card")

Vasárnaponként a Ma oldalon (és folyamatosan az Elemzések menüben) elérhető az elmúlt hét összefoglalója:
- 7 napos átlagos regeneráció, összetett terhelés és alváshatékonyság.
- Célsávban töltött napok száma (pl. 6 / 7 nap).
- A hét legjobb és legnehezebb napja.
- Egy mondatos sporttudományos összefoglaló.
- 1-kattintásos képmegosztás a hivatalos Apex márkajelzéssel ellátott kártyaként.
