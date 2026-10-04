#!/usr/bin/env python3
"""Render GoalKeeper report from checked-in storyboard plates and verification input.
Requires reportlab and Pillow. Does not fetch network content or operate a browser.
"""
import argparse, base64, html, json, re, shutil
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph, Table, TableStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from PIL import Image

parser=argparse.ArgumentParser();parser.add_argument('--copy-to');args=parser.parse_args()
root=Path(__file__).resolve().parents[1]
out=root/'Docs/report';fig=out/'figures';out.mkdir(parents=True,exist_ok=True)
data=json.loads((out/'verification-input.json').read_text())
manifest=json.loads((fig/'storyboard-manifest.json').read_text())
INK='#1c353b';TEAL='#17636c';GOLD='#ae9055';PAPER='#fffefb';MUTED='#4b6065';SOFT='#f2f1e9';LINE='#c4cec9'
fontroot=Path('/usr/share/fonts/truetype/dejavu')
if (fontroot/'DejaVuSans.ttf').exists():
 for n,f in [('Body','DejaVuSans.ttf'),('Bold','DejaVuSans-Bold.ttf'),('Display','DejaVuSerif.ttf')]: pdfmetrics.registerFont(TTFont(n,str(fontroot/f)))
else:
 from reportlab.pdfbase.pdfmetrics import Font
 for n,f in [('Body','Helvetica'),('Bold','Helvetica-Bold'),('Display','Times-Roman')]: pdfmetrics.registerFont(Font(n,f,'WinAnsiEncoding'))
styles={
 'body':ParagraphStyle('body',fontName='Body',fontSize=10.2,leading=15.7,textColor=HexColor(INK)),
 'small':ParagraphStyle('small',fontName='Body',fontSize=8.7,leading=12.6,textColor=HexColor(MUTED)),
 'caption':ParagraphStyle('caption',fontName='Body',fontSize=8.2,leading=11.5,textColor=HexColor(MUTED)),
 'h2':ParagraphStyle('h2',fontName='Bold',fontSize=13,leading=18,textColor=HexColor(TEAL)),
 'cell':ParagraphStyle('cell',fontName='Body',fontSize=8.8,leading=12.5,textColor=HexColor(INK)),
 'cellhead':ParagraphStyle('cellhead',fontName='Bold',fontSize=8.8,leading=12.5,textColor=HexColor(TEAL)),
}
scenes=[
 dict(kicker='01 / IDENTIFY GOALS',title='State the claim',question='What outcome does the case ask a reviewer to accept?',action='Begin with the Loss Tool’s exact Loss, “Loss of authentic fire reports.” Frame a positive assurance claim for the Fire Detection Payload and preserve the source Loss and Asset identities.',result='G1 is the proposition to be argued. C2 preserves the source Loss. Neither the sentence nor its presence in a GSN rectangle establishes that the claim is true.',next='Retain the illustrative-draft status; define the scope before developing the argument.'),
 dict(kicker='02 / DEFINE THE BASIS',title='Bound the claim',question='Which configuration, environment and security property are included?',action='Identify the Fire Detection Payload, its operating environment, and the Standby and Imaging States. Distinguish these operating contexts from an ordered attack scenario.',result='C1 constrains interpretation of G1. The recorded payload identities establish the modeled boundary; independent configuration evidence and acceptance criteria remain outstanding.',next='Keep the source Asset/Loss identifiers and model revision with the case.'),
 dict(kicker='03 / IDENTIFY STRATEGY',title='Explain the inference',question='Why does this decomposition address the top claim?',action='Use S1 to organize the case around scope, four report-chain attack surfaces and the justification of residual decisions. Record the rationale in J1.',result='The parallelogram carries the inference. The J-marked oval explains the choice of decomposition. Its rationale is bounded to the routes modeled by the source prototype.',next='Elaborate S1 into supporting Goals; a Strategy cannot directly support a Solution in the GSN core profile.'),
 dict(kicker='04 / ELABORATE THE STRATEGY',title='Expose unfinished branches',question='Which claims still need operational substantiation?',action='Develop processor, sensor, classification and downlink claims. Preserve the undeveloped markers where configuration, enforcement, bypass, replay or key-custody evidence has not been supplied.',result='G3 and G4 remain open in this excerpt. C4 records that the source marks a frame-injection route Complete Block, while clearly stating that effectiveness has not been demonstrated.',next='G5 and G6 also remain undeveloped. Named countermeasures alone do not justify removing a diamond.'),
 dict(kicker='05 / IDENTIFY SOLUTIONS',title='Attach bounded evidence',question='Does the cited material establish the claim that relies on it?',action='Attach Sn1 to source record FS-E1 for the scope and modeled-route inventory. Separately, G8 uses Sn2/FS-E2 to document prototype dispositions and rationale.',result='The circular Solution references evidence for a narrow traceability claim. Two supplied source notes establish what the prototype records, not that operational controls are effective.',next='Read the evidence note, artifact path, source revision and limits before relying on any Solution.'),
 dict(kicker='06 / REVIEW AND RECURSE',title='Keep acceptance open',question='What remains unresolved before the case could be accepted?',action='Review residual, blocked, derived and excluded routes. Expose the retired-interface assumption and require a justified independent authority decision against approved criteria.',result='G9 remains explicitly undeveloped. A1 still needs configuration evidence. The recorded disposition facts under G8/Sn2 cannot substitute for acceptance of the residual exposure.',next='Continue the six-step method recursively as evidence arrives; preserve revision and decision provenance.'),
]
changes=[
 ('Primary diagram','KerML-style cards and statement snippets','Six GSN shapes, full statements, A/J markers and undeveloped diamonds'),
 ('Relationship rules','Legacy Strategy → Solution exception','Exact GSN Table 1:2-2 matrix; illegal imported edges reported'),
 ('Screen allocation','Technical model consumes persistent space','Primary GSN canvas; alternate model graph/text in View-menu pop-up'),
 ('Layout','Fixed placements and graph-renderer coupling','ELK layered layout; shared symbol dimensions; explicit manual/save/restore workflow'),
 ('Review outputs','Semantic summaries','Scalable GSN SVG plus Markdown/JSON and traceable FireSat example'),
]
provenance=[
 ('Loss Tool example','createOverview(); commit 8d7641d8e1fe5ef9fcbf7bb912dde4cdf922fc28','Exact Loss, Asset, modeled nodes/edges and disposition fields'),
 ('Loss Tool route analysis','analyzePaths(); same source commit','Nine terminal routes: four unaddressed RV, two Allowed, two Derived and one Blocked'),
 ('SSTPA FireSat model','10-space-segment.yaml; HEAD 05e076bfc8a18e36e146b5ecf01121c32566448c','Payload, environment, States, component, interfaces and function identities'),
 ('Bundled evidence','FS-E1, FS-E2 and loss-source-snapshot.json','Source hashes, inventory, routes, recorded decisions and explicit evidence limits'),
]
integration=[
 ('Semantic case','Pure types, rules, graph and Markdown modules','Map local GSN IDs to authoritative Core identities without replacing source provenance'),
 ('Relationships','Strict support/context matrix','Resolve inherited Strategy→Solution exception before production adoption'),
 ('Evidence','Local notes and artifact references','Map authoritative evidence to Validation, Verification or Loss records; retain access rules'),
 ('Persistence','Vault adapter and separate layout metadata','Use the authorized SSTPA transactional commit API and revision handling'),
 ('Presentation','GSN SVG renderer and ELK layout','Mount in the host tool shell and consume theme tokens; keep model view optional'),
 ('Model projection','Illustrative read-only graph/text','Use parser-verified G2M/profile output before claiming SysML/KerML interchange'),
]
repo='https://github.com/netrisk2025/GoalKeeper'
branch=data.get('branch','gsn-v3-presentation')
refs=[('SRS and 52 requirement records','Docs/SRS_GoalKeeper.md'),('Verification procedures','Docs/VERIFICATION_GoalKeeper.md'),('Requirement verification observations','Docs/VERIFICATION_RESULTS_GoalKeeper.md'),('Requirement dispositions','Docs/REQUIREMENT_DISPOSITION.md'),('Architecture and integration mapping','Docs/ARCHITECTURE_GoalKeeper.md'),('FireSat source storyboard','Docs/FireSat-Storyboard.md'),('Source snapshot','examples/firesat-vault/Artifacts/loss-source-snapshot.json'),('Dependency notice verification','Docs/License-Packaging-Verification.md'),('Final software verification log','Docs/report/final-verification.txt'),('Native compilation log','Docs/report/native-compile-verification.txt'),('Browser observations and limits','Docs/report/browser-verification.json')]
# PDF drawing helpers use explicit boxes to make page breaks and whitespace stable.
W,H=A4;c=canvas.Canvas(str(out/'GoalKeeper-Development-Report.pdf'),pagesize=A4)
c.setTitle('GoalKeeper — GSN presentation development report');c.setAuthor('GoalKeeper project')
page=0

def para(text,x,y,w,style='body'):
 p=Paragraph(text,styles[style]);_,h=p.wrap(w,2000);p.drawOn(c,x,y-h);return y-h

def frame(label,title,sub=''):
 global page
 page+=1;c.setFillColor(HexColor(PAPER));c.rect(0,0,W,H,fill=1,stroke=0)
 c.setStrokeColor(HexColor(GOLD));c.setLineWidth(.75);c.line(42,H-40,W-42,H-40)
 # restrained corner curves outside all figures
 for x,sgn in [(42,1),(W-42,-1)]:
  p=c.beginPath();p.moveTo(x,H-40);p.curveTo(x+sgn*10,H-40,x+sgn*8,H-28,x+sgn*20,H-28);c.drawPath(p)
 c.setFillColor(HexColor(TEAL));c.setFont('Bold',8.6);c.drawString(44,H-64,label)
 c.setFillColor(HexColor(INK));c.setFont('Display',25);c.drawString(44,H-98,title)
 y=H-119
 if sub:y=para(sub,44,y,W-88,'small')
 c.setStrokeColor(HexColor(LINE));c.line(44,37,W-44,37)
 c.setFont('Body',7.8);c.setFillColor(HexColor(MUTED));c.drawString(44,23,'GOALKEEPER  /  GSN CORE PRESENTATION  /  '+data['date']);c.drawRightString(W-44,23,f'{page:02d}')
 return y-20

def table(rows,x,y,width,colweights):
 widths=[width*k/sum(colweights) for k in colweights]
 cells=[[Paragraph(html.escape(str(v)),styles['cellhead' if i==0 else 'cell']) for v in row] for i,row in enumerate(rows)]
 t=Table(cells,colWidths=widths,hAlign='LEFT');t.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('BACKGROUND',(0,0),(-1,0),HexColor(SOFT)),('BOTTOMPADDING',(0,0),(-1,-1),9),('TOPPADDING',(0,0),(-1,-1),9),('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),('LINEBELOW',(0,0),(-1,-1),.4,HexColor(LINE))]));_,h=t.wrap(width,H);t.drawOn(c,x,y-h);return y-h

def image_fit(path,x,y,w,h):
 iw,ih=Image.open(path).size;s=min(w/iw,h/ih);dw,dh=iw*s,ih*s
 c.drawImage(str(path),x+(w-dw)/2,y+(h-dh)/2,width=dw,height=dh,mask='auto')

def section(title,body,x,y,w):
 y=para(title,x,y,w,'h2')-7;return para(body,x,y,w)-15

def page_end():c.showPage()

y=frame('DEVELOPMENT REPORT','A readable GSN assurance case','GoalKeeper '+data.get('version','0.2.0')+' · standalone revision and FireSat storyboard')
y=para('GoalKeeper now gives the assurance argument the primary presentation. The revised baseline replaces the inherited KerML-first exception with GSN v3 core notation, while preserving a requested alternate engineering view.',44,y,W-88)-20
# numbers band
for i,(n,label) in enumerate([('52','requirements'),('18','GSN elements'),('2','source notes'),('5','open claims')]):
 x=44+i*127;c.setFillColor(HexColor(SOFT));c.roundRect(x,y-64,116,64,5,fill=1,stroke=0);c.setFillColor(HexColor(TEAL));c.setFont('Display',24);c.drawString(x+12,y-28,n);c.setFont('Body',8.5);c.drawString(x+12,y-48,label)
y-=87
y=section('What changed','The SRS and verification procedures were written before implementation. The new design retains the six standard shapes, full claim text and meaningful edge styles. Technical graph and model text are reached through the View menu; the main canvas remains focused on the case.',44,y,W-88)
y=table([('Area','Result')]+[(a,c_) for a,_,c_ in changes],44,y,W-88,[1,3])
y-=20
y=section('Applicability','This delivery addresses the GSN v3 core profile in Part 1 §2. It does not implement pattern, modular, Assurance Claim Point or dialectic extensions. The FireSat case remains an illustrative draft with operational evidence and regime acceptance outstanding.',44,y,W-88)
para('Verification status: '+html.escape(data['releaseStatus']),44,y,W-88,'small');page_end()

y=frame('SOURCE AND EVIDENCE','Start with the recorded Loss','The example is derived from the prototype Loss Tool, with scope and limits carried into the case.')
y=section('Loss of authentic fire reports','The resulting case contains 18 GSN elements, 17 core links and two evidence-note references. The source Asset is Fire detection reports (DEMO_AST_FIRE_REPORTS); the local Loss ID is loss, with illustrative HID DEMO_LOSS. The modeled scope is Fire Detection Payload SYS_1.1.2_0, Payload Operating Environment ENV_1.1.2_1, and the Standby and Imaging States.',44,y,W-88)
y=table([('Source','What it establishes')]+[(a+'\n'+b,c_) for a,b,c_ in provenance],44,y,W-88,[1.3,1.8]);y-=18
y=section('What the source does not establish','The prototype records 25 nodes and 25 edges. Its nine terminal routes are algorithm results, not independent attacks or probabilities. Simulated UUIDs and illustrative metric inputs are not operational security evidence. The Environment context and tailored-out retired-interface route are excluded by the source route algorithm.',44,y,W-88)
y=section('Five claims intentionally remain open','G3 processing, G4 sensor provenance, G5 classification, G6 freshness and G9 authority acceptance retain their undeveloped diamonds. Source notes support traceability and decision-record claims; they do not demonstrate enforcement, control effectiveness or accepted residual exposure.',44,y,W-88)
para('The six following plates are selected views of the authored case. Omitted nodes are identified in captions; each plate is an authoring/storyboard excerpt, not a declaration that hidden branches are complete.',44,y,W-88,'small');page_end()

for i,(scene,meta) in enumerate(zip(scenes,manifest['scenes'])):
 y=frame(scene['kicker'],scene['title'],scene['question'])
 # generous full-width plate, with surrounding whitespace rather than diagram ornament
 figure_bottom=305;figure_top=y-4
 image_fit(fig/(meta['id']+'.png'),44,figure_bottom,W-88,figure_top-figure_bottom)
 y=para(html.escape(meta['note']),44,288,W-88,'caption')-16
 y=section('Author action',scene['action'],44,y,W-88)
 y=section('What the reviewer can conclude',scene['result'],44,y,W-88)
 para(scene['next'],44,y,W-88,'small');page_end()

y=frame('ENGINEERING HANDOFF','Prepared for SSTPA integration','The standalone model and presentation are separated from host identity, storage and authorization.')
y=table([('Boundary','Standalone / future host responsibility')]+[(a,b+'. '+c_) for a,b,c_ in integration],44,y,W-88,[1,3]);y-=20
y=section('Source conflicts resolved','SSTPA §6.5.11.25’s KerML precedence and the old standalone prohibition on GSN shapes are superseded for this application. Strategy→Solution is removed from the allowed support matrix. The inherited docked model panel is replaced by the menu-launched pop-up. The flagship source tree remains a read-only reference.',44,y,W-88)
y=section('Distribution and remaining boundaries','ELK.js 0.12.0 uses the same layered engine family as the Loss prototype. Matching source archives and notices ship with an offline checksum gate. Native platform qualification and Rust dependency licensing remain distinct from the JavaScript/ELK package inventory.',44,y,W-88)
para('SVG, Markdown and JSON outputs preserve the case for review. The alternate model text is illustrative and read-only; a conforming parser and the SSTPA profile are prerequisites for a future language-interchange claim.',44,y,W-88,'small');page_end()

y=frame('QUALIFICATION RECORD','Evidence for the revision',data['summary'])
y=table([('Check','Status','Observed result')]+[(x['name'],x['status'],x['detail']) for x in data['checks']],44,y,W-88,[1.4,.6,2.7]);y-=17
if y<250:
 page_end();y=frame('QUALIFICATION BOUNDARIES','What the evidence covers','Automated, browser and native evidence have distinct scopes.')
y=para(html.escape(data.get('requirementEvidence','')),44,y,W-88,'small')-16
for text in data['limitations'][:3]:
 y=para('• '+html.escape(text),44,y,W-88,'small')-8
if y<160:
 page_end();y=frame('DOCUMENT MAP','Review and reproduce','Source documents and verification artifacts remain with the repository.')
else:y-=8
for title,path in refs:
 y=para(f'<link href="{repo}/blob/{branch}/{path}" color="{TEAL}">{html.escape(title)}</link>',44,y,W-88,'small')-5
page_end()
shots=[shot for shot in data.get('screenshots',[]) if shot.get('pdf',True) and (root/shot['path']).exists()]
for idx in range(0,len(shots),2):
 frame('IMPLEMENTED APPLICATION','Review in the workspace','Observed application views; the storyboard plates retain the readable claim details.')
 for slot,shot in enumerate(shots[idx:idx+2]):
  bottom=402 if slot==0 else 76
  image_fit(root/shot['path'],44,bottom,W-88,280)
  para(html.escape(shot['title']+' - '+shot.get('caption','')),44,bottom-8,W-88,'caption')
 page_end()
c.save()

# HTML is self-contained: SVG figures and optional screenshot pixels are embedded.
def htable(head,rows):return '<table><thead><tr>'+''.join('<th>'+html.escape(x)+'</th>' for x in head)+'</tr></thead><tbody>'+''.join('<tr>'+''.join('<td>'+html.escape(str(x))+'</td>' for x in row)+'</tr>' for row in rows)+'</tbody></table>'
def svg(name):return (fig/name).read_text()
blocks=[]
blocks.append(f'<header><p class="eyebrow">GOALKEEPER · {data["date"]} · DEVELOPMENT REPORT</p><h1>A readable GSN<br>assurance case</h1><p class="lead">Standalone presentation revision and the FireSat authoring storyboard.</p><div class="metrics">'+''.join(f'<div><strong>{n}</strong><span>{t}</span></div>' for n,t in [('52','requirements'),('18','GSN elements'),('2','source notes'),('5','open claims')])+'</div><p>The revised baseline makes GSN v3 core notation the primary presentation, with the alternate engineering graph and text available through the View menu.</p><p class="callout">The FireSat argument is an illustrative draft. Operational evidence and regime acceptance remain outstanding.</p></header>')
blocks.append('<section><p class="eyebrow">DESIGN BASELINE</p><h2>Changes that support review</h2>'+htable(['Area','Previous direction','Revised behavior'],changes)+'<p>The SRS and verification procedures preceded implementation. Applicability is the GSN v3 core Part 1 §2 profile; pattern, modular, Assurance Claim Point and dialectic extensions are excluded.</p></section>')
blocks.append('<section><p class="eyebrow">SOURCE AND EVIDENCE</p><h2>Start with the recorded Loss</h2><p>The source is “Loss of authentic fire reports,” with local ID <code>loss</code>, illustrative HID <code>DEMO_LOSS</code>, and Asset <code>DEMO_AST_FIRE_REPORTS</code>. Scope is Fire Detection Payload <code>SYS_1.1.2_0</code>, its operating environment, and Standby / Imaging States.</p>'+htable(['Source','Baseline','What it establishes'],provenance)+'<p>The source’s 25 nodes and 25 edges produce nine terminal routes: four unaddressed RV, two Allowed, two Derived and one Blocked. These are route counts, not independent attacks or probabilities. Simulated identities and prototype metric inputs are not operational assurance evidence.</p></section>')
for scene,meta in zip(scenes,manifest['scenes']):
 blocks.append(f'<section class="scene"><p class="eyebrow">{scene["kicker"]}</p><h2>{scene["title"]}</h2><p class="lead">{scene["question"]}</p><figure>{svg(meta["id"]+".svg")}<figcaption>{meta["note"]}</figcaption></figure><div class="columns"><div><h3>Author action</h3><p>{scene["action"]}</p></div><div><h3>Reviewer conclusion</h3><p>{scene["result"]}</p></div></div><p class="callout">{scene["next"]}</p></section>')
blocks.append('<section><p class="eyebrow">FULL-CASE REFERENCE</p><h2>The complete 18-element case</h2><p>This overview preserves all elements and relationships. Open the diagram at its native scale or use the application for detailed reading. G3, G4, G5, G6 and G9 remain undeveloped.</p><div class="fullcase">'+svg('full-case.svg')+'</div><p class="caption">Generated from the implemented SVG renderer and ELK layout. Storyboard excerpts above do not alter the stored case.</p></section>')
blocks.append('<section><p class="eyebrow">ENGINEERING HANDOFF</p><h2>Prepared for SSTPA integration</h2>'+htable(['Boundary','Standalone','Future host responsibility'],integration)+'<p>The inherited KerML-primary exception, Strategy→Solution support and permanently docked model view are superseded for the standalone application. Source projects remain read-only. ELK 0.12.0 source archives, embedded notices and the actual GoalKeeper npm license inventory accompany an offline verification gate.</p></section>')
blocks.append('<section><p class="eyebrow">QUALIFICATION RECORD</p><h2>'+html.escape(data['releaseStatus'])+'</h2><p>'+html.escape(data['summary'])+'</p>'+htable(['Check','Status','Observed result'],[(x['name'],x['status'],x['detail']) for x in data['checks']])+'<p>'+html.escape(data.get('requirementEvidence',''))+'</p><h3>Qualification boundaries</h3><ul>'+''.join('<li>'+html.escape(x)+'</li>' for x in data['limitations'])+'</ul></section>')
for shot in data.get('screenshots',[]):
 p=root/shot['path']
 if p.exists():blocks.append('<section><h2>'+html.escape(shot['title'])+'</h2><img class="screenshot" src="data:'+('image/jpeg' if p.suffix.lower() in ['.jpg','.jpeg'] else 'image/png')+';base64,'+base64.b64encode(p.read_bytes()).decode()+'" alt="'+html.escape(shot['title'],quote=True)+'"><p class="caption">'+html.escape(shot.get('caption',''))+'</p></section>')
blocks.append('<footer><h2>Review and reproduce</h2><ul>'+''.join(f'<li><a href="{repo}/blob/{branch}/{path}">{title}</a></li>' for title,path in refs)+'</ul><p>Figure generation: <code>node scripts/report-figures.mjs</code>. The development report uses these implemented-renderer plates and <code>Docs/report/verification-input.json</code>. Structural validity does not establish evidence sufficiency or approval.</p></footer>')
css='''*{box-sizing:border-box}body{margin:0;background:#ebece6;color:#1c353b;font:16px/1.65 system-ui,Arial,sans-serif}main{max-width:1080px;margin:auto;background:#fffefb}header,section,footer{padding:60px 64px;border-bottom:1px solid #c4cec9}header{border-top:5px solid #ae9055}h1,h2{font-family:Georgia,serif;font-weight:400;line-height:1.13}h1{font-size:62px;margin:20px 0}h2{font-size:38px;margin:14px 0 22px}h3{font-size:17px;color:#17636c;margin-bottom:8px}.eyebrow{color:#17636c;letter-spacing:.14em;font-size:12px;font-weight:700}.lead{font-size:21px;color:#4b6065}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin:30px 0}.metrics div{background:#f2f1e9;padding:16px 20px;border-top:2px solid #ae9055}.metrics strong{font:38px Georgia,serif;color:#17636c;display:block}.metrics span{font-size:13px;color:#4b6065}table{width:100%;border-collapse:collapse;font-size:14px;margin:22px 0}td,th{text-align:left;vertical-align:top;padding:14px 12px;border-bottom:1px solid #c4cec9}th{color:#17636c;background:#f2f1e9}figure{margin:30px 0}figure svg{max-width:100%;height:auto;display:block;margin:auto}figcaption,.caption{font-size:13px;color:#4b6065;margin-top:18px}.columns{display:grid;grid-template-columns:1fr 1fr;gap:36px}.callout{border-left:3px solid #ae9055;padding:16px 22px;background:#f2f1e9}.fullcase{overflow:auto;border:1px solid #c4cec9;padding:16px;max-height:900px}.fullcase svg{display:block;max-width:none}a{color:#17636c}code{font-size:.84em;overflow-wrap:anywhere}.screenshot{width:100%;height:auto;border:1px solid #c4cec9}li{margin:8px 0}@media(max-width:700px){header,section,footer{padding:35px 24px}h1{font-size:44px}h2{font-size:30px}.metrics{grid-template-columns:1fr 1fr}.columns{grid-template-columns:1fr}table{font-size:12px}td,th{padding:10px 6px}}@media print{body{background:white}header,section,footer{padding:30px;break-inside:avoid}.fullcase{overflow:visible;max-height:none}.fullcase svg{width:100%;height:auto}.scene{break-before:page}}'''
(out/'GoalKeeper-Development-Report.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GoalKeeper — development report</title><style>'+css+'</style><main>'+''.join(blocks)+'</main></html>')
if args.copy_to:
 target=Path(args.copy_to);target.mkdir(parents=True,exist_ok=True)
 for name in ['GoalKeeper-Development-Report.pdf','GoalKeeper-Development-Report.html']:shutil.copy2(out/name,target/name)
print(f'Created {page} PDF pages and self-contained HTML in {out}')
