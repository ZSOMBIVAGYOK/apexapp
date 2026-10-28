# Adatbiztonság és Adatvesztés-Megelőzési Jelentés (Data Safety Report)

## 1. Gyökérok-elemzés (Miért tűntek el az edzések kijelentkezés után?)

Az audit és reprodukciós vizsgálatok feltárták, hogy az edzések és egyéb adatok eltűnését **öt egymásra épülő hiba** okozta a rendszerben:

### (a) Érvénytelen `undefined` értékek a Firestore mentésben
A kézi edzésrögzítéskor (`ManualSessionModal.tsx`) a generált adatobjektum több opcionális mezőt `undefined` értékkel adott át (pl. `fileRef`, `fileName`, `distanceMeters`, `avgHeartRate`, `timeSeries`).
A Firebase Firestore Web SDK `setDoc()` és `updateDoc()` függvényei **szigorúan tiltják az `undefined` értékeket**, és futásidejű kivételt dobnak:
`FirebaseError: Function setDoc() called with invalid data. Unsupported field value: undefined`.

### (b) Csendes hibanyelés és az offline sor elakadása
A mentési rétegben (`persistTrainingSession`) a `try { await setDoc(...) } catch { enqueueMutation(...) }` blokk elnyelte a hibát, és a hibás adatobjektumot betette a helyi `localStorage` várakozási sorba (`apex_offline_mutation_queue`).
Amikor a háttérszinkron (`flushOfflineQueue`) megpróbálta újra feltölteni az adatot, ott sem történt adattisztítás, így a Firestore újra és újra elutasította a mentést. A felhasználó felé ez úgy jelent meg, mintha minden rendben lenne, miközben az adat sosem jutott el a Firestore szerverre.

### (c) Végzetes kijelentkezési törlés (`clearUserLocalData`)
A `userStorage.ts` fájlban a `clearUserLocalData(userId)` függvényben kritikus kódhiba volt:
```ts
if (userId) {
  if (key.includes(userId) || key.startsWith("apex_")) {
    keysToRemove.push(key);
  }
}
```
Mivel a rendszerben **minden** helyi kulcs `apex_` előtaggal kezdődött (`apex_sessions_*`, `apex_planned_workouts_*`, `apex_offline_mutation_queue`, `apex_daily_*`), a kijelentkezéskor a kód nemcsak a felhasználó munkamenetét zárta le, hanem **teljesen letörölte a helyi edzésgyorsítótárat és a fel nem töltött várakozási sort is**!

### (d) Hiányzó Firestore lekérdezés a felületen
Az edzésoldal (`TrainingPage.tsx`) és a napi check-in oldal (`CheckinPage.tsx`) induláskor **kizárólag a helyi `localStorage`-ból olvasott adatot**! A felület soha meg sem kísérelte lekérdezni a Firestore `athletes/{athleteId}/sessions` vagy `athletes/{athleteId}/plannedWorkouts` kollekcióját. Így egy újbóli bejelentkezéskor vagy új böngészőben a lista teljesen üres maradt, még akkor is, ha a felhőben létezett volna adat.

### (e) Teljes adatkör vizsgálata (Audit)
Megvizsgáltuk az összes többi adattípust is:
1. **Edzések (Sessions):** Javítva a centralizált repository-val, szerveroldali szinkronnal és adattisztítással.
2. **Tervezett edzések (Planned Workouts):** Korábban csak `localStorage`-ban tárolódtak, most valós Firestore subcollection (`athletes/{id}/plannedWorkouts`).
3. **Célversenyek (Competitions):** Korábban csak `localStorage`-ban tárolódtak, most `athletes/{id}/competitions`.
4. **Napi Check-in (Days):** Tisztítva, Firestore olvasással és offline fallback-kel.
5. **Étrend és Étkezések (NutritionDays):** Korábban csak helyi kulcsban tárolódott, most Firestore `nutritionDays`.
6. **Eszközök (Equipment), Rekordok (Records), Gyakorlatok (Exercises), Regeneráció (Recovery):** Tisztítva az `undefined` értékektől, soft delete és szinkronizációs védelemmel ellátva.

---

## 2. Biztonsági architektúra és bevezetett védelmi hálók

### 1. Rekurzív adattisztítás (`sanitizeForFirestore`)
Minden Firestore írás előtt egy rekurzív szűrő eltávolítja az összes `undefined` kulcsot, a dátumokat ISO szöveggé alakítja, így a `setDoc` és `updateDoc` műveletek soha nem dobnak hibát strukturális okokból.

### 2. Valódi szerveroldali mentési visszaigazolás (Outbox & Save Confirmation)
- A felület nem írja ki, hogy "Mentve", amíg a Firestore szerver vissza nem igazolta a tranzakciót (`waitForPendingWrites` / szerver ack).
- Amíg a mentés folyamatban van, "Szinkronizálás..." jelenik meg.
- Hálózati hiba esetén a felületen jól látható hibaállapot jelenik meg "Újrapróbálás" (Retry) gombbal. Csendes hibanyelés nincs!

### 3. Biztonságos kijelentkezés (Logout Safety)
- A kijelentkezés gomb megnyomásakor a rendszer ellenőrzi a szinkronizálatlan adatokat és a függőben lévő írásokat (`waitForPendingWrites`).
- Ha van fel nem töltött adat, felugrik egy figyelmeztetés: *"Van még fel nem töltött adatod. Várj, amíg szinkronizálódik!"*, és gombot kínál a szinkronizálásra. Csak kifejezett felhasználói megerősítésre engedélyezett a kényszerített kilépés.
- A `clearUserLocalData` függvény kizárólag a bejelentkezett felhasználóhoz tartozó kulcsokat takarítja, a függőben lévő kérések sorát és a biztonsági mentéseket SOHA nem törli.

### 4. Központi Repository réteg (Central Data Layer)
Minden modul típusbiztos repository-n keresztül kommunikál (`sessionRepository`, `plannedWorkoutRepository`, `checkinRepository`, `nutritionRepository`, `competitionRepository`):
- Induláskor lekéri az adatokat a Firestore-ból.
- Offline állapotban a helyi perzisztens tárból szolgál ki.
- Hiba esetén nem üres listát mutat, hanem világos hibaüzenetet és Újrapróbálás gombot.

### 5. Lomtár és 30 napos verziótörténet (Soft Delete & Revisions)
- A törlés sosem végleges azonnal: a dokumentumok `deletedAt` időbélyeget kapnak.
- A Beállítások menüben elérhető a **Kuka (Lomtár)**, ahonnan az elmúlt 30 napban törölt elemek egyetlen kattintással visszaállíthatóak.
- Edzés módosításakor a rendszer pillanatképet ment az al-kollekcióba (`revisions`), így egy elrontott szerkesztés visszagöngyölíthető.

### 6. Felhasználói adatmentés (In-app "Adataim letöltése")
A Beállítások felületen elérhető az "Adataim letöltése" funkció, amely egyetlen JSON fájlba exportálja az összes edzést, check-in-t, étrendet, felszerelést, rekordot és profilt. A rendszer 30 naponta emlékezteti a sportolót a mentés készítésére.

---

## 3. Felhő mentések, PITR és katasztrófa-helyreállítás (GCP/Firebase Backup Guide)

A béta és éles üzemben a felhasználói adatok teljes biztonságát a Google Cloud felhő-infrastruktúrája garantálja:

### (a) Point-in-Time Recovery (PITR) bekapcsolása
A Firestore PITR funkciója lehetővé teszi, hogy a teljes adatbázist a múlt bármely percére visszaállítsuk az elmúlt 7 napból (véletlen tömeges törlés vagy hibás migráció esetén).
Bekapcsolási parancs Google Cloud CLI-ből:
```bash
gcloud firestore databases update --database="(default)" --enable-pitr --project=zsombor-etrend
```
*Költség:* Minimális (~$0.18 / GB / hónap a változásnaplóra).

### (b) Napi automatizált biztonsági mentés Cloud Storage-ba
Napi ütemezett Firestore export Cloud Functions és Cloud Scheduler segítségével:
```bash
gcloud firestore export gs://zsombor-etrend-backups/firestore-daily --project=zsombor-etrend
```
*Lifecycle szabály:* A Cloud Storage vödörben beállított szabály 30 nap után automatikusan archiválja a régi mentéseket Coldline/Archive osztályba, csökkentve a költségeket.

### (c) Helyreállítási eljárás (Disaster Recovery Runbook)
Ha egy adatbázist vissza kell állítani:
1. Azonosítsuk a visszaállítási időpontot vagy a legutóbbi sikeres export könyvtárát.
2. Futtassuk a visszaállítási parancsot:
```bash
gcloud firestore import gs://zsombor-etrend-backups/firestore-daily/[TIMESTAMP] --project=zsombor-etrend
```
3. A visszaállítás után ellenőrizzük a felhasználói profilokat és edzéseket.

---

## 4. Helyi vészhelyzeti adatmentő rutin (Local Browser Data Recovery Routine)

A rendszerbe beépítettünk egy automatikus helyreállító modult (`recoveryRoutine.ts`), amely minden bejelentkezéskor lefut a böngészőben:
1. Átvizsgálja a `localStorage` területet korábbi árva kulcsok után (`apex_sessions_*`, `apex_planned_workouts_*`, `apex_offline_mutation_queue`).
2. Ha talál olyan mentett edzést vagy check-in-t, amely még nem került fel a Firestore szerverre, automatikusan megtisztítja az `undefined` értékektől, hozzáadja a `schemaVersion: 1` fejlécet, és szinkronizálja a felhőbe.
3. Ez garantálja, hogy a korábbi verzióban a helyi böngészőben rekedt adatok sem vesznek el!

---

## 5. Többeszközös szinkronizáció és éles diagnosztika (Cross-Device Synchronization & Production Diagnosis)

A felhasználó által jelzett hiba: **a laptopon felvitt edzés nem jelent meg a telefonon**, az adatok csak az adott készüléken maradtak meg.
Az éles környezetben (`zsombor-etrend.web.app`) lefolytatott részletes vizsgálat a gyanúsított tényezőkre (a-tól h-ig) az alábbi eredményt hozta:

### Éles vizsgálati eredmények (Production Diagnosis: a-h)

#### (a) App Check kikényszerítés (App Check Enforcement)
- **Eredmény:** *Kizárva mint blokkoló tényező, de felügyelt.*
- Az éles Firestore és Storage hívások közvetlen teszteléssel (`test_firestore_connection.ts`) szerveroldali választ adtak. A felületen mostantól a **Beállítások -> Rendszer & Szinkronizáció** kártya közvetlenül kiírja az App Check állapotát (`Aktív / Elérhető`), így ha a reCAPTCHA vagy domain beállítás elromlana, az azonnal láthatóvá válik hibaüzenet formájában, nem pedig csendes hibaként.

#### (b) Végtelenül függőben lévő írások (Writes Pending Forever)
- **Eredmény:** *Valós másodlagos kockázat volt.*
- Amikor egy Firestore írás megszakadt vagy lassú hálózaton beragadt, a helyi cache azonnal visszajelezte a sikert a felületnek, miközben a háttérben az írás sosem ért célba.
- **Javítás:** A rendszer mostantól szerveroldali visszaigazolást (`recordServerWrite`, `waitForPendingWrites`) vár, és a felső szinkronsávban (`ServerSyncBanner`) azonnal jelzi: *"✓ Szerverről szinkronizálva"* vagy *"Nem sikerült elérni a szervert (helyi gyorsítótárból olvasva)"*. A Beállítások menüben látható a függőben lévő írások száma (`Függőben lévő írások: 0`).

#### (c) Kizárólag gyorsítótárból (cache) olvasott adatok
- **Eredmény:** *FŐ GYÖKÉROK (Major Root Cause).*
- A korábbi architektúrában a telefonon megnyitott oldal egy egyszeri `getDocs()` hívást végzett. Ha az új eszközön a gyorsítótár üres volt és a hálózati kapcsolat lassan vagy hibával épült fel, a kód elnyelte a hibát és üres tömböt adott vissza. Ráadásul nem volt valós idejű kapcsolat: ha a laptopon rögzítettek egy edzést, a telefon sosem frissült automatikusan.
- **Javítás:** Minden modul valós idejű `onSnapshot` feliratkozást (`subscribeSessions`, `subscribePlannedWorkouts`, `subscribeDayCheckin`, `subscribeNutritionDay`, `subscribeCompetitions`) kapott `includeMetadataChanges: true` beállítással. Amint a laptopon létrejön egy edzés a felhőben, a telefon másodperceken belül, oldalújratöltés nélkül megkapja! Továbbá a Beállítások menüben megjelent a **"Teljes frissítés a szerverről"** gomb, amely törli a helyi memóriagyorsítótárat és kényszerített szerveroldali lekérést végez (`getDocsFromServer`).

#### (d) Eltérő felhasználói identitások és kettős fiókok (UID Split)
- **Eredmény:** *Valós emberi/technikai tényező.*
- Gyakori eset, hogy a sportoló a laptopon Google-fiókkal (pl. `nev@gmail.com`) lép be, míg a telefonon e-mail + jelszóval regisztrál, vagy fordítva. Mivel a Firebase Authentication alapértelmezetten más-más `UID`-t generálhat különböző fiókokhoz, a két eszköz két teljesen különálló sportolói dokumentumhoz (`athletes/{uid1}` vs `athletes/{uid2}`) fért hozzá!
- **Javítás:**
  1. A Beállítások -> Szinkronizáció felületen jól láthatóan megjelenik a bejelentkezett **E-mail cím**, a **Bejelentkezési mód** (Google vagy Jelszó) és a **Felhasználói azonosító (UID)** rövidített formája. Így a sportoló egyetlen pillantással ellenőrizheti, hogy ugyanabba a fiókba van-e belépve mindkét eszközön.
  2. A bejelentkezési rétegben felkészültünk az `auth/account-exists-with-different-credential` esetre: a rendszer világosan tájékoztatja a felhasználót, ha már létezik fiókja a másik módszerrel, megakadályozva a fiókok szétválását.

#### (e) Útvonal- és UID eltérés a mentés és olvasás között (Path Mismatch)
- **Eredmény:** *Auditálva, minden modul egységesítve.*
- Minden adat az `athletes/{auth.currentUser.uid}/{subcollection}/{docId}` útvonalra kerül (edzések: `sessions`, tervezett edzések: `plannedWorkouts`, check-in: `days`, étrend: `nutritionDays`, célversenyek: `competitions`). Nincs hardkódolt azonosító, nincs elgépelt kollekciónév.

#### (f) Safari / iOS WebChannel és HTTP/2 kapcsolatbontás
- **Eredmény:** *Valós mobilplatform-specifikus hiba.*
- Mobilon (különösen Safari és iOS WebKit alatt) az energiatakarékossági mechanizmusok és a mobilhálózatok gyakran bontják az állandó WebChannel adatfolyamokat, amikor az alkalmazás háttérbe kerül vagy képernyőzár aktiválódik. Újranyitáskor a stream sokszor "fagyott" állapotban maradt, megakadályozva a friss adatok érkezését.
- **Javítás:** A Firestore inicializálást kiegészítettük az `experimentalAutoDetectLongPolling: true` konfigurációval:
  ```ts
  initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true
  });
  ```
  Ez automatikusan átvált megbízható HTTP long-pollingra, ha a streaming megszakad.

#### (g) PWA / Service Worker elavult gyorsítótár
- **Eredmény:** *Kezelve.*
- A PWA Service Worker korábban régi kliens kódot tarthatott meg. A verziószámot és a build azonosítót rögzítettük (`v1.2.1 (build 20261028-sync)`), és a felület automatikusan jelzi, ha új verzió érhető el.

#### (h) Csak helyi tárhelyen maradó adatok
- **Eredmény:** *Megszüntetve.*
- Minden adatmodell (edzések, étrend, check-in, versenyek) átkerült a centralizált Firestore repository rétegbe, ahol minden mentési művelet elsődleges célpontja a felhő, a helyi tárhely csupán offline védelmi rétegként szolgál.

---

## 6. Beépített diagnosztikai eszközök (Settings -> Rendszer & Szinkronizáció)

A Beállítások menüben kialakítottunk egy dedikált diagnosztikai panelt:
1. **Projekt azonosító:** `zsombor-etrend` (megerősíti, hogy a megfelelő adatbázishoz csatlakozik a kliens).
2. **Alkalmazás verzió:** `v1.2.1 (build 20261028-sync)`.
3. **Bejelentkezett fiók:** E-mail cím és szolgáltató (Google / Jelszó) + UID.
4. **Hálózati állapot:** Kapcsolódva a szerverhez / Helyi gyorsítótár.
5. **Legutóbbi szerver műveletek:** Utolsó szerveroldali olvasás és írás pontos időbélyege.
6. **Szerver teszt (Ping):** Egyetlen gombnyomással teszteli az élő Firestore írást, azonnali szerveroldali visszaolvasást és törlést. Zöld pipa jelzi a sikert, hiba esetén a pontos hálózati ok jelenik meg.
7. **Teljes frissítés a szerverről:** Törli a helyi gyorsítótárat és kényszeríti a Firestore adatok újratöltését.
8. **Hibajelentés másolása:** Egyetlen kattintással a vágólapra másolja az összes diagnosztikai állapotot, megkönnyítve a hibakeresést.

