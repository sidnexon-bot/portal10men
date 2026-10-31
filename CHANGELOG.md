# 10base: přehled změn

Verze se označují MAJOR.MINOR.PATCH. Číslo je v `version.js`, vydání se označí tagem `vX.Y.Z`.
Postup vydání: zvýšit číslo a datum ve `version.js`, doplnit tento soubor, nasadit, `git tag -a vX.Y.Z -m "…"` a `git push --tags`.

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
