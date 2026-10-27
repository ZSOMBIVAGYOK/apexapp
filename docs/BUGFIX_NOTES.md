# Gyökérok Elemzés és Hibajavítási Terv (BUGFIX_NOTES.md)

Ez a dokumentum részletesen, érthető nyelvezettel összefoglalja a bejelentett hibák pontos technikai gyökérokait, a kódbázis auditjának eredményét és a javítási lépéseket.

---

## 1. Hiba: Az onboarding kérdőív minden belépéskor újra megjelenik (BUG 1)

### Pontos kiváltó ok:
1. **Firestore `undefined` mező tiltás és elnyelt hiba:**
   Az onboarding zárásakor (`onboardingPage.tsx` és `onboardingMachine.ts`) a felület egy profilobjektumot állít össze a mentéshez (`onboardingDataToUserProfile(data)`). Ha a felhasználó egy opcionális mezőt (pl. születési dátum, célverseny, magasság, testsúly, célok) nem tölt ki, annak értéke `undefined` marad.
   A Firebase Firestore Web SDK **kifejezetten tiltja** az `undefined` értékű mezőket, és `Unsupported field value: undefined` hibát dob `updateDoc` vagy `setDoc` hívásakor.
2. **Csendben elnyelt kivétel (`authService.ts`):**
   A `saveUserProfileToFirestore` függvényben egy általános `catch { // Allow optimistic client updates if offline }` blokk volt, amely a Firestore SDK hibáját csendben elnyelte.
3. **Memóriabeli állapot vs. Adatbázis aszinkronitás:**
   A Zustand memóriatárolóban a profil frissült (`onboardingCompleted: true`), így az aktuális munkamenetben úgy tűnt, mintha a mentés sikerült volna, és átirányított a főoldalra.
   Azonban a **Firestore-ba soha nem íródott be** az `onboardingCompleted: true` érték (a felhasználó Firestore dokumentumában `onboardingCompleted: false` maradt).
4. **Újraindulási ciklus:**
   Amikor a felhasználó frissítette az oldalt vagy újra bejelentkezett, az `initAuthListener` lekérte a Firestore-ból a valós dokumentumot, ahol az `onboardingCompleted` még mindig `false` volt. A `ProtectedRoute` ezt látva azonnal visszairányította a felhasználót a `/onboarding` útvonalra.

### Javítás:
- **`sanitizeForFirestore` segédfüggvény:** Rekurzívan eltávolítja vagy `null`-ra cseréli az `undefined` értékeket mentés előtt, így a Firestore soha nem dob hibát.
- **Lépésenkénti mentés (Progressive save):** Minden onboarding lépés válaszai azonnal elmentődnek Firestore-ba és megerősítésre kerülnek (nem csak a végén).
- **Hiba visszajelzés:** A mentési hibák nincsenek elnyelve; sikertelen mentés esetén egyértelmű magyar hibaüzenet és "Újrapróbálkozás" gomb jelenik meg.
- **Valós idejű szinkronizáció:** Firestore `onSnapshot` figyelő gondoskodik róla, hogy a profil állapota azonnal frissüljön több lap vagy eszköz között.
- **Megbízható kapu (App Start Gating):** Az alkalmazás betöltőképernyőt mutat, amíg mind az Auth, mind a Firestore felhasználói profil be nem töltődik.

---

## 2. Hiba: Felhasználói célverseny helyett "Budapest Maraton" és mintaadatok jelennek meg (BUG 2)

### Pontos kiváltó ok:
1. **Beégetett alapértelmezések a `TrainingPage.tsx`-ben:**
   A `TrainingPage.tsx` 88–120. soraiban a versenyek állapota a helyi `localStorage`-ból próbált betöltődni. Ha ott nem talált adatot (új felhasználó), egy beégetett tömböt adott vissza:
   - `id: "comp-a"`, `title: "Budapest Maraton"`, `priority: "A"`, `distance: "42.2 km"`
   - `id: "comp-b"`, `title: "Félmaraton Felmérő"`, `priority: "B"`
2. **Beégetett küszöbértékek (Thresholds):**
   A `TrainingPage.tsx` 132–138. soraiban új felhasználóknak nem üres állapot, hanem kamu adatok jelentek meg: `maxHr: 194`, `lthr: 172`, `ftp: 285`, `thresholdPaceSeconds: 255`.
3. **Beégetett visszaszámláló az `InsightsPage.tsx`-ben:**
   Az `InsightsPage.tsx` 774–798. soraiban egy statikus kártya volt: *"Budapest Nemzetközi Triatlon Országos Bajnokság"* fix 78 napos visszaszámlálóval, ahelyett hogy a felhasználó valós célversenyét jelenítette volna meg.
4. **Összeköttetés hiánya:**
   A felhasználó által az onboarding során vagy a Profilban megadott `targetCompetition` és `targetCompetitionDate` mezőket a `TrainingPage` és az `InsightsPage` nem olvasta fel.

### Javítás:
- **Teljesen üres indulás:** Új felhasználó profiljában semmilyen verseny, sport, küszöbérték vagy mintaadat nem jelenik meg.
- **Valós adatok használata:** Ha a felhasználó megadott célversenyt, a rendszer abból hozza létre a kiemelt (A) versenyt a Naptárban, a Profilban és az Insights oldalon.
- **Üres állapotok (Empty States):** Ha nincs megadva célverseny, a felület nem kamu maratont mutat, hanem egy barátságos felhívást: *"Még nem adtál meg célversenyt. Kattints ide a hozzáadáshoz!"*.
- **Mintaadatok kiirtása:** Minden hardcoded "Budapest", "Maraton", kamu edzői üzenet és kamu laktátérték el lett távolítva az éles kódútvonalakról.

---

## 3. Hiba: Az Étrend (Nutrition) oldal azonnal összeomlik: "undefined is not an object (evaluating 'P.time')" (BUG 3)

### Pontos kiváltó ok:
1. **Kulcs-eltérés a `NutritionPage.tsx`-ben:**
   A `NutritionPage.tsx` 112–120. soraiban az alapértelmezett étkezések szótára a következő kulcsokat tartalmazza:
   - `breakfast`, `morning_snack`, `during_training`, `lunch`, `afternoon_snack`, `dinner`, `evening_snack`
   Azonban a 854. sorban a napi étkezések renderelésekor a kód a következő listát járja be:
   - `["breakfast", "during_training", "lunch", "snack", "dinner"]`
2. **A végzetes sor:**
   A ciklusban a `"snack"` típushoz tartozó étkezés lekérése:
   ```ts
   const meal = meals[mType]; // meals["snack"] -> undefined!
   ```
   Majd a 872. sorban:
   ```tsx
   <span className="text-12 text-text-tertiary">
     {meal.time} {/* undefined.time -> TypeError: Cannot read property 'time' of undefined */}
   </span>
   ```
3. **Minifikált hibaüzenet a produkciós kódban:**
   A Vite produkciós fordítása során a `meal` változó a `P` egybetűs névre minifikálódott. Így a böngésző pontosan ezt a hibát dobta:
   `Unexpected Application Error! undefined is not an object (evaluating 'P.time')`.
4. **Hiányzó `Optional Chaining` és Normalizálás:**
   Ugyanez a hiba bekövetkezhetett a `meal.totalCalories` elérésekor is, illetve bármikor, ha egy korábbi adatbázis-struktúrából vagy üres fiókból egy adott étkezés hiányzott.

### Javítás:
- **Kulcsok szinkronizálása és dinamikus struktúra:** A renderelés a létező és konfigurált étkezési struktúrát használja.
- **Biztonságos mezőelérés (`Optional Chaining`):** `{meal?.time ?? "—"}` és `{meal?.totalCalories ?? 0}` minden komponensben.
- **Adatnormalizáló réteg (`normalizeNutritionDay`):** Bármilyen adat érkezik Firestore-ból vagy gyorsítótárból (régi formátum, hiányzó mezők, null), a felület garantáltan egy teljes, érvényes struktúrát kap.
- **React Error Boundary védelem:** Alkalmazás szinten és oldalankénti hibahatár, így egy esetleges hibás komponens sem dönti be a teljes alkalmazást.

---

## 4. Átfogó Kód-Audit Összefoglaló

| Modul | Vizsgált terület | Talált kockázat | Megoldás |
| :--- | :--- | :--- | :--- |
| **Auth / Onboarding** | Mentés folyamata | Swallowed errors, undefined Firestore mezők | `sanitizeForFirestore`, awaited Firestore set/update, progressive save |
| **Auth Gating** | Útvonalvédelem | Korai döntés a Firestore profil betöltése előtt | Betöltőképernyő amíg mindkét forrás kész |
| **TrainingPage** | Versenyek & Célok | Hardcoded "Budapest Maraton" és küszöbértékek | Üres kezdőállapot, valós profiladatok bekötése |
| **InsightsPage** | A-Verseny visszaszámláló | Hardcoded "Budapest Nemzetközi Triatlon OB" | Valós célverseny vagy üres felhívás kártya |
| **NutritionPage** | Étkezések listázása | `meal.time` hiba `meals["snack"] === undefined` miatt | `normalizeNutritionDay`, `meal?.time`, dinamikus étkezések |
| **Hibakezelés** | App összeomlás | Nincs Error Boundary, fehér képernyő | Magyar nyelvű ErrorBoundary "Újratöltés" gombbal |
| **Adattisztítás** | Valós Firebase projekt | Régi tesztadatok az adatbázisban | Törlési terv a felhasználó jóváhagyásával |
