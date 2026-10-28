# Apex Share Subsystem Design Specification

Ez a dokumentum az Apex edzésmegosztási rendszerének vizuális és technikai specifikációját tartalmazza a képi (matrica és fotó) és a videós (élő telemetria HUD) módokhoz.

---

## 1. Tipográfia és Tabuláris Számok

### Betűtípus-készlet (Font Stack)
```css
font-family: Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", Roboto, sans-serif;
```

### Jitter-mentes, Tabuláris Számformázás
A videó képkockánkénti renderelésekor a számok nem ugrálhatnak (jitter). Ennek elkerülésére a rendszer szigorú tabuláris formázást alkalmaz:
- **Sebesség**: `XX.X km/h` vagy `XX.X mph` (mindig 1 tizedesjegy).
- **Tempó**: `MM:SS /km` (vezető nullákkal ellátott percek és másodpercek).
- **Pulzus**: `XXX bpm` (egész szám kerekítve).
- **Távolság**: `XX.XX km` (mindig 2 tizedesjegy).
- **Szintemelkedés**: `XXXX m` (egész szám).
- **Lejtő/Emelkedő**: `+X.X%` vagy `-X.X%` (mindig előjellel és 1 tizedessel).
- **Eltelt idő**: `HH:MM:SS` vagy `MM:SS` (mindig kétjegyű tagok).

---

## 2. Biztonsági Zónák (Safe Zones)

A közösségi médiás felületeken (Instagram Stories, Reels, TikTok) a rendszer felületei és gombjai kitakarhatják a videó széleit. A HUD elemek ezért szigorúan a biztonsági zónákon belül helyezkednek el:

- **9:16 (Függőleges Stories / Reels)**:
  - Felső margó (Top): **250 px** (~15%) — felhasználói név, profilkép, történet-sávok védelme.
  - Alsó margó (Bottom): **340 px** (~20%) — üzenetküldő mező, leírás, zenei címke védelme.
  - Oldalsó margók (Left/Right): **70 px** (~12%) — lájk, komment és megosztás gombok védelme.
- **Szerkesztési segédvonalak**: A szerkesztőben a felhasználó bekapcsolhatja az Instagram/TikTok UI fedési vonalait a pontos pozicionáláshoz.

---

## 3. Színpaletta és Kontraszt (Scrim)

### Pulzuszónák (5-Zone Model)
- **Z1 Regeneráció (< 60% maxHr)**: `#60A5FA` (Lágy kék)
- **Z2 Állóképesség (60-70% maxHr)**: `#34D399` (Smaragdzöld)
- **Z3 Tempó (70-80% maxHr)**: `#FACC15` (Meleg sárga)
- **Z4 Küszöb (80-90% maxHr)**: `#FB923C` (Narancssárga)
- **Z5 Maximális / Anaerob (90%+ maxHr)**: `#EF4444` (Élénkpiros)

### Háttér Sötétítés (Scrim)
Világos, havas vagy égboltot ábrázoló felvételeknél a HUD olvashatóságát finom függőleges színátmenetes sötétítés (scrim) biztosítja:
- Állítható intenzitás: 0% és 70% között (alapértelmezett: 30-35%).
- Nem tompítja el a videó felső részét, csak a telemetriai blokkok mögött képez lágy kontrasztot.

---

## 4. Videó HUD Elrendezési Sablonok

1. **Alsó sáv (Lower Third)**:
   - Modern, lekerekített horizontális üveghatású sáv a képernyő alján.
   - Bal oldalon nagy méretű hero metrika (sebesség vagy tempó), középen pulzuszseton színkódolt zónaponttal, távolság és idő.
   - Ideális kerékpáros, futó és túrázó tájképi videókhoz.

2. **Sarok (Corner Cluster)**:
   - Kompakt HUD a sarokban rögzítve.
   - A képernyő közepe 100%-ban szabadon marad a sportoló mozgásához.

3. **Minimál (Minimal Hero Stat)**:
   - Extra nagy, prémium tipográfiájú sebesség vagy pulzusszám finom árnyékkal.
   - Nincsenek nehéz kártyák, tiszta filmes hatás.

4. **Verseny (Race / Action Cam Dashboard)**:
   - Telemetriás műszerfal fordulatszámmérő/sebességmérő ívvel.
   - Mini GPS nyomvonal mozgó, pulzáló pozíciójelző ponttal.
   - Szintmetszet élő magassági mutatóval.

---

## 5. Időbeli Animáció és Kártyák

- **Felvezető Címkártya (Intro Card, 1.5 mp)**:
  - 0.0 - 0.3s: Lágy beúszás / fade in.
  - 0.3 - 1.2s: Megjeleníti a sportág ikont, edzés címet, sportoló nevét és a dátumot.
  - 1.2 - 1.5s: Finom áttűnés a videóba (fade out).
- **Záró Összegző Kártya (Outro Summary Card, 2.0 mp)**:
  - Az utolsó 2 másodpercben lágyan megjelenő összegző kártya: teljes távolság, teljes idő, átlagsebesség/átlagtempó, átlagpulzus és szintemelkedés.
- **Mozgó GPS Pont**:
  - A mini útvonalon a pont a videó aktuális idejének és az edzés eltelt idejének szinkronja alapján folyamatosan halad, külső zöld fénygyűrűvel ellátva.

---

## 6. Teljesítmény és Adatvédelem

- **Kizárólag Helyi Feldolgozás (Zero-Upload)**:
  - A videó fájl soha nem töltődik fel semmilyen szerverre. Minden dekódolás és exportálás a készüléken fut (`OffscreenCanvas` és `MediaRecorder` segítségével).
- **Adatvédelem (Privacy Guard)**:
  - A pulzusadat egészségügyi adat: a videón **alapértelmezetten ki van kapcsolva**, csak explicit felhasználói engedélyezésre jelenik meg.
  - A GPS útvonal kezdő és befejező 200 métere elrejthető az otthon és a cél védelmében.
- **Képernyő ébren tartás (Screen Wake Lock API)**:
  - Az exportálás közben a böngésző aktívan tartja a képernyőt, megelőzve az operációs rendszer elalvását.
- **Hardveres Korlátok**:
  - Maximális videó fájlméret: 500 MB.
  - Maximális exportálási kliphossz: 120 másodperc (az eszközök memóriájának védelméért).

---

## 7. Branding Lockup: APEX Név az Adatblokk Felett (Mindig Jelen van)

### Alapelv: Nem kikapcsolható márkaelem
Az alkalmazás neve („APEX”) az edzésmegosztási képek és videók szerves, prémium része. A korábbi ki-bekapcsoló gomb minden felületről (matrica, fotó, videó) el lett távolítva, és a kód nem tartalmaz olyan ágat, amely elrejthetné.

### Vizuális Specifikáció és Hierarchia
A márkanév nem különálló vízjelként úszik a képernyő alján, hanem közvetlenül az adatblokk **FELETT**, azzal egyetlen zárt vizuális csoportot (lockup) alkotva:
- **Tipográfia**: `800` (extra bold), széles betűköz (`letterSpacing: 6px`, ~0.25em) a prémium, letisztult hatásért.
- **Arányok**: Kisméretű az adatblokkhoz képest (a blokk szélességének ~25-30%-a, 22px méret 1080px bázison).
- **Akcentuscsík**: Közvetlenül a szóvédjegy alatt egy rövid, vékony színes vonal helyezkedik el:
  - Szélesség: `28px`
  - Magasság: `2px`
  - Távolság a szövegtől: `7px`
  - Távolság a lejjebb lévő adatblokktól: `16px`
  - Szín: Élénk sportos cián (`#06B6D4`) vagy a téma szerinti kiemelő szín.
- **Kontraszt és Árnyék**: Finom árnyék (`shadowBlur: 8px`, `shadowOffsetY: 2px`) és a háttér alapján automatikus világos/sötét variáns biztosítja az olvashatóságot átlátszó matricán, sötét és világos fotókon egyaránt.

### Igazítás Elrendezésenként
| Elrendezés | Lockup Igazítása | Pozíció |
|---|---|---|
| **Kompakt** | Középre (`center`) | Közvetlenül a sport címblokk felett |
| **Minimál** | Középre (`center`) | A hero óriásszám felett |
| **Útvonal** | Középre (`center`) | A GPS útvonal és a címblokk felett |
| **Statisztika** | Balra (`left`) | A 2 oszlopos statisztikarács felett |
| **Videó: Alsó sáv** | Balra (`left`) | Közvetlenül a horizontális sáv felett a safe zone-ban |
| **Videó: Sarok** | Balra (`left`) | Közvetlenül a sarokblokk felett |
| **Videó: Minimál** | Középre (`center`) | A nagy élő telemetriai szám felett |
| **Videó: Verseny** | Balra (`left`) | A telemetriás műszerfal kártya felett |
| **Videó: Felvezető (Intro)** | Középre (`center`) | A címkártya felső részén |
| **Videó: Záró (Outro)** | Középre (`center`) | Az összegző kártya felső részén |

### Együtt Mozgás és Szűk Kivágás (Tight Crop)
- Mivel a lockup a layout renderelési fáján belül a tartalom legfelső eleme, a felhasználó által végzett eltoláskor (`offsetY`), nagyításkor vagy mozgatáskor az adatblokkal együtt, tökéletes szinkronban mozog.
- Szűkre vágott matrica (`tightCrop`) exportálásakor a kalkulált határoló doboz (bounding box) a lockuptól indul, így a levágott átlátszó PNG automatikusan tartalmazza az APEX nevet és akcentuscsíkot is.

### Központi Konfiguráció: `branding.ts`
Minden paraméter egyetlen fájlban konfigurálható (`src/shared/lib/share/branding.ts`): a szöveg, betűméret, letter-spacing, akcentuscsík tulajdonságai, layout-igazítások, valamint a jövőbeli logó helye (`logoUrl`, `logoWidth`, `logoHeight`). Ha egyedi grafikus logó érkezik, kizárólag ennek a fájlnak a módosításával azonnal megjelenik minden sablonon.

