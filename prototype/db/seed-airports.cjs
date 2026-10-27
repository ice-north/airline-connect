const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const root = __dirname;
const dbPath = path.join(root, 'airline.db');
if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
const db = new DatabaseSync(dbPath);
db.exec(fs.readFileSync(path.join(root, 'schema.sql'), 'utf8'));

const sourceUrl = 'https://www.stat.go.jp/data/kokusei/2020/kekka/pdf/outline_01.pdf';
const censusYear = 2020;
const prefectures = [
  ['01','北海道',5224614],['02','青森県',1237984],['03','岩手県',1210534],['04','宮城県',2301996],['05','秋田県',959502],['06','山形県',1068027],['07','福島県',1833152],['08','茨城県',2867009],['09','栃木県',1933146],['10','群馬県',1939110],['11','埼玉県',7344765],['12','千葉県',6284480],['13','東京都',14047594],['14','神奈川県',9237337],['15','新潟県',2201272],['16','富山県',1034814],['17','石川県',1132526],['18','福井県',766863],['19','山梨県',809974],['20','長野県',2052493],['21','岐阜県',1978742],['22','静岡県',3633202],['23','愛知県',7542415],['24','三重県',1770254],['25','滋賀県',1413610],['26','京都府',2578087],['27','大阪府',8837685],['28','兵庫県',5465002],['29','奈良県',1324473],['30','和歌山県',922584],['31','鳥取県',553407],['32','島根県',671126],['33','岡山県',1888432],['34','広島県',2799702],['35','山口県',1342059],['36','徳島県',719559],['37','香川県',950244],['38','愛媛県',1334841],['39','高知県',691527],['40','福岡県',5135214],['41','佐賀県',811442],['42','長崎県',1312317],['43','熊本県',1738301],['44','大分県',1123852],['45','宮崎県',1069576],['46','鹿児島県',1588256],['47','沖縄県',1467480],
];

const airports = [
  ['CTS','新千歳空港','01',42.7752,141.6923,'hub',100],['AKJ','旭川空港','01',43.6708,142.4475,'regional',56],['HKD','函館空港','01',41.7700,140.8220,'regional',56],['AOJ','青森空港','02',40.7347,140.6908,'regional',56],['AXT','秋田空港','05',39.6156,140.2186,'regional',56],['SDJ','仙台空港','04',38.1397,140.9169,'major',78],['KIJ','新潟空港','15',37.9559,139.1145,'major',78],['KMQ','小松空港','17',36.3946,136.4066,'major',78],['TOY','富山空港','16',36.6483,137.1870,'regional',56],['MMJ','松本空港','20',36.1667,137.9230,'regional',56],['NRT','成田国際空港','12',35.7719,140.3929,'hub',100],['HND','東京国際空港（羽田）','13',35.5494,139.7798,'hub',100],['FSZ','富士山静岡空港','22',34.7961,138.1890,'regional',56],['NGO','中部国際空港','23',34.8584,136.8054,'hub',100],['ITM','大阪国際空港（伊丹）','27',34.7855,135.4380,'major',82],['KIX','関西国際空港','27',34.4347,135.2440,'hub',100],['UKB','神戸空港','28',34.6328,135.2230,'major',78],['OKJ','岡山桃太郎空港','33',34.7569,133.8550,'regional',56],['HIJ','広島空港','34',34.4361,132.9190,'major',78],['TAK','高松空港','37',34.2142,134.0160,'regional',56],['MYJ','松山空港','38',33.8272,132.7000,'regional',56],['FUK','福岡空港','40',33.5859,130.4510,'hub',100],['KMJ','熊本空港','43',32.8373,130.8550,'major',78],['KOJ','鹿児島空港','46',31.8012,130.7190,'major',78],['OKA','那覇空港','47',26.1958,127.6450,'hub',100],['MMY','宮古空港','47',24.7828,125.2950,'regional',56],['ISG','新石垣空港','47',24.3963,124.2450,'regional',56],
];

const capitals = [
  ['青森圏','02',40.8244,140.7400],['盛岡圏','03',39.7036,141.1527],['仙台圏','04',38.2682,140.8694],['秋田圏','05',39.7186,140.1024],['山形圏','06',38.2554,140.3396],['福島圏','07',37.7608,140.4747],['水戸圏','08',36.3659,140.4712],['宇都宮圏','09',36.5551,139.8828],['前橋圏','10',36.3895,139.0634],['さいたま圏','11',35.8617,139.6455],['千葉圏','12',35.6074,140.1065],['東京圏','13',35.6762,139.6503],['横浜圏','14',35.4437,139.6380],['新潟圏','15',37.9026,139.0236],['富山圏','16',36.6953,137.2113],['金沢圏','17',36.5613,136.6562],['福井圏','18',36.0641,136.2222],['甲府圏','19',35.6639,138.5683],['長野圏','20',36.6486,138.1950],['岐阜圏','21',35.4233,136.7607],['静岡圏','22',34.9756,138.3828],['名古屋圏','23',35.1815,136.9066],['津圏','24',34.7303,136.5086],['大津圏','25',35.0045,135.8686],['京都圏','26',35.0116,135.7681],['大阪圏','27',34.6937,135.5023],['神戸圏','28',34.6901,135.1955],['奈良圏','29',34.6851,135.8050],['和歌山圏','30',34.2305,135.1708],['鳥取圏','31',35.5011,134.2351],['松江圏','32',35.4681,133.0484],['岡山圏','33',34.6618,133.9350],['広島圏','34',34.3853,132.4553],['山口圏','35',34.1861,131.4705],['徳島圏','36',34.0658,134.5593],['高松圏','37',34.3401,134.0434],['松山圏','38',33.8416,132.7657],['高知圏','39',33.5597,133.5311],['福岡圏','40',33.5904,130.4017],['佐賀圏','41',33.2494,130.2988],['長崎圏','42',32.7503,129.8779],['熊本圏','43',32.8031,130.7079],['大分圏','44',33.2396,131.6093],['宮崎圏','45',31.9111,131.4239],['鹿児島圏','46',31.5966,130.5571],['那覇圏','47',26.2124,127.6809],
];

const hokkaidoMarkets = [
  ['01-SAP','札幌圏','01',1973395,43.0618,141.3545],['01-AKJ','旭川圏','01',329306,43.7707,142.3650],['01-HKD','函館圏','01',251084,41.7687,140.7288],['01-OTH','北海道その他','01',2670829,43.2500,142.5000],
];

const populationByPrefecture = new Map(prefectures.map(([code,,population]) => [code,population]));
const markets = [
  ...hokkaidoMarkets,
  ...capitals.map(([name,code,lat,lng]) => [`${code}-CAP`,name,code,populationByPrefecture.get(code),lat,lng]),
];

function haversineKm(lat1, lng1, lat2, lng2) {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function distanceBand(distanceKm) {
  if (distanceKm <= 100) return 'short';
  if (distanceKm <= 250) return 'medium';
  return 'long';
}

function utility(airport, distanceKm) {
  const penalty = distanceKm <= 100 ? 0.10 : distanceKm <= 250 ? 0.25 : 0.55;
  return airport[6] - distanceKm * penalty;
}

const insertPrefecture = db.prepare('INSERT INTO prefectures VALUES (?, ?, ?, ?, ?)');
const insertAirport = db.prepare('INSERT INTO airports VALUES (?, ?, ?, ?, ?, ?, ?)');
const insertMarket = db.prepare('INSERT INTO population_markets VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
const insertAccess = db.prepare('INSERT INTO airport_market_access VALUES (?, ?, ?, ?, ?, ?, ?, ?)');

for (const prefecture of prefectures) insertPrefecture.run(...prefecture, censusYear, sourceUrl);
for (const airport of airports) insertAirport.run(...airport);
for (const market of markets) insertMarket.run(...market, censusYear, sourceUrl);

for (const [marketId, , , marketPopulation, lat, lng] of markets) {
  const options = airports.map((airport) => {
    const distance = haversineKm(lat, lng, airport[3], airport[4]);
    return { airport, distance, band: distanceBand(distance), utility: utility(airport, distance) };
  });
  const maxUtility = Math.max(...options.map((option) => option.utility));
  const weights = options.map((option) => Math.exp((option.utility - maxUtility) / 10));
  const weightTotal = weights.reduce((total, value) => total + value, 0);
  const allocated = options.map((option, index) => ({ ...option, share: weights[index] / weightTotal }));
  const floors = allocated.map((option) => Math.floor(option.share * marketPopulation));
  let remainder = marketPopulation - floors.reduce((total, value) => total + value, 0);
  allocated.map((option, index) => ({ index, remainder: option.share * marketPopulation - floors[index] }))
    .sort((a, b) => b.remainder - a.remainder)
    .slice(0, remainder)
    .forEach(({ index }) => { floors[index] += 1; });
  const primary = allocated.reduce((best, option) => option.utility > best.utility ? option : best, allocated[0]).airport[0];
  allocated.forEach((option, index) => insertAccess.run(marketId, option.airport[0], option.distance, option.band, option.utility, option.share, floors[index], option.airport[0] === primary ? 1 : 0));
}

db.exec('PRAGMA optimize');
const total = db.prepare('SELECT SUM(population) AS population FROM population_markets').get().population;
const allocatedTotal = db.prepare('SELECT SUM(allocated_population) AS population FROM airport_market_access').get().population;
console.log(`Seeded ${airports.length} airports, ${markets.length} population markets, and ${total.toLocaleString()} people. Allocated total: ${allocatedTotal.toLocaleString()}.`);
db.close();
