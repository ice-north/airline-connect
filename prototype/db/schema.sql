PRAGMA foreign_keys = ON;

CREATE TABLE prefectures (
  prefecture_code TEXT PRIMARY KEY,
  prefecture_name TEXT NOT NULL UNIQUE,
  population INTEGER NOT NULL CHECK (population >= 0),
  census_year INTEGER NOT NULL,
  source_url TEXT NOT NULL
);

CREATE TABLE airports (
  iata_code TEXT PRIMARY KEY CHECK (length(iata_code) = 3),
  airport_name TEXT NOT NULL UNIQUE,
  prefecture_code TEXT NOT NULL REFERENCES prefectures(prefecture_code),
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  network_tier TEXT NOT NULL CHECK (network_tier IN ('hub', 'major', 'regional')),
  base_convenience INTEGER NOT NULL
);

CREATE TABLE population_markets (
  market_id TEXT PRIMARY KEY,
  market_name TEXT NOT NULL,
  prefecture_code TEXT NOT NULL REFERENCES prefectures(prefecture_code),
  population INTEGER NOT NULL CHECK (population >= 0),
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  source_year INTEGER NOT NULL,
  source_url TEXT NOT NULL
);

CREATE TABLE airport_market_access (
  market_id TEXT NOT NULL REFERENCES population_markets(market_id) ON DELETE CASCADE,
  iata_code TEXT NOT NULL REFERENCES airports(iata_code) ON DELETE CASCADE,
  distance_km REAL NOT NULL CHECK (distance_km >= 0),
  distance_band TEXT NOT NULL CHECK (distance_band IN ('short', 'medium', 'long')),
  base_utility REAL NOT NULL,
  demand_share REAL NOT NULL CHECK (demand_share >= 0 AND demand_share <= 1),
  allocated_population INTEGER NOT NULL CHECK (allocated_population >= 0),
  is_primary_airport INTEGER NOT NULL CHECK (is_primary_airport IN (0, 1)),
  PRIMARY KEY (market_id, iata_code)
);

CREATE INDEX idx_airports_prefecture_code ON airports(prefecture_code);
CREATE INDEX idx_population_markets_prefecture_code ON population_markets(prefecture_code);
CREATE INDEX idx_access_airport_population ON airport_market_access(iata_code, allocated_population DESC);
CREATE INDEX idx_access_market_primary ON airport_market_access(market_id, is_primary_airport);

CREATE VIEW airport_population_summary AS
SELECT
  a.iata_code,
  a.airport_name,
  a.network_tier,
  SUM(ama.allocated_population) AS linked_population,
  COUNT(CASE WHEN ama.is_primary_airport = 1 THEN 1 END) AS primary_markets
FROM airports a
LEFT JOIN airport_market_access ama ON ama.iata_code = a.iata_code
GROUP BY a.iata_code, a.airport_name, a.network_tier;
