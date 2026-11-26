# 10base: přehled změn

Verze se označují MAJOR.MINOR.PATCH. Číslo je v `version.js`, vydání se označí tagem `vX.Y.Z`.
Postup vydání: zvýšit číslo a datum ve `version.js`, doplnit tento soubor, nasadit, `git tag -a vX.Y.Z -m "…"` a `git push --tags`.

## 4.17.2 (26. 11. 2026)
- Harmonogram koncertu na telefonu: banka dílků je pod osou programu a zůstává přilepená dole nad zápatím formuláře (dílky se v ní posouvají do strany), takže je při tažení pořád po ruce i u dlouhé osy. Stránka se při tažení u okraje posouvá rychleji, čím blíž je prst k okraji, a nad přilepenou bankou a zápatím se neposouvá.

## 4.17.1 (26. 11. 2026)
- Oprava: verze 4.17.0 nešla spustit (chyba „updateRiderHarmonogramField is not defined“ při načtení aplikace). V 4.17.0 zbyl odkaz na odstraněnou funkci starého editoru harmonogramu.

## 4.17.0 (26. 11. 2026)
- Podrobnosti pro 10space, Harmonogram koncertu: nový editor „banka dílků + osa programu“. V bance jsou dílky Příchod, Odchod, Moderace, Společná skladba, Prázdný blok a všechny skladby z programu akce, které ještě nejsou na ose. Dílek se na osu přidá klepnutím, nebo se přetáhne za úchyt (myší i prstem, stránka se při tažení u okraje sama posouvá). Na ose se položky řadí tažením nebo šipkami nahoru a dolů na úchytu.
- Skladby se dají přetahovat mezi bloky, z banky do bloku a z bloku zpět do banky. Moderace, příchod nebo odchod přetažené doprostřed bloku skladeb blok rozdělí na dvě části (druhá se jmenuje „… (pokračování)“). Skladba přetažená z banky na osu založí nový blok.
- Časy: zadáš začátek programu (jinak se vezme začátek akce) a stopáž u položek, osa dopočítá časy od–do. Nahoře je souhrn „18 min celkem · slot 60 min · zbývá 42 min“ (červeně, když program přetéká). Detail položky (moderátor, poznámka) se rozbalí šipkou. Data zůstávají ve stejném tvaru jako dřív (nově jen pole smer u příchodu a odchodu a harmonogram_start), takže 10space se nemění.

## 4.16.1 (26. 11. 2026)
- Formulář akce, úspora místa: pryč jsou vysvětlivky pod přepínači, nabídky data, času a míst z historie i popisky karet typu. Zbyla jen pole a volby.
- Formulář akce, přepínače místo tlačítek: všude, kde se nepíše text, je segmentový přepínač s plynulým přesunem vybrané volby (typ akce, délka, opakování, stav akce, doprava, oblečení, spacáky, strava, druh koncertního oblečení). Vždy je vybraná právě jedna volba, takže ji nejde omylem zrušit; „Nezadáno“ je samostatná volba. Doprava a oblečení mají rovnoměrně rozložené volby s ikonami (SVG). Ano / Ne jsou běžné přepínače (koncertní oblečení na soustředění).
- Formulář akce, tvary podle pravidel (změřeno proti stávajícím přepínačům a tlačítkům): segmentové přepínače mají volby 30 px, písmo 13 px (Apple 600, Android 500), pilulku vybrané volby a rodiče s paddingem 3 px a mezerou 2 px (Apple kapsle, Android zaoblení 12 px); vybraná pilulka se přesouvá podle skutečné šířky voleb. Typ akce a oblečení jsou bez ikon, aby se vešly (u typu „Jiná akce“ je na přepínači „Jiná“), ikony zůstaly u dopravy. Přepínače Ano / Ne mají rozměry podle platformy: Apple 51 × 31 px, Android (Material 3) 52 × 32 px s obrysem a malým palcem ve vypnutém stavu. Vnořené panely (sekce, souhrn) používají zaoblení ovládacích prvků platformy, víceřádková pole přebírají vzhled pole z platformy a chyby mají na Androidu červenou z Material 3.
- Formulář akce, ochrana před omyly: konec akce před začátkem a opakování končící před první akcí se zachytí u pole, souhrn upozorní na datum v minulosti, konec po půlnoci a konec před začátkem.

## 4.16.0 (26. 11. 2026)
- Formulář akce přepracovaný na průvodce. Nejdřív se vybere typ akce (Zkouška, Koncert, Soustředění, Soutěž, Jiná akce) kartami s ikonou a popiskem, zbytek formuláře se ukáže podle typu. Ikony jsou SVG, žádné emotikony.
- Kdy: rychlé volby data (Dnes, Zítra a dva nejbližší dny v týdnu, kdy se u daného typu akce obvykle koná), začátek tlačítky (17:00 až 20:00 a nejčastější čas daného typu) a délka tlačítky 1 h / 2 h / 2,5 h / 3 h / Celý den, konec se dopočítá. Živý souhrn („Středa 9. 12. · 18:00–20:30, za 13 dní · 2,5 h“). Datum konce se ukáže až po zapnutí „Trvá víc dní“. Název se při výběru typu a data předvyplní („Zkouška 9. 12.“), ruční úprava ho přestane měnit.
- Kde: místo s nabídkou nedávných míst z historie akcí, odkaz na online call se ukáže po zapnutí „Online“.
- Podrobnosti podle typu jsou rozbalovací sekce s ukazatelem vyplnění (Koncert: Sraz a oblečení, Doprava, Hospoda, Spolupráce, Harmonogram dne; Soustředění a Soutěž: Spaní a strava, Koncertní oblečení, Doprava, Harmonogram po dnech). Doprava, oblečení, spacáky a strava jsou tlačítka místo rozbalovacích seznamů. Rozepsané hodnoty přežijí přepnutí typu a změna typu se projeví hned (dřív zůstala stará pole).
- Opakování: tlačítka Jednorázově / Každý týden / Co 2 týdny, rychlé volby konce (+4 týdny, +8 týdnů, do konce měsíce) a hláška „Vytvoří se 9 akcí, vždy ve středu 18:00–20:30“.
- Dole jedno hlavní tlačítko „Vytvořit akci“ / „Uložit“ (modré) a přepínač „Poslat do Discordu“, který je ve výchozím stavu zapnutý a pamatuje si poslední volbu. Při úpravě je samostatné červené tlačítko „Smazat akci“; stav „Zrušená“ se už v seznamu nenabízí (dřív akci smazal).
- Chyby (chybí název, datum, konec opakování) se zobrazí přímo u pole místo vyskakovacího okna. Poznámka a ostatní pole mají vzhled podle pravidel, tlačítka v harmonogramu a podkladech pro 10space mají třídy tlačítek.

## 4.15.0 (26. 11. 2026)
- Nastavení, Moje auta: formulář auta podle pravidel vzhledu. Hlavní tlačítko („Uložit“ / „Přidat auto“) je `btn-primary`, „Zrušit“ `btn-secondary`, „Smazat“ `btn-danger`, vše ve skupině tlačítek (na mobilu mřížka: hlavní nahoře přes celou šířku, pod ním dvě). „Přidat auto“ pod seznamem je hlavní tlačítko.
- Moje auta, přívětivost: formulář auta je interaktivní. Nahoře je živý náhled (dlaždice míst: „Ty“ + spolucestující, název a souhrn přesně jako v seznamu aut). Počet míst se nastavuje posuvníkem 2 až 9 s velkým číslem a nové dlaždice naskakují s animací. Palivo se vybírá tlačítky místo seznamu (druhé klepnutí volbu zruší). Spotřeba má posuvník, tlačítka − / + po 0,1 a pole pro přesné číslo; jednotka se mění podle paliva (kWh/100 km u elektřiny) a posuvník je do zadání hodnoty zašedlý, takže se spotřeba nepředvyplňuje (musí být podle technického průkazu).
- Moje auta: první auto je rovnou výchozí s vysvětlením volby, chybová hláška je červená, karta auta má šipku, úvodní text vysvětluje, že auto si člen vybere sám v kartě Doprava (dřív mluvil o výběru administrátorem).

## 4.14.0 (26. 11. 2026)
- Karta Doprava, administrátor: tlačítko „Upravit (admin)“ je v zápatí karty. V režimu úprav jsou v zápatí tlačítka „Uložit“ a „Zrušit“. Změny se už neukládají po každém výběru: provádějí se v rozpracované verzi (stejné kontroly jako na serveru) a na server jdou jedním zápisem po kliknutí na „Uložit“. „Zrušit“ všechny změny zahodí.
- Karta Doprava, řidič: u svého auta má tlačítko „Upravit“ (místo „Místa pro jiné“). Režim úprav je jako u administrátora, ale jen pro jeho auto: místa pro jiné než členy, u carsharingu počet volných míst, odebrání spolucestujících a zrušení auta; Uložit / Zrušit v zápatí.
- Server (api.js): nová akce dopravy „davka“ provede všechny změny najednou, nebo žádnou; každá změna se kontroluje s oprávněními toho, kdo ukládá (řidič tedy změní jen své auto). Na Discord jde jedna zpráva o úpravě dopravy.

## 4.13.1 (26. 11. 2026)
- Karta Doprava: tlačítka podle pravidel vzhledu. Hlavní akce („Vezmu auto“, „Potvrdit“, „Pojedu tímto autem“) jsou `btn-primary` (na Androidu plná barva aplikace, na Apple kapsle), „Zrušit auto“ je `btn-danger`, všechna tlačítka mají jednotnou výšku a písmo z pravidel (dřív vlastní inline velikost 34 px / 13 px).
- Karta Doprava: řady tlačítek jsou v `.btn-group`, takže na mobilu platí mřížka (hlavní nahoře přes celou šířku, pod ním dvě vedle sebe). Tlačítka v záhlaví karty jsou pod nadpisem.

## 4.13.0 (26. 11. 2026)
- Karta Doprava, administrátor: v záhlaví je tlačítko „Upravit (admin)“. Po kliknutí se karta přepne do režimu úprav, kde u každého auta vybere jiné auto (z profilu řidiče nebo carsharing), nastaví počet míst včetně řidiče a místa pro jiné než členy, přidá nebo odebere spolucestujícího a auto zruší; dole „Přidat auto za řidiče“. Změny se ukládají hned po výběru, tlačítko „Hotovo“ režim ukončí. Mimo režim úprav vidí administrátor kartu jako ostatní členové.
- Počet míst nejde snížit pod aktuální obsazenost; člen má stále místo jen v jednom autě. Řidič dál spravuje jen své auto. Zprávy na Discord o zápisu za jiného nesou poznámku „zapsáno adminem …“.
- Server (api.js): akce `dopravazmena` rozšířená o administrátorské změny (kontrola role při zápisu).

## 4.12.0 (26. 11. 2026)
- Detail akce s dopravou „Auta“: nová samostatná karta Doprava. Tlačítko „Vezmu auto“: člen vybere jedno ze svých aut z profilu (Nastavení → Moje auta) nebo carsharing, u carsharingu zadá jen počet volných míst. Ostatní členové u aut vidí obsazenost a jedním klikem si vyberou, s kým pojedou („Pojedu tímto autem“), případně se zase uvolní („Nepojedu“). Řidič může spolucestujícího odebrat, u carsharingu změnit počet míst a auto zrušit.
- Každý člen jezdí jen v jednom autě a do plného auta se nelze přidat; dva členové, kteří si berou místo současně, se nepřepíší (zápis v transakci). Hosté dopravu měnit nemohou.
- Řidiči a posádky se přesouvají z formuláře akce do karty Doprava. Formulář už posádky neobsahuje a při ukládání je nemění; vymažou se jen tehdy, když se změní druh dopravy. Dříve zadané posádky se v kartě zobrazují dál. Řidič v kartě nastaví i místa obsazená jinými než členy („Místa pro jiné“).
- Discord: zpráva přijde, když si někdo vezme auto nebo carsharing („bere auto … , 3 volná místa“) a když se někdo přidá k někomu do auta („pojede s …“). Ostatní změny (uvolnění místa, zrušení auta) zprávu neposílají.
- Server (api.js): nová akce `dopravazmena`.

## 4.11.0 (26. 11. 2026)
- Přehled, karta Úkoly: záložka Všechny kromě společných úkolů sboru ukazuje i nevyřízené marketingové úkoly nadcházejících akcí (sekce Marketing: úkol, kanály, akce, termín, kdo ho má, „po termínu“). Odškrtnout je jde na Přehledu i v detailu akce; je to týž údaj, takže se změna na jednom místě projeví na druhém (na Přehledu hned při změně akce, jinak po obnovení). Klepnutím na úkol se otevře akce. Počet na záložce Všechny zahrnuje i marketingové úkoly. Záložka Moje zůstává beze změny.
- Server (api.js): nová akce `marketingtasks`.

## 4.10.0 (26. 11. 2026)
- Marketingové úkoly: v úkolu lze zaškrtnout víc kanálů najednou (např. Facebook i Instagram). Formulář má místo výběru jednoho kanálu zaškrtávací pole, v seznamech a kartách se kanály vypíšou čárkou. Úkol drží seznam `kanaly` a první kanál navíc ve starém poli `kanal`, které čte Marek; starší úkoly s jedním kanálem fungují beze změny. Formulář (`openFormModal`) umí nový typ pole `checkboxes` a pamatuje si zaškrtnutí i při obnovení rozepsaného formuláře.
- Server (api.js): `savemarketingtask` přijímá `kanaly` (pole, bez duplicit, nejméně jeden), úkoly v přehledu a v Mých úkolech vrací `kanaly`.

## 4.9.1 (26. 11. 2026)
- Detail akce, Další informace: posádky mají přehlednější vzhled. U každého auta je název a štítek s obsazeností (např. 6/7), pruh míst (obsazeno členy, místa pro jiné než členy, volno), stav textem (volné místo, plno, přeplněno) a pod tím řidič a posádka v oddělených řádcích.

## 4.9.0 (26. 11. 2026)
- Posádky: u auta s určeným typem je pole „Místa obsazená jinými (rodina, hosté)“. Tato místa se započítají do obsazenosti („5/7 · 2 volná místa (z toho 2 pro jiné než členy)“), takže řidič, který veze rodinu, nemá k dispozici celou kapacitu. Hodnota se ukládá do posádky jako `auto_rezervovano` a zobrazí se i v detailu akce a v Discordu. Starší posádky bez ní se počítají jako dřív (0).

## 4.8.3 (26. 11. 2026)
- Moje auta: spotřeba podle technického průkazu je povinná (ukládá se jen s hodnotou nad 0 a do 40). Auta uložená dřív bez spotřeby mají na kartě upozornění „doplň spotřebu“ a při úpravě se spotřeba musí doplnit; pravidla databáze se nemění, stará data zůstávají čitelná.

## 4.8.2 (26. 11. 2026)
- Moje auta: spotřeba se zadává podle technického průkazu (u elektřiny v kWh/100 km); údaje z auta teď předvyplní proplácení paliva v 10korun.

## 4.8.1 (25. 11. 2026)
- Nastavení, Moje auta: auta jsou přehledné karty (název, počet míst, palivo, spotřeba, značka Výchozí). Klepnutím na kartu se otevře úprava s tlačítky Uložit, Zrušit a Smazat. Tlačítko „Přidat auto“ otevře formulářovou kartu pro nové auto.

## 4.8.0 (25. 11. 2026)
- Nastavení: nová sekce „Moje auta“. Každý člen si může založit víc aut (název, počet míst včetně řidiče, palivo, spotřeba, výchozí auto). Údaje jsou v nové větvi databáze `memberAuta` (viz pravidla v `database.rules.json`).
- Editor akce, posádky: po výběru řidiče se nabídne jeho auto (výchozí se předvybere) a ukáže se obsazenost, např. „4/7 · 3 volná místa“; při přeplnění se zvýrazní červeně, přidání dalšího člověka ale zůstává možné. Do posádky se ukládá kopie názvu a počtu míst, takže pozdější změna nebo smazání auta starší akce nezmění.
- Detail akce a Discord (nová akce a změna akce): u posádky je auto a obsazenost.
- Server (api.js): nová akce `auta`.

## 4.7.0 (20. 11. 2026)
- Program akce: vedle „Z minulé akce“ je nové tlačítko „Z jiné akce…“. Otevře seznam všech akcí, které mají vyplněný program (nejblíž datu této akce nahoře, s hledáním podle názvu nebo data a s počtem skladeb). Program z vybrané akce se převezme místo současného, nebo se zaškrtnutím „Přidat k současnému programu“ doplní jen skladby, které tam ještě nejsou. Hodí se na cvičení z koncertního programu a na zkopírování programu z jiné zkoušky.
- Server (api.js): nová akce `programsummary` s počty skladeb programu podle akce.

## 4.6.0 (13. 11. 2026)
- Přehled: karty „Moje úkoly“ a „Úkoly“ jsou sloučené do jedné karty „Úkoly“ s přepínačem Moje / Všechny a počty nevyřízených. Moje = společné i marketingové úkoly přidělené přihlášenému (jako dosud, včetně odškrtnutí a otevření akce), Všechny = společné úkoly sboru s úpravami pro administrátora. Zvolená záložka se pamatuje; bez volby a bez vlastních úkolů se otevře Všechny.
- Nastavení: v seznamu karet Přehledu je jedna karta „Úkoly“. Stávající nastavení se přenese (karta stojí na dřívější z obou pozic a je skrytá jen tehdy, když byly skryté obě).
- Oprava: změna úkolů od někoho jiného už nepřepíše celou kartu jen seznamem (zmizel z ní nadpis, jména přidělených osob a tlačítko Přidat úkol); obnoví se jen obsah panelů a počty.

## 4.5.0 (13. 11. 2026)
- Detail akce: u akce se ukáže jméno garanta (pole Garant ze záložky rider v editoru akce). Kontakt na garanta (e-mail, telefon) se zobrazuje jen ve sdíleném odkazu projektu v 10space, který dostávají spolupracující skupiny.
- Editor akce: u výběru garanta je upozornění, že jeho e-mail a telefon uvidí spolupracující skupiny ve sdíleném odkazu projektu.

## 4.4.0 (9. 11. 2026)
- Marketing v 10base slouží jen jako přehled „úkol – hotovo“: seznam úkolů akce, kdo zodpovídá, termín a odškrtnutí. Texty, stavy návrhů, přidělování osob a psaní textů se dělají v Markovi (nová záložka Přehled). Členům s přístupem k Marketingu se v sekci Marketing ukáže odkaz do přehledu v Markovi. Odkazy „Napsat s Markem“ a „Beru to“ z 10base zmizely, přidělovat lze v Markovi nebo formulářem úkolu.
- Opravy: v kartě Moje úkoly se už nezobrazují úkoly zrušených akcí.

## 4.3.0 (8. 11. 2026)
- Zodpovědná osoba u úkolů. Společný úkol i marketingový úkol akce lze přiřadit členovi (formulář, pole Zodpovědný). U marketingového úkolu, který nikdo nemá, je odkaz „Beru to“; vidí ho administrátor, umělecký vedoucí a členové s přístupem k Marketingu. Přiřazení je vidět v seznamech („ty“ u vlastních úkolů).
- Nová karta Přehledu „Moje úkoly“: nevyřízené úkoly přidělené přihlášenému (společné i marketingové, podle termínu, po termínu červeně). Odškrtnout je jde přímo z karty, klepnutí na marketingový úkol otevře akci. Kartu lze skrýt nebo přesunout v Nastavení; u stávajících uživatelů se zařadí na první místo.
- Oprava: úprava společného úkolu už neodškrtne dokončený úkol zpět na nevyřízený.
- Marek zná úkoly přihlášeného člena (otázky typu „co mám udělat“).
- Společné úkoly smí měnit a mazat jen administrátor; člen, kterému je úkol přidělen, smí jen změnit jeho stav (hotovo / nehotovo). Platí od nasazení pravidel databáze.

## 4.2.0 (8. 11. 2026)
- Marketingový úkol je propojený s návrhem textu z Marka. U úkolu s kanálem Facebook, Instagram, Plakát nebo Newsletter se (členům s přístupem k Marketingu) zobrazí odkaz „Napsat s Markem“, který otevře Marka s vybranou akcí a kanálem a s předvyplněným zadáním z úkolu. Po vytvoření návrhu je u úkolu vidět jeho stav (Nový návrh, Rozpracováno, Ke schválení, Hotovo) a odkaz na návrh.
- Když se návrh v Markovi přepne na Hotovo, úkol se sám odškrtne („schválený text z Marka“). Vrátí-li se návrh z Hotovo zpět, automatické odškrtnutí se zruší; ručně odškrtnutý úkol zůstane hotový. Kdo úkol vyřídil jinak než přes Marka, odškrtne ho ručně jako dosud.
- Opakovaný převod plánu z Marka už nepřepíše úkol, který někdo upravil v 10base nebo který má návrh textu.

## 4.1.1 (8. 11. 2026)
- Oprava: po odškrtnutí, úpravě nebo smazání úkolu v detailu akce (a při jakékoli změně akce od někoho jiného) aplikace vrátila uživatele ze seznamu do přehledu akcí a sbalila sekce. Otevřený detail se teď obnoví na místě: rozbalené sekce (Marketing, To-do list…) i pozice na stránce zůstanou a detail se nezakryje načítacím kolečkem.

## 4.1.0 (8. 11. 2026)
- Vlastní šablony úkolů ke koncertům. V Nastavení (Šablony úkolů; vidí a upravují administrátor, vlastník a umělecký vedoucí) lze vytvořit libovolný počet pojmenovaných seznamů úkolů, každý úkol je samostatný řádek. V podkladech akce (To-do před koncertem i v den koncertu) se vedle tlačítka „Přidat šablonu“ objeví výběr šablony; vestavěná šablona zůstává jako výchozí volba. Úkoly se k akci přidají nezaškrtnuté a dají se dál upravovat. Pozdější úprava šablony se u akcí, kam už byla přidána, neprojeví.
- Sekce Marketing v detailu akce. Marketingový plán se vytváří v Markovi a tlačítkem „Převést do 10base“ se jeho harmonogram stane úkoly u akce (termín, čas, kanál, formát, účel, nápad). V 10base je odškrtávají všichni členové (zapíše se kdo a kdy), upravovat, přidávat a mazat je smí administrátor, umělecký vedoucí a lidé s přístupem do Marketingu. Úkol po termínu je označený. Opakovaný převod z Marka nahradí úkoly z plánu, ručně přidané nechá a hotové úkoly se stejným termínem a kanálem zůstanou hotové. Úkoly jsou uložené odděleně od akce, takže je uložení formuláře akce nepřepíše.
- Marketingové úkoly se zrcadlí v podkladech pro 10space projekt (To-do před koncertem, v detailu i v editoru) jako zašedlé řádky bez možnosti úprav. Slouží jako kontrola, ať tam nikdo nevytvoří duplicitu; odškrtávají se jen v sekci Marketing.

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
