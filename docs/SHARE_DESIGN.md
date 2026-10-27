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
