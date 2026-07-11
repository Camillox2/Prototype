#!/usr/bin/env python3
"""Converte um patch Brasfoot autorizado em pacotes FutMaster locais.

Dependências: pip install javaobj-py3 libarchive-c
O conteúdo convertido não deve ser commitado no repositório público.
"""
import argparse, base64, json, re, unicodedata
from collections import Counter, defaultdict
from pathlib import Path
import javaobj

COUNTRIES={'bra':'Brasil','arg':'Argentina','par':'Paraguai','uru':'Uruguai','chi':'Chile','col':'Colômbia','equ':'Equador','per':'Peru','ven':'Venezuela','bol':'Bolívia','por':'Portugal','esp':'Espanha','ita':'Itália','ing':'Inglaterra','ale':'Alemanha','fra':'França','hol':'Países Baixos','bel':'Bélgica','sui':'Suíça','aut':'Áustria','esc':'Escócia','wal':'País de Gales','irl':'Irlanda','din':'Dinamarca','nor':'Noruega','sue':'Suécia','fin':'Finlândia','isl':'Islândia','gre':'Grécia','tur':'Turquia','cro':'Croácia','ser':'Sérvia','bos':'Bósnia','slk':'Eslováquia','esl':'Eslovênia','rom':'Romênia','bul':'Bulgária','hun':'Hungria','pol':'Polônia','ucr':'Ucrânia','rus':'Rússia','bie':'Bielorrússia','caz':'Cazaquistão','geo':'Geórgia','arm':'Armênia','aze':'Azerbaijão','isr':'Israel','chp':'Chipre','mon':'Montenegro','mac':'Macedônia do Norte','alb':'Albânia','kos':'Kosovo','mol':'Moldávia','lit':'Lituânia','let':'Letônia','est':'Estônia','lux':'Luxemburgo','mal':'Malta','eua':'Estados Unidos','usa':'Estados Unidos','mex':'México','can':'Canadá','crc':'Costa Rica','gua':'Guatemala','hon':'Honduras','sal':'El Salvador','pan':'Panamá','jam':'Jamaica','tri':'Trinidad e Tobago','nic':'Nicarágua','cub':'Cuba','hai':'Haiti','dom':'República Dominicana','jap':'Japão','chn':'China','cor':'Coreia do Sul','crn':'Coreia do Norte','aus':'Austrália','nzl':'Nova Zelândia','ind':'Índia','tha':'Tailândia','vie':'Vietnã','mas':'Malásia','sin':'Singapura','ino':'Indonésia','fil':'Filipinas','uzb':'Uzbequistão','ira':'Irã','irq':'Iraque','cat':'Catar','ara':'Arábia Saudita','emi':'Emirados Árabes Unidos','jor':'Jordânia','lib':'Líbano','sir':'Síria','bah':'Bahrein','oma':'Omã','kuw':'Kuwait','egi':'Egito','mar':'Marrocos','argl':'Argélia','tun':'Tunísia','nig':'Nigéria','gan':'Gana','sen':'Senegal','cam':'Camarões','civ':'Costa do Marfim','afs':'África do Sul','ang':'Angola','moz':'Moçambique','zam':'Zâmbia','zim':'Zimbábue','con':'Congo','rdc':'RD Congo','ken':'Quênia','tan':'Tanzânia','uga':'Uganda','eti':'Etiópia','sud':'Sudão','lia':'Líbia','mli':'Mali','bur':'Burkina Faso','tog':'Togo','ben':'Benim','gui':'Guiné','gab':'Gabão','mad':'Madagascar'}

def norm(value):
    value=unicodedata.normalize('NFKD',str(value)).encode('ascii','ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+','',value)

def suffix(stem):
    match=re.search(r'_([A-Za-z]{2,4})$',stem)
    return match.group(1).lower() if match else None

def position(player):
    group=int(player.get('e',3)); foot=int(player.get('i',0))
    return ['GOL','LE' if foot==1 else 'LD','ZAG','MC','ATA'][max(0,min(4,group))]

def rating(team_strength,starter,age,name):
    value=43+float(team_strength)*2.15+(2.5 if starter else 0)+(sum(ord(c) for c in name)%7)-3
    if age<=20:value-=2
    if age>=34:value-=1
    return max(42,min(91,round(value)))

def potential(overall,age,name):
    return max(overall,min(96,overall+round(max(0,25-age)*.65)+(sum(ord(c) for c in name)%7)//2))

def locate(root):
    team_dir=root/'TeamsAndroid'
    if not team_dir.exists():
        found=list(root.rglob('TeamsAndroid'))
        if not found:raise SystemExit('Pasta TeamsAndroid não encontrada.')
        team_dir=found[0]
    return team_dir,team_dir.parent/'Escudos'

def convert(root,output):
    team_dir,logo_dir=locate(root);output.mkdir(parents=True,exist_ok=True)
    logo_map={norm(path.stem):path for path in logo_dir.glob('*.png')}
    raw=[];country_ids=defaultdict(Counter)
    for path in sorted(team_dir.glob('*.ban')):
        with path.open('rb') as stream:team=javaobj.load(stream)
        values=vars(team);code=suffix(path.stem) or suffix(str(values.get('d','')))
        if code:country_ids[int(values.get('a',-1))][code]+=1
        raw.append((path,values,code))
    id_to_code={key:counts.most_common(1)[0][0] for key,counts in country_ids.items()}
    groups=defaultdict(list);unmatched=0
    for path,values,code in raw:
        code=code or id_to_code.get(int(values.get('a',-1)),'out')
        slug=str(values.get('d') or path.stem);logo=logo_map.get(norm(slug)) or logo_map.get(norm(path.stem));logo_data=None
        if logo:logo_data='data:image/png;base64,'+base64.b64encode(logo.read_bytes()).decode()
        else:unmatched+=1
        players=[]
        for source,youth in ((values.get('l',[]),False),(values.get('m',[]),True)):
            for item in source:
                player=vars(item);name=str(player.get('a','Jogador')).replace('\xa0',' ').strip();age=int(player.get('d',18));starter=bool(player.get('f',0)) and not youth;overall=rating(values.get('c',10),starter,age,name)
                players.append({'name':name,'age':age,'position':position(player),'starter':starter,'youth':youth,'overall':overall,'potential':potential(overall,age,name),'foot':'E' if int(player.get('i',0))==1 else 'D','nationalityId':int(player.get('c',values.get('a',0))),'traitA':int(player.get('g',0)),'traitB':int(player.get('h',0)),'special':bool(player.get('b',False))})
        team_rating=max(45,min(92,round(43+float(values.get('c',10))*2.15)))
        groups[code].append({'id':slug,'name':str(values.get('e') or slug),'short':re.sub(r'[^A-Za-z0-9]','',str(values.get('e') or slug))[:3].upper(),'countryCode':code,'country':COUNTRIES.get(code,code.upper()),'stadium':str(values.get('f') or 'Estádio local'),'coach':str(values.get('h') or 'Treinador local'),'capacity':int(values.get('g') or 10000),'colors':[str(values.get('cor1') or '#1d4ed8'),str(values.get('cor2') or '#ffffff')],'rating':team_rating,'reputation':max(35,min(95,team_rating-2+int(values.get('n',0)))),'players':players,'logoData':logo_data})
    catalog=[]
    for code,teams in sorted(groups.items(),key=lambda item:(COUNTRIES.get(item[0],item[0]),item[0])):
        teams.sort(key=lambda team:(-team['rating'],team['name']))
        pack={'format':'futmaster-brasfoot-pack','version':1,'privateUseOnly':True,'countryCode':code,'country':COUNTRIES.get(code,code.upper()),'teamCount':len(teams),'teams':teams}
        target=output/f'{code}.fmpack.json';target.write_text(json.dumps(pack,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
        catalog.append({'code':code,'country':pack['country'],'teams':len(teams),'file':target.name,'size':target.stat().st_size})
    (output/'catalog.json').write_text(json.dumps({'format':'futmaster-pack-catalog','version':1,'totalTeams':sum(item['teams'] for item in catalog),'unmatchedLogos':unmatched,'packs':catalog},ensure_ascii=False,indent=2),encoding='utf-8')
    return {'teams':sum(item['teams'] for item in catalog),'countries':len(catalog),'unmatchedLogos':unmatched}

def main():
    parser=argparse.ArgumentParser();parser.add_argument('input_dir',type=Path);parser.add_argument('output_dir',type=Path);args=parser.parse_args()
    print(json.dumps(convert(args.input_dir,args.output_dir),ensure_ascii=False))
if __name__=='__main__':main()
