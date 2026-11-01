# 10base: přehled změn

Verze se označují MAJOR.MINOR.PATCH. Číslo je v `version.js`, vydání se označí tagem `vX.Y.Z`.
Postup vydání: zvýšit číslo a datum ve `version.js`, doplnit tento soubor, nasadit, `git tag -a vX.Y.Z -m "…"` a `git push --tags`.

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
