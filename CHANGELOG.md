# 10base: přehled změn

Verze se označují MAJOR.MINOR.PATCH. Číslo je v `version.js`, vydání se označí tagem `vX.Y.Z`.
Postup vydání: zvýšit číslo a datum ve `version.js`, doplnit tento soubor, nasadit, `git tag -a vX.Y.Z -m "…"` a `git push --tags`.

## 4.0.2 (4. 11. 2026)
- Oprava: v okně Odškrtnout docházku se po zaškrtnutí člena seznam vracel nahoru, takže při odškrtávání níž v seznamu bylo nutné pokaždé znovu rolovat. Seznam teď zůstane tam, kde jste; zůstane i zaměřený řádek (ovládání klávesnicí).

## 4.0.1 (3. 11. 2026)
- Aktivita člena v docházce se počítá za aktuální kalendářní rok, ne z celé historie. 1. ledna se počítá znovu od nuly. Člen, který nastoupil během roku („V 10men působí od“), se počítá od data nástupu. V okně je u aktivity uvedeno „v roce 2026“, popř. „od 15. 10. 2026“.
- Docházka skupiny: zpětně se zobrazují i proběhlé akce daného měsíce (dřív jen budoucí). Jsou zašedlé a u data je „proběhlo“, ale stav členů zůstává čitelný, aby šla docházka a aktivita zkontrolovat. Měsíc se přepíná stejným posuvným přepínačem.
- Odškrtnutí docházky (jen administrátor): u akce, která už začala, v kartě Docházka tlačítko „Odškrtnout docházku“. Otevře seznam členů podle hlasů, předvyplněný podle toho, kdo slíbil, že přijde. Administrátor označí, kdo opravdu přišel (rychlé volby „Podle slibů“ a „Nikdo“) a uloží jako finální stav. Potvrzení jde později upravit nebo zrušit.
- Skutečná účast se ukládá zvlášť, původní odpovědi členů zůstávají. U potvrzené akce se v detailu i v Docházce skupiny zobrazuje skutečná účast (Přišel / Nepřišel) a aktivita člena se počítá z ní, takže ji nezkreslí zapomenuté zadání. U dosud nepotvrzených proběhlých akcí vidí administrátor v Docházce skupiny odkaz „odškrtnout docházku“.
- Apple: všechna okna (formuláře, seznamy, volby) jsou plovoucí karta nahoře místo bottom sheetu, jako okno odškrtnutí docházky. Android zůstává u bottom sheetu.
- Oprava (Apple, 10space): primární a nebezpečná tlačítka v dialozích (modal-btn-primary, modal-btn-danger) se vykreslovala jako bílé sklo místo barvy aplikace.
- Tlačítka: jedna velikost na Apple (38 px, písmo 14 px; na počítači s myší kompaktních 34 px), na Androidu 40 px. Nebezpečné tlačítko na Androidu je tonální červené, v patičce okna červený text.
- Okna na Apple (karta): pevné záhlaví a zápatí s tlačítky při rolování, v každém okně křížek, jednotné odsazení aspoň 20 px nahoře i dole.
- Spodní lišta na iPhonu v aplikaci přidané na plochu: zaoblení soustředné s rohem displeje (odsazení R − 32 px podle modelu iPhonu).
- Přístupnost: rozbalovací bloky a rozbalovací řádky jdou ovládat klávesnicí (role, tabindex, aria-expanded, Enter a mezerník).
- Okna docházky (člen, odškrtnutí) mají vlastní křížek; formulář akce má pevné tlačítka dole.

## 3.18.0 (3. 11. 2026)
- Správa členů: nová kolonka „V 10men působí od“ (datum) při přidání i úpravě člena. Člen ji vidí v Nastavení mezi osobními údaji.
- Aktivita v okně člena (Docházka skupiny) počítá jen proběhlé akce od tohoto data, takže nepenalizuje členy, kteří nastoupili během roku. Bez vyplněného data se počítají všechny akce jako dosud; u započtených se v textu ukáže „od 15. 10. 2026“.
- Oprava: formulář „Nový člen“ se odkazoval na neexistující proměnnou (Discord ID) a mohl se při otevření zhroutit.

## 3.17.0 (3. 11. 2026)
- Docházka skupiny: kuličky členů mají pevný rozměr (na dotykových displejích je dřív roztahovalo pravidlo pro tlačítka s onclick „heatmap…“).
- Klepnutí na člena otevře okno místo systémového upozornění: jméno a příjmení, účast na vybrané akci (s důvodem), stav na další dvě akce menším písmem a aktivita v procentech (podíl proběhlých akcí, na které člen potvrdil „Přijdu“; zrušené se nepočítají). 0–30 % červeně, 31–65 % oranžově, 66–100 % zeleně.

## 3.16.0 (3. 11. 2026)
- Docházka skupiny (10base): přepracovaný přehled se stejnými daty. U každé akce je datumová dlaždice, poměr přítomných (např. 14/16), pruh se zastoupením stavů a členové seskupení podle hlasů (1. a 2. tenor, 1. a 2. bas) s počtem přítomných v hlasu.
- Stav se rozliší i bez barvy: přijde = plná, možná = oranžová, nepřijde = tónovaná s přeškrtnutými iniciálami, bez odpovědi = čárkovaný obrys. Pod přehledem je legenda.
- Zrušená akce zabírá jen jeden řádek. Zmizela karta vnořená v kartě. Na počítači je matice seskupená podle hlasů, má sloupec součtů a pevný první sloupec s akcí.
- Zůstal původní posuvný přepínač měsíců a klepnutí na člena (důvod odpovědi).

## 3.15.2 (3. 11. 2026)
- Android: formuláře mají zase jen placeholdery místo popisků kolonek. Popisky se po změně písma (3.15.0) omylem ukázaly znovu vedle placeholderů.
- Apple: formulář nové a upravované akce už není obalený ještě jednou kartou uvnitř okna.

## 3.15.1 (3. 11. 2026)
- iPhone: ve spodní liště se useknul spodek písmen (Platby, Zkušebna…); oprava výšky řádku popisků.
- Hlavičky rozbalovacích bloků (10base) mají stejné odsazení nahoře i dole, text nesedí u spodní hrany kulaté karty.

## 3.15.0 (3. 11. 2026)
Písmo a typografie podle platformy.
- Apple: zůstává systémové písmo (SF Pro). Zrušilo se ruční těsné prostrkání nadpisů, takže se uplatní vestavěné optické prostrkání SF Pro podle velikosti. Stupnice podle iOS: velký nadpis 28, nadpis obrazovky 22, nadpis okna 20, nadpis karty 17, popisek sekce 12, drobný text 13.
- Android: písmo Google Sans Flex (písmo Pixelů, licence OFL, hostované v aplikaci, včetně české diakritiky), záloha Roboto. Stupnice Material 3: nadpis okna 24, nadpis obrazovky 22, nadpis karty 16 (500), popisek sekce 14 (500), drobný text 12, čísla 24.

## 3.14.0 (3. 11. 2026)
Nový vzhled tlačítek a kulatější tvary, na každé platformě podle jejích zvyklostí.
- Apple (iPhone, iPad, Mac): tlačítka jako v iOS 26. Kapsle, průsvitné „sklo“ u vedlejších tlačítek, hlavní tlačítko v barvě aplikace, stisk tlačítko pružně zmenší (bez zdvihu při najetí). Výška 44 px na dotyku, 34 px s myší.
- Apple: kulatější karty (26 px, na počítači 20 px), okna a spodní listy (34 px), nabídky (22 px).
- Android: tlačítka podle Material 3. Hlavní akce jsou plná kapsle, vedlejší (Zrušit, Upravit, Otevřít…) jsou textová bez výplně; najetí a stisk ztmaví pozadí (stavová vrstva), vypnuté tlačítko má 38 % krytí.
- Android: hlavní tlačítko je plné i uvnitř karet (dříve na tabletu splývalo se šedou).
- Sjednocené třídy tlačítek (btn-primary, btn-secondary, btn-danger, btn-success, btn-info, btn-neutral) místo barev zapsaných přímo v kódu.

## 3.13.0 (3. 11. 2026)
- Rozbalovací bloky (accordiony) se rozbalují a sbalují jako roleta: obsah se odvíjí shora dolů a stejně se svine. Respektuje nastavení „omezit pohyb“.
- Výraznější šipka: v zavřeném stavu míří na text, v otevřeném dolů (otáčí se plynule).
- 10base: všechny rozbalovací bloky (detail akce, další informace, harmonogram, program, CVT).

## 3.12.1 (3. 11. 2026)
- Záhlaví bottom sheetu: nadpis a křížek jsou ve stejné výšce (v 10space a 10base byl křížek o 10 px níž kvůli zbytku starého pravidla).

## 3.12.0 (3. 11. 2026)
- Okna na mobilu: dialog (potvrzení, krátký formulář) nahoře, menu a formuláře s mnoha kolonkami jako bottom sheet bez držátka s pevným záhlavím (nadpis a křížek), vyjíždí zespodu a zajíždí dolů. Vynucení: atributy data-sheet a data-dialog.
- Tlačítka: Apple (iPhone, iPad, desktop) jedna sada, Android (telefon, tablet) jedna sada. Pilulky, výšky 38 px (akce v řádku 38 px, přihlášení 44 px, filtry 30 px), Apple tučnost 600, Android 500, barva podle akcentu aplikace.
- Zavírací křížek: Apple skleněné kolečko 34 px, Android samotný křížek (dotyková plocha 40 px).
- Oprava: v oknech, která se na telefonu mění na bottom sheet, se na tabletu a počítači objevoval neostylovaný křížek (chyba z 3.11.0).
- 10base: Uložit a další hlavní akce jsou modré (dřív světle zelené), tlačítka na tabletu a desktopu mají stejný vzor jako na telefonu.

## 3.11.0 (2. 11. 2026)
- Okna na mobilu mají pravidla: potvrzení a krátký formulář s jedním polem jsou nahoře jako modální okno (nezakryje je klávesnice), menu, seznamy a formuláře s mnoha kolonkami jsou bottom sheet bez držátka, s křížkem a tlačítky dole. Sheet vyjíždí zespodu a zajíždí dolů, dialog sjíždí shora.
- Tažení okna dolů už nic nedělá (a v 10base nespouští obnovení stránky).

## 3.10.0 (2. 11. 2026)
- Formuláře na mobilu jsou bottom sheet: okno se vysune zespodu, má držátko a zavře se tažením dolů (tablet a počítač beze změny).

## 3.6.0 (2. 11. 2026)
- Počítač a tablet po vzoru telefonu: tlačítka a (na Applu) kolonky formulářů mají přesně 38 px a tvar kapsle, přepínače a filtry 30 px; zaoblení karet a oken se nemění.
- Apple: všechna akční tlačítka jsou kapsle na každé velikosti, položky bočního panelu mají jednotné zaoblení.
- Android tablet: spodní lišta je schovaná, ovládá se jen bočním panelem (stejně jako na iPadu); pole formulářů mají každé vlastní kapsli.
- Sbalený boční panel nemá logo, začíná profilovým obrázkem.
- Tablet: karty (faktury, náhrady, projekty, přehled) se řadí vedle sebe, kde se vejdou; v 10korun je Účetnictví o řádek kratší a při sbaleném panelu jsou karty Pokladna a Bankovní účet vedle sebe.

## 3.5.0 (1. 11. 2026)
- Apple: spodní lišta se při posunu stránky dolů zmenší a schová popisky, při posunu nahoru se vrátí; vybranou záložku (kapku skla) jde chytit a přetáhnout prstem na jinou záložku.

## 3.4.0 (1. 11. 2026)
- Tlačítka ve dvojicích na mobilu: výchozí je půl na půl, ale když by se delší text zalomil, kratší tlačítko se zúží na šířku svého textu. Platí i pro dialogy sestavené za běhu.

## 3.3.0 (1. 11. 2026)
- Animace: po přepnutí sekce se karty zobrazují postupně od nejvyšší dolů, karty níže naskočí při scrollování; rozbalovací nabídky se rozbalují jako roleta shora.

## 3.2.1 (1. 11. 2026)
- Přepínač měsíců (Akce, Docházka skupiny) je posuvný jezdec: uprostřed vybraný měsíc, vlevo předchozí, vpravo následující; klepnutím, tažením nebo švihem (měsíce rotují a pozvolna se zastaví).
- Přepínače (Světlý / Tmavý / Podle systému, Program / Přídavky) jsou menší než tlačítka: 30 px.

## 3.2.0 (1. 11. 2026)
- Oprava: pravidlo pro samostatná tlačítka nově přeskakuje řádky tabulek a seznamů, aby je nerozhodilo.

## 3.1.10 (1. 11. 2026)
- Přepínač měsíců (Akce, Docházka skupiny) má jednotný vzhled: pilulka s kulatými tlačítky ‹ ›.
- Program: u skladeb v editoru už není ikona ani emoji papíru; v detailu akce zůstává odkaz „Noty“ bez emoji.

## 3.1.9 (1. 11. 2026)
- Apple: přepínače (Světlý / Tmavý / Podle systému a další) jsou zaoblené do pilulek.

## 3.1.8 (1. 11. 2026)
- Apple (iOS 26): větší zaoblení oken a karet, pilulková tlačítka, zavírání ikonou ✕ / ✓ místo textu Zavřít / Hotovo, nadpisy sekcí ve větném tvaru, zaoblená pole (včetně data a času), systémové písmo SF Pro.
- Tlačítka na mobilu mají jednotnou výšku 38 px; samostatná tlačítka a Navigovat / Připojit se jsou v mřížce; popisek „Opakující se akce“ ve větném tvaru.

## 3.1.7 (1. 11. 2026)
- Tlačítka na mobilu: jednotná mřížka (1 = celá šířka, 2 = vedle sebe, 3 = hlavní nahoře a pod ním dvě, 4 = dvě a dvě, 5 = hlavní nahoře a pod ním dvě a dvě); přepínač Přijdu / Možná / Nepřijdu zůstává jako řada voleb.
- Android: hlavní tlačítko je plná pilulka, ostatní jsou textová tlačítka (jako u Google).

## 3.1.6 (1. 11. 2026)
- Apple: profilové menu ve stylu Liquid Glass (jako spodní lišta); Android beze změny.
- 10space: přepínač Akce / Kódy má stejný vzhled jako přepínač Pokladna / Bankovní účet v 10korun (na všech platformách).
- Akce, program: nový editor programu (přepínač Program / Přídavky s počty, označené skladby v seznamu, přetahování pořadí úchytem, spodní tlačítka stále vidět), vzhled sedí i v tmavém režimu a na Androidu.
- Editor programu: tlačítko „Převzít program z minulé akce“ natáhne program nejbližší dřívější akce stejného typu (jinak jakéhokoli typu); u neprázdného programu se předtím zeptá.
- Ochrana oken: Zrušit a Esc se u okna s neuloženými změnami zeptají „Zahodit neuložené změny?“; klik mimo okno dál jen zatřese.

## 3.1.5 (1. 11. 2026)
Designový audit všech obrazovek (iPhone, Android, tablet, počítač).
- Počítač: ikonová tlačítka (křížek v detailu projektu) se po zhuštění už nesmršťují.
- Mobilní nabídky: místo tlustých šedých pruhů jemné oddělovací čáry.
- Android: detail projektu s bílým pozadím a šedými kartami; správná ikona u čísla faktury.
- 10base: tmavé textové pole poznámky, menší popisky ve formuláři na telefonu, větší šipky měsíců.
- Dotyková zařízení: větší klikací plochy (zavírací křížek, tři tečky, drobná tlačítka).

## 3.1.4 (1. 11. 2026)
- Tlačítko Proplatit výdaje (Platby) má stejný vzhled jako ostatní tlačítka v kartách, i na Androidu a na počítači.

## 3.1.3 (1. 11. 2026)
Kompaktní prostředí na počítači (myš, okno od 768 px; telefony a tablety se nemění).
- Menší písmo a pole (výška 32 px), užší okna a formuláře ve dvou až třech sloupcích, hustší tabulky a karty.
- Karty vedle sebe tam, kde se vejde víc: Přehled a Projekty v 10space, faktury a náhrady v 10korun; Přehled v 10base bez mezer pod nižšími kartami.

## 3.1.2 (1. 11. 2026)
- Android: spodní lišta je nižší, ikony a popisky jsou menší a aktivní záložka má barvu aplikace.

## 3.1.1 (1. 11. 2026)
Vzhled Androidu podle Material Design 3 (Apple se nemění) a nové formuláře.
- Spodní lišta na Androidu jde od kraje ke kraji a navazuje na spodní hranu; odsazení pro systémová tlačítka a gesta řeší aplikace sama.
- Prostředí jako od Googlu: písmo Roboto / Google Sans, ploché plochy bez stínů a rámečků, bílé pozadí a světle šedé karty, zaoblení karet 28 px, tlačítka a pole jako pilulky, nové dialogy.
- Formuláře v oknech: popisek je zástupný text přímo v poli s ikonou, pole za sebou tvoří jeden souvislý blok, výběry a soubory jsou samostatné pilulky; čára se objeví až po ťuknutí do pole.
- Okna s formulářem se klikem mimo nezavírají (rozepsaná práce se neztratí), jen se zatřesou.

## 3.0.1 (30. 10. 2026)
Číslování verzí bylo sjednoceno na 3.0.1 (dřívější záznam 1.0.0 je jeho historií).

První označené vydání.
- Nastavení: vzhled (světlý, tmavý, podle systému), karty Přehledu (přidat, odebrat, pořadí přetahováním), osobní údaje jen pro čtení, informace o verzi.
- Zkušebna: bez záložky Repertoár (noty a repertoár jsou v 10space), zůstávají Klávesy a CVT.
- Animace oken, nabídek a ovladačů, boční panel jde zúžit na ikony.
- Barva horní lišty telefonu sleduje zvolený režim.
- Aplikace sama nabídne obnovení, když vyjde novější verze.
