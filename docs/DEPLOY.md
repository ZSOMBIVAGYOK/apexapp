# Apex Béta Telepítési és Üzemeltetési Útmutató (DEPLOY.md)

Ez a dokumentum összefoglalja a béta környezet működtetését, az újratelepítést, a vészleállítást (Kill Switch), a költségvédelmet és az adatmentést.

---

## 1. Gyors Újratelepítés (Redeploy)

A kód frissítése és újratelepítése a terminálból egyszerűen elvégezhető.

### Előfeltétel:
Győződj meg róla, hogy a Node.js elérhető:
```bash
export PATH="/Users/zsombi/Downloads/oly/.tools/node/bin:$PATH"
```

### Csak a Frontend (Hosting) frissítése:
Ha a felületen (React / CSS / szövegek) változtattál:
```bash
npm run build
npx firebase deploy --only hosting --project zsombor-etrend
```

### Csak a Cloud Functions frissítése:
Ha a háttérfunkciókon (`functions/src`) változtattál:
```bash
npm --prefix functions run build
npx firebase deploy --only functions --project zsombor-etrend --force
```

### Adatbázis szabályok és indexek frissítése:
```bash
npx firebase deploy --only firestore,storage --project zsombor-etrend
```

### Teljes projekt újratelepítése egyszerre:
```bash
npm run build
npm --prefix functions run build
npx firebase deploy --project zsombor-etrend --force
```

---

## 2. Verzió Visszaállítása (Rollback)

Ha egy frissítés hibát okoz, azonnal visszagörgethetsz az előző működő verzióra:

1. Nyisd meg a Firebase Console-t: [console.firebase.google.com](https://console.firebase.google.com/)
2. Válaszd a **zsombor-etrend** projektet.
3. A bal oldali menüben kattints a **Build** > **Hosting** menüpontra.
4. A **Release history** (Kiadási előzmények) táblázatban keresd meg az előző sikeres verziót.
5. Kattints a verzió jobb szélén lévő 3 pontra (**⋮**), majd válaszd a **Rollback** (Visszaállítás) lehetőséget.
6. A Hosting másodpercek alatt visszatér az előző verzióra újraépítés nélkül.

---

## 3. Regisztrációs Vészleállító (Kill Switch)

Ha le szeretnéd zárni a béta tesztelést az új felhasználók előtt:

### Azonnali módszer (Firebase Console - 10 másodperc, nem kell build):
1. Menj a [console.firebase.google.com](https://console.firebase.google.com/) oldalra.
2. Kattints az **Authentication** menüpontra, majd válaszd a **Settings** (Beállítások) fület.
3. Keresd meg a **User actions** (Felhasználói műveletek) szakaszt.
4. Kapcsold ki az **Enable create (sign-up)** (Regisztráció engedélyezése) jelölőnégyzetet.
5. Mentsd el. Ezt követően senki új nem tud regisztrálni se email-lel, se Google-lel; a meglévő felhasználók bejelentkezése továbbra is zavartalan marad.

### Felületi tiltás (.env flag):
A `.env` fájlban beállítható:
```env
VITE_DISABLE_REGISTRATION=true
```
Újraépítés után a regisztrációs űrlap helyett egy magyar nyelvű üzenet jelenik meg: *"A béta regisztráció jelenleg szünetel."*

---

## 4. Költségvédelem: Költségkeret Beállítása (~10 EUR)

Hogy soha ne érjen meglepetés a havi számlában, állíts be figyelmeztetést:

1. Nyisd meg a Google Cloud Billing felületét: [console.cloud.google.com/billing](https://console.cloud.google.com/billing)
2. Válaszd ki a számlázási fiókodat.
3. A bal menüben kattints a **Budgets & alerts** (Költségkeretek és értesítések) gombra.
4. Kattints a **CREATE BUDGET** (Költségkeret létrehozása) gombra.
5. **Scope (Hatókör):** Válaszd ki a `zsombor-etrend` projektet.
6. **Amount (Összeg):** Állíts be célösszegnek **10 EUR**-t (vagy ~4000 HUF).
7. **Actions / Thresholds (Értesítési szintek):**
   - 50% (5 EUR elérésekor)
   - 90% (9 EUR elérésekor)
   - 100% (10 EUR elérésekor)
8. Jelöld be az **Email alerts to billing admins** opciót (értesítés a(z) `marenecdozsazsombor7@gmail.com` címre).
9. Kattints a **Finish** gombra.

### Fő költségtényezők és Ingyenes Sáv (Free Tier):
- **Firebase Authentication:** Havi 50 000 aktív felhasználóig teljesen ingyenes.
- **Cloud Firestore:** Napi 50 000 olvasás, 20 000 írás és 1 GB tárhely ingyenes.
- **Cloud Storage:** 5 GB tárhely és napi 1 GB letöltés ingyenes.
- **Cloud Functions:** Havi 2 000 000 meghívás ingyenes.
- **Container Cleanup Policy:** Be van állítva az automatikus 1 napos törlési szabály a build konténerekre, így azok nem foglalnak fizetős tárhelyet.

---

## 5. Automatikus Napi Firestore Biztonsági Mentés (Backup)

Bár a Firestore adatai replikáltak és megbízhatóak, készíthetsz külön mentést egy Google Cloud Storage vödörbe (bucket):

### Mentési tárhely létrehozása (egyszeri):
```bash
gcloud storage buckets create gs://zsombor-etrend-backups --project=zsombor-etrend --location=europe-west1
```

### Kézi mentés futtatása parancssorból:
```bash
gcloud firestore export gs://zsombor-etrend-backups --project=zsombor-etrend
```

### Automatikus napi mentés beállítása (Cloud Scheduler + Cloud Function):
1. A Google Cloud Console-ban nyisd meg a **Cloud Scheduler** felületet.
2. Hozz létre egy ütemezőt:
   - Név: `daily-firestore-export`
   - Gyakoriság: `0 2 * * *` (minden éjjel 2:00-kor)
   - Időzóna: `Europe/Budapest`
   - Cél: HTTP POST a Cloud Firestore Admin API végpontjára:
     `https://firestore.googleapis.com/v1/projects/zsombor-etrend/databases/(default):exportDocuments`
   - Törzs (JSON): `{"outputUriPrefix": "gs://zsombor-etrend-backups"}`

---

## 6. Felhasználói Fiók és Adatkezelés (GDPR)

### Felhasználó által kezdeményezett adatletöltés és törlés:
- **Adatexport (GDPR JSON):** A felhasználó a felületen a **Beállítások** > **Adatvédelem és Fiók** menüpontban bármikor egyetlen kattintással letöltheti a teljes profilját, edzés- és étrendi naplóját JSON formátumban.
- **Fióktörlés:** Ugyanitt a **Fiók törlése** gombra kattintva a felhasználó profilja, naplóbejegyzései és a Storage-ban tárolt fájljai (profilkép, edzésfájlok) azonnal és véglegesen törlődnek.

### Adminisztrátori kézi törlés:
1. **Firebase Console > Authentication:** Keresd meg a felhasználó email címét, kattints a jobb oldali menüre, és válaszd a **Delete account** lehetőséget.
2. **Firebase Console > Firestore Database:** Keresd meg a `users/{uid}` dokumentumot, és töröld a dokumentumot és a hozzá tartozó algyűjteményeket (`days`, `sessions`, stb.).

---

## 7. Hasznos Linkek

- **Éles Béta Weboldal:** [https://zsombor-etrend.web.app](https://zsombor-etrend.web.app) (és [https://zsombor-etrend.firebaseapp.com](https://zsombor-etrend.firebaseapp.com))
- **Firebase Projekt Kezelőpult:** [https://console.firebase.google.com/project/zsombor-etrend](https://console.firebase.google.com/project/zsombor-etrend)
- **Google Cloud Számlázás és Keretek:** [https://console.cloud.google.com/billing](https://console.cloud.google.com/billing)
- **Visszajelzés Email:** [mailto:marenecdozsazsombor7@gmail.com](mailto:marenecdozsazsombor7@gmail.com)
