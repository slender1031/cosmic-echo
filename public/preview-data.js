// 农历万年历数据 1900–2050
const LUNAR_INFO = [
  0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,
  0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,
  0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,
  0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,
  0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,
  0x06ca0,0x0b550,0x15355,0x04da0,0x0a5d0,0x14573,0x052d0,0x0a9a8,0x0e950,0x06aa0,
  0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,
  0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,
  0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,
  0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06aa0,0x0a6b6,0x056a0,0x02b40,0x0acb3,
  0x0a940,0x0d4a0,0x0d8a6,0x0b550,0x056a0,0x0a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,
  0x0b557,0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,
  0x06aa0,0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,
  0x056a0,0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,
  0x195a6,0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,
  0x09570,
];

const LUNAR_MONTHS = ["正","二","三","四","五","六","七","八","九","十","冬","腊"];
const LUNAR_DAYS = ["","初一","初二","初三","初四","初五","初六","初七","初八","初九","初十",
  "十一","十二","十三","十四","十五","十六","十七","十八","十九","二十",
  "廿一","廿二","廿三","廿四","廿五","廿六","廿七","廿八","廿九","三十"];
const WEEKDAYS = ["日","一","二","三","四","五","六"];

function leapMonth(y){return LUNAR_INFO[y-1900]&0xf;}
function leapDays(y){return leapMonth(y)?((LUNAR_INFO[y-1900]&0x10000)?30:29):0;}
function monthDays(y,m){return(LUNAR_INFO[y-1900]&(0x10000>>m))?30:29;}

function solarToLunar(year,month,day){
  const base=new Date(1900,0,31);
  let offset=Math.round((new Date(year,month-1,day)-base)/86400000);
  let ly=1900,dy=0;
  for(;ly<2051&&offset>0;ly++){
    dy=348;
    for(let i=0x8000;i>0x8;i>>=1)dy+=(LUNAR_INFO[ly-1900]&i)?1:0;
    dy+=leapDays(ly);offset-=dy;
  }
  if(offset<0){offset+=dy;ly--;}
  const leap=leapMonth(ly);let isLeap=false,lm=1;
  for(;lm<13&&offset>0;lm++){
    if(leap>0&&lm===leap+1&&!isLeap){lm--;isLeap=true;offset-=leapDays(ly);}
    else offset-=monthDays(ly,lm);
    if(isLeap&&lm===leap+1)isLeap=false;
  }
  if(offset<0){offset+=isLeap?leapDays(ly):monthDays(ly,lm);if(isLeap)isLeap=false;else lm--;}
  const ld=offset+1;
  const mName=(isLeap?"闰":"")+LUNAR_MONTHS[lm-1]+"月";
  return {monthName:mName,dayName:LUNAR_DAYS[ld],full:mName+LUNAR_DAYS[ld]};
}

function getTodayInfo(){
  const n=new Date(),y=n.getFullYear(),m=n.getMonth()+1,d=n.getDate();
  const lunar=solarToLunar(y,m,d);
  return {solar:`${y}年${m}月${d}日`,weekday:`周${WEEKDAYS[n.getDay()]}`,lunar:lunar.full};
}

// 塔罗大阿卡纳
const TAROT_CARDS=[
  {id:"fool",num:"0",zh:"愚者",en:"THE FOOL"},
  {id:"magician",num:"I",zh:"魔术师",en:"THE MAGICIAN"},
  {id:"high-priestess",num:"II",zh:"女祭司",en:"THE HIGH PRIESTESS"},
  {id:"empress",num:"III",zh:"女皇",en:"THE EMPRESS"},
  {id:"emperor",num:"IV",zh:"皇帝",en:"THE EMPEROR"},
  {id:"hierophant",num:"V",zh:"教皇",en:"THE HIEROPHANT"},
  {id:"lovers",num:"VI",zh:"恋人",en:"THE LOVERS"},
  {id:"chariot",num:"VII",zh:"战车",en:"THE CHARIOT"},
  {id:"strength",num:"VIII",zh:"力量",en:"STRENGTH"},
  {id:"hermit",num:"IX",zh:"隐士",en:"THE HERMIT"},
  {id:"wheel",num:"X",zh:"命运之轮",en:"WHEEL OF FORTUNE"},
  {id:"justice",num:"XI",zh:"正义",en:"JUSTICE"},
  {id:"hanged-man",num:"XII",zh:"倒吊人",en:"THE HANGED MAN"},
  {id:"death",num:"XIII",zh:"死神",en:"DEATH"},
  {id:"temperance",num:"XIV",zh:"节制",en:"TEMPERANCE"},
  {id:"devil",num:"XV",zh:"恶魔",en:"THE DEVIL"},
  {id:"tower",num:"XVI",zh:"塔",en:"THE TOWER"},
  {id:"star",num:"XVII",zh:"星星",en:"THE STAR"},
  {id:"moon",num:"XVIII",zh:"月亮",en:"THE MOON"},
  {id:"sun",num:"XIX",zh:"太阳",en:"THE SUN"},
  {id:"judgement",num:"XX",zh:"审判",en:"JUDGEMENT"},
  {id:"world",num:"XXI",zh:"世界",en:"THE WORLD"},
];

function getCardImg(idx){
  return `https://sacred-texts.com/tarot/pkt/img/ar${String(idx).padStart(2,"0")}.jpg`;
}

const ASTROLOGY_TAGS=[
  {name:"双子座水星直行",desc:"思维活跃，沟通顺畅，适合表达真实想法"},
  {name:"金星入摩羯",desc:"在关系中寻求稳定，适合审视长期承诺"},
  {name:"满月射手座",desc:"视野开阔，适合反思信念与行动的一致性"},
  {name:"火星天秤座",desc:"在冲突与和谐间寻找平衡，行动需要权衡"},
  {name:"土星逆行",desc:"审视过去的结构与规则，内省比外求更有力"},
  {name:"新月双鱼",desc:"直觉敏锐，适合冥想与情感清理"},
  {name:"木星巨蟹",desc:"家庭与情感的扩展期，内在安全感增强"},
];
function getTodayAstrology(){
  const d=new Date(),dy=Math.floor((d-(new Date(d.getFullYear(),0,0)))/86400000);
  return ASTROLOGY_TAGS[dy%ASTROLOGY_TAGS.length];
}

// 模拟历史数据
const MOCK_HISTORY=[
  {date:"今日",card:"愚者",cardIdx:0,theme:"在不确定中保持行动力",echo:"你不是在等准备好，你是在等允许。",patterns:["延迟满足","行动焦虑"],color:"#C2593F"},
  {date:"昨日",card:"星星",cardIdx:17,theme:"希望作为一种主动姿态",echo:"光不会自己来找你，你得走向它一步。",patterns:["回避期待"],color:"#7C9A6F"},
  {date:"前天",card:"月亮",cardIdx:18,theme:"直觉与理性的拉锯",echo:"模糊不是错误，它是你还在感知的证明。",patterns:["过度分析","情绪压制"],color:"#6A88C8"},
];
